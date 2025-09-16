import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createActor } from 'xstate';
import { createWhiteboardMachine } from '../whiteboard-machine';
import { createTimeTravelService, type TimeTravelService } from '../services/time-travel-service';

describe('Time Travel Integration', () => {
  let whiteboardActor: any;
  let timeTravelService: TimeTravelService;

  beforeEach(() => {
    // Create whiteboard machine actor for testing
    const machine = createWhiteboardMachine({
      userId: 'test-user',
      userName: 'Test User'
    });
    whiteboardActor = createActor(machine);
    whiteboardActor.start();

    // Create time travel service
    timeTravelService = createTimeTravelService({
      maxSnapshots: 50,
      enableRealtime: true,
      autoCapture: true,
      devOnly: false
    });

    timeTravelService.connect();
    timeTravelService.registerActor(whiteboardActor, 'whiteboard');
  });

  afterEach(() => {
    whiteboardActor?.stop();
    timeTravelService?.disconnect();
  });

  test('should integrate with XState actor for complete time travel flow', async () => {
    // Initial state should be captured
    expect(timeTravelService.getSnapshots()).toHaveLength(1);
    expect(timeTravelService.getCurrentSnapshotIndex()).toBe(0);
    expect(timeTravelService.isTimeTraveling()).toBe(false);

    // Trigger state transitions
    whiteboardActor.send({ type: 'SELECT_TOOL', tool: 'brush' });
    whiteboardActor.send({ type: 'SELECT_SHAPE', shapeType: 'circle' });
    whiteboardActor.send({
      type: 'SET_STYLE',
      style: { color: '#FF0000', width: 5 }
    });

    // Wait for async snapshot captures
    await new Promise(resolve => setTimeout(resolve, 50));

    // Should have captured all transitions
    const snapshots = timeTravelService.getSnapshots();
    expect(snapshots).toHaveLength(4); // initial + 3 events

    // Verify event types are captured correctly
    const eventHistory = timeTravelService.getEventHistory();
    expect(eventHistory).toHaveLength(3);
    expect(eventHistory.map(e => e.event.type)).toEqual([
      'SELECT_TOOL',
      'SELECT_SHAPE',
      'SET_STYLE'
    ]);

    // Test time travel navigation
    expect(timeTravelService.getCurrentSnapshotIndex()).toBe(3);

    // Step backward
    const stepped = timeTravelService.stepBackward();
    expect(stepped).toBe(true);
    expect(timeTravelService.getCurrentSnapshotIndex()).toBe(2);
    expect(timeTravelService.isTimeTraveling()).toBe(true);

    // Jump to specific snapshot
    const jumped = timeTravelService.replayToSnapshot(1);
    expect(jumped).toBe(true);
    expect(timeTravelService.getCurrentSnapshotIndex()).toBe(1);

    // Resume normal execution
    timeTravelService.resumeExecution();
    expect(timeTravelService.isTimeTraveling()).toBe(false);
    expect(timeTravelService.getCurrentSnapshotIndex()).toBe(3);

    // New events should be captured after resume
    whiteboardActor.send({ type: 'SELECT_TOOL', tool: 'eraser' });
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(timeTravelService.getSnapshots()).toHaveLength(5);
    expect(timeTravelService.getCurrentSnapshotIndex()).toBe(4);
  });

  test('should perform state comparison between snapshots', async () => {
    // Create history with different states
    whiteboardActor.send({ type: 'SELECT_TOOL', tool: 'brush' });
    whiteboardActor.send({
      type: 'SET_STYLE',
      style: { color: '#FF0000', width: 5 }
    });

    // Wait for async snapshot captures
    await new Promise(resolve => setTimeout(resolve, 30));

    const snapshots = timeTravelService.getSnapshots();
    expect(snapshots).toHaveLength(3);

    // Compare first and last snapshots
    const comparison = timeTravelService.compareSnapshots(0, 2);
    expect(comparison).toBeDefined();
    expect(comparison!.differences).toContain('currentTool');
    expect(comparison!.differences).toContain('currentStyle');

    // Check specific changes
    expect(comparison!.before.context.currentTool).toBe('pen');
    expect(comparison!.after.context.currentTool).toBe('brush');
    expect(comparison!.after.context.currentStyle.color).toBe('#FF0000');
  });

  test('should handle multiple actor registration and tracking', async () => {
    // Create second actor
    const machine2 = createWhiteboardMachine({ userId: 'user2' });
    const actor2 = createActor(machine2);
    actor2.start();

    // Register second actor
    timeTravelService.registerActor(actor2, 'whiteboard2');

    // Trigger events on both actors
    whiteboardActor.send({ type: 'SELECT_TOOL', tool: 'brush' });
    actor2.send({ type: 'SELECT_SHAPE', shapeType: 'circle' });

    // Wait for async snapshot captures
    await new Promise(resolve => setTimeout(resolve, 30));

    const snapshots = timeTravelService.getSnapshots();
    expect(snapshots).toHaveLength(4); // 2 initial + 2 events

    // Filter snapshots by actor
    const whiteboard1Snapshots = timeTravelService.getSnapshotsForActor('whiteboard');
    const whiteboard2Snapshots = timeTravelService.getSnapshotsForActor('whiteboard2');

    expect(whiteboard1Snapshots).toHaveLength(2); // initial + tool change
    expect(whiteboard2Snapshots).toHaveLength(2); // initial + shape change

    // Verify events are tracked per actor
    const eventHistory = timeTravelService.getEventHistory();
    expect(eventHistory).toHaveLength(2);
    expect(eventHistory.find(e => e.actorName === 'whiteboard')).toBeDefined();
    expect(eventHistory.find(e => e.actorName === 'whiteboard2')).toBeDefined();

    actor2.stop();
  });

  test('should handle service lifecycle correctly', () => {
    // Test disconnected service
    const disconnectedService = createTimeTravelService({ devOnly: false });
    expect(disconnectedService.isConnected).toBe(false);
    expect(disconnectedService.getSnapshots()).toHaveLength(0);

    // Test connection
    const connected = disconnectedService.connect();
    expect(connected).toBe(true);
    expect(disconnectedService.isConnected).toBe(true);

    // Test actor registration after connection
    const registered = disconnectedService.registerActor(whiteboardActor, 'test');
    expect(registered).toBe(true);
    expect(disconnectedService.getSnapshots()).toHaveLength(1);

    // Test cleanup
    disconnectedService.disconnect();
    expect(disconnectedService.isConnected).toBe(false);
    expect(disconnectedService.getSnapshots()).toHaveLength(0);
  });
});