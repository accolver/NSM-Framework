import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createEventLogService, getEventLogService, logNostrEvent, getNSMEvents } from '../event-log-service';
import { NSM_PROTOCOL } from '@nsm/core';
import type { INostrEvent } from '@nsm/core';

describe('EventLogService Integration', () => {
  // Mock event factory
  function createMockEvent(overrides: Partial<INostrEvent> = {}): INostrEvent {
    return {
      id: 'test-' + Math.random().toString(36).substring(2, 15),
      pubkey: 'npub' + Math.random().toString(36).substring(2, 32),
      created_at: Math.floor(Date.now() / 1000),
      kind: NSM_PROTOCOL.DEFINITION_KIND,
      tags: [],
      content: 'test content',
      sig: 'test-signature-' + Math.random().toString(36).substring(2, 32),
      ...overrides
    };
  }

  beforeEach(() => {
    // Clear any existing global service
    const service = getEventLogService();
    service.clearEvents();
  });

  describe('Global Service Integration', () => {
    test('should provide a global event log service', () => {
      const service1 = getEventLogService();
      const service2 = getEventLogService();

      // Should return the same instance
      expect(service1).toBe(service2);
    });

    test('should allow logging events through utility function', () => {
      const event = createMockEvent({
        content: 'Test event for utility function'
      });

      logNostrEvent(event);

      const service = getEventLogService();
      const events = service.getEvents();

      expect(events).toHaveLength(1);
      expect(events[0].content).toBe('Test event for utility function');
    });
  });

  describe('NSM Event Integration', () => {
    test('should filter and return only NSM events', () => {
      const service = getEventLogService();

      // Add NSM Definition event
      service.addEvent(createMockEvent({
        kind: NSM_PROTOCOL.DEFINITION_KIND,
        content: JSON.stringify({
          type: 'whiteboard',
          definition: { states: ['idle', 'drawing'] }
        })
      }));

      // Add NSM State Update event
      service.addEvent(createMockEvent({
        kind: NSM_PROTOCOL.STATE_UPDATE_KIND,
        content: JSON.stringify({
          state: 'drawing',
          previousState: 'idle'
        })
      }));

      // Add NSM Interaction event
      service.addEvent(createMockEvent({
        kind: NSM_PROTOCOL.INTERACTION_KIND_MIN + 100,
        content: JSON.stringify({
          action: 'startDrawing',
          coordinates: { x: 100, y: 200 }
        })
      }));

      // Add non-NSM event (should be filtered out)
      service.addEvent(createMockEvent({
        kind: 1, // Regular Nostr note
        content: 'This is not an NSM event'
      }));

      const nsmEvents = getNSMEvents();

      expect(nsmEvents).toHaveLength(3);
      expect(nsmEvents.every(event => {
        return event.kind === NSM_PROTOCOL.DEFINITION_KIND ||
               event.kind === NSM_PROTOCOL.STATE_UPDATE_KIND ||
               (event.kind >= NSM_PROTOCOL.INTERACTION_KIND_MIN && event.kind <= NSM_PROTOCOL.INTERACTION_KIND_MAX);
      })).toBe(true);
    });

    test('should return NSM events sorted by timestamp (most recent first)', () => {
      const service = getEventLogService();

      // Add events with different timestamps
      const oldEvent = createMockEvent({
        kind: NSM_PROTOCOL.DEFINITION_KIND,
        created_at: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        content: 'Old event'
      });

      const recentEvent = createMockEvent({
        kind: NSM_PROTOCOL.STATE_UPDATE_KIND,
        created_at: Math.floor(Date.now() / 1000) - 60, // 1 minute ago
        content: 'Recent event'
      });

      const newestEvent = createMockEvent({
        kind: NSM_PROTOCOL.INTERACTION_KIND_MIN + 50,
        created_at: Math.floor(Date.now() / 1000), // Now
        content: 'Newest event'
      });

      // Add in random order
      service.addEvent(recentEvent);
      service.addEvent(oldEvent);
      service.addEvent(newestEvent);

      const nsmEvents = getNSMEvents();

      expect(nsmEvents).toHaveLength(3);
      expect(nsmEvents[0].content).toBe('Newest event');
      expect(nsmEvents[1].content).toBe('Recent event');
      expect(nsmEvents[2].content).toBe('Old event');
    });
  });

  describe('Event Metadata Integration', () => {
    test('should correctly identify NSM event types', () => {
      const service = getEventLogService();

      const definitionEvent = createMockEvent({
        kind: NSM_PROTOCOL.DEFINITION_KIND
      });

      const stateEvent = createMockEvent({
        kind: NSM_PROTOCOL.STATE_UPDATE_KIND
      });

      const interactionEvent = createMockEvent({
        kind: NSM_PROTOCOL.INTERACTION_KIND_MIN + 500
      });

      service.addEvent(definitionEvent);
      service.addEvent(stateEvent);
      service.addEvent(interactionEvent);

      const metadata1 = service.getEventMetadata(definitionEvent);
      const metadata2 = service.getEventMetadata(stateEvent);
      const metadata3 = service.getEventMetadata(interactionEvent);

      expect(metadata1.nsmEventType).toBe('definition');
      expect(metadata2.nsmEventType).toBe('state-update');
      expect(metadata3.nsmEventType).toBe('interaction');
    });

    test('should parse JSON content in NSM events', () => {
      const service = getEventLogService();

      const validJsonEvent = createMockEvent({
        kind: NSM_PROTOCOL.DEFINITION_KIND,
        content: JSON.stringify({
          type: 'whiteboard',
          states: ['idle', 'drawing', 'selecting'],
          initialState: 'idle'
        })
      });

      service.addEvent(validJsonEvent);
      const metadata = service.getEventMetadata(validJsonEvent);

      expect(metadata.parsedContent).toEqual({
        type: 'whiteboard',
        states: ['idle', 'drawing', 'selecting'],
        initialState: 'idle'
      });
      expect(metadata.parseError).toBeUndefined();
    });
  });

  describe('Real-time Event Flow', () => {
    test('should emit events in real-time when added', (done) => {
      const service = getEventLogService();
      let callbackCount = 0;

      const unsubscribe = service.onEvent((event) => {
        callbackCount++;
        expect(event.content).toBe(`Event ${callbackCount}`);

        if (callbackCount === 3) {
          unsubscribe();
          done();
        }
      });

      // Add events one by one
      service.addEvent(createMockEvent({ content: 'Event 1' }));
      service.addEvent(createMockEvent({ content: 'Event 2' }));
      service.addEvent(createMockEvent({ content: 'Event 3' }));
    });

    test('should emit clear events when events are cleared', (done) => {
      const service = getEventLogService();

      const unsubscribe = service.onClear(() => {
        unsubscribe();
        done();
      });

      // Add some events and then clear
      service.addEvent(createMockEvent());
      service.addEvent(createMockEvent());
      service.clearEvents();
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle large number of NSM events efficiently', () => {
      const service = getEventLogService();

      // Add 100 NSM events of different types
      for (let i = 0; i < 100; i++) {
        const kindOptions = [
          NSM_PROTOCOL.DEFINITION_KIND,
          NSM_PROTOCOL.STATE_UPDATE_KIND,
          NSM_PROTOCOL.INTERACTION_KIND_MIN + (i % 1000)
        ];

        service.addEvent(createMockEvent({
          kind: kindOptions[i % 3],
          content: JSON.stringify({
            eventNumber: i,
            timestamp: Date.now() + i
          })
        }));
      }

      const nsmEvents = getNSMEvents();
      expect(nsmEvents).toHaveLength(100);

      // Test search performance
      const searchResults = service.searchEvents('eventNumber');
      expect(searchResults.length).toBeGreaterThan(0);

      // Test filtering performance
      const definitionEvents = service.getEventsByKind(NSM_PROTOCOL.DEFINITION_KIND);
      const stateEvents = service.getEventsByKind(NSM_PROTOCOL.STATE_UPDATE_KIND);
      const interactionEvents = service.getEventsByKindRange(
        NSM_PROTOCOL.INTERACTION_KIND_MIN,
        NSM_PROTOCOL.INTERACTION_KIND_MAX
      );

      expect(definitionEvents.length + stateEvents.length + interactionEvents.length).toBe(100);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle malformed JSON content gracefully', () => {
      const service = getEventLogService();

      const malformedEvent = createMockEvent({
        kind: NSM_PROTOCOL.DEFINITION_KIND,
        content: '{"invalid": json content}'
      });

      service.addEvent(malformedEvent);
      const metadata = service.getEventMetadata(malformedEvent);

      expect(metadata.parsedContent).toBeNull();
      expect(metadata.parseError).toBeTruthy();
    });

    test('should handle events with unusual event kinds', () => {
      const service = getEventLogService();

      // Test boundary conditions
      const minInteractionEvent = createMockEvent({
        kind: NSM_PROTOCOL.INTERACTION_KIND_MIN
      });

      const maxInteractionEvent = createMockEvent({
        kind: NSM_PROTOCOL.INTERACTION_KIND_MAX
      });

      const outsideRangeEvent = createMockEvent({
        kind: NSM_PROTOCOL.INTERACTION_KIND_MAX + 1
      });

      service.addEvent(minInteractionEvent);
      service.addEvent(maxInteractionEvent);
      service.addEvent(outsideRangeEvent);

      const interactionEvents = service.getEventsByKindRange(
        NSM_PROTOCOL.INTERACTION_KIND_MIN,
        NSM_PROTOCOL.INTERACTION_KIND_MAX
      );

      expect(interactionEvents).toHaveLength(2);
      expect(interactionEvents.some(e => e.kind === NSM_PROTOCOL.INTERACTION_KIND_MIN)).toBe(true);
      expect(interactionEvents.some(e => e.kind === NSM_PROTOCOL.INTERACTION_KIND_MAX)).toBe(true);
    });
  });
});