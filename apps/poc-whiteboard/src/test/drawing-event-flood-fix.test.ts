/**
 * Test to verify that the drawing event flooding bug has been fixed
 *
 * The issue was:
 * 1. User draws first line
 * 2. Canvas calls realTimeCollaborationService.startLiveDrawing()
 * 3. Service emits live drawing event
 * 4. App.tsx listener receives event and sends it back to state machine
 * 5. State machine triggers action that calls service again
 * 6. Infinite loop creates event flooding
 *
 * The fix:
 * - Removed live drawing event handlers from state machine
 * - Live drawing events are now logged to EventLogService instead
 * - Canvas directly calls collaboration service without state machine roundtrip
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createActor } from 'xstate';
import { whiteboardMachine } from '../whiteboard-machine';
import { createRealTimeCollaborationService } from '../services/realtime-collaboration';
import { createCollaborationService } from '../services/collaboration';

describe('Drawing Event Flood Fix', () => {
  let actor: any;
  let collaborationService: any;
  let realTimeCollaborationService: any;
  let eventCallback: any;
  let emittedEvents: any[];

  beforeEach(() => {
    // Create actor
    actor = createActor(whiteboardMachine);

    // Mock collaboration services
    collaborationService = createCollaborationService('test-user');
    eventCallback = vi.fn();

    // Track emitted events
    emittedEvents = [];

    // Create real-time collaboration service
    realTimeCollaborationService = createRealTimeCollaborationService(
      collaborationService,
      eventCallback
    );

    // Monitor live drawing events
    realTimeCollaborationService.onLiveDrawingUpdate((event: any) => {
      emittedEvents.push(event);
    });

    actor.start();

    // Initialize collaboration
    actor.send({
      type: 'INITIALIZE_COLLABORATION',
      userId: 'test-user',
      userName: 'Test User'
    });

    actor.send({
      type: 'INITIALIZE_REALTIME_COLLABORATION'
    });
  });

  afterEach(() => {
    actor.stop();
    realTimeCollaborationService.destroy();
  });

  it('should not flood events when starting live drawing', () => {
    // Clear any initialization events
    emittedEvents.length = 0;

    // Simulate starting drawing (this would have caused flooding before)
    realTimeCollaborationService.startLiveDrawing('test-user', 'drawing-1');

    // Should only emit one event
    expect(emittedEvents).toHaveLength(1);
    expect(emittedEvents[0]).toMatchObject({
      type: 'LIVE_DRAWING_START',
      userId: 'test-user',
      drawingId: 'drawing-1'
    });

    // Wait a bit to see if more events are emitted (they shouldn't be)
    return new Promise(resolve => {
      setTimeout(() => {
        expect(emittedEvents).toHaveLength(1);
        resolve(undefined);
      }, 100);
    });
  });

  it('should not flood events when ending live drawing', () => {
    // Start drawing first
    realTimeCollaborationService.startLiveDrawing('test-user', 'drawing-1');

    // Clear events
    emittedEvents.length = 0;

    // End drawing
    realTimeCollaborationService.endLiveDrawing('test-user');

    // Should only emit one event
    expect(emittedEvents).toHaveLength(1);
    expect(emittedEvents[0]).toMatchObject({
      type: 'LIVE_DRAWING_END',
      userId: 'test-user'
    });

    // Wait a bit to see if more events are emitted (they shouldn't be)
    return new Promise(resolve => {
      setTimeout(() => {
        expect(emittedEvents).toHaveLength(1);
        resolve(undefined);
      }, 100);
    });
  });

  it('should not send live drawing events to state machine', () => {
    const initialState = actor.getSnapshot();

    // Start live drawing - this should NOT trigger state machine changes
    realTimeCollaborationService.startLiveDrawing('test-user', 'drawing-1');

    const afterStartState = actor.getSnapshot();

    // End live drawing - this should also NOT trigger state machine changes
    realTimeCollaborationService.endLiveDrawing('test-user');

    const afterEndState = actor.getSnapshot();

    // State machine should be unchanged by live drawing events
    expect(initialState.value).toBe(afterStartState.value);
    expect(initialState.value).toBe(afterEndState.value);

    // Context should also be unchanged (except for potential service references)
    expect(initialState.context.isDrawing).toBe(afterStartState.context.isDrawing);
    expect(initialState.context.isDrawing).toBe(afterEndState.context.isDrawing);
  });

  it('should still handle actual drawing events properly', () => {
    // This tests that fixing the flood didn't break normal drawing
    expect(actor.getSnapshot().value).toBe('idle');
    expect(actor.getSnapshot().context.isDrawing).toBe(false);

    // Start drawing through state machine (normal flow)
    actor.send({
      type: 'START_DRAWING',
      point: { x: 100, y: 100, timestamp: Date.now() }
    });

    // State should change to drawing
    expect(actor.getSnapshot().value).toBe('drawing');
    expect(actor.getSnapshot().context.isDrawing).toBe(true);
    expect(actor.getSnapshot().context.currentPath).toBeTruthy();

    // End drawing
    actor.send({ type: 'END_DRAWING' });

    // Should return to idle with path saved
    expect(actor.getSnapshot().value).toBe('idle');
    expect(actor.getSnapshot().context.isDrawing).toBe(false);
    expect(actor.getSnapshot().context.currentPath).toBeNull();
    expect(actor.getSnapshot().context.paths).toHaveLength(1);
  });

  it('should not have infinite loops with multiple rapid drawing events', () => {
    // This test simulates rapid drawing that could cause flooding
    const startTime = Date.now();
    let eventCount = 0;

    // Monitor all events
    const allEvents: any[] = [];
    realTimeCollaborationService.onLiveDrawingUpdate((event: any) => {
      allEvents.push(event);
      eventCount++;
    });

    // Simulate rapid drawing events
    for (let i = 0; i < 10; i++) {
      realTimeCollaborationService.startLiveDrawing('test-user', `drawing-${i}`);
      realTimeCollaborationService.endLiveDrawing('test-user');
    }

    // Should only have exactly 20 events (10 start + 10 end)
    expect(allEvents).toHaveLength(20);

    // Test should complete quickly (no infinite loops)
    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(1000); // Should complete in less than 1 second
  });
});