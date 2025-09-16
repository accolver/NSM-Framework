import { describe, it, expect, beforeEach } from 'bun:test';
import { createActor } from 'xstate';
import { whiteboardMachine } from '../whiteboard-machine';

describe('Real-Time Collaboration Integration Tests', () => {
  let actor: any;

  beforeEach(() => {
    actor = createActor(whiteboardMachine);
    actor.start();
  });

  it('should initialize collaboration and real-time services', () => {
    const userId = 'test-user-123';
    const userName = 'Test User';

    // Initialize collaboration
    actor.send({
      type: 'INITIALIZE_COLLABORATION',
      userId,
      userName
    });

    // Initialize real-time collaboration
    actor.send({
      type: 'INITIALIZE_REALTIME_COLLABORATION'
    });

    const state = actor.getSnapshot();

    expect(state.context.collaborationService).not.toBeNull();
    expect(state.context.realTimeCollaborationService).not.toBeNull();
    expect(state.context.userId).toBe(userId);
    expect(state.context.userName).toBe(userName);
  });

  it('should handle remote cursor updates', () => {
    // Initialize services
    actor.send({ type: 'INITIALIZE_COLLABORATION', userId: 'local-user', userName: 'Local' });
    actor.send({ type: 'INITIALIZE_REALTIME_COLLABORATION' });

    // Add a participant
    actor.send({
      type: 'PARTICIPANT_JOINED',
      userId: 'remote-user',
      userName: 'Remote User'
    });

    // Update remote cursor
    actor.send({
      type: 'UPDATE_REMOTE_CURSOR',
      userId: 'remote-user',
      position: { x: 100, y: 200 }
    });

    const state = actor.getSnapshot();
    const rtService = state.context.realTimeCollaborationService;

    expect(rtService).not.toBeNull();

    const cursors = rtService?.getRemoteCursors();
    expect(cursors?.has('remote-user')).toBe(true);
    expect(cursors?.get('remote-user')).toEqual({ x: 100, y: 200 });
  });

  it('should handle live drawing session management', () => {
    // Initialize services
    actor.send({ type: 'INITIALIZE_COLLABORATION', userId: 'local-user', userName: 'Local' });
    actor.send({ type: 'INITIALIZE_REALTIME_COLLABORATION' });

    // Start live drawing
    actor.send({
      type: 'START_LIVE_DRAWING',
      userId: 'artist-user',
      drawingId: 'path-123'
    });

    let state = actor.getSnapshot();
    let rtService = state.context.realTimeCollaborationService;
    let activeDrawings = rtService?.getActiveDrawings();

    expect(activeDrawings?.has('artist-user')).toBe(true);
    expect(activeDrawings?.get('artist-user')).toBe('path-123');

    // End live drawing
    actor.send({
      type: 'END_LIVE_DRAWING',
      userId: 'artist-user'
    });

    state = actor.getSnapshot();
    rtService = state.context.realTimeCollaborationService;
    activeDrawings = rtService?.getActiveDrawings();

    expect(activeDrawings?.has('artist-user')).toBe(false);
  });

  it('should handle participant management', () => {
    // Initialize services
    actor.send({ type: 'INITIALIZE_COLLABORATION', userId: 'local-user', userName: 'Local' });
    actor.send({ type: 'INITIALIZE_REALTIME_COLLABORATION' });

    // Add participants
    actor.send({
      type: 'PARTICIPANT_JOINED',
      userId: 'user1',
      userName: 'Alice'
    });

    actor.send({
      type: 'PARTICIPANT_JOINED',
      userId: 'user2',
      userName: 'Bob'
    });

    let state = actor.getSnapshot();
    let rtService = state.context.realTimeCollaborationService;
    let participants = rtService?.getSessionParticipants();

    expect(participants?.size).toBe(2);
    expect(participants?.get('user1')?.userName).toBe('Alice');
    expect(participants?.get('user2')?.userName).toBe('Bob');

    // Remove participant
    actor.send({
      type: 'PARTICIPANT_LEFT',
      userId: 'user1'
    });

    state = actor.getSnapshot();
    rtService = state.context.realTimeCollaborationService;
    participants = rtService?.getSessionParticipants();

    expect(participants?.size).toBe(1);
    expect(participants?.has('user1')).toBe(false);
    expect(participants?.has('user2')).toBe(true);
  });

  it('should maintain consistency between collaboration services', () => {
    const userId = 'test-user-456';
    const userName = 'Consistency User';

    // Initialize both services
    actor.send({
      type: 'INITIALIZE_COLLABORATION',
      userId,
      userName
    });

    actor.send({
      type: 'INITIALIZE_REALTIME_COLLABORATION'
    });

    // Join session and add as participant
    actor.send({
      type: 'JOIN_SESSION',
      userId,
      userName
    });

    actor.send({
      type: 'PARTICIPANT_JOINED',
      userId,
      userName
    });

    const state = actor.getSnapshot();

    // Verify both services are initialized
    expect(state.context.collaborationService).not.toBeNull();
    expect(state.context.realTimeCollaborationService).not.toBeNull();

    // Verify user identity consistency
    expect(state.context.userId).toBe(userId);
    expect(state.context.userName).toBe(userName);

    // Verify participant is tracked
    const participants = state.context.realTimeCollaborationService?.getSessionParticipants();
    expect(participants?.has(userId)).toBe(true);
    expect(participants?.get(userId)?.userName).toBe(userName);
  });
});