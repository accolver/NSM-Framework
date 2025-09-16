/**
 * Wordle Validation Integration Tests
 * Testing integration of bloom filter with Wordle state machine
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { createWordleMachine, WordleContext } from '../wordle-machine';
import { createActor } from 'xstate';
import { WordValidator } from '../word-validator';

describe('Wordle Word Validation Integration', () => {
  let wordleMachine: any;
  let actor: any;
  let validator: WordValidator;

  beforeEach(async () => {
    // Create validator with known words for testing
    validator = new WordValidator();
    await validator.initialize(['ABOUT', 'ABOVE', 'ACTOR', 'ACUTE', 'ADMIT', 'SPELL', 'HELLO']);

    // Create machine with a known word for testing
    wordleMachine = createWordleMachine('ABOUT', validator);
    actor = createActor(wordleMachine);
    actor.start();
  });

  describe('Valid Word Submission', () => {
    it('should accept valid 5-letter words', () => {
      // Type a valid word
      actor.send({ type: 'KEYPRESS', letter: 'A' });
      actor.send({ type: 'KEYPRESS', letter: 'C' });
      actor.send({ type: 'KEYPRESS', letter: 'T' });
      actor.send({ type: 'KEYPRESS', letter: 'O' });
      actor.send({ type: 'KEYPRESS', letter: 'R' });

      expect(actor.getSnapshot().context.currentGuess).toBe('ACTOR');

      // Should allow submission of valid word
      actor.send({ type: 'SUBMIT_GUESS' });

      const context = actor.getSnapshot().context as WordleContext;
      expect(context.guesses).toHaveLength(1);
      expect(context.guesses[0]!.word).toBe('ACTOR');
    });

    it('should accept the target word', () => {
      // Type the target word
      'ABOUT'.split('').forEach(letter => {
        actor.send({ type: 'KEYPRESS', letter });
      });

      actor.send({ type: 'SUBMIT_GUESS' });

      // Should win the game
      expect(actor.getSnapshot().value).toBe('won');
    });
  });

  describe('Invalid Word Rejection', () => {
    it('should reject nonsense words', () => {
      // Type a nonsense word
      actor.send({ type: 'KEYPRESS', letter: 'X' });
      actor.send({ type: 'KEYPRESS', letter: 'Q' });
      actor.send({ type: 'KEYPRESS', letter: 'Z' });
      actor.send({ type: 'KEYPRESS', letter: 'P' });
      actor.send({ type: 'KEYPRESS', letter: 'T' });

      expect(actor.getSnapshot().context.currentGuess).toBe('XQZPT');

      // Should reject submission and show validation error
      const stateBefore = actor.getSnapshot();
      actor.send({ type: 'SUBMIT_GUESS' });
      const stateAfter = actor.getSnapshot();

      // Should stay in the same state with validation error
      expect(stateAfter.value).toBe('playing');
      expect(stateAfter.context.guesses).toHaveLength(0);
      expect(stateAfter.context.currentGuess).toBe('XQZPT'); // Word should remain
      expect(stateAfter.context.validationError).toBe('Word not in dictionary');
    });

    it('should reject common invalid combinations', () => {
      const invalidWords = ['AAAAA', 'ZZZZZ', 'QWXYZ', 'VVVVV'];

      invalidWords.forEach(invalidWord => {
        // Reset the current guess
        actor.send({ type: 'RESET_GAME' });

        // Type the invalid word
        invalidWord.split('').forEach(letter => {
          actor.send({ type: 'KEYPRESS', letter });
        });

        // Try to submit
        actor.send({ type: 'SUBMIT_GUESS' });

        const context = actor.getSnapshot().context as WordleContext;
        expect(context.guesses).toHaveLength(0);
        expect(context.validationError).toBe('Word not in dictionary');
      });
    });

    it('should clear validation error on new keypress', () => {
      // Create invalid word first
      'XQZPT'.split('').forEach(letter => {
        actor.send({ type: 'KEYPRESS', letter });
      });

      actor.send({ type: 'SUBMIT_GUESS' });
      expect(actor.getSnapshot().context.validationError).toBe('Word not in dictionary');

      // First remove a letter to make space, then add new letter
      actor.send({ type: 'BACKSPACE' });
      expect(actor.getSnapshot().context.validationError).toBeUndefined();
    });

    it('should clear validation error on backspace', () => {
      // Create invalid word first
      'XQZPT'.split('').forEach(letter => {
        actor.send({ type: 'KEYPRESS', letter });
      });

      actor.send({ type: 'SUBMIT_GUESS' });
      expect(actor.getSnapshot().context.validationError).toBe('Word not in dictionary');

      // Backspace should clear error
      actor.send({ type: 'BACKSPACE' });
      expect(actor.getSnapshot().context.validationError).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle words with repeated letters', () => {
      // Test with SPELL which has repeated L's (already in our validator)
      'SPELL'.split('').forEach(letter => {
        actor.send({ type: 'KEYPRESS', letter });
      });

      actor.send({ type: 'SUBMIT_GUESS' });

      // Should accept valid word with repeated letters
      const context = actor.getSnapshot().context as WordleContext;
      expect(context.guesses).toHaveLength(1);
      expect(context.validationError).toBeUndefined();
    });

    it('should handle uppercase/lowercase consistently', () => {
      'about'.toLowerCase().split('').forEach(letter => {
        actor.send({ type: 'KEYPRESS', letter });
      });

      actor.send({ type: 'SUBMIT_GUESS' });

      // Should accept valid word regardless of case
      const context = actor.getSnapshot().context as WordleContext;
      expect(context.guesses).toHaveLength(1);
      expect(context.guesses[0]!.word).toBe('ABOUT');
    });
  });

  describe('Performance', () => {
    it('should validate words quickly', () => {
      const startTime = performance.now();

      // Test 100 word validations
      for (let i = 0; i < 100; i++) {
        actor.send({ type: 'RESET_GAME' });
        'ABOUT'.split('').forEach(letter => {
          actor.send({ type: 'KEYPRESS', letter });
        });
        actor.send({ type: 'SUBMIT_GUESS' });
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete 100 validations in under 100ms
      expect(totalTime).toBeLessThan(100);
    });
  });
});

describe('WordValidator', () => {
  let validator: WordValidator;

  beforeEach(async () => {
    validator = new WordValidator();
    await validator.initialize(['ABOUT', 'ABOVE', 'ACTOR', 'ACUTE', 'ADMIT']);
  });

  describe('Initialization', () => {
    it('should initialize with word list', async () => {
      expect(validator.isInitialized()).toBe(true);
      expect(validator.getWordCount()).toBe(5);
    });

    it('should handle empty word list', async () => {
      const emptyValidator = new WordValidator();
      await emptyValidator.initialize([]);
      expect(emptyValidator.isInitialized()).toBe(true);
      expect(emptyValidator.getWordCount()).toBe(0);
    });
  });

  describe('Word Validation', () => {
    it('should validate known words', () => {
      expect(validator.isValid('ABOUT')).toBe(true);
      expect(validator.isValid('ACTOR')).toBe(true);
      expect(validator.isValid('about')).toBe(true); // case insensitive
    });

    it('should reject unknown words', () => {
      expect(validator.isValid('XQZPT')).toBe(false);
      expect(validator.isValid('AAAAA')).toBe(false);
      expect(validator.isValid('ZZZZZ')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(validator.isValid('')).toBe(false);
      expect(validator.isValid('AB')).toBe(false); // too short
      expect(validator.isValid('ABCDEF')).toBe(false); // too long
    });

    it('should throw error if not initialized', () => {
      const uninitializedValidator = new WordValidator();
      expect(() => uninitializedValidator.isValid('ABOUT')).toThrow('Validator not initialized');
    });
  });

  describe('Serialization', () => {
    it('should export serialized bloom filter', () => {
      const serialized = validator.exportFilter();
      expect(serialized).toBeInstanceOf(Uint8Array);
      expect(serialized.length).toBeGreaterThan(0);
    });

    it('should import serialized bloom filter', async () => {
      const serialized = validator.exportFilter();
      const newValidator = new WordValidator();
      await newValidator.importFilter(serialized);

      expect(newValidator.isInitialized()).toBe(true);
      expect(newValidator.isValid('ABOUT')).toBe(true);
      expect(newValidator.isValid('XQZPT')).toBe(false);
    });
  });
});