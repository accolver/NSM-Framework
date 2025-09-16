import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createActor } from 'xstate';
import { whiteboardMachine } from '../whiteboard-machine';
import {
  InspectorService,
  createInspectorService,
  InspectorConfig,
  getInspectorService,
  inspectActor
} from '../services/inspector-service';

describe('XState Inspector Integration', () => {
  let inspectorService: InspectorService;
  let whiteboardActor: ReturnType<typeof createActor>;

  beforeEach(() => {
    // Create fresh actor for each test
    whiteboardActor = createActor(whiteboardMachine);
  });

  afterEach(async () => {
    if (inspectorService) {
      await inspectorService.disconnect();
    }
    if (whiteboardActor) {
      whiteboardActor.stop();
    }
  });

  describe('InspectorService Creation and Configuration', () => {
    it('should create inspector service with default configuration', () => {
      inspectorService = createInspectorService();

      expect(inspectorService).toBeDefined();
      expect(typeof inspectorService.isConnected).toBe('boolean');
      expect(typeof inspectorService.connect).toBe('function');
      expect(typeof inspectorService.disconnect).toBe('function');
      expect(typeof inspectorService.registerActor).toBe('function');
      expect(typeof inspectorService.unregisterActor).toBe('function');
    });

    it('should create inspector service with custom configuration', () => {
      const config: InspectorConfig = {
        url: 'ws://localhost:8081',
        autoStart: false,
        maxBufferSize: 500,
        devOnly: false
      };

      inspectorService = createInspectorService(config);

      expect(inspectorService).toBeDefined();
      expect(inspectorService.isConnected).toBe(false);
    });

    it('should throw error with invalid URL configuration', () => {
      const invalidConfig = {
        url: 'invalid-url'
      };

      expect(() => createInspectorService(invalidConfig)).toThrow('WebSocket URL');
    });

    it('should throw error with invalid buffer size', () => {
      const invalidConfig = {
        maxBufferSize: -1
      };

      expect(() => createInspectorService(invalidConfig)).toThrow('positive number');
    });

    it('should create service with devOnly flag', () => {
      const config = { devOnly: true };
      inspectorService = createInspectorService(config);

      expect(inspectorService).toBeDefined();
    });
  });

  describe('Inspector Service Methods', () => {
    beforeEach(() => {
      inspectorService = createInspectorService({ autoStart: false, devOnly: false });
    });

    it('should have isConnected property that starts as false', () => {
      expect(inspectorService.isConnected).toBe(false);
    });

    it('should attempt to connect (may fail without real WebSocket server)', async () => {
      // This test verifies the method exists and handles connection gracefully
      const result = await inspectorService.connect();

      // Result should be boolean (true if connection succeeds, false if it fails)
      expect(typeof result).toBe('boolean');
    });

    it('should handle disconnect gracefully even when not connected', async () => {
      // Should not throw when disconnecting without connection
      await expect(inspectorService.disconnect()).resolves.toBeUndefined();
    });

    it('should manage actor registration', () => {
      // Should return false when trying to register without connection
      const registered = inspectorService.registerActor(whiteboardActor, 'test-machine');
      expect(registered).toBe(false);

      // Should return list of registered actors
      const actors = inspectorService.getRegisteredActors();
      expect(Array.isArray(actors)).toBe(true);
    });

    it('should handle actor unregistration', () => {
      const unregistered = inspectorService.unregisterActor('non-existent');
      expect(unregistered).toBe(false);
    });

    it('should return empty list initially', () => {
      const actors = inspectorService.getRegisteredActors();
      expect(actors).toEqual([]);
    });
  });

  describe('Global Inspector Service', () => {
    it('should provide global inspector service', () => {
      const global1 = getInspectorService();
      const global2 = getInspectorService();

      expect(global1).toBeDefined();
      expect(global1).toBe(global2); // Should return same instance
    });

    it('should allow inspecting actor via utility function', async () => {
      const result = await inspectActor(whiteboardActor, 'utility-test');

      // Should return boolean (success/failure of inspection)
      expect(typeof result).toBe('boolean');
    });
  });

  describe('State Machine Integration', () => {
    beforeEach(() => {
      inspectorService = createInspectorService({ autoStart: false, devOnly: false });
    });

    it('should handle state machine lifecycle', async () => {
      whiteboardActor.start();

      // Get initial state
      const initialSnapshot = whiteboardActor.getSnapshot();
      expect(initialSnapshot.value).toBe('idle');

      // Send drawing events
      whiteboardActor.send({
        type: 'START_DRAWING',
        point: { x: 10, y: 20, timestamp: Date.now() }
      });

      const drawingSnapshot = whiteboardActor.getSnapshot();
      expect(drawingSnapshot.value).toBe('drawing');

      whiteboardActor.send({ type: 'END_DRAWING' });

      const endSnapshot = whiteboardActor.getSnapshot();
      expect(endSnapshot.value).toBe('idle');
      expect(endSnapshot.context.paths).toHaveLength(1);

      whiteboardActor.stop();
    });

    it('should handle complex whiteboard operations', async () => {
      whiteboardActor.start();

      // Initialize history with a clear canvas action (creates first history entry)
      whiteboardActor.send({ type: 'CLEAR_CANVAS' });

      // Tool selection
      whiteboardActor.send({ type: 'SELECT_TOOL', tool: 'brush' });

      let snapshot = whiteboardActor.getSnapshot();
      expect(snapshot.context.currentTool).toBe('brush');
      expect(snapshot.context.history).toHaveLength(1); // Should have initial history

      // Style changes
      whiteboardActor.send({
        type: 'SET_STYLE',
        style: { color: '#ff0000', width: 5 }
      });

      snapshot = whiteboardActor.getSnapshot();
      expect(snapshot.context.currentStyle.color).toBe('#ff0000');
      expect(snapshot.context.currentStyle.width).toBe(5);

      // Drawing operations
      whiteboardActor.send({
        type: 'START_DRAWING',
        point: { x: 100, y: 100, timestamp: Date.now() }
      });

      whiteboardActor.send({
        type: 'CONTINUE_DRAWING',
        point: { x: 150, y: 150, timestamp: Date.now() }
      });

      whiteboardActor.send({ type: 'END_DRAWING' });

      snapshot = whiteboardActor.getSnapshot();
      expect(snapshot.context.paths).toHaveLength(1);
      expect(snapshot.context.paths[0].tool).toBe('brush');
      expect(snapshot.context.paths[0].style.color).toBe('#ff0000');
      expect(snapshot.context.history).toHaveLength(2); // Initial clear + drawing action

      // Undo operation (should work since we have history)
      whiteboardActor.send({ type: 'UNDO' });

      snapshot = whiteboardActor.getSnapshot();
      expect(snapshot.context.paths).toHaveLength(0); // Should undo the path
      expect(snapshot.context.historyIndex).toBe(0); // Should be at initial state
    });

    it('should handle shape drawing workflow', async () => {
      whiteboardActor.start();

      // Select shape tool
      whiteboardActor.send({ type: 'SELECT_TOOL', tool: 'shape' });
      whiteboardActor.send({ type: 'SELECT_SHAPE', shapeType: 'rectangle' });

      let snapshot = whiteboardActor.getSnapshot();
      expect(snapshot.context.currentTool).toBe('shape');
      expect(snapshot.context.currentShapeType).toBe('rectangle');

      // Start shaping
      whiteboardActor.send({
        type: 'START_DRAWING',
        point: { x: 50, y: 50, timestamp: Date.now() }
      });

      snapshot = whiteboardActor.getSnapshot();
      expect(snapshot.value).toBe('shaping');

      // Continue shaping
      whiteboardActor.send({
        type: 'CONTINUE_DRAWING',
        point: { x: 150, y: 100, timestamp: Date.now() }
      });

      // End shaping
      whiteboardActor.send({ type: 'END_DRAWING' });

      snapshot = whiteboardActor.getSnapshot();
      expect(snapshot.value).toBe('idle');
      expect(snapshot.context.shapes).toHaveLength(1);
      expect(snapshot.context.shapes[0].type).toBe('rectangle');
    });

    it('should handle collaboration features', async () => {
      whiteboardActor.start();

      const userId = 'test-user-123';
      const userName = 'Test User';

      // Initialize collaboration
      whiteboardActor.send({
        type: 'INITIALIZE_COLLABORATION',
        userId,
        userName
      });

      let snapshot = whiteboardActor.getSnapshot();
      expect(snapshot.context.userId).toBe(userId);
      expect(snapshot.context.userName).toBe(userName);

      // Join session
      whiteboardActor.send({
        type: 'JOIN_SESSION',
        userId,
        userName
      });

      snapshot = whiteboardActor.getSnapshot();
      expect(snapshot.context.userId).toBe(userId);

      // Update cursor position
      whiteboardActor.send({
        type: 'UPDATE_CURSOR',
        userId: 'other-user',
        cursor: { x: 300, y: 300, timestamp: Date.now() }
      });

      snapshot = whiteboardActor.getSnapshot();
      expect(snapshot.context.collaborators).toHaveLength(1);
      expect(snapshot.context.collaborators[0].cursor?.x).toBe(300);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle service creation errors gracefully', () => {
      // Invalid configuration should throw
      expect(() => createInspectorService({ url: 'not-a-websocket' })).toThrow();
    });

    it('should handle production mode correctly', () => {
      // Set NODE_ENV to production temporarily
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        inspectorService = createInspectorService({ devOnly: true });
        expect(inspectorService).toBeDefined();
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should handle multiple disconnect calls', async () => {
      inspectorService = createInspectorService({ autoStart: false });

      await inspectorService.disconnect();
      await expect(inspectorService.disconnect()).resolves.toBeUndefined();
    });

    it('should validate actor registration without connection', () => {
      inspectorService = createInspectorService({ autoStart: false });

      const result = inspectorService.registerActor(whiteboardActor, 'test');
      expect(result).toBe(false);
    });
  });

  describe('Development Workflow Integration', () => {
    it('should support typical development workflow', async () => {
      // Create service for development
      inspectorService = createInspectorService({
        autoStart: false,
        devOnly: false,
        maxBufferSize: 100
      });

      // Start whiteboard application
      whiteboardActor.start();

      // Initialize history with clear canvas to enable undo/redo
      whiteboardActor.send({ type: 'CLEAR_CANVAS' });

      // Simulate user drawing session
      whiteboardActor.send({ type: 'SELECT_TOOL', tool: 'pen' });

      for (let i = 0; i < 5; i++) {
        whiteboardActor.send({
          type: 'START_DRAWING',
          point: { x: i * 10, y: i * 10, timestamp: Date.now() }
        });

        whiteboardActor.send({
          type: 'CONTINUE_DRAWING',
          point: { x: i * 10 + 5, y: i * 10 + 5, timestamp: Date.now() }
        });

        whiteboardActor.send({ type: 'END_DRAWING' });
      }

      // Verify state
      const snapshot = whiteboardActor.getSnapshot();
      expect(snapshot.context.paths).toHaveLength(5);
      expect(snapshot.context.history.length).toBeGreaterThan(1); // Should have multiple history entries

      // Perform some undos
      whiteboardActor.send({ type: 'UNDO' });
      whiteboardActor.send({ type: 'UNDO' });

      const undoSnapshot = whiteboardActor.getSnapshot();
      expect(undoSnapshot.context.paths).toHaveLength(3); // Should have 3 paths after 2 undos
      expect(undoSnapshot.context.historyIndex).toBeLessThan(snapshot.context.historyIndex);

      // Redo
      whiteboardActor.send({ type: 'REDO' });

      const redoSnapshot = whiteboardActor.getSnapshot();
      expect(redoSnapshot.context.paths).toHaveLength(4); // Should have 4 paths after 1 redo
      expect(redoSnapshot.context.historyIndex).toBe(undoSnapshot.context.historyIndex + 1);

      // The inspector service should handle this workflow gracefully
      expect(inspectorService).toBeDefined();
    });
  });
});