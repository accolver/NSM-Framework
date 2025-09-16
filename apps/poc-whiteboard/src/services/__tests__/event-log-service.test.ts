import { describe, test, expect, beforeEach, afterEach, vi } from 'bun:test';
import { createEventLogService, type EventLogService, type EventLogConfig } from '../event-log-service';
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

describe('EventLogService', () => {
  let eventLogService: EventLogService;
  let config: EventLogConfig;

  beforeEach(() => {
    config = {
      maxEvents: 1000,
      enableRealtime: true,
      filterKinds: [NSM_PROTOCOL.DEFINITION_KIND, NSM_PROTOCOL.STATE_UPDATE_KIND],
      autoStart: false
    };
    eventLogService = createEventLogService(config);
  });

  afterEach(() => {
    eventLogService.stop();
  });

  describe('Event Capture and Storage', () => {
    test('should capture and store NSM definition events', () => {
      const event = createMockNostrEvent({
        kind: NSM_PROTOCOL.DEFINITION_KIND,
        content: '{"stateMachine": "whiteboard", "definition": {}}'
      });

      eventLogService.addEvent(event);
      const events = eventLogService.getEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(event);
    });

    test('should capture and store NSM state update events', () => {
      const event = createMockNostrEvent({
        kind: NSM_PROTOCOL.STATE_UPDATE_KIND,
        content: '{"state": "drawing", "transition": "draw"}'
      });

      eventLogService.addEvent(event);
      const events = eventLogService.getEvents();

      expect(events).toHaveLength(1);
      expect(events[0].kind).toBe(NSM_PROTOCOL.STATE_UPDATE_KIND);
    });

    test('should capture and store NSM interaction events', () => {
      const interactionKind = NSM_PROTOCOL.INTERACTION_KIND_MIN + 100; // 7100
      const event = createMockNostrEvent({
        kind: interactionKind,
        content: '{"action": "draw", "payload": {"x": 100, "y": 200}}'
      });

      eventLogService.addEvent(event);
      const events = eventLogService.getEvents();

      expect(events).toHaveLength(1);
      expect(events[0].kind).toBe(interactionKind);
    });

    test('should respect maxEvents limit', () => {
      const smallConfig = { ...config, maxEvents: 2 };
      const service = createEventLogService(smallConfig);

      // Add 3 events
      for (let i = 0; i < 3; i++) {
        service.addEvent(createMockNostrEvent({
          id: `event-${i}`,
          content: `event ${i}`
        }));
      }

      const events = service.getEvents();
      expect(events).toHaveLength(2);
      // Should keep the most recent events
      expect(events[0].content).toBe('event 1');
      expect(events[1].content).toBe('event 2');

      service.stop();
    });
  });

  describe('Event Filtering', () => {
    test('should filter events by NSM definition kind', () => {
      const definitionEvent = createMockNostrEvent({ kind: NSM_PROTOCOL.DEFINITION_KIND });
      const otherEvent = createMockNostrEvent({ kind: 1 }); // regular note

      eventLogService.addEvent(definitionEvent);
      eventLogService.addEvent(otherEvent);

      const filtered = eventLogService.getEventsByKind(NSM_PROTOCOL.DEFINITION_KIND);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].kind).toBe(NSM_PROTOCOL.DEFINITION_KIND);
    });

    test('should filter events by NSM state update kind', () => {
      const stateEvent = createMockNostrEvent({ kind: NSM_PROTOCOL.STATE_UPDATE_KIND });
      const definitionEvent = createMockNostrEvent({ kind: NSM_PROTOCOL.DEFINITION_KIND });

      eventLogService.addEvent(stateEvent);
      eventLogService.addEvent(definitionEvent);

      const filtered = eventLogService.getEventsByKind(NSM_PROTOCOL.STATE_UPDATE_KIND);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].kind).toBe(NSM_PROTOCOL.STATE_UPDATE_KIND);
    });

    test('should filter events by NSM interaction kind range', () => {
      const interactionKind1 = NSM_PROTOCOL.INTERACTION_KIND_MIN; // 7000
      const interactionKind2 = NSM_PROTOCOL.INTERACTION_KIND_MAX; // 7999
      const outsideKind = 8000;

      eventLogService.addEvent(createMockNostrEvent({ kind: interactionKind1 }));
      eventLogService.addEvent(createMockNostrEvent({ kind: interactionKind2 }));
      eventLogService.addEvent(createMockNostrEvent({ kind: outsideKind }));

      const filtered = eventLogService.getEventsByKindRange(NSM_PROTOCOL.INTERACTION_KIND_MIN, NSM_PROTOCOL.INTERACTION_KIND_MAX);
      expect(filtered).toHaveLength(2);
      expect(filtered.every(e => e.kind >= NSM_PROTOCOL.INTERACTION_KIND_MIN && e.kind <= NSM_PROTOCOL.INTERACTION_KIND_MAX)).toBe(true);
    });

    test('should filter events by multiple kinds', () => {
      const kinds = [NSM_PROTOCOL.DEFINITION_KIND, NSM_PROTOCOL.STATE_UPDATE_KIND];

      eventLogService.addEvent(createMockNostrEvent({ kind: NSM_PROTOCOL.DEFINITION_KIND }));
      eventLogService.addEvent(createMockNostrEvent({ kind: NSM_PROTOCOL.STATE_UPDATE_KIND }));
      eventLogService.addEvent(createMockNostrEvent({ kind: 1 })); // should be filtered out

      const filtered = eventLogService.getEventsByKinds(kinds);
      expect(filtered).toHaveLength(2);
      expect(filtered.every(e => kinds.includes(e.kind))).toBe(true);
    });
  });

  describe('Search Functionality', () => {
    test('should search events by content text', () => {
      eventLogService.addEvent(createMockNostrEvent({
        content: 'drawing a circle on the whiteboard'
      }));
      eventLogService.addEvent(createMockNostrEvent({
        content: 'changing color to red'
      }));
      eventLogService.addEvent(createMockNostrEvent({
        content: 'adding a new rectangle'
      }));

      const results = eventLogService.searchEvents('drawing');
      expect(results).toHaveLength(1);
      expect(results[0].content).toContain('drawing');
    });

    test('should search events case-insensitively', () => {
      eventLogService.addEvent(createMockNostrEvent({
        content: 'Drawing a Circle'
      }));

      const results = eventLogService.searchEvents('drawing circle');
      expect(results).toHaveLength(1);
    });

    test('should search events by pubkey', () => {
      const targetPubkey = 'specific-pubkey-12345';
      eventLogService.addEvent(createMockNostrEvent({ pubkey: targetPubkey }));
      eventLogService.addEvent(createMockNostrEvent({ pubkey: 'other-pubkey' }));

      const results = eventLogService.searchEvents(targetPubkey);
      expect(results).toHaveLength(1);
      expect(results[0].pubkey).toBe(targetPubkey);
    });

    test('should search events by event ID', () => {
      const targetId = 'specific-event-id-12345';
      eventLogService.addEvent(createMockNostrEvent({ id: targetId }));
      eventLogService.addEvent(createMockNostrEvent({ id: 'other-id' }));

      const results = eventLogService.searchEvents(targetId);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(targetId);
    });

    test('should return empty array for no matches', () => {
      eventLogService.addEvent(createMockNostrEvent({
        content: 'some content'
      }));

      const results = eventLogService.searchEvents('nonexistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('Real-time Event Updates', () => {
    test('should emit events when new events are added', () => {
      const onEventCallback = vi.fn();
      eventLogService.onEvent(onEventCallback);

      const event = createMockNostrEvent();
      eventLogService.addEvent(event);

      expect(onEventCallback).toHaveBeenCalledWith(event);
    });

    test('should emit events when events are cleared', () => {
      const onClearCallback = vi.fn();
      eventLogService.onClear(onClearCallback);

      eventLogService.addEvent(createMockNostrEvent());
      eventLogService.clearEvents();

      expect(onClearCallback).toHaveBeenCalled();
    });

    test('should remove event listeners', () => {
      const onEventCallback = vi.fn();
      const unsubscribe = eventLogService.onEvent(onEventCallback);

      unsubscribe();

      eventLogService.addEvent(createMockNostrEvent());
      expect(onEventCallback).not.toHaveBeenCalled();
    });

    test('should handle multiple event listeners', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      eventLogService.onEvent(callback1);
      eventLogService.onEvent(callback2);

      const event = createMockNostrEvent();
      eventLogService.addEvent(event);

      expect(callback1).toHaveBeenCalledWith(event);
      expect(callback2).toHaveBeenCalledWith(event);
    });
  });

  describe('Service Lifecycle', () => {
    test('should start and stop the service', () => {
      expect(eventLogService.isRunning()).toBe(false);

      eventLogService.start();
      expect(eventLogService.isRunning()).toBe(true);

      eventLogService.stop();
      expect(eventLogService.isRunning()).toBe(false);
    });

    test('should clear all events', () => {
      eventLogService.addEvent(createMockNostrEvent());
      eventLogService.addEvent(createMockNostrEvent());

      expect(eventLogService.getEvents()).toHaveLength(2);

      eventLogService.clearEvents();
      expect(eventLogService.getEvents()).toHaveLength(0);
    });

    test('should get event count', () => {
      expect(eventLogService.getEventCount()).toBe(0);

      eventLogService.addEvent(createMockNostrEvent());
      eventLogService.addEvent(createMockNostrEvent());

      expect(eventLogService.getEventCount()).toBe(2);
    });
  });

  describe('Event Metadata', () => {
    test('should extract NSM event type from event kind', () => {
      const definitionEvent = createMockNostrEvent({ kind: NSM_PROTOCOL.DEFINITION_KIND });
      const stateEvent = createMockNostrEvent({ kind: NSM_PROTOCOL.STATE_UPDATE_KIND });
      const interactionEvent = createMockNostrEvent({ kind: 7500 });

      eventLogService.addEvent(definitionEvent);
      eventLogService.addEvent(stateEvent);
      eventLogService.addEvent(interactionEvent);

      const events = eventLogService.getEvents();
      const metadata1 = eventLogService.getEventMetadata(events[0]);
      const metadata2 = eventLogService.getEventMetadata(events[1]);
      const metadata3 = eventLogService.getEventMetadata(events[2]);

      expect(metadata1.nsmEventType).toBe('definition');
      expect(metadata2.nsmEventType).toBe('state-update');
      expect(metadata3.nsmEventType).toBe('interaction');
    });

    test('should parse JSON content safely', () => {
      const validJsonEvent = createMockNostrEvent({
        content: '{"action": "draw", "x": 100}'
      });
      const invalidJsonEvent = createMockNostrEvent({
        content: 'invalid json content'
      });

      eventLogService.addEvent(validJsonEvent);
      eventLogService.addEvent(invalidJsonEvent);

      const events = eventLogService.getEvents();
      const metadata1 = eventLogService.getEventMetadata(events[0]);
      const metadata2 = eventLogService.getEventMetadata(events[1]);

      expect(metadata1.parsedContent).toEqual({ action: 'draw', x: 100 });
      expect(metadata2.parsedContent).toBeNull();
      expect(metadata2.parseError).toBeTruthy();
    });

    test('should format event timestamps', () => {
      const timestamp = 1640995200; // 2022-01-01 00:00:00 UTC
      const event = createMockNostrEvent({ created_at: timestamp });

      eventLogService.addEvent(event);
      const events = eventLogService.getEvents();
      const metadata = eventLogService.getEventMetadata(events[0]);

      expect(metadata.formattedTimestamp).toMatch(/\d{4}-\d{2}-\d{2}/); // Should contain date
      expect(metadata.relativeTime).toBeTruthy(); // Should have relative time
    });
  });
});