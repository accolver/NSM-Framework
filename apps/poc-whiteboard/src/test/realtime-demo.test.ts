import { describe, it, expect } from 'bun:test';
import { createActor } from 'xstate';
import { whiteboardMachine } from '../whiteboard-machine';

describe('Real-Time Collaboration Demo Test', () => {
  it('should demonstrate complete real-time collaboration workflow', () => {
    // Simulate two users collaborating
    const user1Actor = createActor(whiteboardMachine);
    const user2Actor = createActor(whiteboardMachine);

    user1Actor.start();
    user2Actor.start();

    // User 1 joins session
    user1Actor.send({
      type: 'INITIALIZE_COLLABORATION',
      userId: 'user1',
      userName: 'Alice'
    });

    user1Actor.send({
      type: 'INITIALIZE_REALTIME_COLLABORATION'
    });

    user1Actor.send({
      type: 'PARTICIPANT_JOINED',
      userId: 'user1',
      userName: 'Alice'
    });

    // User 2 joins session
    user2Actor.send({
      type: 'INITIALIZE_COLLABORATION',
      userId: 'user2',
      userName: 'Bob'
    });

    user2Actor.send({
      type: 'INITIALIZE_REALTIME_COLLABORATION'
    });

    user2Actor.send({
      type: 'PARTICIPANT_JOINED',
      userId: 'user2',
      userName: 'Bob'
    });

    // Get collaboration services to simulate cross-user communication
    const user1State = user1Actor.getSnapshot();
    const user2State = user2Actor.getSnapshot();
    const user1RtService = user1State.context.realTimeCollaborationService;
    const user2RtService = user2State.context.realTimeCollaborationService;

    // Simulate cross-user communication using service methods
    // User 1 receives notification that User 2 joined
    user1RtService?.addParticipant('user2', 'Bob');

    // User 2 receives notification that User 1 is already there
    user2RtService?.addParticipant('user1', 'Alice');

    // User 1 moves cursor
    user1Actor.send({
      type: 'UPDATE_REMOTE_CURSOR',
      userId: 'user1',
      position: { x: 150, y: 200 }
    });

    // User 2 starts drawing using service method
    user2RtService?.startLiveDrawing('user2', 'drawing-123');

    // Verify states
    // Both users should have real-time collaboration initialized
    expect(user1State.context.realTimeCollaborationService).not.toBeNull();
    expect(user2State.context.realTimeCollaborationService).not.toBeNull();

    // User 1 should see User 2 as participant
    const user1Participants = user1RtService?.getSessionParticipants();
    expect(user1Participants?.has('user2')).toBe(true);
    expect(user1Participants?.get('user2')?.userName).toBe('Bob');

    // User 2 should see User 1 as participant
    const user2Participants = user2RtService?.getSessionParticipants();
    expect(user2Participants?.has('user1')).toBe(true);
    expect(user2Participants?.get('user1')?.userName).toBe('Alice');

    // User 1 should see own cursor
    const user1Cursors = user1RtService?.getRemoteCursors();
    expect(user1Cursors?.has('user1')).toBe(true);

    // User 2 should see own active drawing
    const user2Drawings = user2RtService?.getActiveDrawings();
    expect(user2Drawings?.has('user2')).toBe(true);
    expect(user2Drawings?.get('user2')).toBe('drawing-123');

    console.log('✅ Real-time collaboration demo completed successfully!');
    console.log('📊 Features tested:');
    console.log('  - User session management');
    console.log('  - Participant tracking');
    console.log('  - Cursor position updates');
    console.log('  - Live drawing indicators');
    console.log('  - Cross-user communication');
  });
});