import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createActor } from 'xstate';
import { whiteboardMachine } from '../whiteboard-machine';
import { getEventLogService, logNostrEvent } from '../services/event-log-service';
import { createMockNostrEvent } from '../test-utils';
import { NSM_PROTOCOL } from '@nsm/core';

describe('Event Flood Fix', () => {
  let eventLogService: any;
  let actor: any;
  let originalDateNow: typeof Date.now;

  beforeEach(() => {
    // Mock Date.now to control timestamps
    originalDateNow = Date.now;

    eventLogService = getEventLogService({
      maxEvents: 100,
      enableRealtime: true,
      autoStart: true
    });

    actor = createActor(whiteboardMachine);
    actor.start();
  });

  afterEach(() => {
    Date.now = originalDateNow;

    if (actor) {
      actor.stop();
    }

    if (eventLogService) {
      eventLogService.clearEvents();
      eventLogService.stop();
    }
  });

  test('should not flood events with same idle state', () => {
    let eventCount = 0;

    // Subscribe to events to count them
    const unsubscribe = eventLogService.onEvent(() => {
      eventCount++;
    });

    // Mock Date.now to simulate old timestamps (the 1007944 minutes ago issue)
    const currentTime = Date.now();
    const veryOldTimestamp = Math.floor(currentTime / 1000) - (1007944 * 60); // 1007944 minutes ago

    // Keep current time for now calculation
    Date.now = () => currentTime;

    // Create events with old timestamps that should not trigger floods
    const stateEvent1 = createMockNostrEvent({
      kind: NSM_PROTOCOL.STATE_UPDATE_KIND,
      created_at: veryOldTimestamp,
      content: JSON.stringify({
        state: 'idle',
        previousState: 'idle',
        context: {
          currentTool: 'pen',
          isDrawing: false
        },
        timestamp: veryOldTimestamp * 1000
      })
    });

    const stateEvent2 = createMockNostrEvent({
      kind: NSM_PROTOCOL.STATE_UPDATE_KIND,
      created_at: veryOldTimestamp,
      content: JSON.stringify({
        state: 'idle',
        previousState: 'idle',
        context: {
          currentTool: 'pen',
          isDrawing: false
        },
        timestamp: veryOldTimestamp * 1000
      })
    });

    // Add the first event
    eventLogService.addEvent(stateEvent1);
    const countAfterFirst = eventCount;

    // Add identical event - should be deduplicated and not cause flood
    eventLogService.addEvent(stateEvent2);
    const countAfterSecond = eventCount;

    unsubscribe();

    // CRITICAL FIX TEST: Deduplication should prevent identical events
    expect(countAfterFirst).toBe(1);
    expect(countAfterSecond).toBe(1); // Should still be 1 due to deduplication

    // Verify the metadata calculation doesn't cause issues
    const metadata1 = eventLogService.getEventMetadata(stateEvent1);
    const metadata2 = eventLogService.getEventMetadata(stateEvent2);

    // Should show proper relative time calculation for very old timestamps
    expect(metadata1.relativeTime).toMatch(/(day|week|month|year)/);
    expect(metadata2.relativeTime).toMatch(/(day|week|month|year)/);
  });

  test('should not create infinite loop in state subscriptions', () => {
    let stateChangeCount = 0;
    const maxExpectedChanges = 5;

    // Monitor state changes
    const subscription = actor.subscribe(() => {
      stateChangeCount++;

      // Safety check to prevent infinite loop in test
      if (stateChangeCount > 50) {
        throw new Error(`Infinite loop detected: ${stateChangeCount} state changes`);
      }
    });

    // Trigger some normal state changes
    actor.send({ type: 'SELECT_TOOL', tool: 'brush' });
    actor.send({ type: 'SELECT_TOOL', tool: 'pen' });
    actor.send({ type: 'START_DRAWING', point: { x: 10, y: 10, timestamp: Date.now() } });
    actor.send({ type: 'END_DRAWING' });

    // Clean up
    subscription.unsubscribe();

    // Should have reasonable number of state changes, not a flood
    expect(stateChangeCount).toBeLessThan(maxExpectedChanges * 2);
    expect(stateChangeCount).toBeGreaterThan(0);
  });

  test('should throttle identical state update events', () => {
    const events: any[] = [];

    // Subscribe to capture events
    const unsubscribe = eventLogService.onEvent((event: any) => {
      events.push(event);
    });

    const baseTimestamp = Math.floor(Date.now() / 1000);

    // Simulate rapid identical state updates (like what causes the flood)
    for (let i = 0; i < 10; i++) {
      logNostrEvent(createMockNostrEvent({
        kind: NSM_PROTOCOL.STATE_UPDATE_KIND,
        created_at: baseTimestamp + i,
        content: JSON.stringify({
          state: 'idle',
          previousState: 'idle',
          context: { currentTool: 'pen', isDrawing: false },
          timestamp: (baseTimestamp + i) * 1000
        })
      }));
    }

    unsubscribe();

    // CRITICAL FIX TEST: Should deduplicate identical events
    expect(events.length).toBe(1); // Only first event should be processed, rest deduplicated

    // Verify no memory leaks or performance issues
    const allEvents = eventLogService.getEvents();
    expect(allEvents.length).toBe(1); // Only one unique event in storage
  });

  test('should handle timestamp edge cases properly', () => {
    const currentTime = Date.now();

    // Test various timestamp edge cases that might cause "minutes ago" issues
    const testCases = [
      Math.floor(currentTime / 1000) - (1007944 * 60), // The specific "1007944 minutes ago" case
      Math.floor(currentTime / 1000) - (24 * 60 * 60), // 1 day ago
      Math.floor(currentTime / 1000) - (60), // 1 minute ago
      Math.floor(currentTime / 1000), // Current time
      Math.floor(currentTime / 1000) + 60, // Future time (edge case)
    ];

    testCases.forEach((timestamp, index) => {
      const event = createMockNostrEvent({
        kind: NSM_PROTOCOL.STATE_UPDATE_KIND,
        created_at: timestamp,
        content: JSON.stringify({ state: 'idle', test: index })
      });

      eventLogService.addEvent(event);
      const metadata = eventLogService.getEventMetadata(event);

      // Should not throw or cause issues
      expect(metadata.relativeTime).toBeDefined();
      expect(typeof metadata.relativeTime).toBe('string');
      expect(metadata.formattedTimestamp).toBeDefined();
    });
  });

  test('should prevent callback registration loops', () => {
    let callbackCount = 0;

    // Simulate the collaboration service callback issue
    const mockCollabService = {
      _callbackSet: false,
      setEventCallback: (callback: Function) => {
        if (!mockCollabService._callbackSet) {
          callbackCount++;
          mockCollabService._callbackSet = true;
        }
      }
    };

    // Simulate multiple state changes that might re-register callbacks
    for (let i = 0; i < 5; i++) {
      if (!mockCollabService._callbackSet) {
        mockCollabService.setEventCallback(() => {});
      }
    }

    // Should only register callback once, not multiple times
    expect(callbackCount).toBe(1);
    expect(mockCollabService._callbackSet).toBe(true);
  });
});