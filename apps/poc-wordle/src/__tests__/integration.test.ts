/**
 * Integration Tests
 * Testing the complete flow of bloom filter validation in Wordle
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createWordleMachine, WordleContext } from '../wordle-machine';
import { createActor } from 'xstate';
import { generateWordFilter } from '../generate-word-filter';

describe('Complete Bloom Filter Integration', () => {
  let wordleMachine: any;
  let actor: any;

  beforeEach(async () => {
    // Generate a word filter with extended word list
    const { validator } = await generateWordFilter();

    // Create machine with validator
    wordleMachine = createWordleMachine('HELLO', validator);
    actor = createActor(wordleMachine);
    actor.start();
  });

  describe('Real World Usage', () => {
    it('should validate words from extended dictionary', () => {
      // Test with a word from our extended list
      'CRANE'.split('').forEach(letter => {
        actor.send({ type: 'KEYPRESS', letter });
      });

      actor.send({ type: 'SUBMIT_GUESS' });

      const context = actor.getSnapshot().context as WordleContext;
      expect(context.guesses).toHaveLength(1);
      expect(context.guesses[0]!.word).toBe('CRANE');
      expect(context.validationError).toBeUndefined();
    });

    it('should reject nonsense words consistently', () => {
      // Test multiple nonsense words
      const nonsenseWords = ['XQZPT', 'AAAAA', 'ZZZZQ', 'QWXYZ'];

      nonsenseWords.forEach(word => {
        // Reset game
        actor.send({ type: 'RESET_GAME' });

        // Type nonsense word
        word.split('').forEach(letter => {
          actor.send({ type: 'KEYPRESS', letter });
        });

        // Try to submit
        actor.send({ type: 'SUBMIT_GUESS' });

        const context = actor.getSnapshot().context as WordleContext;
        expect(context.guesses).toHaveLength(0);
        expect(context.validationError).toBe('Word not in dictionary');
      });
    });

    it('should handle gameplay flow correctly', () => {
      // Play a realistic game
      const guesses = ['CRANE', 'SLATE', 'PROSE'];

      guesses.forEach((guess, index) => {
        guess.split('').forEach(letter => {
          actor.send({ type: 'KEYPRESS', letter });
        });

        actor.send({ type: 'SUBMIT_GUESS' });

        const context = actor.getSnapshot().context as WordleContext;
        expect(context.guesses).toHaveLength(index + 1);
        expect(context.guesses[index]!.word).toBe(guess);
        expect(context.validationError).toBeUndefined();
      });

      // Now guess the correct word
      'HELLO'.split('').forEach(letter => {
        actor.send({ type: 'KEYPRESS', letter });
      });

      actor.send({ type: 'SUBMIT_GUESS' });

      // Should win the game
      expect(actor.getSnapshot().value).toBe('won');
    });

    it('should maintain performance under load', () => {
      const startTime = performance.now();

      // Perform 1000 validations
      for (let i = 0; i < 1000; i++) {
        actor.send({ type: 'RESET_GAME' });

        const word = i % 2 === 0 ? 'CRANE' : 'XQZPT'; // Alternate valid/invalid
        word.split('').forEach(letter => {
          actor.send({ type: 'KEYPRESS', letter });
        });

        actor.send({ type: 'SUBMIT_GUESS' });
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete 1000 validations in under 100ms
      expect(totalTime).toBeLessThan(100);
      console.log(`Completed 1000 validations in ${totalTime.toFixed(2)}ms`);
    });
  });

  describe('Filter Quality Assessment', () => {
    it('should have reasonable false positive rate', async () => {
      const { validator } = await generateWordFilter();

      // Test with random 5-letter combinations
      let falsePositives = 0;
      const testCount = 1000;

      for (let i = 0; i < testCount; i++) {
        // Generate random 5-letter word
        const randomWord = Array.from({ length: 5 }, () =>
          String.fromCharCode(65 + Math.floor(Math.random() * 26))
        ).join('');

        if (validator.isValid(randomWord)) {
          falsePositives++;
        }
      }

      const falsePositiveRate = falsePositives / testCount;
      console.log(`False positive rate: ${(falsePositiveRate * 100).toFixed(2)}%`);

      // Should be less than 5% for practical usage
      expect(falsePositiveRate).toBeLessThan(0.05);
    });

    it('should accept all words from original word list', async () => {
      const { validator } = await generateWordFilter();
      const { WORD_LIST } = await import('../word-list');

      const rejectedWords: string[] = [];
      WORD_LIST.forEach(word => {
        if (!validator.isValid(word)) {
          rejectedWords.push(word);
        }
      });

      if (rejectedWords.length > 0) {
        console.log('Rejected words from original list:', rejectedWords);
      }

      // Should accept all original words
      expect(rejectedWords).toHaveLength(0);
    });
  });
});