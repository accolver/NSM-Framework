import { describe, test, expect } from 'bun:test';
import { createActor } from 'xstate';
import { whiteboardMachine } from '../whiteboard-machine';
import { createInspectorService } from '../services/inspector-service';

describe('Simple Inspector Test', () => {
  test('should extract machine definition', () => {
    const inspectorService = createInspectorService({
      autoStart: false,
      devOnly: true
    });

    const actor = createActor(whiteboardMachine);

    // Register the actor (should store it even without connection)
    const registered = inspectorService.registerActor(actor, 'test-machine');
    console.log('🔍 Registration result:', registered);

    // Extract the machine definition
    const definition = inspectorService.getMachineDefinition('test-machine');
    console.log('🔍 Machine definition extracted:', definition);

    if (definition) {
      console.log('🔍 Machine ID:', definition.id);
      console.log('🔍 Initial state:', definition.initial);
      console.log('🔍 States:', Object.keys(definition.states || {}));
      console.log('🔍 Context keys:', Object.keys(definition.context || {}));
    }

    expect(definition).toBeTruthy();
  });
});