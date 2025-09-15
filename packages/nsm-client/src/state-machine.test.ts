import { describe, it, expect, beforeEach } from 'bun:test';
import { NSMStateMachine } from './state-machine';
import { createMachine } from 'xstate';

describe('NSMStateMachine', () => {
  let stateMachine: NSMStateMachine;

  beforeEach(() => {
    stateMachine = new NSMStateMachine();
  });

  describe('machine loading', () => {
    it('should load a valid state machine definition', () => {
      const machineDefinition = {
        id: 'toggle',
        initial: 'inactive',
        states: {
          inactive: {
            on: { TOGGLE: 'active' }
          },
          active: {
            on: { TOGGLE: 'inactive' }
          }
        }
      };

      const machine = stateMachine.loadMachine(machineDefinition);
      expect(machine).toBeDefined();
      expect(machine.id).toBe('toggle');
    });

    it('should validate machine definition structure', () => {
      const invalidDefinition = {
        // Missing required fields
        states: {}
      };

      expect(() => {
        stateMachine.loadMachine(invalidDefinition);
      }).toThrow('Invalid machine definition');
    });

    it('should sanitize machine definition for security', () => {
      const maliciousDefinition = {
        id: 'evil',
        initial: 'idle',
        states: {
          idle: {
            entry: 'eval("malicious code")', // This should be rejected
            on: { START: 'running' }
          },
          running: {}
        }
      };

      expect(() => {
        stateMachine.loadMachine(maliciousDefinition);
      }).toThrow('Unsafe machine definition');
    });
  });

  describe('machine interpretation', () => {
    const simpleMachine = {
      id: 'counter',
      initial: 'idle',
      context: { count: 0 },
      states: {
        idle: {
          on: {
            INCREMENT: {
              target: 'idle',
              actions: ['incrementCount']
            },
            DECREMENT: {
              target: 'idle',
              actions: ['decrementCount']
            }
          }
        }
      }
    };

    it('should create interpreter for machine', () => {
      const machine = stateMachine.loadMachine(simpleMachine);
      const interpreter = stateMachine.interpret(machine, {
        actions: {
          incrementCount: (context: any) => ({ count: context.count + 1 }),
          decrementCount: (context: any) => ({ count: context.count - 1 })
        }
      });

      expect(interpreter).toBeDefined();
      interpreter.start();
      expect(interpreter.getSnapshot().value).toBe('idle');
      interpreter.stop();
    });

    it('should handle state transitions', () => {
      const toggleMachine = {
        id: 'toggle',
        initial: 'off',
        states: {
          off: {
            on: { TOGGLE: 'on' }
          },
          on: {
            on: { TOGGLE: 'off' }
          }
        }
      };

      const machine = stateMachine.loadMachine(toggleMachine);
      const interpreter = stateMachine.interpret(machine);

      interpreter.start();
      expect(interpreter.getSnapshot().value).toBe('off');

      interpreter.send({ type: 'TOGGLE' });
      expect(interpreter.getSnapshot().value).toBe('on');

      interpreter.send({ type: 'TOGGLE' });
      expect(interpreter.getSnapshot().value).toBe('off');

      interpreter.stop();
    });

    it('should handle state transitions with context', () => {
      // Simplified test that just validates transitions work
      const toggleMachine = {
        id: 'toggle',
        initial: 'off',
        context: { toggleCount: 0 },
        states: {
          off: {
            on: { TOGGLE: 'on' }
          },
          on: {
            on: { TOGGLE: 'off' }
          }
        }
      };

      const machine = stateMachine.loadMachine(toggleMachine);
      const interpreter = stateMachine.interpret(machine);

      interpreter.start();

      // Test initial state
      expect(interpreter.getSnapshot().value).toBe('off');
      expect(interpreter.getSnapshot().context).toEqual({ toggleCount: 0 });

      // Test transitions
      interpreter.send({ type: 'TOGGLE' });
      expect(interpreter.getSnapshot().value).toBe('on');

      interpreter.send({ type: 'TOGGLE' });
      expect(interpreter.getSnapshot().value).toBe('off');

      interpreter.stop();
    });
  });

  describe('sandboxed execution', () => {
    it('should execute actions in sandbox', () => {
      const machineWithActions = {
        id: 'secure',
        initial: 'idle',
        states: {
          idle: {
            entry: 'logEntry',
            on: {
              ACTION: {
                target: 'active',
                actions: ['doAction']
              }
            }
          },
          active: {
            exit: 'logExit'
          }
        }
      };

      const machine = stateMachine.loadMachine(machineWithActions);
      const sandbox = stateMachine.createSandbox({
        logEntry: () => console.log('Entry'),
        doAction: () => console.log('Action'),
        logExit: () => console.log('Exit')
      });

      const interpreter = stateMachine.interpret(machine, sandbox);

      // Should not throw errors
      interpreter.start();
      interpreter.send({ type: 'ACTION' });
      interpreter.stop();
    });

    it('should wrap actions in sandbox', async () => {
      const sandbox = stateMachine.createSandbox({
        safeAction: () => {
          // This action should be wrapped
          return 'executed safely';
        }
      });

      const result = await sandbox.actions.safeAction();
      expect(result).toBe('executed safely');
    });

    it('should timeout long-running actions', async () => {
      const sandbox = stateMachine.createSandbox({
        infiniteLoop: () => {
          // Simulate long-running action
          const start = Date.now();
          while (Date.now() - start < 5000) {
            // This should be terminated
          }
        }
      }, { timeout: 100 });

      // Should timeout and not run for 5 seconds
      await expect(sandbox.actions.infiniteLoop()).rejects.toThrow('Action execution timeout');
    });
  });

  describe('state persistence', () => {
    it('should serialize machine state', () => {
      const machine = {
        id: 'persistent',
        initial: 'idle',
        context: { data: 'test' },
        states: {
          idle: {
            on: { START: 'running' }
          },
          running: {
            on: { STOP: 'idle' }
          }
        }
      };

      const loadedMachine = stateMachine.loadMachine(machine);
      const interpreter = stateMachine.interpret(loadedMachine);

      interpreter.start();
      interpreter.send({ type: 'START' });

      const snapshot = stateMachine.serializeState(interpreter);
      expect(snapshot).toBeDefined();
      expect(snapshot.value).toBe('running');
      expect(snapshot.context).toEqual({ data: 'test' });

      interpreter.stop();
    });

    it('should serialize and track machine state', () => {
      const machine = {
        id: 'restorable',
        initial: 'idle',
        context: { counter: 0 },
        states: {
          idle: {
            on: { COUNT: 'counting' }
          },
          counting: {
            on: { DONE: 'idle' }
          }
        }
      };

      const loadedMachine = stateMachine.loadMachine(machine);
      const interpreter = stateMachine.interpret(loadedMachine);

      // Start and track state changes
      interpreter.start();
      expect(interpreter.getSnapshot().value).toBe('idle');

      interpreter.send({ type: 'COUNT' });
      expect(interpreter.getSnapshot().value).toBe('counting');

      // Serialize current state
      const snapshot = stateMachine.serializeState(interpreter);
      expect(snapshot.value).toBe('counting');
      expect(snapshot.context).toEqual({ counter: 0 });

      interpreter.send({ type: 'DONE' });
      expect(interpreter.getSnapshot().value).toBe('idle');

      interpreter.stop();
    });
  });

  describe('security validations', () => {
    it('should reject machines with eval or Function constructor', () => {
      const dangerousMachine = {
        id: 'danger',
        initial: 'idle',
        states: {
          idle: {
            entry: 'eval("alert(1)")'
          }
        }
      };

      expect(() => {
        stateMachine.loadMachine(dangerousMachine);
      }).toThrow('Unsafe machine definition');
    });

    it('should reject machines with __proto__ manipulation', () => {
      const protoMachine = {
        id: 'proto',
        initial: 'idle',
        states: {
          idle: {
            entry: '__proto__.polluted = true'
          }
        }
      };

      expect(() => {
        stateMachine.loadMachine(protoMachine);
      }).toThrow('Unsafe machine definition');
    });

    it('should validate action names are safe', () => {
      const unsafeActionMachine = {
        id: 'unsafe',
        initial: 'idle',
        states: {
          idle: {
            entry: 'constructor.constructor("alert(1)")()'
          }
        }
      };

      expect(() => {
        stateMachine.loadMachine(unsafeActionMachine);
      }).toThrow('Unsafe machine definition');
    });
  });
});