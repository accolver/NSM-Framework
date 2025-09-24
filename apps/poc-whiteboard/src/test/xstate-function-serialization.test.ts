/**
 * TDD Tests for XState Function Serialization
 *
 * These tests verify that XState functions are properly serialized with their source code
 * instead of showing "[Function: assign2]"
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createActor, assign } from 'xstate';
import { serializeMachine } from '@nsm/dev-tools';
import { whiteboardMachine } from '../whiteboard-machine';

describe('XState Function Serialization (TDD)', () => {
  let actor: any;

  beforeEach(() => {
    actor = createActor(whiteboardMachine);
    actor.start();
  });

  it('should serialize assign functions with their source code when preserveFunctionCode is true', () => {
    const serialized = serializeMachine(actor, {
      preserveFunctionCode: true,
      prettyPrint: true
    });

    // Parse the serialized JSON
    const parsed = JSON.parse(serialized);

    // Look for assign functions in the states
    let foundAssignFunction = false;
    let functionHasSource = false;

    function searchForAssignFunctions(obj: any): void {
      if (typeof obj === 'object' && obj !== null) {
        // Look for XState assign functions
        if (obj.__type === 'xstate.assign' && obj.assignment) {
          foundAssignFunction = true;
          // Check if any assignment has function source code
          for (const [key, value] of Object.entries(obj.assignment)) {
            if (typeof value === 'object' && value !== null &&
                (value as any).__type === 'function' && (value as any).source) {
              functionHasSource = true;
              console.log('Found function with source:', { key, name: (value as any).name, source: (value as any).source.substring(0, 100) });
            }
          }
        }

        // Look for direct actions with function source code
        if (obj.__type === 'direct_action' && obj.implementation) {
          foundAssignFunction = true;
          if (typeof obj.implementation === 'object' && obj.implementation.__type === 'function' && obj.implementation.source) {
            functionHasSource = true;
            console.log('Found direct action with source:', { name: obj.name, source: obj.implementation.source.substring(0, 100) });
          }
        }

        for (const value of Object.values(obj)) {
          searchForAssignFunctions(value);
        }
      }
    }

    searchForAssignFunctions(parsed);

    expect(foundAssignFunction).toBe(true);
    expect(functionHasSource).toBe(true);

    // Ensure we don't see the generic "[Function: assign2]" pattern
    expect(serialized).not.toContain('[Function: assign2]');
  });

  it('should show function names when preserveFunctionCode is false', () => {
    const serialized = serializeMachine(actor, {
      preserveFunctionCode: false,
      prettyPrint: true
    });

    // Should contain direct_action types with function names but not source code
    expect(serialized).toContain('"__type": "direct_action"');
    expect(serialized).toContain('"name": "assign"');
    expect(serialized).not.toContain('"source":');
    expect(serialized).not.toContain('"implementation":');
  });

  it('should handle native functions gracefully', () => {
    const serialized = serializeMachine(actor, {
      preserveFunctionCode: true,
      prettyPrint: true
    });

    const parsed = JSON.parse(serialized);

    // Should not crash on native functions
    expect(parsed).toBeDefined();
    expect(typeof parsed).toBe('object');
  });

  it('should preserve function names even when source is not available', () => {
    const serialized = serializeMachine(actor, {
      preserveFunctionCode: true,
      prettyPrint: true
    });

    // Parse and search for function names
    const parsed = JSON.parse(serialized);
    let foundNamedFunction = false;

    function searchForFunctionNames(obj: any): void {
      if (typeof obj === 'object' && obj !== null) {
        if (obj.__type === 'function' && obj.name) {
          foundNamedFunction = true;
          console.log('Found named function:', obj.name);
        }

        for (const value of Object.values(obj)) {
          searchForFunctionNames(value);
        }
      }
    }

    searchForFunctionNames(parsed);

    // Should find at least some named functions
    expect(foundNamedFunction).toBe(true);
  });

  it('should serialize complete whiteboard machine without errors', () => {
    // Initialize the machine with some context
    actor.send({
      type: 'INITIALIZE_COLLABORATION',
      userId: 'test-user',
      userName: 'Test User'
    });

    const serialized = serializeMachine(actor, {
      preserveFunctionCode: true,
      sanitizeCollaboration: true,
      prettyPrint: true
    });

    // Should be valid JSON
    expect(() => JSON.parse(serialized)).not.toThrow();

    const parsed = JSON.parse(serialized);
    expect(parsed.id).toBe('whiteboardMachine');
    expect(parsed.initial).toBe('idle');
    expect(parsed.states).toBeDefined();
    expect(parsed.context).toBeDefined();

    // Should have sanitized collaboration data
    expect(parsed.context.collaborationService).toBeNull();
    expect(parsed.context.userId).toBe('');
  });

  it('should handle drawing actions properly', () => {
    // Start drawing to trigger assign functions
    actor.send({
      type: 'START_DRAWING',
      point: { x: 100, y: 100, timestamp: Date.now() }
    });

    const serialized = serializeMachine(actor, {
      preserveFunctionCode: true,
      prettyPrint: true
    });

    const parsed = JSON.parse(serialized);

    // Should serialize the current state with drawing in progress
    expect(parsed.context.isDrawing).toBe(true);
    expect(parsed.context.currentPath).toBeTruthy();

    // Should contain serialized assign functions for drawing actions
    let hasDrawingActions = false;

    function searchForDrawingActions(obj: any): void {
      if (typeof obj === 'object' && obj !== null) {
        // Look for actions in the drawing state
        if (obj.drawing && obj.drawing.on) {
          hasDrawingActions = true;
        }

        for (const value of Object.values(obj)) {
          searchForDrawingActions(value);
        }
      }
    }

    searchForDrawingActions(parsed);
    expect(hasDrawingActions).toBe(true);
  });
});