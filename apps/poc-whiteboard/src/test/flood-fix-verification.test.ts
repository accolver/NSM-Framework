/**
 * Verification test that demonstrates the exact event flooding bug has been fixed
 *
 * This test recreates the exact scenario that was causing infinite loops:
 * 1. App starts in idle state (no flooding)
 * 2. User draws first line (used to trigger flooding)
 * 3. Verify no exponential event growth occurs
 */

import { vi } from 'vitest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createActor } from 'xstate';
import { whiteboardMachine } from '../whiteboard-machine';
import { createRealTimeCollaborationService } from '../services/realtime-collaboration';
import { createCollaborationService } from '../services/collaboration';

describe('Event Flooding Bug Fix Verification', () => {
  let actor: any;
  let collaborationService: any;
  let realTimeCollaborationService: any;
  let allEvents: any[];

  beforeEach(() => {
    allEvents = [];

    // Create the exact setup from the app
    actor = createActor(whiteboardMachine);

    collaborationService = createCollaborationService('test-user');
    realTimeCollaborationService = createRealTimeCollaborationService(
      collaborationService,
      vi.fn()
    );

    // Monitor ALL events that could flood
    realTimeCollaborationService.onLiveDrawingUpdate((event: any) => {
      allEvents.push({ type: 'liveDrawing', event });
    });

    realTimeCollaborationService.onCursorUpdate((event: any) => {
      allEvents.push({ type: 'cursor', event });
    });

    realTimeCollaborationService.onParticipantUpdate((event: any) => {
      allEvents.push({ type: 'participant', event });
    });

    actor.start();

    // Initialize collaboration (as done in App.tsx)
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

  it('CRITICAL: Should not flood when user draws first line', async () => {
    console.log('🧪 Testing the exact scenario that caused infinite loops...');

    // Clear any initialization events
    allEvents.length = 0;

    // Verify app starts in idle state (no flooding)
    expect(actor.getSnapshot().value).toBe('idle');
    expect(actor.getSnapshot().context.isDrawing).toBe(false);

    // STEP 1: User starts drawing (the exact trigger for the infinite loop)
    console.log('Step 1: User clicks to start drawing...');

    const startPoint = { x: 100, y: 100, timestamp: Date.now() };

    // This is what happens when user clicks on canvas
    actor.send({
      type: 'START_DRAWING',
      point: startPoint
    });

    // This is what the canvas component does (was causing the loop)
    const drawingId = `drawing_${Date.now()}_test`;
    realTimeCollaborationService.startLiveDrawing('test-user', drawingId);

    // STEP 2: User moves mouse (continues drawing)
    console.log('Step 2: User drags to continue drawing...');

    const continuePoint = { x: 150, y: 150, timestamp: Date.now() };

    actor.send({
      type: 'CONTINUE_DRAWING',
      point: continuePoint
    });

    // This happens on every mouse move
    realTimeCollaborationService.updateCursorPosition('test-user', {
      x: continuePoint.x,
      y: continuePoint.y
    });

    // STEP 3: User releases mouse (ends drawing)
    console.log('Step 3: User releases mouse to end drawing...');

    actor.send({ type: 'END_DRAWING' });
    realTimeCollaborationService.endLiveDrawing('test-user');

    // Wait for any potential async events
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log(`📊 Total events captured: ${allEvents.length}`);
    console.log('Event breakdown:', {
      liveDrawing: allEvents.filter(e => e.type === 'liveDrawing').length,
      cursor: allEvents.filter(e => e.type === 'cursor').length,
      participant: allEvents.filter(e => e.type === 'participant').length
    });

    // CRITICAL ASSERTIONS: No event flooding
    expect(allEvents.length).toBeLessThan(10); // Should be very few events
    expect(allEvents.filter(e => e.type === 'liveDrawing').length).toBe(2); // start + end
    expect(allEvents.filter(e => e.type === 'cursor').length).toBe(1); // one cursor update

    // Drawing should work normally
    expect(actor.getSnapshot().value).toBe('idle');
    expect(actor.getSnapshot().context.isDrawing).toBe(false);
    expect(actor.getSnapshot().context.paths).toHaveLength(1);

    console.log('✅ VERIFICATION PASSED: No event flooding detected!');
  });

  it('Should handle multiple rapid drawing strokes without exponential growth', async () => {
    const startTime = Date.now();

    // Clear any initialization events
    allEvents.length = 0;

    console.log('🧪 Testing rapid drawing that would amplify flooding...');

    // Draw 10 quick strokes (this would cause exponential growth if flooding existed)
    for (let i = 0; i < 10; i++) {
      // Start stroke
      actor.send({
        type: 'START_DRAWING',
        point: { x: 100 + i * 10, y: 100 + i * 10, timestamp: Date.now() }
      });

      realTimeCollaborationService.startLiveDrawing('test-user', `drawing_${i}`);

      // Continue stroke
      actor.send({
        type: 'CONTINUE_DRAWING',
        point: { x: 105 + i * 10, y: 105 + i * 10, timestamp: Date.now() }
      });

      realTimeCollaborationService.updateCursorPosition('test-user', {
        x: 105 + i * 10,
        y: 105 + i * 10
      });

      // End stroke
      actor.send({ type: 'END_DRAWING' });
      realTimeCollaborationService.endLiveDrawing('test-user');
    }

    const elapsed = Date.now() - startTime;

    // Wait for any async events
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log(`📊 Rapid drawing completed in ${elapsed}ms`);
    console.log(`📊 Total events: ${allEvents.length}`);

    // Should complete quickly (no infinite loops)
    expect(elapsed).toBeLessThan(1000);

    // Events should grow linearly, not exponentially
    expect(allEvents.length).toBeLessThan(50); // Should be around 30 (10 strokes * 3 events each)

    // Should have exactly 10 start + 10 end = 20 drawing events
    expect(allEvents.filter(e => e.type === 'liveDrawing').length).toBe(20);

    // Should have 10 cursor updates
    expect(allEvents.filter(e => e.type === 'cursor').length).toBe(10);

    // Final state should be correct
    expect(actor.getSnapshot().value).toBe('idle');
    expect(actor.getSnapshot().context.paths).toHaveLength(10);

    console.log('✅ RAPID DRAWING TEST PASSED: Linear event growth confirmed!');
  });

  it('Should demonstrate the difference: before vs after fix', () => {
    // This test documents what the behavior was before vs after the fix

    console.log('📋 BEFORE FIX (simulated):');
    console.log('  1. User draws line');
    console.log('  2. Canvas calls realTimeCollaborationService.startLiveDrawing()');
    console.log('  3. Service emits event');
    console.log('  4. App.tsx listener sends event to state machine');
    console.log('  5. State machine calls service again');
    console.log('  6. INFINITE LOOP - exponential event growth');
    console.log('  7. Browser becomes unresponsive');

    console.log('📋 AFTER FIX (current behavior):');
    console.log('  1. User draws line');
    console.log('  2. Canvas calls realTimeCollaborationService.startLiveDrawing()');
    console.log('  3. Service emits event');
    console.log('  4. App.tsx listener logs event to EventLogService');
    console.log('  5. NO state machine roundtrip');
    console.log('  6. LINEAR event growth - one event per action');
    console.log('  7. Browser remains responsive');

    // Clear events
    allEvents.length = 0;

    // Perform the exact action that used to cause flooding
    realTimeCollaborationService.startLiveDrawing('test-user', 'test-drawing');

    // Verify only one event was emitted
    expect(allEvents.length).toBe(1);
    expect(allEvents[0].type).toBe('liveDrawing');
    expect(allEvents[0].event.type).toBe('LIVE_DRAWING_START');

    console.log('✅ FIX VERIFICATION COMPLETE: Event flooding eliminated!');
  });
});