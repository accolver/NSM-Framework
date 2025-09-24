/**
 * TDD Tests for XState Function Serialization
 *
 * These tests verify that XState machines with functions (actions, guards, services)
 * can be properly serialized and reconstructed while preserving function logic.
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { createMachine, assign } from 'xstate';
import { serializeMachine, SerializationOptions } from '@nsm/dev-tools';

describe('XState Serialization Tests (TDD - RED Phase)', () => {
  let testMachine: any;

  beforeEach(() => {
    testMachine = createMachine({
      id: 'testMachine',
      initial: 'idle',
      context: {
        count: 0,
        data: 'test'
      },
      states: {
        idle: {
          on: {
            INCREMENT: {
              actions: assign({
                count: ({ context }) => context.count + 1
              })
            },
            VALIDATE: {
              guard: ({ context }) => context.count > 0,
              target: 'valid'
            }
          }
        },
        valid: {
          type: 'final'
        }
      }
    });
  });

  it('should serialize actions with function source code', () => {
    const options: SerializationOptions = {
      preserveFunctionCode: true,
      prettyPrint: true
    };

    const serialized = serializeMachine(testMachine, options);
    const parsed = JSON.parse(serialized);

    // Should contain actual function code, not just "[Function: assign]"
    expect(serialized).toContain('context.count + 1');
    expect(serialized).not.toContain('[Function: assign');
  });

  it('should serialize guards with function source code', () => {
    const options: SerializationOptions = {
      preserveFunctionCode: true,
      prettyPrint: true
    };

    const serialized = serializeMachine(testMachine, options);

    // Should contain actual guard logic
    expect(serialized).toContain('context.count > 0');
    expect(serialized).not.toContain('[Function:');
  });

  it('should reconstruct executable machine from serialized data', () => {
    const options: SerializationOptions = {
      preserveFunctionCode: true,
      prettyPrint: true
    };

    const serialized = serializeMachine(testMachine, options);
    const config = JSON.parse(serialized);

    // Should be able to recreate machine
    const reconstructed = createMachine(config);

    expect(reconstructed.config.id).toBe('testMachine');
    expect(reconstructed.config.initial).toBe('idle');
    expect(reconstructed.config.context.count).toBe(0);
  });

  it('should handle complex nested functions', () => {
    const complexMachine = createMachine({
      id: 'complex',
      initial: 'start',
      context: {
        items: [],
        selectedItem: null
      },
      states: {
        start: {
          on: {
            ADD_ITEM: {
              actions: assign({
                items: ({ context, event }) => [
                  ...context.items,
                  { id: Date.now(), value: event.value }
                ]
              })
            },
            SELECT_ITEM: {
              actions: assign({
                selectedItem: ({ context, event }) =>
                  context.items.find(item => item.id === event.id) || null
              })
            }
          }
        }
      }
    });

    const options: SerializationOptions = {
      preserveFunctionCode: true,
      prettyPrint: true
    };

    const serialized = serializeMachine(complexMachine, options);

    // Should preserve complex function logic
    expect(serialized).toContain('...context.items');
    expect(serialized).toContain('Date.now()');
    expect(serialized).toContain('items.find');
  });

  it('should handle function serialization errors gracefully', () => {
    const machineWithNativeFunctions = createMachine({
      id: 'native',
      initial: 'start',
      states: {
        start: {
          on: {
            TEST: {
              actions: [console.log, Math.random] // Native functions
            }
          }
        }
      }
    });

    const options: SerializationOptions = {
      preserveFunctionCode: true,
      prettyPrint: true
    };

    const serialized = serializeMachine(machineWithNativeFunctions, options);

    // Should handle native functions gracefully
    expect(serialized).toBeDefined();
    expect(() => JSON.parse(serialized)).not.toThrow();
  });

  it('should support different serialization modes', () => {
    const modes = [
      { preserveFunctionCode: true, includeSensitiveData: false },
      { preserveFunctionCode: false, includeSensitiveData: true },
      { preserveFunctionCode: true, includeSensitiveData: true }
    ];

    modes.forEach(mode => {
      expect(() => {
        const serialized = serializeMachine(testMachine, mode);
        JSON.parse(serialized);
      }).not.toThrow();
    });
  });
});