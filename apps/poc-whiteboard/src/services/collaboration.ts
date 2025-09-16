import * as Y from 'yjs';
import { DrawingPath, Shape, WhiteboardContext, WhiteboardEvent } from '../whiteboard-machine';

/**
 * CollaborationService handles multi-user state reconciliation using Yjs CRDTs.
 * It provides conflict resolution for simultaneous operations and maintains deterministic ordering.
 */
export class CollaborationService {
  private ydoc: Y.Doc;
  private ypaths: Y.Array<any>;
  private yshapes: Y.Array<any>;
  private ymetadata: Y.Map<any>;
  private eventCallback?: (event: WhiteboardEvent) => void;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
    this.ydoc = new Y.Doc();

    // Initialize CRDT structures for different data types
    this.ypaths = this.ydoc.getArray('paths');
    this.yshapes = this.ydoc.getArray('shapes');
    this.ymetadata = this.ydoc.getMap('metadata');

    // Set up observers for remote changes
    this.setupObservers();
  }

  /**
   * Initialize the collaboration service with a whiteboard context
   */
  public initialize(context: WhiteboardContext): void {
    // Initialize Yjs arrays with existing data if any
    if (context.paths.length > 0 && this.ypaths.length === 0) {
      this.ypaths.insert(0, context.paths.map(path => this.serializePath(path)));
    }

    if (context.shapes.length > 0 && this.yshapes.length === 0) {
      this.yshapes.insert(0, context.shapes.map(shape => this.serializeShape(shape)));
    }

    // Set user metadata
    this.ymetadata.set(`user_${this.userId}`, {
      id: this.userId,
      name: context.userName,
      lastSeen: Date.now()
    });
  }

  /**
   * Set up observers for remote changes from other users
   */
  private setupObservers(): void {
    // Observe paths changes
    this.ypaths.observe((event) => {
      if (this.eventCallback) {
        event.changes.added.forEach((item) => {
          const path = this.deserializePath(item.content.getContent()[0]);
          if (path.userId !== this.userId) {
            this.eventCallback!({
              type: 'RECEIVE_REMOTE_OBJECT',
              object: path
            });
          }
        });

        // Handle deletions via a separate tracking mechanism
        event.changes.deleted.forEach(() => {
          // For deletions, we'll use a different approach with tombstones
          this.handleRemoteDeletions();
        });
      }
    });

    // Observe shapes changes
    this.yshapes.observe((event) => {
      if (this.eventCallback) {
        event.changes.added.forEach((item) => {
          const shape = this.deserializeShape(item.content.getContent()[0]);
          if (shape.userId !== this.userId) {
            this.eventCallback!({
              type: 'RECEIVE_REMOTE_OBJECT',
              object: shape
            });
          }
        });
      }
    });
  }

  /**
   * Handle remote deletions using metadata tracking
   */
  private handleRemoteDeletions(): void {
    // This is a simplified approach - in a real implementation,
    // you'd track deletions more sophisticated way using tombstones
    if (this.eventCallback) {
      // For now, we'll implement a basic deletion reconciliation
      // In practice, you'd maintain a deletion log or use tombstone markers
    }
  }

  /**
   * Set the event callback for receiving remote changes
   */
  public setEventCallback(callback: (event: WhiteboardEvent) => void): void {
    this.eventCallback = callback;
  }

  /**
   * Add a new drawing path with conflict resolution
   */
  public addPath(path: DrawingPath): void {
    const serializedPath = this.serializePath(path);

    // Use transaction for atomic operations
    this.ydoc.transact(() => {
      // Insert with deterministic ordering based on timestamp and userId
      const insertIndex = this.findInsertIndex(this.ypaths, serializedPath);
      this.ypaths.insert(insertIndex, [serializedPath]);
    }, this.userId); // Origin for tracking
  }

  /**
   * Add a new shape with conflict resolution
   */
  public addShape(shape: Shape): void {
    const serializedShape = this.serializeShape(shape);

    this.ydoc.transact(() => {
      const insertIndex = this.findInsertIndex(this.yshapes, serializedShape);
      this.yshapes.insert(insertIndex, [serializedShape]);
    }, this.userId);
  }

  /**
   * Delete objects by their IDs
   */
  public deleteObjects(objectIds: string[]): void {
    this.ydoc.transact(() => {
      // Remove from paths
      for (let i = this.ypaths.length - 1; i >= 0; i--) {
        const item = this.ypaths.get(i);
        if (objectIds.includes(item.id)) {
          this.ypaths.delete(i, 1);
        }
      }

      // Remove from shapes
      for (let i = this.yshapes.length - 1; i >= 0; i--) {
        const item = this.yshapes.get(i);
        if (objectIds.includes(item.id)) {
          this.yshapes.delete(i, 1);
        }
      }
    }, this.userId);
  }

  /**
   * Clear all canvas objects
   */
  public clearCanvas(): void {
    this.ydoc.transact(() => {
      this.ypaths.delete(0, this.ypaths.length);
      this.yshapes.delete(0, this.yshapes.length);
    }, this.userId);
  }

  /**
   * Get current state from CRDT
   */
  public getCurrentState(): { paths: DrawingPath[]; shapes: Shape[] } {
    return {
      paths: this.ypaths.toArray().map(item => this.deserializePath(item)),
      shapes: this.yshapes.toArray().map(item => this.deserializeShape(item))
    };
  }

  /**
   * Find insertion index for deterministic ordering
   * Uses timestamp first, then userId as tiebreaker for deterministic order
   */
  private findInsertIndex(yarray: Y.Array<any>, newItem: any): number {
    const items = yarray.toArray();

    for (let i = 0; i < items.length; i++) {
      const existing = items[i];

      // Primary sort: timestamp
      if (newItem.timestamp < existing.timestamp) {
        return i;
      }

      // Tiebreaker: userId for deterministic ordering
      if (newItem.timestamp === existing.timestamp &&
          newItem.userId < existing.userId) {
        return i;
      }
    }

    return items.length; // Insert at end
  }

  /**
   * Serialize path for CRDT storage
   */
  private serializePath(path: DrawingPath): any {
    return {
      id: path.id,
      tool: path.tool,
      points: path.points,
      style: path.style,
      timestamp: path.timestamp,
      userId: path.userId || this.userId,
      type: 'path'
    };
  }

  /**
   * Deserialize path from CRDT storage
   */
  private deserializePath(serialized: any): DrawingPath {
    return {
      id: serialized.id,
      tool: serialized.tool,
      points: serialized.points,
      style: serialized.style,
      timestamp: serialized.timestamp,
      userId: serialized.userId
    };
  }

  /**
   * Serialize shape for CRDT storage
   */
  private serializeShape(shape: Shape): any {
    return {
      id: shape.id,
      type: shape.type,
      startPoint: shape.startPoint,
      endPoint: shape.endPoint,
      style: shape.style,
      timestamp: shape.timestamp,
      userId: shape.userId || this.userId,
      objectType: 'shape'
    };
  }

  /**
   * Deserialize shape from CRDT storage
   */
  private deserializeShape(serialized: any): Shape {
    return {
      id: serialized.id,
      type: serialized.type,
      startPoint: serialized.startPoint,
      endPoint: serialized.endPoint,
      style: serialized.style,
      timestamp: serialized.timestamp,
      userId: serialized.userId
    };
  }

  /**
   * Get document state as update for synchronization
   */
  public getDocumentUpdate(): Uint8Array {
    return Y.encodeStateAsUpdate(this.ydoc);
  }

  /**
   * Apply remote document update
   */
  public applyDocumentUpdate(update: Uint8Array): void {
    Y.applyUpdate(this.ydoc, update);
  }

  /**
   * Get state vector for efficient syncing
   */
  public getStateVector(): Uint8Array {
    return Y.encodeStateVector(this.ydoc);
  }

  /**
   * Get document changes since a specific state vector
   */
  public getChangesSince(stateVector: Uint8Array): Uint8Array {
    return Y.encodeStateAsUpdate(this.ydoc, stateVector);
  }

  /**
   * Update user cursor position
   */
  public updateCursor(cursor: { x: number; y: number }): void {
    this.ymetadata.set(`cursor_${this.userId}`, {
      x: cursor.x,
      y: cursor.y,
      userId: this.userId,
      timestamp: Date.now()
    });
  }

  /**
   * Get all user cursors
   */
  public getCursors(): Array<{ x: number; y: number; userId: string; timestamp: number }> {
    const cursors: Array<{ x: number; y: number; userId: string; timestamp: number }> = [];

    this.ymetadata.forEach((value, key) => {
      if (key.startsWith('cursor_') && value.userId !== this.userId) {
        cursors.push(value);
      }
    });

    return cursors;
  }

  /**
   * Clean up when component unmounts
   */
  public destroy(): void {
    this.ydoc.destroy();
  }
}

/**
 * Factory function to create a collaboration service
 */
export const createCollaborationService = (userId: string): CollaborationService => {
  return new CollaborationService(userId);
};