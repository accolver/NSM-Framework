import { CollaborationService } from './collaboration';

// Types for real-time collaboration features
export interface CursorPosition {
  x: number;
  y: number;
}

export interface SessionParticipant {
  userId: string;
  userName: string;
  joinedAt: Date;
}

export interface CursorUpdateEvent {
  type: 'CURSOR_UPDATE';
  userId: string;
  position: CursorPosition;
}

export interface LiveDrawingEvent {
  type: 'LIVE_DRAWING_START' | 'LIVE_DRAWING_END';
  userId: string;
  drawingId?: string;
}

export interface ParticipantEvent {
  type: 'PARTICIPANT_JOINED' | 'PARTICIPANT_LEFT';
  userId: string;
  userName?: string;
}

export type RealTimeEvent = CursorUpdateEvent | LiveDrawingEvent | ParticipantEvent;

/**
 * RealTimeCollaborationService handles live collaboration features like
 * user cursors, drawing indicators, and session management.
 */
export class RealTimeCollaborationService {
  private collaborationService: CollaborationService;
  private eventCallback: (event: any) => void;

  // State for real-time features
  private remoteCursors = new Map<string, CursorPosition>();
  private activeDrawings = new Map<string, string>(); // userId -> drawingId
  private sessionParticipants = new Map<string, SessionParticipant>();

  // Event listeners
  private cursorUpdateListeners: Array<(event: CursorUpdateEvent) => void> = [];
  private liveDrawingListeners: Array<(event: LiveDrawingEvent) => void> = [];
  private participantListeners: Array<(event: ParticipantEvent) => void> = [];

  constructor(collaborationService: CollaborationService, eventCallback: (event: any) => void) {
    this.collaborationService = collaborationService;
    this.eventCallback = eventCallback;
  }

  // Cursor management
  updateCursorPosition(userId: string, position: CursorPosition): void {
    this.remoteCursors.set(userId, position);

    const event: CursorUpdateEvent = {
      type: 'CURSOR_UPDATE',
      userId,
      position
    };

    this.emitCursorUpdate(event);
  }

  removeCursor(userId: string): void {
    this.remoteCursors.delete(userId);
  }

  getRemoteCursors(): Map<string, CursorPosition> {
    return new Map(this.remoteCursors);
  }

  onCursorUpdate(listener: (event: CursorUpdateEvent) => void): void {
    this.cursorUpdateListeners.push(listener);
  }

  private emitCursorUpdate(event: CursorUpdateEvent): void {
    this.cursorUpdateListeners.forEach(listener => listener(event));
  }

  // Live drawing indicators
  startLiveDrawing(userId: string, drawingId: string): void {
    this.activeDrawings.set(userId, drawingId);

    const event: LiveDrawingEvent = {
      type: 'LIVE_DRAWING_START',
      userId,
      drawingId
    };

    this.emitLiveDrawingUpdate(event);
  }

  endLiveDrawing(userId: string): void {
    this.activeDrawings.delete(userId);

    const event: LiveDrawingEvent = {
      type: 'LIVE_DRAWING_END',
      userId
    };

    this.emitLiveDrawingUpdate(event);
  }

  getActiveDrawings(): Map<string, string> {
    return new Map(this.activeDrawings);
  }

  onLiveDrawingUpdate(listener: (event: LiveDrawingEvent) => void): void {
    this.liveDrawingListeners.push(listener);
  }

  private emitLiveDrawingUpdate(event: LiveDrawingEvent): void {
    this.liveDrawingListeners.forEach(listener => listener(event));
  }

  // Session participant management
  addParticipant(userId: string, userName: string): void {
    const participant: SessionParticipant = {
      userId,
      userName,
      joinedAt: new Date()
    };

    this.sessionParticipants.set(userId, participant);

    const event: ParticipantEvent = {
      type: 'PARTICIPANT_JOINED',
      userId,
      userName
    };

    this.emitParticipantUpdate(event);
  }

  // CRITICAL FIX: Add participant without emitting event (for initial user setup)
  addParticipantSilent(userId: string, userName: string): void {
    const participant: SessionParticipant = {
      userId,
      userName,
      joinedAt: new Date()
    };

    this.sessionParticipants.set(userId, participant);
    // Intentionally do NOT emit participant update to prevent infinite loop
  }

  removeParticipant(userId: string): void {
    const participant = this.sessionParticipants.get(userId);
    this.sessionParticipants.delete(userId);

    if (participant) {
      const event: ParticipantEvent = {
        type: 'PARTICIPANT_LEFT',
        userId,
        userName: participant.userName
      };

      this.emitParticipantUpdate(event);
    }

    // Clean up related state
    this.removeCursor(userId);
    this.endLiveDrawing(userId);
  }

  getSessionParticipants(): Map<string, SessionParticipant> {
    return new Map(this.sessionParticipants);
  }

  onParticipantUpdate(listener: (event: ParticipantEvent) => void): void {
    this.participantListeners.push(listener);
  }

  private emitParticipantUpdate(event: ParticipantEvent): void {
    this.participantListeners.forEach(listener => listener(event));
  }

  // Cleanup
  destroy(): void {
    this.remoteCursors.clear();
    this.activeDrawings.clear();
    this.sessionParticipants.clear();
    this.cursorUpdateListeners.length = 0;
    this.liveDrawingListeners.length = 0;
    this.participantListeners.length = 0;
  }
}

/**
 * Factory function to create a RealTimeCollaborationService instance
 */
export function createRealTimeCollaborationService(
  collaborationService: CollaborationService,
  eventCallback: (event: any) => void
): RealTimeCollaborationService {
  return new RealTimeCollaborationService(collaborationService, eventCallback);
}