import { describe, it, expect } from 'bun:test';
import { createActor } from 'xstate';
import { createWordleMachine } from './wordle-machine';
import { isValidWord } from './word-list';

describe('STAIR Word Fix - Core Issue Resolution', () => {
  it('should now recognize STAIR as a valid word', () => {
    // Test that STAIR is now in the word list
    expect(isValidWord('STAIR')).toBe(true);
    expect(isValidWord('stair')).toBe(true); // Test case insensitivity
  });

  it('should successfully submit STAIR as a guess', () => {
    const testActor = createActor(createWordleMachine('ABOUT'));
    testActor.start();

    // Type STAIR
    testActor.send({ type: 'KEYPRESS', letter: 'S' });
    testActor.send({ type: 'KEYPRESS', letter: 'T' });
    testActor.send({ type: 'KEYPRESS', letter: 'A' });
    testActor.send({ type: 'KEYPRESS', letter: 'I' });
    testActor.send({ type: 'KEYPRESS', letter: 'R' });

    // Submit the guess
    testActor.send({ type: 'SUBMIT_GUESS' });

    const snapshot = testActor.getSnapshot();

    // Should successfully submit (no validation error)
    expect(snapshot.context.validationError).toBeUndefined();
    expect(snapshot.context.guesses).toHaveLength(1);
    expect(snapshot.context.currentGuess).toBe('');
    expect(snapshot.context.attemptNumber).toBe(1);

    testActor.stop();
  });

  it('should win the game when STAIR is the hidden word and user types STAIR', () => {
    const testActor = createActor(createWordleMachine('STAIR'));
    testActor.start();

    // Type STAIR to match hidden word
    testActor.send({ type: 'KEYPRESS', letter: 'S' });
    testActor.send({ type: 'KEYPRESS', letter: 'T' });
    testActor.send({ type: 'KEYPRESS', letter: 'A' });
    testActor.send({ type: 'KEYPRESS', letter: 'I' });
    testActor.send({ type: 'KEYPRESS', letter: 'R' });

    // Submit the winning guess
    testActor.send({ type: 'SUBMIT_GUESS' });

    const snapshot = testActor.getSnapshot();

    // Should win the game!
    expect(snapshot.value).toBe('won');
    expect(snapshot.context.gameOver).toBe(true);
    expect(snapshot.context.guesses).toHaveLength(1);
    expect(snapshot.context.guesses[0].word).toBe('STAIR');

    testActor.stop();
  });

  it('should provide correct letter status feedback for STAIR guess', () => {
    // Hidden word: ABOUT, Guess: STAIR
    const testActor = createActor(createWordleMachine('ABOUT'));
    testActor.start();

    testActor.send({ type: 'KEYPRESS', letter: 'S' });
    testActor.send({ type: 'KEYPRESS', letter: 'T' });
    testActor.send({ type: 'KEYPRESS', letter: 'A' });
    testActor.send({ type: 'KEYPRESS', letter: 'I' });
    testActor.send({ type: 'KEYPRESS', letter: 'R' });
    testActor.send({ type: 'SUBMIT_GUESS' });

    const snapshot = testActor.getSnapshot();
    const guess = snapshot.context.guesses[0];

    // Expected status for STAIR vs ABOUT:
    // S - not in ABOUT = absent
    // T - in ABOUT but wrong position = present
    // A - in ABOUT but wrong position (A is at position 0 in ABOUT, position 2 in STAIR) = present
    // I - not in ABOUT = absent
    // R - not in ABOUT = absent
    expect(guess.letterStatus).toEqual([
      'absent',   // S
      'present',  // T (in ABOUT but wrong position)
      'present',  // A (in ABOUT but wrong position - it's at index 0 in ABOUT, index 2 in STAIR)
      'absent',   // I
      'absent'    // R
    ]);

    testActor.stop();
  });
});