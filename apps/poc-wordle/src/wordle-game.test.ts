import { describe, it, expect, beforeEach } from 'bun:test';
import { WordleGame } from './wordle-game';

describe('WordleGame Wrapper', () => {
  let game: WordleGame;

  beforeEach(() => {
    game = new WordleGame('ABOUT');
    game.start();
  });

  describe('Game Initialization', () => {
    it('should start in playing state', () => {
      const state = game.getState();
      expect(state.gameState).toBe('playing');
      expect(state.currentGuess).toBe('');
      expect(state.guesses).toEqual([]);
      expect(state.hiddenWord).toBe('ABOUT');
      game.stop();
    });

    it('should create word grid with empty cells', () => {
      const grid = game.getWordGrid();
      expect(grid).toHaveLength(6);
      expect(grid[0]).toEqual([null, null, null, null, null]);
      game.stop();
    });
  });

  describe('Keyboard Input', () => {
    it('should handle letter input', () => {
      game.pressKey('A');
      const state = game.getState();
      expect(state.currentGuess).toBe('A');
      game.stop();
    });

    it('should handle backspace', () => {
      game.pressKey('A');
      game.pressKey('B');
      game.backspace();
      const state = game.getState();
      expect(state.currentGuess).toBe('A');
      game.stop();
    });

    it('should convert letters to uppercase', () => {
      game.pressKey('a');
      const state = game.getState();
      expect(state.currentGuess).toBe('A');
      game.stop();
    });
  });

  describe('Guess Submission', () => {
    it('should submit complete guess', () => {
      game.pressKey('H');
      game.pressKey('E');
      game.pressKey('L');
      game.pressKey('L');
      game.pressKey('O');
      game.submitGuess();

      const state = game.getState();
      expect(state.guesses).toHaveLength(1);
      expect(state.guesses[0].word).toBe('HELLO');
      expect(state.currentGuess).toBe('');
      game.stop();
    });

    it('should transition to won state when guessing correctly', () => {
      game.pressKey('A');
      game.pressKey('B');
      game.pressKey('O');
      game.pressKey('U');
      game.pressKey('T');
      game.submitGuess();

      expect(game.hasWon()).toBe(true);
      expect(game.isGameOver()).toBe(true);
      expect(game.hasLost()).toBe(false);
      game.stop();
    });
  });

  describe('Word Grid Display', () => {
    it('should show current guess in grid', () => {
      game.pressKey('A');
      game.pressKey('B');
      game.pressKey('C');

      const grid = game.getWordGrid();
      expect(grid[0]).toEqual(['A', 'B', 'C', null, null]);
      game.stop();
    });

    it('should show completed guesses in grid', () => {
      game.pressKey('H');
      game.pressKey('E');
      game.pressKey('L');
      game.pressKey('L');
      game.pressKey('O');
      game.submitGuess();

      const grid = game.getWordGrid();
      expect(grid[0]).toEqual(['H', 'E', 'L', 'L', 'O']);
      expect(grid[1]).toEqual([null, null, null, null, null]);
      game.stop();
    });
  });

  describe('Letter Status', () => {
    it('should provide letter status grid', () => {
      // Test with "HOUSE" against hidden word "ABOUT"
      // H vs A = absent (H not in ABOUT), O vs B = present (O in ABOUT), U vs O = present (U in ABOUT), S vs U = absent (S not in ABOUT), E vs T = absent (E not in ABOUT)
      game.pressKey('H');
      game.pressKey('O');
      game.pressKey('U');
      game.pressKey('S');
      game.pressKey('E');
      game.submitGuess();

      const statusGrid = game.getLetterStatusGrid();
      expect(statusGrid[0]).toEqual(['absent', 'present', 'present', 'absent', 'absent']);
      game.stop();
    });

    it('should provide keyboard status', () => {
      // Test with "HOUSE" against hidden word "ABOUT"
      game.pressKey('H');
      game.pressKey('O');
      game.pressKey('U');
      game.pressKey('S');
      game.pressKey('E');
      game.submitGuess();

      const keyboardStatus = game.getKeyboardStatus();
      expect(keyboardStatus['H']).toBe('absent');
      expect(keyboardStatus['O']).toBe('present');
      expect(keyboardStatus['U']).toBe('present');
      expect(keyboardStatus['S']).toBe('absent');
      expect(keyboardStatus['E']).toBe('absent');
      game.stop();
    });
  });

  describe('Game Reset', () => {
    it('should reset game state', () => {
      // Make some moves
      game.pressKey('H');
      game.pressKey('E');
      game.pressKey('L');
      game.pressKey('L');
      game.pressKey('O');
      game.submitGuess();

      // Reset
      game.resetGame();

      const state = game.getState();
      expect(state.gameState).toBe('playing');
      expect(state.currentGuess).toBe('');
      expect(state.guesses).toEqual([]);
      expect(state.attemptNumber).toBe(0);
      expect(game.isGameOver()).toBe(false);
      game.stop();
    });
  });
});