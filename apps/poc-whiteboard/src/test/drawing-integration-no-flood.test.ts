/**
 * Integration test to verify drawing works without event flooding
 * This simulates the exact user flow that was causing the infinite loop
 */

import { vi } from 'vitest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createActor } from 'xstate';
import { whiteboardMachine } from '../whiteboard-machine';
import { createRealTimeCollaborationService } from '../services/realtime-collaboration';
import { createCollaborationService } from '../services/collaboration';

describe('Drawing Integration - No Event Flooding', () => {
  let actor: any;
  let collaborationService: any;
  let realTimeCollaborationService: any;
  let eventCounts: { [key: string]: number };

  beforeEach(() => {
    // Reset event counts
    eventCounts = {
      liveDrawingStart: 0,
      liveDrawingEnd: 0,
      cursorUpdate: 0,
      participantUpdate: 0
    };

    // Create actor
    actor = createActor(whiteboardMachine);

    // Mock collaboration services
    collaborationService = createCollaborationService('test-user');

    // Create real-time collaboration service
    realTimeCollaborationService = createRealTimeCollaborationService(
      collaborationService,
      vi.fn()
    );

    // Monitor all event types
    realTimeCollaborationService.onLiveDrawingUpdate((event: any) => {
      if (event.type === 'LIVE_DRAWING_START') {
        eventCounts.liveDrawingStart++;
      } else if (event.type === 'LIVE_DRAWING_END') {
        eventCounts.liveDrawingEnd++;
      }
    });

    realTimeCollaborationService.onCursorUpdate(() => {
      eventCounts.cursorUpdate++;
    });

    realTimeCollaborationService.onParticipantUpdate(() => {
      eventCounts.participantUpdate++;
    });

    actor.start();

    // Initialize services
    actor.send({
      type: 'INITIALIZE_COLLABORATION',
      userId: 'test-user',
      userName: 'Test User'
    });

    actor.send({
      type: 'INITIALIZE_REALTIME_COLLABORATION'
    });

    // Set the collaboration service in context
    const currentState = actor.getSnapshot();
    currentState.context.realTimeCollaborationService = realTimeCollaborationService;
  });

  afterEach(() => {
    actor.stop();
    realTimeCollaborationService.destroy();
  });

  it('should complete a full drawing cycle without event flooding', async () => {
    // Step 1: User starts drawing (this was the trigger for the infinite loop)
    console.log('Step 1: Starting drawing...');

    // Reset counters before the critical operation
    Object.keys(eventCounts).forEach(key => eventCounts[key] = 0);

    // Simulate what happens when user clicks to start drawing
    actor.send({
      type: 'START_DRAWING',
      point: { x: 100, y: 100, timestamp: Date.now() }
    });

    // Simulate what the canvas component does (this was causing the loop)
    const drawingId = `drawing_${Date.now()}_test`;
    realTimeCollaborationService.startLiveDrawing('test-user', drawingId);

    // Verify state machine is in drawing state
    expect(actor.getSnapshot().value).toBe('drawing');
    expect(actor.getSnapshot().context.isDrawing).toBe(true);

    // Step 2: Continue drawing
    console.log('Step 2: Continuing drawing...');
    actor.send({
      type: 'CONTINUE_DRAWING',
      point: { x: 150, y: 150, timestamp: Date.now() }
    });

    // Step 3: Simulate cursor movement (this could also trigger events)
    console.log('Step 3: Moving cursor...');
    realTimeCollaborationService.updateCursorPosition('test-user', { x: 150, y: 150 });

    // Step 4: End drawing
    console.log('Step 4: Ending drawing...');
    actor.send({ type: 'END_DRAWING' });
    realTimeCollaborationService.endLiveDrawing('test-user');

    // Verify final state
    expect(actor.getSnapshot().value).toBe('idle');
    expect(actor.getSnapshot().context.isDrawing).toBe(false);
    expect(actor.getSnapshot().context.paths).toHaveLength(1);

    // Wait a moment to let any async events settle
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify event counts are reasonable (no flooding)
    console.log('Final event counts:', eventCounts);

    expect(eventCounts.liveDrawingStart).toBe(1);
    expect(eventCounts.liveDrawingEnd).toBe(1);
    expect(eventCounts.cursorUpdate).toBe(1);

    // Total events should be very low (no exponential growth)
    const totalEvents = Object.values(eventCounts).reduce((sum, count) => sum + count, 0);
    expect(totalEvents).toBeLessThan(10);
  });

  it('should handle rapid drawing without exponential event growth', async () => {
    const startTime = Date.now();

    // Reset counters
    Object.keys(eventCounts).forEach(key => eventCounts[key] = 0);

    // Simulate rapid drawing strokes (this would amplify flooding if present)
    for (let i = 0; i < 5; i++) {
      // Start drawing
      actor.send({
        type: 'START_DRAWING',
        point: { x: 100 + i * 20, y: 100 + i * 20, timestamp: Date.now() }
      });

      realTimeCollaborationService.startLiveDrawing('test-user', `drawing_${i}`);

      // Continue a few points
      for (let j = 0; j < 3; j++) {
        actor.send({
          type: 'CONTINUE_DRAWING',
          point: { x: 100 + i * 20 + j * 5, y: 100 + i * 20 + j * 5, timestamp: Date.now() }
        });

        realTimeCollaborationService.updateCursorPosition('test-user', {
          x: 100 + i * 20 + j * 5,
          y: 100 + i * 20 + j * 5
        });
      }

      // End drawing
      actor.send({ type: 'END_DRAWING' });
      realTimeCollaborationService.endLiveDrawing('test-user');
    }

    // Wait for any async events
    await new Promise(resolve => setTimeout(resolve, 100));

    const elapsed = Date.now() - startTime;
    console.log(`Rapid drawing test completed in ${elapsed}ms`);
    console.log('Event counts after rapid drawing:', eventCounts);

    // Should complete quickly (no infinite loops)
    expect(elapsed).toBeLessThan(1000);

    // Should have exactly 5 drawing cycles
    expect(eventCounts.liveDrawingStart).toBe(5);
    expect(eventCounts.liveDrawingEnd).toBe(5);

    // Cursor updates should be linear, not exponential
    expect(eventCounts.cursorUpdate).toBe(15); // 3 updates per 5 drawings

    // Final state should be correct
    expect(actor.getSnapshot().value).toBe('idle');
    expect(actor.getSnapshot().context.paths).toHaveLength(5);
  });

  it('should not trigger state machine events from collaboration service events', () => {
    // Track state machine events
    const stateMachineEvents: string[] = [];

    const originalSend = actor.send;
    actor.send = vi.fn((event) => {
      stateMachineEvents.push(event.type);
      return originalSend(event);
    });

    // Reset counters
    Object.keys(eventCounts).forEach(key => eventCounts[key] = 0);

    // Trigger collaboration service events directly
    realTimeCollaborationService.startLiveDrawing('test-user', 'drawing-test');
    realTimeCollaborationService.updateCursorPosition('test-user', { x: 200, y: 200 });
    realTimeCollaborationService.endLiveDrawing('test-user');

    // Add a participant (this used to cause loops too)
    realTimeCollaborationService.addParticipant('other-user', 'Other User');

    // Events should be emitted by collaboration service
    expect(eventCounts.liveDrawingStart).toBe(1);
    expect(eventCounts.liveDrawingEnd).toBe(1);
    expect(eventCounts.cursorUpdate).toBe(1);
    expect(eventCounts.participantUpdate).toBe(1);

    // But NO events should be sent to state machine
    // (originalSend was called initially, but not from collaboration events)
    const collaborationEvents = stateMachineEvents.filter(type =>
      type === 'START_LIVE_DRAWING' ||
      type === 'END_LIVE_DRAWING' ||
      type === 'PARTICIPANT_JOINED'
    );

    expect(collaborationEvents).toHaveLength(0);
  });
});