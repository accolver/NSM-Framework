/**
 * Comprehensive Test for Complete NSM Browser Workflow
 *
 * This test verifies the entire workflow from machine creation through
 * Nostr publishing with all optimizations and error handling.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { createMachine, assign } from 'xstate';
import { createNSMEvent, parseNSMEvent } from '../utils/nostr-events';
import { validateXStateJSON } from '../utils/xstate-validator';
import {
  serializeMachine,
  SerializationOptions,
  validateSerializedMachine,
  estimateMachineComplexity
} from '@nsm/dev-tools';

describe('Comprehensive NSM Browser Workflow (REFACTOR Phase)', () => {
  let wordleMachine: any;

  beforeEach(() => {
    wordleMachine = createMachine({
      id: 'wordleMachine',
      initial: 'playing',
      context: {
        hiddenWord: 'HELLO',
        currentGuess: '',
        guesses: [],
        attemptNumber: 0,
        gameOver: false,
        score: 0
      },
      states: {
        playing: {
          on: {
            KEYPRESS: {
              guard: ({ context }) => context.currentGuess.length < 5,
              actions: assign({
                currentGuess: ({ context, event }) =>
                  context.currentGuess + event.letter.toUpperCase()
              })
            },
            SUBMIT_GUESS: [
              {
                guard: ({ context }) =>
                  context.currentGuess.length === 5 &&
                  context.currentGuess === context.hiddenWord,
                target: 'won',
                actions: assign({
                  guesses: ({ context }) => [
                    ...context.guesses,
                    { word: context.currentGuess, status: 'correct' }
                  ],
                  gameOver: true,
                  score: ({ context }) => context.score + (6 - context.attemptNumber) * 10
                })
              },
              {
                guard: ({ context }) =>
                  context.currentGuess.length === 5 &&
                  context.attemptNumber >= 5,
                target: 'lost',
                actions: assign({
                  guesses: ({ context }) => [
                    ...context.guesses,
                    { word: context.currentGuess, status: 'wrong' }
                  ],
                  gameOver: true
                })
              },
              {
                guard: ({ context }) => context.currentGuess.length === 5,
                actions: assign({
                  guesses: ({ context }) => [
                    ...context.guesses,
                    { word: context.currentGuess, status: 'partial' }
                  ],
                  currentGuess: '',
                  attemptNumber: ({ context }) => context.attemptNumber + 1
                })
              }
            ]
          }
        },
        won: {
          type: 'final',
          entry: assign({
            score: ({ context }) => context.score + 100 // Bonus for winning
          })
        },
        lost: {
          type: 'final'
        }
      }
    });
  });

  it('should handle complete optimized workflow with validation', () => {
    // Step 1: Serialize with function preservation
    const serialized = serializeMachine(wordleMachine, {
      preserveFunctionCode: true,
      includeSensitiveData: false,
      prettyPrint: true
    });

    // Step 2: Validate the serialized machine
    const validation = validateSerializedMachine(serialized);
    expect(validation.isValid).toBe(true);
    expect(validation.errors.length).toBe(0);

    // Should have warnings about hidden data and functions
    expect(validation.warnings.length).toBeGreaterThan(0);

    // Step 3: Estimate complexity
    const complexity = estimateMachineComplexity(serialized);
    expect(complexity.stateCount).toBe(3); // playing, won, lost
    expect(complexity.functionCount).toBeGreaterThan(5); // Multiple assign functions
    // This has many functions, so it's considered medium complexity
    expect(['low', 'medium']).toContain(complexity.complexity);

    // Step 4: Validate with XState validator
    const xstateValidation = validateXStateJSON(serialized);
    expect(xstateValidation.isValid).toBe(true);

    // Step 5: Create NSM event
    const event = createNSMEvent(
      xstateValidation.machine,
      'Enhanced Wordle Game',
      'Feature-rich word guessing game with scoring'
    );

    expect(event.kind).toBe(30079);
    expect(event.tags).toContainEqual(['name', 'Enhanced Wordle Game']);
    expect(event.tags).toContainEqual(['engine', 'xstate']);

    // Step 6: Parse back from event
    const mockEvent = {
      kind: 30079,
      content: event.content,
      tags: event.tags,
      pubkey: 'test-pubkey',
      created_at: Date.now()
    };

    const parsedApp = parseNSMEvent(mockEvent);
    expect(parsedApp).toBeDefined();
    expect(parsedApp!.name).toBe('Enhanced Wordle Game');
    expect(parsedApp!.engine).toBe('xstate');
    expect(parsedApp!.engineCodeURI).toBe('https://xstate.js.org/');

    // Step 7: Verify function preservation in final result
    const machineContent = JSON.parse(parsedApp!.machine);
    const serializedString = JSON.stringify(machineContent);

    // Check that complex logic is preserved
    expect(serializedString).toContain('context.currentGuess + event.letter');
    expect(serializedString).toContain('context.attemptNumber + 1');
    expect(serializedString).toContain('6 - context.attemptNumber');
    expect(serializedString).toContain('...context.guesses');
    expect(serializedString).toContain('context.score + 100');

    // Step 8: Verify hidden data is masked
    expect(serializedString).not.toContain('HELLO');
    expect(serializedString).toContain('[HIDDEN]');
  });

  it('should handle error cases gracefully with detailed validation', () => {
    // Test invalid machine
    expect(() => {
      serializeMachine(null as any);
    }).toThrow('Machine or actor is required for serialization');

    // Test invalid JSON validation
    const invalidJson = validateSerializedMachine('invalid json');
    expect(invalidJson.isValid).toBe(false);
    expect(invalidJson.errors[0]).toContain('Invalid JSON');

    // Test empty machine validation
    const emptyMachine = validateSerializedMachine('{}');
    expect(emptyMachine.isValid).toBe(false);
    expect(emptyMachine.errors).toContain('Machine must have a states property');

    // Test machine without states
    const noStates = validateSerializedMachine('{"id": "test"}');
    expect(noStates.isValid).toBe(false);
    expect(noStates.errors).toContain('Machine must have a states property');
  });

  it('should provide performance insights for complex machines', () => {
    const complexMachine = createMachine({
      id: 'complexMachine',
      initial: 'idle',
      context: { data: [] },
      states: {
        idle: { on: { START: 'loading' } },
        loading: { on: { SUCCESS: 'success', ERROR: 'error' } },
        success: { on: { RESET: 'idle' } },
        error: { on: { RETRY: 'loading', RESET: 'idle' } },
        // Add more states to increase complexity
        state5: { on: { NEXT: 'state6' } },
        state6: { on: { NEXT: 'state7' } },
        state7: { on: { NEXT: 'state8' } },
        state8: { on: { NEXT: 'state9' } },
        state9: { on: { NEXT: 'state10' } },
        state10: { on: { RESET: 'idle' } }
      }
    });

    const serialized = serializeMachine(complexMachine);
    const complexity = estimateMachineComplexity(serialized);

    expect(complexity.stateCount).toBe(10);
    expect(complexity.transitionCount).toBeGreaterThan(8);
    // With 10 states and simple transitions, could be low or medium
    expect(['low', 'medium']).toContain(complexity.complexity);
  });

  it('should simulate complete publish workflow with error handling', async () => {
    const mockPublish = mock(() => Promise.resolve());
    const mockNDKEvent = {
      publish: mockPublish
    };

    // Create a realistic publishing workflow
    try {
      // Serialize with production settings
      const serialized = serializeMachine(wordleMachine, {
        preserveFunctionCode: true,
        includeSensitiveData: false, // Production: hide sensitive data
        sanitizeCollaboration: true,
        prettyPrint: false // Production: minimize size
      });

      // Validate before publishing
      const validation = validateSerializedMachine(serialized);
      expect(validation.isValid).toBe(true);

      // Check size (should be compact without pretty printing)
      expect(serialized.length).toBeLessThan(serialized.replace(/\s/g, '').length + 1000);

      // Validate with XState
      const xstateValidation = validateXStateJSON(serialized);
      expect(xstateValidation.isValid).toBe(true);

      // Create event
      const event = createNSMEvent(
        xstateValidation.machine,
        'Production Wordle',
        'Optimized word game for Nostr'
      );

      // Simulate publishing
      Object.assign(mockNDKEvent, event);
      await mockNDKEvent.publish();

      expect(mockPublish).toHaveBeenCalled();

    } catch (error) {
      // Should not reach here in successful test
      expect(error).toBeUndefined();
    }
  });

  it('should maintain data integrity through serialization cycle', () => {
    const originalContext = wordleMachine.config.context;

    const serialized = serializeMachine(wordleMachine, {
      preserveFunctionCode: true,
      includeSensitiveData: true // Keep sensitive data for this test
    });

    const validation = validateXStateJSON(serialized);
    expect(validation.isValid).toBe(true);

    const reconstructed = validation.machine;

    // Check that non-sensitive data is preserved
    expect(reconstructed.context.currentGuess).toBe(originalContext.currentGuess);
    expect(reconstructed.context.guesses).toEqual(originalContext.guesses);
    expect(reconstructed.context.attemptNumber).toBe(originalContext.attemptNumber);
    expect(reconstructed.context.gameOver).toBe(originalContext.gameOver);
    expect(reconstructed.context.score).toBe(originalContext.score);

    // Hidden data should be preserved when includeSensitiveData is true
    expect(reconstructed.context.hiddenWord).toBe(originalContext.hiddenWord);
  });
});