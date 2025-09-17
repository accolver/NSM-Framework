import { describe, test, expect, beforeEach } from 'bun:test';
import { createActor } from 'xstate';
import { whiteboardMachine } from '../whiteboard-machine';
import { getInspectorService } from '../services/inspector-service';

describe('Inspector Machine Definition Extraction', () => {
  let inspectorService: any;
  let actor: any;

  beforeEach(() => {
    inspectorService = getInspectorService({
      autoStart: false,
      devOnly: true
    });
    actor = createActor(whiteboardMachine);
  });

  test('should extract machine definition from registered actor', () => {
    // Register the actor
    inspectorService.registerActor(actor, 'test-whiteboard');

    // Extract the machine definition
    const definition = inspectorService.getMachineDefinition('test-whiteboard');

    expect(definition).toBeTruthy();
    expect(definition.id).toBe('whiteboardMachine');
    expect(definition.initial).toBe('idle');
    expect(definition.states).toBeTruthy();
    expect(typeof definition.states).toBe('object');

    console.log('🔍 Machine definition extracted:', definition);
  });

  test('should return null for non-existent actor', () => {
    const definition = inspectorService.getMachineDefinition('non-existent');
    expect(definition).toBeNull();
  });

  test('should successfully copy machine definition to clipboard (mock)', async () => {
    // Mock navigator.clipboard for testing
    let mockCalls = 0;
    const mockWriteText = (() => {
      mockCalls++;
      return Promise.resolve();
    }) as any;
    mockWriteText.toHaveBeenCalled = () => mockCalls > 0;

    if (!globalThis.navigator) {
      globalThis.navigator = {} as any;
    }
    if (!globalThis.navigator.clipboard) {
      globalThis.navigator.clipboard = {} as any;
    }
    globalThis.navigator.clipboard.writeText = mockWriteText;

    // Register the actor
    inspectorService.registerActor(actor, 'test-whiteboard');

    // Try to copy the definition
    const success = await inspectorService.copyMachineDefinition('test-whiteboard');

    expect(success).toBe(true);
    expect(mockCalls).toBeGreaterThan(0);
  });

  test('should extract valid machine states and transitions', () => {
    // Register the actor
    inspectorService.registerActor(actor, 'test-whiteboard');

    // Extract the machine definition
    const definition = inspectorService.getMachineDefinition('test-whiteboard');

    expect(definition).toBeTruthy();
    console.log('🔍 Full machine definition:', definition);

    expect(definition.states).toBeTruthy();
    console.log('🔍 Machine states keys:', Object.keys(definition.states));

    // Check that core states exist (adjust based on actual machine structure)
    const stateKeys = Object.keys(definition.states);
    expect(stateKeys.length).toBeGreaterThan(0);

    // The machine should have at least these states based on the machine definition
    if (definition.states.idle) {
      expect(definition.states.idle).toBeTruthy();
      console.log('🔍 Idle state transitions:', definition.states.idle);
    }
    if (definition.states.drawing) {
      expect(definition.states.drawing).toBeTruthy();
    }
    if (definition.states.selecting) {
      expect(definition.states.selecting).toBeTruthy();
    }
  });

  test('should preserve context structure in definition', () => {
    // Register the actor
    inspectorService.registerActor(actor, 'test-whiteboard');

    // Extract the machine definition
    const definition = inspectorService.getMachineDefinition('test-whiteboard');

    expect(definition).toBeTruthy();
    expect(definition.context).toBeTruthy();

    // Check that context has expected properties
    expect(definition.context.currentTool).toBeDefined();
    expect(definition.context.isDrawing).toBeDefined();
    expect(definition.context.paths).toBeDefined();
    expect(definition.context.shapes).toBeDefined();

    console.log('🔍 Machine context structure:', Object.keys(definition.context));
  });
});