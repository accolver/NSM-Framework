import type { AnyActor, Snapshot } from 'xstate';

/**
 * Configuration for Time Travel Service
 */
export interface TimeTravelConfig {
  /** Maximum number of snapshots to store in memory */
  maxSnapshots?: number;
  /** Whether to enable real-time snapshot updates */
  enableRealtime?: boolean;
  /** Whether to automatically capture snapshots on transitions */
  autoCapture?: boolean;
  /** Whether to enable time travel debugging in development only */
  devOnly?: boolean;
}

/**
 * Represents a captured state snapshot with metadata
 */
export interface StateSnapshot {
  /** Unique identifier for the snapshot */
  id: string;
  /** XState snapshot */
  state: Snapshot<unknown>;
  /** Context at the time of snapshot */
  context: any;
  /** Event that caused this transition (null for initial state) */
  event: any | null;
  /** Actor name this snapshot belongs to */
  actorName: string;
  /** Timestamp when snapshot was captured */
  timestamp: number;
  /** Index in the snapshot history */
  index: number;
}

/**
 * Time travel event record for history tracking
 */
export interface TimeTravelEvent {
  /** Event that was sent to the actor */
  event: any;
  /** Timestamp when event was processed */
  timestamp: number;
  /** Snapshot index after this event was processed */
  snapshotIndex: number;
  /** Actor name */
  actorName: string;
}

/**
 * State comparison result between two snapshots
 */
export interface StateComparison {
  /** Before snapshot */
  before: StateSnapshot;
  /** After snapshot */
  after: StateSnapshot;
  /** List of context keys that changed */
  differences: string[];
  /** Detailed diff of changes */
  contextDiff: {
    added: Record<string, any>;
    removed: Record<string, any>;
    modified: Record<string, { from: any; to: any }>;
  };
}

/**
 * Time Travel Service for XState debugging and state replay
 */
export interface TimeTravelService {
  /** Check if service is connected */
  readonly isConnected: boolean;

  /** Connect to start capturing snapshots */
  connect(): boolean;

  /** Disconnect and stop capturing */
  disconnect(): void;

  /** Register an actor for time travel debugging */
  registerActor(actor: AnyActor, name: string): boolean;

  /** Unregister an actor */
  unregisterActor(name: string): boolean;

  /** Get all captured snapshots */
  getSnapshots(): StateSnapshot[];

  /** Get snapshots for specific actor */
  getSnapshotsForActor(actorName: string): StateSnapshot[];

  /** Get current snapshot index */
  getCurrentSnapshotIndex(): number;

  /** Replay state to specific snapshot index */
  replayToSnapshot(index: number): boolean;

  /** Step backward in time (one snapshot) */
  stepBackward(): boolean;

  /** Step forward in time (one snapshot) */
  stepForward(): boolean;

  /** Check if currently in time travel mode */
  isTimeTraveling(): boolean;

  /** Resume normal execution after time travel */
  resumeExecution(): void;

  /** Compare two snapshots */
  compareSnapshots(beforeIndex: number, afterIndex: number): StateComparison | null;

  /** Get event history */
  getEventHistory(): TimeTravelEvent[];

  /** Clear all history and snapshots */
  clearHistory(): void;

  /** Manually capture current state snapshot */
  captureSnapshot(actorName?: string): StateSnapshot | null;

  /** Subscribe to snapshot captures */
  onSnapshotCapture(callback: (snapshot: StateSnapshot) => void): () => void;

  /** Subscribe to time travel events */
  onTimeTravel(callback: (fromIndex: number, toIndex: number) => void): () => void;
}

/**
 * Implementation of TimeTravelService
 */
class TimeTravelServiceImpl implements TimeTravelService {
  private connected = false;
  private config: Required<TimeTravelConfig>;
  private actors = new Map<string, AnyActor>();
  private snapshots: StateSnapshot[] = [];
  private eventHistory: TimeTravelEvent[] = [];
  private currentSnapshotIndex = -1;
  private isInTimeTravelMode = false;
  private snapshotId = 0;

  // Event listeners
  private snapshotListeners: Set<(snapshot: StateSnapshot) => void> = new Set();
  private timeTravelListeners: Set<(fromIndex: number, toIndex: number) => void> = new Set();

  constructor(config: TimeTravelConfig = {}) {
    this.config = {
      maxSnapshots: 1000,
      enableRealtime: true,
      autoCapture: true,
      devOnly: true,
      ...config
    };

    // Skip in production if configured
    if (this.config.devOnly && process.env.NODE_ENV === 'production') {
      console.log('🕰️ TimeTravelService disabled in production');
      return;
    }
  }

  get isConnected(): boolean {
    return this.connected;
  }

  connect(): boolean {
    if (this.config.devOnly && process.env.NODE_ENV === 'production') {
      return false;
    }

    this.connected = true;
    console.log('🕰️ TimeTravelService connected');
    return true;
  }

  disconnect(): void {
    this.connected = false;
    this.actors.clear();
    this.snapshots = [];
    this.eventHistory = [];
    this.currentSnapshotIndex = -1;
    this.isInTimeTravelMode = false;
    this.snapshotListeners.clear();
    this.timeTravelListeners.clear();
    console.log('🕰️ TimeTravelService disconnected');
  }

  registerActor(actor: AnyActor, name: string): boolean {
    if (!this.connected) {
      console.warn('🕰️ Cannot register actor: TimeTravelService not connected');
      return false;
    }

    this.actors.set(name, actor);

    // Capture initial snapshot
    const initialSnapshot = this.createSnapshot(actor, name, null);
    this.addSnapshot(initialSnapshot);

    // Subscribe to state transitions if auto-capture is enabled
    if (this.config.autoCapture) {
      // Track the last event sent to the actor
      const originalSend = actor.send.bind(actor);
      (actor as any).send = (event: any) => {
        const eventCopy = JSON.parse(JSON.stringify(event)); // Deep copy the event
        const result = originalSend(event);

        // Capture snapshot after the event is processed, but not during time travel
        if (!this.isInTimeTravelMode) {
          // Use setTimeout to capture the snapshot after the actor processes the event
          setTimeout(() => {
            const stateSnapshot = this.createSnapshot(actor, name, eventCopy);
            this.addSnapshot(stateSnapshot);
          }, 0);
        }

        return result;
      };

      // Store the original send function for cleanup
      (actor as any)._originalSend = originalSend;
    }

    console.log(`🕰️ Actor registered for time travel: ${name}`);
    return true;
  }

  unregisterActor(name: string): boolean {
    const actor = this.actors.get(name);
    if (!actor) {
      return false;
    }

    // Restore original send function if we modified it
    const originalSend = (actor as any)._originalSend;
    if (originalSend) {
      (actor as any).send = originalSend;
      delete (actor as any)._originalSend;
    }

    this.actors.delete(name);
    console.log(`🕰️ Actor unregistered: ${name}`);
    return true;
  }

  getSnapshots(): StateSnapshot[] {
    return [...this.snapshots];
  }

  getSnapshotsForActor(actorName: string): StateSnapshot[] {
    return this.snapshots.filter(snapshot => snapshot.actorName === actorName);
  }

  getCurrentSnapshotIndex(): number {
    return this.currentSnapshotIndex;
  }

  replayToSnapshot(index: number): boolean {
    if (index < 0 || index >= this.snapshots.length) {
      return false;
    }

    const fromIndex = this.currentSnapshotIndex;
    this.currentSnapshotIndex = index;
    this.isInTimeTravelMode = true;

    // Restore actor state to the snapshot
    const targetSnapshot = this.snapshots[index];
    const actor = this.actors.get(targetSnapshot.actorName);

    if (actor && typeof (actor as any).restoreState === 'function') {
      // This would require custom XState functionality to restore state
      // For now, we simulate it by updating internal tracking
      console.log(`🕰️ Replaying to snapshot ${index} (${targetSnapshot.actorName})`);
    }

    // Notify listeners
    this.timeTravelListeners.forEach(listener => {
      try {
        listener(fromIndex, index);
      } catch (error) {
        console.warn('Error in time travel listener:', error);
      }
    });

    return true;
  }

  stepBackward(): boolean {
    if (this.currentSnapshotIndex <= 0) {
      return false;
    }
    return this.replayToSnapshot(this.currentSnapshotIndex - 1);
  }

  stepForward(): boolean {
    if (this.currentSnapshotIndex >= this.snapshots.length - 1) {
      return false;
    }
    return this.replayToSnapshot(this.currentSnapshotIndex + 1);
  }

  isTimeTraveling(): boolean {
    return this.isInTimeTravelMode;
  }

  resumeExecution(): void {
    this.isInTimeTravelMode = false;
    this.currentSnapshotIndex = this.snapshots.length - 1;
    console.log('🕰️ Resumed normal execution');
  }

  compareSnapshots(beforeIndex: number, afterIndex: number): StateComparison | null {
    const beforeSnapshot = this.snapshots[beforeIndex];
    const afterSnapshot = this.snapshots[afterIndex];

    if (!beforeSnapshot || !afterSnapshot) {
      return null;
    }

    const differences: string[] = [];
    const contextDiff = {
      added: {} as Record<string, any>,
      removed: {} as Record<string, any>,
      modified: {} as Record<string, { from: any; to: any }>
    };

    // Compare contexts (simplified comparison)
    const beforeContext = beforeSnapshot.context || {};
    const afterContext = afterSnapshot.context || {};

    const allKeys = new Set([...Object.keys(beforeContext), ...Object.keys(afterContext)]);

    allKeys.forEach(key => {
      const beforeValue = beforeContext[key];
      const afterValue = afterContext[key];

      if (!(key in beforeContext)) {
        differences.push(key);
        contextDiff.added[key] = afterValue;
      } else if (!(key in afterContext)) {
        differences.push(key);
        contextDiff.removed[key] = beforeValue;
      } else if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
        differences.push(key);
        contextDiff.modified[key] = { from: beforeValue, to: afterValue };
      }
    });

    return {
      before: beforeSnapshot,
      after: afterSnapshot,
      differences,
      contextDiff
    };
  }

  getEventHistory(): TimeTravelEvent[] {
    return [...this.eventHistory];
  }

  clearHistory(): void {
    this.snapshots = [];
    this.eventHistory = [];
    this.currentSnapshotIndex = -1;
    this.isInTimeTravelMode = false;
    console.log('🕰️ History cleared');
  }

  captureSnapshot(actorName?: string): StateSnapshot | null {
    if (!actorName) {
      // Capture snapshots for all registered actors
      const allSnapshots = Array.from(this.actors.entries()).map(([name, actor]) =>
        this.createSnapshot(actor, name, null)
      );
      allSnapshots.forEach(snapshot => this.addSnapshot(snapshot));
      return allSnapshots[0] || null;
    }

    const actor = this.actors.get(actorName);
    if (!actor) {
      return null;
    }

    const snapshot = this.createSnapshot(actor, actorName, null);
    this.addSnapshot(snapshot);
    return snapshot;
  }

  onSnapshotCapture(callback: (snapshot: StateSnapshot) => void): () => void {
    this.snapshotListeners.add(callback);
    return () => {
      this.snapshotListeners.delete(callback);
    };
  }

  onTimeTravel(callback: (fromIndex: number, toIndex: number) => void): () => void {
    this.timeTravelListeners.add(callback);
    return () => {
      this.timeTravelListeners.delete(callback);
    };
  }

  private createSnapshot(actor: AnyActor, actorName: string, event: any): StateSnapshot {
    const snapshot = actor.getSnapshot();
    return {
      id: `snapshot-${++this.snapshotId}`,
      state: snapshot,
      context: snapshot.context,
      event,
      actorName,
      timestamp: Date.now(),
      index: this.snapshots.length
    };
  }

  private addSnapshot(snapshot: StateSnapshot): void {
    // Add snapshot
    this.snapshots.push(snapshot);

    // Update current index if not in time travel mode
    if (!this.isInTimeTravelMode) {
      this.currentSnapshotIndex = this.snapshots.length - 1;
    }

    // Add event to history if this snapshot has an event
    if (snapshot.event) {
      this.eventHistory.push({
        event: snapshot.event,
        timestamp: snapshot.timestamp,
        snapshotIndex: snapshot.index,
        actorName: snapshot.actorName
      });
    }

    // Enforce maxSnapshots limit
    if (this.snapshots.length > this.config.maxSnapshots) {
      const removed = this.snapshots.shift();
      if (removed) {
        // Adjust indices
        this.snapshots.forEach(s => s.index--);
        this.eventHistory.forEach(e => e.snapshotIndex--);
        this.currentSnapshotIndex = Math.max(0, this.currentSnapshotIndex - 1);
      }
    }

    // Notify listeners
    if (this.config.enableRealtime) {
      this.snapshotListeners.forEach(listener => {
        try {
          listener(snapshot);
        } catch (error) {
          console.warn('Error in snapshot listener:', error);
        }
      });
    }
  }
}

/**
 * Create a new TimeTravelService instance
 */
export function createTimeTravelService(config?: TimeTravelConfig): TimeTravelService {
  return new TimeTravelServiceImpl(config);
}

/**
 * Global time travel service instance for easy access
 */
let globalTimeTravelService: TimeTravelService | null = null;

/**
 * Get or create the global time travel service
 */
export function getTimeTravelService(config?: TimeTravelConfig): TimeTravelService {
  if (!globalTimeTravelService) {
    globalTimeTravelService = createTimeTravelService(config);
  }
  return globalTimeTravelService;
}

/**
 * Utility function to quickly enable time travel for an actor
 */
export async function enableTimeTravel(actor: AnyActor, name: string = 'default-actor'): Promise<boolean> {
  const service = getTimeTravelService();

  if (!service.isConnected) {
    const connected = service.connect();
    if (!connected) {
      return false;
    }
  }

  return service.registerActor(actor, name);
}