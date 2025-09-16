import { describe, it, expect, beforeEach } from 'bun:test';
import { createActor } from 'xstate';
import { wordleMachine, createWordleMachine, type WordleContext, type WordleEvent } from './wordle-machine';

describe('Wordle State Machine', () => {
  let actor: any;

  beforeEach(() => {
    actor = createActor(wordleMachine);
  });

  describe('Initial State', () => {
    it('should start in playing state', () => {
      actor.start();
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe('playing');
      expect(snapshot.context.currentGuess).toBe('');
      expect(snapshot.context.guesses).toEqual([]);
      expect(snapshot.context.hiddenWord).toHaveLength(5);
      expect(snapshot.context.gameOver).toBe(false);
      actor.stop();
    });

    it('should initialize with empty current guess and no previous guesses', () => {
      actor.start();
      const snapshot = actor.getSnapshot();
      expect(snapshot.context.currentGuess).toBe('');
      expect(snapshot.context.guesses).toEqual([]);
      expect(snapshot.context.attemptNumber).toBe(0);
      actor.stop();
    });
  });

  describe('Keyboard Input Events', () => {
    it('should add letter to current guess on KEYPRESS', () => {
      actor.start();
      actor.send({ type: 'KEYPRESS', letter: 'A' });
      const snapshot = actor.getSnapshot();
      expect(snapshot.context.currentGuess).toBe('A');
      expect(snapshot.value).toBe('playing');
      actor.stop();
    });

    it('should allow up to 5 letters in current guess', () => {
      actor.start();
      actor.send({ type: 'KEYPRESS', letter: 'A' });
      actor.send({ type: 'KEYPRESS', letter: 'B' });
      actor.send({ type: 'KEYPRESS', letter: 'C' });
      actor.send({ type: 'KEYPRESS', letter: 'D' });
      actor.send({ type: 'KEYPRESS', letter: 'E' });

      const snapshot = actor.getSnapshot();
      expect(snapshot.context.currentGuess).toBe('ABCDE');
      actor.stop();
    });

    it('should not add more than 5 letters to current guess', () => {
      actor.start();
      actor.send({ type: 'KEYPRESS', letter: 'A' });
      actor.send({ type: 'KEYPRESS', letter: 'B' });
      actor.send({ type: 'KEYPRESS', letter: 'C' });
      actor.send({ type: 'KEYPRESS', letter: 'D' });
      actor.send({ type: 'KEYPRESS', letter: 'E' });
      actor.send({ type: 'KEYPRESS', letter: 'F' }); // Should be ignored

      const snapshot = actor.getSnapshot();
      expect(snapshot.context.currentGuess).toBe('ABCDE');
      actor.stop();
    });

    it('should remove last letter on BACKSPACE', () => {
      actor.start();
      actor.send({ type: 'KEYPRESS', letter: 'A' });
      actor.send({ type: 'KEYPRESS', letter: 'B' });
      actor.send({ type: 'BACKSPACE' });

      const snapshot = actor.getSnapshot();
      expect(snapshot.context.currentGuess).toBe('A');
      actor.stop();
    });

    it('should handle BACKSPACE on empty current guess', () => {
      actor.start();
      actor.send({ type: 'BACKSPACE' });

      const snapshot = actor.getSnapshot();
      expect(snapshot.context.currentGuess).toBe('');
      actor.stop();
    });
  });

  describe('Guess Submission', () => {
    it('should not submit guess with less than 5 letters', () => {
      actor.start();
      actor.send({ type: 'KEYPRESS', letter: 'A' });
      actor.send({ type: 'KEYPRESS', letter: 'B' });
      actor.send({ type: 'SUBMIT_GUESS' });

      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe('playing');
      expect(snapshot.context.guesses).toEqual([]);
      expect(snapshot.context.currentGuess).toBe('AB');
      actor.stop();
    });

    it('should submit valid 5-letter guess', () => {
      actor.start();
      actor.send({ type: 'KEYPRESS', letter: 'A' });
      actor.send({ type: 'KEYPRESS', letter: 'B' });
      actor.send({ type: 'KEYPRESS', letter: 'O' });
      actor.send({ type: 'KEYPRESS', letter: 'U' });
      actor.send({ type: 'KEYPRESS', letter: 'T' });
      actor.send({ type: 'SUBMIT_GUESS' });

      const snapshot = actor.getSnapshot();
      expect(snapshot.context.guesses).toHaveLength(1);
      expect(snapshot.context.guesses[0].word).toBe('ABOUT');
      expect(snapshot.context.currentGuess).toBe('');
      expect(snapshot.context.attemptNumber).toBe(1);
      actor.stop();
    });

    it('should transition to won state when guess matches hidden word', () => {
      // Set up a known word for testing
      const testActor = createActor(createWordleMachine('ABOUT'));
      testActor.start();

      testActor.send({ type: 'KEYPRESS', letter: 'A' });
      testActor.send({ type: 'KEYPRESS', letter: 'B' });
      testActor.send({ type: 'KEYPRESS', letter: 'O' });
      testActor.send({ type: 'KEYPRESS', letter: 'U' });
      testActor.send({ type: 'KEYPRESS', letter: 'T' });
      testActor.send({ type: 'SUBMIT_GUESS' });

      const snapshot = testActor.getSnapshot();
      expect(snapshot.value).toBe('won');
      expect(snapshot.context.gameOver).toBe(true);
      testActor.stop();
    });

    it('should transition to lost state after 6 failed attempts', () => {
      actor.start();
      // Submit 6 wrong guesses
      for (let i = 0; i < 6; i++) {
        actor.send({ type: 'KEYPRESS', letter: 'W' });
        actor.send({ type: 'KEYPRESS', letter: 'R' });
        actor.send({ type: 'KEYPRESS', letter: 'O' });
        actor.send({ type: 'KEYPRESS', letter: 'N' });
        actor.send({ type: 'KEYPRESS', letter: 'G' });
        actor.send({ type: 'SUBMIT_GUESS' });
      }

      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe('lost');
      expect(snapshot.context.gameOver).toBe(true);
      expect(snapshot.context.attemptNumber).toBe(6);
      actor.stop();
    });
  });

  describe('Letter Status Tracking', () => {
    it('should calculate correct letter status for guess', () => {
      // Set up a known word for testing
      const testActor = createActor(createWordleMachine('ABOUT'));
      testActor.start();

      testActor.send({ type: 'KEYPRESS', letter: 'A' });
      testActor.send({ type: 'KEYPRESS', letter: 'L' });
      testActor.send({ type: 'KEYPRESS', letter: 'O' });
      testActor.send({ type: 'KEYPRESS', letter: 'N' });
      testActor.send({ type: 'KEYPRESS', letter: 'E' });
      testActor.send({ type: 'SUBMIT_GUESS' });

      const snapshot = testActor.getSnapshot();
      const guess = snapshot.context.guesses[0];
      expect(guess.letterStatus).toEqual([
        'correct',   // A is in position 0
        'absent',    // L is not in ABOUT
        'correct',   // O is in position 2
        'absent',    // N is not in ABOUT
        'absent'     // E is not in ABOUT
      ]);
      testActor.stop();
    });

    it('should handle letters in wrong position', () => {
      const testActor = createActor(createWordleMachine('ABOUT'));
      testActor.start();

      testActor.send({ type: 'KEYPRESS', letter: 'Y' });
      testActor.send({ type: 'KEYPRESS', letter: 'O' });
      testActor.send({ type: 'KEYPRESS', letter: 'U' });
      testActor.send({ type: 'KEYPRESS', letter: 'T' });
      testActor.send({ type: 'KEYPRESS', letter: 'H' });
      testActor.send({ type: 'SUBMIT_GUESS' });

      const snapshot = testActor.getSnapshot();
      const guess = snapshot.context.guesses[0];
      expect(guess.letterStatus).toEqual([
        'absent',    // Y is not in ABOUT
        'present',   // O is in ABOUT but wrong position (position 1 vs position 2)
        'present',   // U is in ABOUT but wrong position (position 2 vs position 3)
        'present',   // T is in ABOUT but wrong position (position 3 vs position 4)
        'absent'     // H is not in ABOUT
      ]);
      testActor.stop();
    });
  });

  describe('Game Reset', () => {
    it('should reset game state on RESET_GAME event', () => {
      actor.start();
      // Make some moves first
      actor.send({ type: 'KEYPRESS', letter: 'A' });
      actor.send({ type: 'KEYPRESS', letter: 'B' });
      actor.send({ type: 'KEYPRESS', letter: 'O' });
      actor.send({ type: 'KEYPRESS', letter: 'U' });
      actor.send({ type: 'KEYPRESS', letter: 'T' });
      actor.send({ type: 'SUBMIT_GUESS' });

      // Reset the game
      actor.send({ type: 'RESET_GAME' });

      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe('playing');
      expect(snapshot.context.currentGuess).toBe('');
      expect(snapshot.context.guesses).toEqual([]);
      expect(snapshot.context.attemptNumber).toBe(0);
      expect(snapshot.context.gameOver).toBe(false);
      expect(snapshot.context.hiddenWord).toHaveLength(5);
      actor.stop();
    });

    it('should allow reset from won state', () => {
      const testActor = createActor(createWordleMachine('ABOUT'));
      testActor.start();

      // Win the game
      testActor.send({ type: 'KEYPRESS', letter: 'A' });
      testActor.send({ type: 'KEYPRESS', letter: 'B' });
      testActor.send({ type: 'KEYPRESS', letter: 'O' });
      testActor.send({ type: 'KEYPRESS', letter: 'U' });
      testActor.send({ type: 'KEYPRESS', letter: 'T' });
      testActor.send({ type: 'SUBMIT_GUESS' });

      expect(testActor.getSnapshot().value).toBe('won');

      // Reset and verify
      testActor.send({ type: 'RESET_GAME' });
      const snapshot = testActor.getSnapshot();
      expect(snapshot.value).toBe('playing');
      expect(snapshot.context.gameOver).toBe(false);
      testActor.stop();
    });

    it('should allow reset from lost state', () => {
      actor.start();
      // Lose the game with 6 wrong guesses
      for (let i = 0; i < 6; i++) {
        actor.send({ type: 'KEYPRESS', letter: 'W' });
        actor.send({ type: 'KEYPRESS', letter: 'R' });
        actor.send({ type: 'KEYPRESS', letter: 'O' });
        actor.send({ type: 'KEYPRESS', letter: 'N' });
        actor.send({ type: 'KEYPRESS', letter: 'G' });
        actor.send({ type: 'SUBMIT_GUESS' });
      }

      expect(actor.getSnapshot().value).toBe('lost');

      // Reset and verify
      actor.send({ type: 'RESET_GAME' });
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe('playing');
      expect(snapshot.context.gameOver).toBe(false);
      actor.stop();
    });
  });
});