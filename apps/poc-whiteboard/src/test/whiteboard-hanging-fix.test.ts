import { describe, test, expect } from 'bun:test';
import { createActor } from 'xstate';
import { whiteboardMachine } from '../whiteboard-machine';

describe('Whiteboard Hanging Fix', () => {
  test('should not hang when creating and starting an actor', () => {
    let isComplete = false;

    // This test verifies that the whiteboard state machine doesn't hang
    // when created and started (the original reported issue)

    const actor = createActor(whiteboardMachine);

    // Start the actor - this should not hang
    actor.start();

    // Verify we can get the initial state
    const initialState = actor.getSnapshot();
    expect(initialState).toBeDefined();
    expect(initialState.value).toBeDefined();

    // Verify we can subscribe to state changes without hanging
    const subscription = actor.subscribe((state) => {
      expect(state).toBeDefined();
    });

    // Send a test event to ensure state transitions work
    actor.send({ type: 'SET_TOOL', tool: 'brush' });

    // Clean up
    subscription.unsubscribe();
    actor.stop();

    isComplete = true;
    expect(isComplete).toBe(true);
  });

  test('should handle rapid state changes without hanging', () => {
    const actor = createActor(whiteboardMachine);
    actor.start();

    let stateChangeCount = 0;
    const subscription = actor.subscribe(() => {
      stateChangeCount++;
    });

    // Rapid state changes that could potentially cause hanging
    for (let i = 0; i < 10; i++) {
      actor.send({ type: 'SET_TOOL', tool: i % 2 === 0 ? 'brush' : 'eraser' });
      actor.send({ type: 'START_DRAWING', x: i * 10, y: i * 10 });
      actor.send({ type: 'STOP_DRAWING' });
    }

    // Should have received multiple state changes
    expect(stateChangeCount).toBeGreaterThan(0);

    subscription.unsubscribe();
    actor.stop();
  });

  test('should properly initialize without infinite loops', () => {
    // Test that creating multiple actors doesn't cause hanging
    const actors = [];

    for (let i = 0; i < 3; i++) {
      const actor = createActor(whiteboardMachine);
      actor.start();
      actors.push(actor);
    }

    // All actors should be in a valid state
    actors.forEach((actor, index) => {
      const state = actor.getSnapshot();
      expect(state).toBeDefined();
      expect(state.value).toBeDefined();
    });

    // Clean up all actors
    actors.forEach(actor => {
      actor.stop();
    });

    expect(actors.length).toBe(3);
  });
});