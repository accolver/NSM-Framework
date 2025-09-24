/**
 * TDD Tests for End-to-End NSM Browser Workflow
 *
 * These tests verify the complete workflow from XState machine export
 * through Nostr publishing and back to machine reconstruction.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { createMachine, assign } from 'xstate';
import { createNSMEvent, parseNSMEvent } from '../utils/nostr-events';
import { validateXStateJSON } from '../utils/xstate-validator';
import { serializeMachine, SerializationOptions } from '@nsm/dev-tools';

describe('End-to-End NSM Browser Workflow Tests (TDD - RED Phase)', () => {
  let wordleMachine: any;

  beforeEach(() => {
    // Create a Wordle-like machine for testing
    wordleMachine = createMachine({
      id: 'wordleMachine',
      initial: 'playing',
      context: {
        hiddenWord: 'HELLO',
        currentGuess: '',
        guesses: [],
        attemptNumber: 0,
        gameOver: false
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
            SUBMIT_GUESS: {
              guard: ({ context }) => context.currentGuess.length === 5,
              actions: assign({
                guesses: ({ context }) => [
                  ...context.guesses,
                  { word: context.currentGuess, status: 'submitted' }
                ],
                currentGuess: '',
                attemptNumber: ({ context }) => context.attemptNumber + 1
              })
            }
          }
        },
        won: { type: 'final' },
        lost: { type: 'final' }
      }
    });
  });

  it('should export Wordle machine with preserved function logic', () => {
    const serialized = serializeMachine(wordleMachine, {
      preserveFunctionCode: true,
      includeSensitiveData: false, // Hide hiddenWord
      prettyPrint: true
    });

    // Verify serialization preserves function logic
    expect(serialized).toContain('context.currentGuess.length < 5');
    expect(serialized).toContain('context.currentGuess + event.letter');
    expect(serialized).toContain('context.attemptNumber + 1');

    // Verify sensitive data is hidden
    expect(serialized).not.toContain('HELLO');
    expect(serialized).toContain('[HIDDEN]');
  });

  it('should validate serialized machine JSON', () => {
    const serialized = serializeMachine(wordleMachine, {
      preserveFunctionCode: true,
      includeSensitiveData: false
    });

    const validation = validateXStateJSON(serialized);

    expect(validation.isValid).toBe(true);
    expect(validation.machine).toBeDefined();
    expect(validation.machine.id).toBe('wordleMachine');
    expect(validation.machine.states.playing).toBeDefined();
  });

  it('should create valid NSM event from serialized machine', () => {
    const serialized = serializeMachine(wordleMachine, {
      preserveFunctionCode: true,
      includeSensitiveData: false
    });

    const validation = validateXStateJSON(serialized);
    expect(validation.isValid).toBe(true);

    const event = createNSMEvent(
      validation.machine,
      'Wordle Game',
      'Interactive word guessing game'
    );

    expect(event.kind).toBe(30079);
    expect(event.content).toContain('initialState');
    expect(event.tags).toContainEqual(['name', 'Wordle Game']);
    expect(event.tags).toContainEqual(['engine', 'xstate']);
  });

  it('should reconstruct machine from NSM event', () => {
    // Serialize machine
    const serialized = serializeMachine(wordleMachine, {
      preserveFunctionCode: true,
      includeSensitiveData: false
    });

    const validation = validateXStateJSON(serialized);
    expect(validation.isValid).toBe(true);

    // Create NSM event
    const event = createNSMEvent(
      validation.machine,
      'Wordle Game',
      'Interactive word guessing game'
    );

    // Parse back from event
    const mockEvent = {
      kind: 30079,
      content: event.content,
      tags: event.tags,
      pubkey: 'test-pubkey',
      created_at: Date.now()
    };

    const parsedApp = parseNSMEvent(mockEvent);

    expect(parsedApp).toBeDefined();
    expect(parsedApp!.name).toBe('Wordle Game');
    expect(parsedApp!.engine).toBe('xstate');

    // Verify machine content is preserved
    const machineContent = JSON.parse(parsedApp!.machine);
    expect(machineContent.initialState.id).toBe('wordleMachine');
    expect(machineContent.initialState.states.playing).toBeDefined();
  });

  it('should handle complete publish workflow', async () => {
    // Mock NDK event
    const mockPublish = mock(() => Promise.resolve());
    const mockNDKEvent = {
      publish: mockPublish
    };

    // Serialize machine
    const serialized = serializeMachine(wordleMachine, {
      preserveFunctionCode: true,
      includeSensitiveData: false
    });

    // Validate
    const validation = validateXStateJSON(serialized);
    expect(validation.isValid).toBe(true);

    // Create event
    const event = createNSMEvent(
      validation.machine,
      'Wordle Game',
      'Interactive word guessing game'
    );

    // Simulate publishing
    Object.assign(mockNDKEvent, event);
    await mockNDKEvent.publish();

    expect(mockPublish).toHaveBeenCalled();
  });

  it('should preserve complex action logic through serialization cycle', () => {
    const complexMachine = createMachine({
      id: 'complex',
      initial: 'idle',
      context: {
        score: 0,
        multiplier: 1,
        achievements: []
      },
      states: {
        idle: {
          on: {
            SCORE: {
              actions: assign({
                score: ({ context, event }) => {
                  const baseScore = event.points || 0;
                  const bonus = context.multiplier > 1 ? baseScore * 0.5 : 0;
                  return context.score + baseScore + bonus;
                },
                achievements: ({ context, event }) => {
                  const newScore = context.score + (event.points || 0);
                  const milestones = [100, 500, 1000, 5000];
                  const newAchievements = milestones.filter(
                    milestone => newScore >= milestone &&
                    context.score < milestone
                  );
                  return [...context.achievements, ...newAchievements];
                }
              })
            }
          }
        }
      }
    });

    const serialized = serializeMachine(complexMachine, {
      preserveFunctionCode: true
    });

    // Verify complex logic is preserved (check source code in functions)
    expect(serialized).toContain('baseScore * 0.5');
    expect(serialized).toContain('filter');
    expect(serialized).toContain('newScore >= milestone');
    expect(serialized).toContain('...context.achievements');
  });

  it('should handle error cases gracefully', () => {
    // Test invalid JSON
    const invalidValidation = validateXStateJSON('invalid json');
    expect(invalidValidation.isValid).toBe(false);
    expect(invalidValidation.error).toBeDefined();

    // Test empty machine
    const emptyValidation = validateXStateJSON('{}');
    expect(emptyValidation.isValid).toBe(false);

    // Test machine without states
    const noStatesValidation = validateXStateJSON('{"id": "test"}');
    expect(noStatesValidation.isValid).toBe(false);
  });
});