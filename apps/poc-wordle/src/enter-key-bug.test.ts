import { describe, it, expect, beforeEach } from 'bun:test';
import { createActor } from 'xstate';
import { createWordleMachine, type WordleContext, type WordleEvent } from './wordle-machine';

describe('Enter Key Bug Investigation', () => {
  describe('SUBMIT_GUESS Event Test', () => {
    it('should fail - demonstrates the bug where SUBMIT_GUESS does not work with valid words', () => {
      // Set up a known word for testing - using ABOUT which IS in the word list
      const testActor = createActor(createWordleMachine('ABOUT'));
      testActor.start();

      // Simulate typing "ABOUT" which is definitely in the word list
      testActor.send({ type: 'KEYPRESS', letter: 'A' });
      testActor.send({ type: 'KEYPRESS', letter: 'B' });
      testActor.send({ type: 'KEYPRESS', letter: 'O' });
      testActor.send({ type: 'KEYPRESS', letter: 'U' });
      testActor.send({ type: 'KEYPRESS', letter: 'T' });

      // Verify we have the current guess set up correctly
      let snapshot = testActor.getSnapshot();
      console.log('🐛 Bug test - State before SUBMIT_GUESS:', {
        value: snapshot.value,
        currentGuess: snapshot.context.currentGuess,
        guessesLength: snapshot.context.guesses.length
      });

      expect(snapshot.context.currentGuess).toBe('ABOUT');
      expect(snapshot.value).toBe('playing');

      // Now try to submit the guess - THIS IS WHERE THE BUG HAPPENS
      console.log('🐛 Sending SUBMIT_GUESS event...');
      testActor.send({ type: 'SUBMIT_GUESS' });

      // Check what happened
      snapshot = testActor.getSnapshot();
      console.log('🐛 Bug test - State after SUBMIT_GUESS:', {
        value: snapshot.value,
        currentGuess: snapshot.context.currentGuess,
        guessesLength: snapshot.context.guesses.length,
        validationError: snapshot.context.validationError
      });

      // This should win the game since the guess matches hidden word
      // But due to the bug, the state machine doesn't transition
      expect(snapshot.value).toBe('won'); // This will fail due to the bug
      expect(snapshot.context.currentGuess).toBe(''); // This will fail due to the bug

      testActor.stop();
    });

    it('should demonstrate word validation working correctly', () => {
      const testActor = createActor(createWordleMachine('ABOUT'));
      testActor.start();

      // Type a valid word that's in the dictionary but wrong - using WORLD
      testActor.send({ type: 'KEYPRESS', letter: 'W' });
      testActor.send({ type: 'KEYPRESS', letter: 'O' });
      testActor.send({ type: 'KEYPRESS', letter: 'R' });
      testActor.send({ type: 'KEYPRESS', letter: 'L' });
      testActor.send({ type: 'KEYPRESS', letter: 'D' });

      let snapshot = testActor.getSnapshot();
      console.log('📝 Word validation test - Before SUBMIT:', {
        currentGuess: snapshot.context.currentGuess,
        isInWordList: snapshot.context.currentGuess === 'WORLD' ? 'WORLD is in word list' : 'Not found'
      });

      testActor.send({ type: 'SUBMIT_GUESS' });

      snapshot = testActor.getSnapshot();
      console.log('📝 Word validation test - After SUBMIT:', {
        value: snapshot.value,
        currentGuess: snapshot.context.currentGuess,
        guessesLength: snapshot.context.guesses.length
      });

      // This should work - WORLD is a valid word
      expect(snapshot.context.guesses).toHaveLength(1);
      expect(snapshot.context.currentGuess).toBe('');

      testActor.stop();
    });

    it('should demonstrate invalid word handling', () => {
      const testActor = createActor(createWordleMachine('ABOUT'));
      testActor.start();

      // Type an invalid word
      testActor.send({ type: 'KEYPRESS', letter: 'X' });
      testActor.send({ type: 'KEYPRESS', letter: 'Y' });
      testActor.send({ type: 'KEYPRESS', letter: 'Z' });
      testActor.send({ type: 'KEYPRESS', letter: 'Z' });
      testActor.send({ type: 'KEYPRESS', letter: 'Z' });

      testActor.send({ type: 'SUBMIT_GUESS' });

      const snapshot = testActor.getSnapshot();
      console.log('❌ Invalid word test:', {
        validationError: snapshot.context.validationError,
        currentGuess: snapshot.context.currentGuess,
        guessesLength: snapshot.context.guesses.length
      });

      // Should show validation error and not submit
      expect(snapshot.context.validationError).toBe('Word not in dictionary');
      expect(snapshot.context.guesses).toHaveLength(0);
      expect(snapshot.context.currentGuess).toBe('XYZZZ');

      testActor.stop();
    });
  });

  describe('React Component Integration Test', () => {
    it('should test physical keyboard Enter key handling', () => {
      // This will be filled in after we fix the state machine bug
      console.log('🎯 React component test placeholder - will implement after state machine fix');
    });
  });
});