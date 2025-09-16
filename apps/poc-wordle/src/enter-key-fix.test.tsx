import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createActor } from 'xstate';
import { createWordleMachine, type WordleContext, type WordleEvent } from './wordle-machine';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './components/App';

describe('Enter Key Fix - TDD Implementation', () => {
  describe('RED Phase: Failing Tests for Enter Key Submission', () => {
    it('should successfully submit STAIR as a valid word', () => {
      // Create a game where hidden word is different from STAIR
      const testActor = createActor(createWordleMachine('ABOUT'));
      testActor.start();

      // Type STAIR (now in word list)
      testActor.send({ type: 'KEYPRESS', letter: 'S' });
      testActor.send({ type: 'KEYPRESS', letter: 'T' });
      testActor.send({ type: 'KEYPRESS', letter: 'A' });
      testActor.send({ type: 'KEYPRESS', letter: 'I' });
      testActor.send({ type: 'KEYPRESS', letter: 'R' });

      let snapshot = testActor.getSnapshot();
      expect(snapshot.context.currentGuess).toBe('STAIR');

      // Submit the guess
      testActor.send({ type: 'SUBMIT_GUESS' });

      snapshot = testActor.getSnapshot();
      console.log('✅ STAIR submission result:', {
        guessesLength: snapshot.context.guesses.length,
        currentGuess: snapshot.context.currentGuess,
        validationError: snapshot.context.validationError
      });

      // Should successfully submit as STAIR is now in word list
      expect(snapshot.context.guesses).toHaveLength(1);
      expect(snapshot.context.currentGuess).toBe('');
      expect(snapshot.context.validationError).toBeUndefined();

      testActor.stop();
    });

    it('should handle winning guess submission correctly', () => {
      // Set STAIR as the hidden word
      const testActor = createActor(createWordleMachine('STAIR'));
      testActor.start();

      // Type STAIR to win
      testActor.send({ type: 'KEYPRESS', letter: 'S' });
      testActor.send({ type: 'KEYPRESS', letter: 'T' });
      testActor.send({ type: 'KEYPRESS', letter: 'A' });
      testActor.send({ type: 'KEYPRESS', letter: 'I' });
      testActor.send({ type: 'KEYPRESS', letter: 'R' });

      // Submit to win
      testActor.send({ type: 'SUBMIT_GUESS' });

      const snapshot = testActor.getSnapshot();
      console.log('🏆 Winning submission result:', {
        value: snapshot.value,
        gameOver: snapshot.context.gameOver
      });

      expect(snapshot.value).toBe('won');
      expect(snapshot.context.gameOver).toBe(true);
      expect(snapshot.context.guesses).toHaveLength(1);

      testActor.stop();
    });
  });

  describe('GREEN Phase: Physical Keyboard Integration Tests', () => {
    afterEach(() => {
      cleanup();
    });

    it('should handle physical Enter key press for STAIR submission', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Focus the app container
      const appContainer = screen.getByRole('main');
      await user.click(appContainer);

      // Type STAIR using physical keyboard
      await user.keyboard('STAIR');

      // Verify STAIR appears in the grid
      const stairLetters = screen.getAllByText('S');
      expect(stairLetters.length).toBeGreaterThanOrEqual(1);

      // Press Enter key physically
      await user.keyboard('{Enter}');

      // Should advance to attempt 2 (successful submission)
      expect(screen.getByText(/attempt 2 of 6/i)).toBeInTheDocument();
    });

    it('should handle virtual keyboard Enter button for STAIR submission', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Click virtual keyboard letters to spell STAIR
      const sKey = screen.getByRole('button', { name: 'S' });
      const tKey = screen.getByRole('button', { name: 'T' });
      const aKey = screen.getByRole('button', { name: 'A' });
      const iKey = screen.getByRole('button', { name: 'I' });
      const rKey = screen.getByRole('button', { name: 'R' });

      await user.click(sKey);
      await user.click(tKey);
      await user.click(aKey);
      await user.click(iKey);
      await user.click(rKey);

      // Click the virtual Enter button
      const enterButton = screen.getByRole('button', { name: 'Enter' });
      await user.click(enterButton);

      // Should advance to attempt 2 (successful submission)
      expect(screen.getByText(/attempt 2 of 6/i)).toBeInTheDocument();
    });

    it('should show validation error for invalid word submission', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Focus and type invalid word
      const appContainer = screen.getByRole('main');
      await user.click(appContainer);
      await user.keyboard('XYZZZ');

      // Press Enter
      await user.keyboard('{Enter}');

      // Should still be on attempt 1 (failed submission)
      expect(screen.getByText(/attempt 1 of 6/i)).toBeInTheDocument();

      // Should show some indication of error (current guess should remain)
      const xElements = screen.getAllByText('X');
      expect(xElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('REFACTOR Phase: Edge Cases and User Experience', () => {
    it('should handle repeated Enter key presses gracefully', () => {
      const testActor = createActor(createWordleMachine('ABOUT'));
      testActor.start();

      // Type partial word
      testActor.send({ type: 'KEYPRESS', letter: 'S' });
      testActor.send({ type: 'KEYPRESS', letter: 'T' });

      // Try to submit incomplete word multiple times
      testActor.send({ type: 'SUBMIT_GUESS' });
      testActor.send({ type: 'SUBMIT_GUESS' });
      testActor.send({ type: 'SUBMIT_GUESS' });

      const snapshot = testActor.getSnapshot();

      // Should still be playing, no guesses submitted
      expect(snapshot.value).toBe('playing');
      expect(snapshot.context.guesses).toHaveLength(0);
      expect(snapshot.context.currentGuess).toBe('ST');

      testActor.stop();
    });

    it('should clear validation error when user starts typing again', () => {
      const testActor = createActor(createWordleMachine('ABOUT'));
      testActor.start();

      // Type invalid word
      testActor.send({ type: 'KEYPRESS', letter: 'X' });
      testActor.send({ type: 'KEYPRESS', letter: 'Y' });
      testActor.send({ type: 'KEYPRESS', letter: 'Z' });
      testActor.send({ type: 'KEYPRESS', letter: 'Z' });
      testActor.send({ type: 'KEYPRESS', letter: 'Z' });

      // Submit and get error
      testActor.send({ type: 'SUBMIT_GUESS' });

      let snapshot = testActor.getSnapshot();
      expect(snapshot.context.validationError).toBe('Word not in dictionary');

      // Start typing new letter - should clear error
      testActor.send({ type: 'KEYPRESS', letter: 'A' });

      snapshot = testActor.getSnapshot();
      expect(snapshot.context.validationError).toBeUndefined();

      testActor.stop();
    });
  });
});