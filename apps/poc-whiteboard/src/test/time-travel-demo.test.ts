import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createActor } from 'xstate';
import { createWhiteboardMachine, type WhiteboardContext } from '../whiteboard-machine';
import { createTimeTravelService, type TimeTravelService } from '../services/time-travel-service';

describe('Time Travel Demo - Complete Whiteboard Integration', () => {
  let whiteboardActor: any;
  let timeTravelService: TimeTravelService;

  beforeEach(() => {
    // Create realistic whiteboard machine
    const machine = createWhiteboardMachine({
      userId: 'demo-user',
      userName: 'Demo User',
      currentStyle: {
        color: '#000000',
        width: 2,
        opacity: 1,
        fill: 'transparent'
      }
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
    timeTravelService.registerActor(whiteboardActor, 'whiteboard-demo');
  });

  afterEach(() => {
    whiteboardActor?.stop();
    timeTravelService?.disconnect();
  });

  test('should demonstrate complete drawing workflow with time travel', async () => {
    console.log('\n🎨 === Time Travel Demo: Drawing Workflow ===');

    // Initial state
    let snapshots = timeTravelService.getSnapshots();
    console.log(`📸 Initial state captured - ${snapshots.length} snapshots`);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].state.value).toBe('idle');

    // 1. Select brush tool
    console.log('🖌️ Step 1: Select brush tool');
    whiteboardActor.send({ type: 'SELECT_TOOL', tool: 'brush' });
    await new Promise(resolve => setTimeout(resolve, 10));

    snapshots = timeTravelService.getSnapshots();
    console.log(`📸 After tool selection - ${snapshots.length} snapshots`);
    expect(snapshots).toHaveLength(2);
    expect((snapshots[1].context as WhiteboardContext).currentTool).toBe('brush');

    // 2. Change color to red
    console.log('🔴 Step 2: Change color to red');
    whiteboardActor.send({
      type: 'SET_STYLE',
      style: { color: '#FF0000', width: 5 }
    });
    await new Promise(resolve => setTimeout(resolve, 10));

    snapshots = timeTravelService.getSnapshots();
    console.log(`📸 After style change - ${snapshots.length} snapshots`);
    expect(snapshots).toHaveLength(3);
    expect((snapshots[2].context as WhiteboardContext).currentStyle.color).toBe('#FF0000');

    // 3. Start drawing
    console.log('✏️ Step 3: Start drawing');
    whiteboardActor.send({
      type: 'START_DRAWING',
      point: { x: 100, y: 100, timestamp: Date.now() }
    });
    await new Promise(resolve => setTimeout(resolve, 10));

    snapshots = timeTravelService.getSnapshots();
    console.log(`📸 After start drawing - ${snapshots.length} snapshots`);
    expect(snapshots).toHaveLength(4);
    expect(snapshots[3].state.value).toBe('drawing');

    // 4. Continue drawing
    console.log('➡️ Step 4: Continue drawing');
    whiteboardActor.send({
      type: 'CONTINUE_DRAWING',
      point: { x: 150, y: 120, timestamp: Date.now() }
    });
    await new Promise(resolve => setTimeout(resolve, 10));

    snapshots = timeTravelService.getSnapshots();
    console.log(`📸 After continue drawing - ${snapshots.length} snapshots`);
    expect(snapshots).toHaveLength(5);

    // 5. End drawing
    console.log('🏁 Step 5: End drawing');
    whiteboardActor.send({ type: 'END_DRAWING' });
    await new Promise(resolve => setTimeout(resolve, 10));

    snapshots = timeTravelService.getSnapshots();
    const finalContext = snapshots[5].context as WhiteboardContext;
    console.log(`📸 After end drawing - ${snapshots.length} snapshots`);
    console.log(`🎨 Paths created: ${finalContext.paths.length}`);
    expect(snapshots).toHaveLength(6);
    expect(snapshots[5].state.value).toBe('idle');
    expect(finalContext.paths).toHaveLength(1);

    // === TIME TRAVEL DEMONSTRATION ===
    console.log('\n🕰️ === Time Travel Demo: History Navigation ===');

    // Go back to before drawing started
    console.log('⏪ Going back to before drawing (snapshot 2)');
    timeTravelService.replayToSnapshot(2);
    expect(timeTravelService.getCurrentSnapshotIndex()).toBe(2);
    expect(timeTravelService.isTimeTraveling()).toBe(true);

    const preDrawingSnapshot = snapshots[2];
    console.log(`📍 At snapshot 2: State=${preDrawingSnapshot.state.value}, Tool=${(preDrawingSnapshot.context as WhiteboardContext).currentTool}, Color=${(preDrawingSnapshot.context as WhiteboardContext).currentStyle.color}`);

    // Step forward through drawing process
    console.log('⏩ Step forward to start drawing');
    timeTravelService.stepForward();
    expect(timeTravelService.getCurrentSnapshotIndex()).toBe(3);

    console.log('⏩ Step forward again');
    timeTravelService.stepForward();
    expect(timeTravelService.getCurrentSnapshotIndex()).toBe(4);

    // Resume normal execution
    console.log('▶️ Resume normal execution');
    timeTravelService.resumeExecution();
    expect(timeTravelService.isTimeTraveling()).toBe(false);
    expect(timeTravelService.getCurrentSnapshotIndex()).toBe(5);

    // === STATE COMPARISON DEMONSTRATION ===
    console.log('\n🔍 === State Comparison Demo ===');

    const comparison = timeTravelService.compareSnapshots(1, 5);
    expect(comparison).toBeDefined();
    console.log(`🔄 Comparing snapshot 1 (${comparison!.before.event?.type || 'INITIAL'}) to snapshot 5 (${comparison!.after.event?.type || 'UNKNOWN'})`);
    console.log(`📊 Found ${comparison!.differences.length} differences: [${comparison!.differences.join(', ')}]`);

    // Should show differences in paths, state, etc.
    expect(comparison!.differences.length).toBeGreaterThan(0);
    if (comparison!.differences.includes('paths')) {
      console.log('✅ Paths difference detected (drawing was captured)');
    }

    // === EVENT HISTORY DEMONSTRATION ===
    console.log('\n📜 === Event History Demo ===');

    const eventHistory = timeTravelService.getEventHistory();
    console.log(`📚 Total events captured: ${eventHistory.length}`);

    eventHistory.forEach((event, index) => {
      const timestamp = new Date(event.timestamp).toLocaleTimeString();
      console.log(`  ${index + 1}. [${timestamp}] ${event.event.type} → Snapshot #${event.snapshotIndex}`);
    });

    expect(eventHistory).toHaveLength(5); // All events except initial
    expect(eventHistory.map(e => e.event.type)).toEqual([
      'SELECT_TOOL',
      'SET_STYLE',
      'START_DRAWING',
      'CONTINUE_DRAWING',
      'END_DRAWING'
    ]);

    console.log('\n✅ === Demo Complete: All time travel features working! ===\n');
  });

  test('should handle complex multi-tool workflow with undo/redo', async () => {
    console.log('\n🛠️ === Complex Workflow Demo ===');

    // Create a complex drawing workflow
    const workflow = [
      { type: 'SELECT_TOOL', tool: 'pen', desc: 'Select pen' },
      { type: 'SET_STYLE', style: { color: '#0000FF', width: 1 }, desc: 'Blue, thin' },
      { type: 'START_DRAWING', point: { x: 50, y: 50, timestamp: Date.now() }, desc: 'Start line 1' },
      { type: 'END_DRAWING', desc: 'End line 1' },
      { type: 'SELECT_TOOL', tool: 'brush', desc: 'Select brush' },
      { type: 'SET_STYLE', style: { color: '#FF0000', width: 8 }, desc: 'Red, thick' },
      { type: 'START_DRAWING', point: { x: 100, y: 100, timestamp: Date.now() }, desc: 'Start stroke' },
      { type: 'END_DRAWING', desc: 'End stroke' },
      { type: 'SELECT_TOOL', tool: 'shape', desc: 'Select shape tool' },
      { type: 'SELECT_SHAPE', shapeType: 'circle', desc: 'Select circle' },
      { type: 'SET_STYLE', style: { color: '#00FF00', width: 3 }, desc: 'Green, medium' },
      { type: 'START_DRAWING', point: { x: 200, y: 150, timestamp: Date.now() }, desc: 'Start circle' },
      { type: 'END_DRAWING', desc: 'End circle' }
    ];

    // Execute workflow
    for (const [index, step] of workflow.entries()) {
      console.log(`📝 ${index + 1}. ${step.desc}`);
      whiteboardActor.send(step);
      await new Promise(resolve => setTimeout(resolve, 5));
    }

    // Verify all steps were captured
    const finalSnapshots = timeTravelService.getSnapshots();
    console.log(`📸 Total snapshots captured: ${finalSnapshots.length}`);
    expect(finalSnapshots.length).toBe(workflow.length + 1); // +1 for initial

    // Test time travel navigation
    console.log('\n🕰️ Time travel to middle of workflow');
    const midPoint = Math.floor(workflow.length / 2);
    timeTravelService.replayToSnapshot(midPoint);
    expect(timeTravelService.getCurrentSnapshotIndex()).toBe(midPoint);

    // Verify we can see the state at that point
    const midSnapshot = finalSnapshots[midPoint];
    console.log(`📍 At mid-point: Tool=${(midSnapshot.context as WhiteboardContext).currentTool}, State=${midSnapshot.state.value}`);

    // Jump to different points rapidly
    console.log('⚡ Rapid time jumps');
    for (let i = 0; i < 5; i++) {
      const randomIndex = Math.floor(Math.random() * finalSnapshots.length);
      timeTravelService.replayToSnapshot(randomIndex);
      expect(timeTravelService.getCurrentSnapshotIndex()).toBe(randomIndex);
    }

    // Test state comparison across the workflow
    const earlyVsLate = timeTravelService.compareSnapshots(2, finalSnapshots.length - 1);
    console.log(`🔍 Early vs Late comparison: ${earlyVsLate!.differences.length} differences`);
    expect(earlyVsLate!.differences.length).toBeGreaterThan(0);

    console.log('✅ Complex workflow demo complete!');
  });
});