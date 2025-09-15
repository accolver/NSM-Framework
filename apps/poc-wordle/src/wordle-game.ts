import { createActor } from 'xstate';
import { wordleMachine, createWordleMachine, type WordleContext, type WordleEvent } from './wordle-machine';

/**
 * Wordle Game wrapper class that provides a clean API for interacting with the state machine
 */
export class WordleGame {
  private actor: any;

  constructor(hiddenWord?: string) {
    const machine = hiddenWord ? createWordleMachine(hiddenWord) : wordleMachine;
    this.actor = createActor(machine);
  }

  /**
   * Start the game
   */
  start(): void {
    this.actor.start();
  }

  /**
   * Stop the game
   */
  stop(): void {
    this.actor.stop();
  }

  /**
   * Get current game state
   */
  getState(): WordleContext & { gameState: string } {
    const snapshot = this.actor.getSnapshot();
    return {
      ...snapshot.context,
      gameState: snapshot.value as string
    };
  }

  /**
   * Send a letter keypress
   */
  pressKey(letter: string): void {
    this.actor.send({ type: 'KEYPRESS', letter: letter.toUpperCase() });
  }

  /**
   * Send backspace
   */
  backspace(): void {
    this.actor.send({ type: 'BACKSPACE' });
  }

  /**
   * Submit current guess
   */
  submitGuess(): void {
    this.actor.send({ type: 'SUBMIT_GUESS' });
  }

  /**
   * Reset the game
   */
  resetGame(): void {
    this.actor.send({ type: 'RESET_GAME' });
  }

  /**
   * Check if game is over (won or lost)
   */
  isGameOver(): boolean {
    const state = this.getState();
    return state.gameOver;
  }

  /**
   * Check if player won
   */
  hasWon(): boolean {
    const state = this.getState();
    return state.gameState === 'won';
  }

  /**
   * Check if player lost
   */
  hasLost(): boolean {
    const state = this.getState();
    return state.gameState === 'lost';
  }

  /**
   * Get the current word grid for display
   */
  getWordGrid(): (string | null)[][] {
    const state = this.getState();
    const grid: (string | null)[][] = [];

    // Add completed guesses
    for (const guess of state.guesses) {
      grid.push(guess.word.split(''));
    }

    // Add current guess if game is still playing
    if (state.gameState === 'playing') {
      const currentRow = state.currentGuess.split('');
      while (currentRow.length < 5) {
        currentRow.push(null);
      }
      grid.push(currentRow);
    }

    // Add empty rows
    while (grid.length < 6) {
      grid.push([null, null, null, null, null]);
    }

    return grid;
  }

  /**
   * Get letter status grid for styling
   */
  getLetterStatusGrid(): (string | null)[][] {
    const state = this.getState();
    const grid: (string | null)[][] = [];

    // Add completed guesses with status
    for (const guess of state.guesses) {
      grid.push(guess.letterStatus);
    }

    // Add empty rows
    while (grid.length < 6) {
      grid.push([null, null, null, null, null]);
    }

    return grid;
  }

  /**
   * Get keyboard letter status for visual keyboard
   */
  getKeyboardStatus(): Record<string, string> {
    const state = this.getState();
    const keyStatus: Record<string, string> = {};

    // Process all guesses to determine letter status
    for (const guess of state.guesses) {
      for (let i = 0; i < guess.word.length; i++) {
        const letter = guess.word[i];
        const status = guess.letterStatus[i];

        // Priority: correct > present > absent
        if (keyStatus[letter] === 'correct') continue;
        if (keyStatus[letter] === 'present' && status === 'absent') continue;

        keyStatus[letter] = status;
      }
    }

    return keyStatus;
  }
}