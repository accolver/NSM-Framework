import { describe, test, expect, beforeEach, afterEach, vi } from 'bun:test';
import { createActor } from 'xstate';
import { createWhiteboardMachine } from '../../whiteboard-machine';
import {
  createTimeTravelService,
  type TimeTravelService,
  type TimeTravelConfig,
  type StateSnapshot,
  type TimeTravelEvent
} from '../time-travel-service';

describe('TimeTravelService', () => {
  let timeTravelService: TimeTravelService;
  let whiteboardActor: any;
  let config: TimeTravelConfig;

  beforeEach(() => {
    // Create whiteboard machine actor for testing
    const machine = createWhiteboardMachine({
      userId: 'test-user',
      userName: 'Test User'
    });
    whiteboardActor = createActor(machine);
    whiteboardActor.start();

    config = {
      maxSnapshots: 100,
      enableRealtime: true,
      autoCapture: true,
      devOnly: false // Disable dev-only mode for testing
    };

    timeTravelService = createTimeTravelService(config);
    timeTravelService.connect(); // Connect the service
  });

  afterEach(() => {
    whiteboardActor?.stop();
    timeTravelService.disconnect();
  });

  describe('State Snapshot Capture', () => {
    test('should capture initial state snapshot when actor is registered', () => {
      timeTravelService.registerActor(whiteboardActor, 'whiteboard');

      const snapshots = timeTravelService.getSnapshots();
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].state.value).toBe('idle');
      expect(snapshots[0].actorName).toBe('whiteboard');
    });

    test('should capture state snapshots on transitions', async () => {
      timeTravelService.registerActor(whiteboardActor, 'whiteboard');

      // Trigger a transition
      whiteboardActor.send({
        type: 'START_DRAWING',
        point: { x: 100, y: 100, timestamp: Date.now() }
      });

      // Wait for async snapshot capture
      await new Promise(resolve => setTimeout(resolve, 10));

      const snapshots = timeTravelService.getSnapshots();
      expect(snapshots).toHaveLength(2);
      expect(snapshots[1].state.value).toBe('drawing');
    });

    test('should store event that caused transition with snapshot', async () => {
      timeTravelService.registerActor(whiteboardActor, 'whiteboard');

      const event = {
        type: 'START_DRAWING' as const,
        point: { x: 100, y: 100, timestamp: Date.now() }
      };
      whiteboardActor.send(event);

      // Wait for async snapshot capture
      await new Promise(resolve => setTimeout(resolve, 10));

      const snapshots = timeTravelService.getSnapshots();
      expect(snapshots[1].event).toEqual(expect.objectContaining({
        type: 'START_DRAWING'
      }));
    });

    test('should respect maxSnapshots limit', async () => {
      const smallConfig = { ...config, maxSnapshots: 3 };
      const service = createTimeTravelService(smallConfig);
      service.connect();

      service.registerActor(whiteboardActor, 'whiteboard');

      // Trigger multiple transitions
      for (let i = 0; i < 5; i++) {
        whiteboardActor.send({
          type: 'SELECT_TOOL',
          tool: i % 2 === 0 ? 'pen' : 'brush'
        });
      }

      // Wait for async snapshot captures
      await new Promise(resolve => setTimeout(resolve, 50));

      const snapshots = service.getSnapshots();
      expect(snapshots).toHaveLength(3);

      service.disconnect();
    });
  });

  describe('Time Travel Navigation', () => {
    test('should replay state to specific snapshot index', async () => {
      timeTravelService.registerActor(whiteboardActor, 'whiteboard');

      // Create some state transitions
      whiteboardActor.send({ type: 'SELECT_TOOL', tool: 'brush' });
      whiteboardActor.send({ type: 'SELECT_SHAPE', shapeType: 'circle' });

      // Wait for async snapshot captures
      await new Promise(resolve => setTimeout(resolve, 20));

      const snapshots = timeTravelService.getSnapshots();
      expect(snapshots).toHaveLength(3);

      // Replay to index 1 (after first tool selection)
      const success = timeTravelService.replayToSnapshot(1);
      expect(success).toBe(true);
      expect(timeTravelService.getCurrentSnapshotIndex()).toBe(1);
    });

    test('should step forward and backward through history', async () => {
      timeTravelService.registerActor(whiteboardActor, 'whiteboard');

      whiteboardActor.send({ type: 'SELECT_TOOL', tool: 'brush' });
      whiteboardActor.send({ type: 'SELECT_SHAPE', shapeType: 'circle' });

      // Wait for async snapshot captures
      await new Promise(resolve => setTimeout(resolve, 20));

      // Start at latest state (index 2)
      expect(timeTravelService.getCurrentSnapshotIndex()).toBe(2);

      // Step backward
      const stepped = timeTravelService.stepBackward();
      expect(stepped).toBe(true);
      expect(timeTravelService.getCurrentSnapshotIndex()).toBe(1);

      // Step forward
      const steppedForward = timeTravelService.stepForward();
      expect(steppedForward).toBe(true);
      expect(timeTravelService.getCurrentSnapshotIndex()).toBe(2);
    });

    test('should not step beyond boundaries', () => {
      timeTravelService.registerActor(whiteboardActor, 'whiteboard');

      // Try to step backward from initial state
      const steppedBack = timeTravelService.stepBackward();
      expect(steppedBack).toBe(false);
      expect(timeTravelService.getCurrentSnapshotIndex()).toBe(0);

      // Try to step forward from latest state
      const steppedForward = timeTravelService.stepForward();
      expect(steppedForward).toBe(false);
      expect(timeTravelService.getCurrentSnapshotIndex()).toBe(0);
    });

    test('should resume normal execution after time travel', async () => {
      timeTravelService.registerActor(whiteboardActor, 'whiteboard');

      whiteboardActor.send({ type: 'SELECT_TOOL', tool: 'brush' });
      whiteboardActor.send({ type: 'SELECT_SHAPE', shapeType: 'circle' });

      // Wait for snapshots
      await new Promise(resolve => setTimeout(resolve, 20));

      // Go back in time
      timeTravelService.replayToSnapshot(1);

      // Resume normal execution
      timeTravelService.resumeExecution();
      expect(timeTravelService.isTimeTraveling()).toBe(false);

      // New transitions should be captured normally
      whiteboardActor.send({ type: 'SELECT_TOOL', tool: 'eraser' });
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(timeTravelService.getCurrentSnapshotIndex()).toBe(3);
    });
  });

  describe('State Comparison', () => {
    test('should compare states between two snapshots', async () => {
      timeTravelService.registerActor(whiteboardActor, 'whiteboard');

      whiteboardActor.send({ type: 'SELECT_TOOL', tool: 'brush' });

      // Wait for async snapshot capture
      await new Promise(resolve => setTimeout(resolve, 10));

      const snapshots = timeTravelService.getSnapshots();
      const comparison = timeTravelService.compareSnapshots(0, 1);

      expect(comparison).toBeDefined();
      expect(comparison.differences).toContain('currentTool');
      expect(comparison.before.context.currentTool).toBe('pen');
      expect(comparison.after.context.currentTool).toBe('brush');
    });

    test('should identify all context differences', async () => {
      timeTravelService.registerActor(whiteboardActor, 'whiteboard');

      whiteboardActor.send({
        type: 'SET_STYLE',
        style: { color: '#FF0000', width: 5 }
      });

      // Wait for async snapshot capture
      await new Promise(resolve => setTimeout(resolve, 10));

      const snapshots = timeTravelService.getSnapshots();
      const comparison = timeTravelService.compareSnapshots(0, 1);

      expect(comparison.differences).toContain('currentStyle');
      expect(comparison.before.context.currentStyle.color).toBe('#000000');
      expect(comparison.after.context.currentStyle.color).toBe('#FF0000');
      expect(comparison.after.context.currentStyle.width).toBe(5);
    });
  });

  describe('Event History Management', () => {
    test('should track all events chronologically', async () => {
      timeTravelService.registerActor(whiteboardActor, 'whiteboard');

      const events = [
        { type: 'SELECT_TOOL' as const, tool: 'brush' as const },
        { type: 'SELECT_SHAPE' as const, shapeType: 'circle' as const },
        { type: 'SET_STYLE' as const, style: { color: '#FF0000' } }
      ];

      events.forEach(event => whiteboardActor.send(event));

      // Wait for async snapshot captures
      await new Promise(resolve => setTimeout(resolve, 30));

      const history = timeTravelService.getEventHistory();
      expect(history).toHaveLength(3);
      expect(history.map(h => h.event.type)).toEqual(['SELECT_TOOL', 'SELECT_SHAPE', 'SET_STYLE']);
    });

    test('should provide event metadata including timestamps', async () => {
      timeTravelService.registerActor(whiteboardActor, 'whiteboard');

      const beforeTime = Date.now();
      whiteboardActor.send({ type: 'SELECT_TOOL', tool: 'brush' });

      // Wait for async snapshot capture
      await new Promise(resolve => setTimeout(resolve, 10));
      const afterTime = Date.now();

      const history = timeTravelService.getEventHistory();
      const eventRecord = history[0];

      expect(eventRecord.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(eventRecord.timestamp).toBeLessThanOrEqual(afterTime);
      expect(eventRecord.snapshotIndex).toBe(1);
    });
  });

  describe('Service Lifecycle', () => {
    test('should start and stop service', () => {
      const newService = createTimeTravelService({ devOnly: false });
      expect(newService.isConnected).toBe(false);

      const connected = newService.connect();
      expect(connected).toBe(true);
      expect(newService.isConnected).toBe(true);

      newService.disconnect();
      expect(newService.isConnected).toBe(false);
    });

    test('should clear history and reset state', async () => {
      timeTravelService.registerActor(whiteboardActor, 'whiteboard');
      whiteboardActor.send({ type: 'SELECT_TOOL', tool: 'brush' });

      // Wait for async snapshot capture
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(timeTravelService.getSnapshots()).toHaveLength(2);

      timeTravelService.clearHistory();
      expect(timeTravelService.getSnapshots()).toHaveLength(0);
      expect(timeTravelService.getCurrentSnapshotIndex()).toBe(-1);
    });

    test('should handle multiple actor registration', async () => {
      const machine2 = createWhiteboardMachine({ userId: 'user2' });
      const actor2 = createActor(machine2);
      actor2.start();

      timeTravelService.registerActor(whiteboardActor, 'whiteboard1');
      timeTravelService.registerActor(actor2, 'whiteboard2');

      whiteboardActor.send({ type: 'SELECT_TOOL', tool: 'brush' });
      actor2.send({ type: 'SELECT_SHAPE', shapeType: 'circle' });

      // Wait for async snapshot captures
      await new Promise(resolve => setTimeout(resolve, 20));

      const snapshots = timeTravelService.getSnapshots();
      const whiteboard1Snapshots = snapshots.filter(s => s.actorName === 'whiteboard1');
      const whiteboard2Snapshots = snapshots.filter(s => s.actorName === 'whiteboard2');

      expect(whiteboard1Snapshots).toHaveLength(2); // initial + tool change
      expect(whiteboard2Snapshots).toHaveLength(2); // initial + shape change

      actor2.stop();
    });
  });
});