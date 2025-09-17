import { describe, test, expect, beforeEach, afterEach, vi } from 'bun:test';
import { createEventLogService, type EventLogService } from '../event-log-service';
import { NSM_PROTOCOL } from '@nsm/core';
import type { INostrEvent } from '@nsm/core';

// Mock Nostr event factory
function createMockNostrEvent(overrides: Partial<INostrEvent> = {}): INostrEvent {
  return {
    id: 'mock-event-id-' + Math.random().toString(36).substr(2, 9),
    pubkey: 'mock-pubkey-' + Math.random().toString(36).substr(2, 16),
    created_at: Math.floor(Date.now() / 1000),
    kind: NSM_PROTOCOL.DEFINITION_KIND,
    tags: [],
    content: 'mock event content',
    sig: 'mock-signature-' + Math.random().toString(36).substr(2, 32),
    ...overrides
  };
}

describe('EventLogService - Event Deduplication', () => {
  let eventLogService: EventLogService;

  beforeEach(() => {
    // Mock console.debug to suppress duplicate event logs during testing
    vi.spyOn(console, 'debug').mockImplementation(() => {});

    eventLogService = createEventLogService({
      maxEvents: 1000,
      enableRealtime: true,
      autoStart: false
    });
  });

  afterEach(() => {
    eventLogService.stop();
  });

  describe('Basic Deduplication', () => {
    test('should deduplicate identical events based on ID and timestamp', () => {
      const baseEvent = createMockNostrEvent({
        id: 'test-event-123',
        created_at: 1640995200,
        content: 'Test content'
      });

      // Add the same event twice
      eventLogService.addEvent(baseEvent);
      eventLogService.addEvent(baseEvent);

      const events = eventLogService.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('test-event-123');
    });

    test('should allow events with same content but different IDs', () => {
      const event1 = createMockNostrEvent({
        id: 'event-1',
        created_at: 1640995200,
        content: 'Same content'
      });

      const event2 = createMockNostrEvent({
        id: 'event-2',
        created_at: 1640995200,
        content: 'Same content'
      });

      eventLogService.addEvent(event1);
      eventLogService.addEvent(event2);

      const events = eventLogService.getEvents();
      expect(events).toHaveLength(2);
    });

    test('should allow events with same ID but different timestamps', () => {
      const event1 = createMockNostrEvent({
        id: 'same-id',
        created_at: 1640995200,
        content: 'Content 1'
      });

      const event2 = createMockNostrEvent({
        id: 'same-id',
        created_at: 1640995300, // Different timestamp
        content: 'Content 2'
      });

      eventLogService.addEvent(event1);
      eventLogService.addEvent(event2);

      const events = eventLogService.getEvents();
      expect(events).toHaveLength(2);
    });
  });

  describe('State Update Event Deduplication', () => {
    test('should deduplicate state-update events with same state transition', () => {
      const commonPubkey = 'npub1testuser123456789';
      const commonContent = JSON.stringify({
        state: 'drawing',
        previousState: 'idle',
        context: {
          currentTool: 'pen',
          isDrawing: true,
          pathsCount: 5,
          shapesCount: 2
        }
      });

      const stateEvent1 = createMockNostrEvent({
        id: 'state-event-1',
        pubkey: commonPubkey,
        created_at: 1640995200,
        kind: NSM_PROTOCOL.STATE_UPDATE_KIND,
        content: commonContent
      });

      const stateEvent2 = createMockNostrEvent({
        id: 'state-event-2', // Different ID but same content
        pubkey: commonPubkey, // Same user
        created_at: 1640995201, // Different timestamp
        kind: NSM_PROTOCOL.STATE_UPDATE_KIND,
        content: commonContent // Same content - should be deduplicated
      });

      eventLogService.addEvent(stateEvent1);
      eventLogService.addEvent(stateEvent2);

      const events = eventLogService.getEvents();
      expect(events).toHaveLength(1);
    });

    test('should allow state-update events with different state transitions', () => {
      const stateEvent1 = createMockNostrEvent({
        id: 'state-event-1',
        created_at: 1640995200,
        kind: NSM_PROTOCOL.STATE_UPDATE_KIND,
        content: JSON.stringify({
          state: 'drawing',
          previousState: 'idle',
          context: {
            currentTool: 'pen',
            isDrawing: true,
            pathsCount: 5,
            shapesCount: 2
          }
        })
      });

      const stateEvent2 = createMockNostrEvent({
        id: 'state-event-1', // Same ID
        created_at: 1640995200, // Same timestamp
        kind: NSM_PROTOCOL.STATE_UPDATE_KIND,
        content: JSON.stringify({
          state: 'selecting', // Different state
          previousState: 'drawing', // Different previous state
          context: {
            currentTool: 'pen',
            isDrawing: true,
            pathsCount: 5,
            shapesCount: 2
          }
        })
      });

      eventLogService.addEvent(stateEvent1);
      eventLogService.addEvent(stateEvent2);

      const events = eventLogService.getEvents();
      expect(events).toHaveLength(2);
    });

    test('should allow state-update events with different context properties', () => {
      const stateEvent1 = createMockNostrEvent({
        id: 'state-event-1',
        created_at: 1640995200,
        kind: NSM_PROTOCOL.STATE_UPDATE_KIND,
        content: JSON.stringify({
          state: 'drawing',
          previousState: 'idle',
          context: {
            currentTool: 'pen',
            isDrawing: true,
            pathsCount: 5,
            shapesCount: 2
          }
        })
      });

      const stateEvent2 = createMockNostrEvent({
        id: 'state-event-1', // Same ID
        created_at: 1640995200, // Same timestamp
        kind: NSM_PROTOCOL.STATE_UPDATE_KIND,
        content: JSON.stringify({
          state: 'drawing', // Same state
          previousState: 'idle', // Same previous state
          context: {
            currentTool: 'pencil', // Different tool
            isDrawing: false, // Different drawing state
            pathsCount: 10, // Different count
            shapesCount: 5 // Different count
          }
        })
      });

      eventLogService.addEvent(stateEvent1);
      eventLogService.addEvent(stateEvent2);

      const events = eventLogService.getEvents();
      expect(events).toHaveLength(2);
    });

    test('should handle state-update events with malformed JSON content', () => {
      const validStateEvent = createMockNostrEvent({
        id: 'valid-state-event',
        created_at: 1640995200,
        kind: NSM_PROTOCOL.STATE_UPDATE_KIND,
        content: JSON.stringify({
          state: 'drawing',
          previousState: 'idle'
        })
      });

      const malformedStateEvent = createMockNostrEvent({
        id: 'malformed-state-event',
        created_at: 1640995200,
        kind: NSM_PROTOCOL.STATE_UPDATE_KIND,
        content: 'invalid json content'
      });

      const duplicateMalformed = createMockNostrEvent({
        id: 'malformed-state-event', // Same ID
        created_at: 1640995200, // Same timestamp
        kind: NSM_PROTOCOL.STATE_UPDATE_KIND,
        content: 'invalid json content' // Same malformed content
      });

      eventLogService.addEvent(validStateEvent);
      eventLogService.addEvent(malformedStateEvent);
      eventLogService.addEvent(duplicateMalformed);

      const events = eventLogService.getEvents();
      expect(events).toHaveLength(2); // Valid + one malformed (duplicate rejected)
    });
  });

  describe('Non-State Event Deduplication', () => {
    test('should deduplicate non-state events with same ID, timestamp, kind, and content', () => {
      const definitionEvent1 = createMockNostrEvent({
        id: 'definition-1',
        created_at: 1640995200,
        kind: NSM_PROTOCOL.DEFINITION_KIND,
        content: '{"type": "whiteboard", "states": ["idle", "drawing"]}'
      });

      const definitionEvent2 = createMockNostrEvent({
        id: 'definition-1', // Same ID
        created_at: 1640995200, // Same timestamp
        kind: NSM_PROTOCOL.DEFINITION_KIND, // Same kind
        content: '{"type": "whiteboard", "states": ["idle", "drawing"]}' // Same content
      });

      eventLogService.addEvent(definitionEvent1);
      eventLogService.addEvent(definitionEvent2);

      const events = eventLogService.getEvents();
      expect(events).toHaveLength(1);
    });

    test('should allow non-state events with same ID/timestamp but different content', () => {
      const event1 = createMockNostrEvent({
        id: 'event-1',
        created_at: 1640995200,
        kind: NSM_PROTOCOL.DEFINITION_KIND,
        content: 'Content A'
      });

      const event2 = createMockNostrEvent({
        id: 'event-1', // Same ID
        created_at: 1640995200, // Same timestamp
        kind: NSM_PROTOCOL.DEFINITION_KIND, // Same kind
        content: 'Content B' // Different content
      });

      eventLogService.addEvent(event1);
      eventLogService.addEvent(event2);

      const events = eventLogService.getEvents();
      expect(events).toHaveLength(2);
    });

    test('should allow non-state events with same ID/timestamp but different kinds', () => {
      const event1 = createMockNostrEvent({
        id: 'event-1',
        created_at: 1640995200,
        kind: NSM_PROTOCOL.DEFINITION_KIND,
        content: 'Same content'
      });

      const event2 = createMockNostrEvent({
        id: 'event-1', // Same ID
        created_at: 1640995200, // Same timestamp
        kind: NSM_PROTOCOL.INTERACTION_KIND_MIN, // Different kind
        content: 'Same content' // Same content
      });

      eventLogService.addEvent(event1);
      eventLogService.addEvent(event2);

      const events = eventLogService.getEvents();
      expect(events).toHaveLength(2);
    });
  });

  describe('Deduplication Memory Management', () => {
    test('should clean up old deduplication hashes to prevent memory leaks', () => {
      // Mock Date.now to control time progression
      const originalNow = Date.now;
      let mockTime = 1640995200000; // Start time

      vi.spyOn(Date, 'now').mockImplementation(() => mockTime);

      // Add events normally
      for (let i = 0; i < 60; i++) {
        eventLogService.addEvent(createMockNostrEvent({
          id: `event-${i}`,
          content: `content-${i}`
        }));
      }

      // Advance time by more than 60 seconds to trigger cleanup
      mockTime += 61000;

      // Add another event to trigger cleanup
      eventLogService.addEvent(createMockNostrEvent({
        id: 'cleanup-trigger',
        content: 'trigger cleanup'
      }));

      const events = eventLogService.getEvents();
      expect(events).toHaveLength(61); // All should be added since they're unique

      // Restore Date.now
      Date.now = originalNow;
    });

    test('should handle hash cleanup when threshold is exceeded', () => {
      // Add many unique events to trigger hash cleanup
      for (let i = 0; i < 150; i++) {
        eventLogService.addEvent(createMockNostrEvent({
          id: `hash-event-${i}`,
          created_at: Math.floor(Date.now() / 1000) + i,
          content: `unique-content-${i}`
        }));
      }

      const events = eventLogService.getEvents();
      expect(events).toHaveLength(150);

      // Service should still function properly
      eventLogService.addEvent(createMockNostrEvent({
        id: 'post-cleanup-event',
        content: 'after cleanup'
      }));

      expect(eventLogService.getEventCount()).toBe(151);
    });
  });

  describe('Real-time Updates with Deduplication', () => {
    test('should not emit duplicate events to listeners', () => {
      const onEventCallback = vi.fn();
      eventLogService.onEvent(onEventCallback);

      const event = createMockNostrEvent({
        id: 'listener-test',
        content: 'Test event for listeners'
      });

      // Add the same event twice
      eventLogService.addEvent(event);
      eventLogService.addEvent(event);

      // Callback should only be called once
      expect(onEventCallback).toHaveBeenCalledTimes(1);
      expect(onEventCallback).toHaveBeenCalledWith(event);
    });

    test('should emit events that pass deduplication check', () => {
      const onEventCallback = vi.fn();
      eventLogService.onEvent(onEventCallback);

      const event1 = createMockNostrEvent({
        id: 'unique-1',
        content: 'First unique event'
      });

      const event2 = createMockNostrEvent({
        id: 'unique-2',
        content: 'Second unique event'
      });

      eventLogService.addEvent(event1);
      eventLogService.addEvent(event2);

      expect(onEventCallback).toHaveBeenCalledTimes(2);
      expect(onEventCallback).toHaveBeenNthCalledWith(1, event1);
      expect(onEventCallback).toHaveBeenNthCalledWith(2, event2);
    });
  });

  describe('Performance with Deduplication', () => {
    test('should efficiently handle many duplicate events', () => {
      const baseEvent = createMockNostrEvent({
        id: 'duplicate-performance-test',
        created_at: 1640995200,
        content: 'Repeated event'
      });

      const startTime = performance.now();

      // Try to add the same event 1000 times
      for (let i = 0; i < 1000; i++) {
        eventLogService.addEvent(baseEvent);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete quickly (under 100ms) and only store one event
      expect(duration).toBeLessThan(100);
      expect(eventLogService.getEventCount()).toBe(1);
    });

    test('should efficiently handle unique events', () => {
      const startTime = performance.now();

      // Add many unique events
      for (let i = 0; i < 1000; i++) {
        eventLogService.addEvent(createMockNostrEvent({
          id: `unique-perf-${i}`,
          created_at: Math.floor(Date.now() / 1000) + i,
          content: `unique-content-${i}`
        }));
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete quickly and store all events
      expect(duration).toBeLessThan(500);
      expect(eventLogService.getEventCount()).toBe(1000);
    });
  });

  describe('Clear Events with Deduplication', () => {
    test('should clear deduplication hashes when events are cleared', () => {
      const event = createMockNostrEvent({
        id: 'clear-test',
        content: 'Test clear functionality'
      });

      // Add event
      eventLogService.addEvent(event);
      expect(eventLogService.getEventCount()).toBe(1);

      // Clear events
      eventLogService.clearEvents();
      expect(eventLogService.getEventCount()).toBe(0);

      // Add the same event again - should be allowed since hashes were cleared
      eventLogService.addEvent(event);
      expect(eventLogService.getEventCount()).toBe(1);
    });
  });
});