import type { GameReplay, ReplayStep } from './types';
import type { GamePersistence } from './game-persistence';
import type { WordleGame } from '../wordle-game';
import type { GuessData } from '../wordle-machine';

/**
 * Manages recording and playback of game replays
 */
export class GameReplayManager {
  private currentRecording: GameReplay | null = null;
  private recordingStartTime: number = 0;

  constructor(private persistence: GamePersistence) {}

  /**
   * Start recording a new game replay
   */
  startRecording(gameId: string, hiddenWord: string): void {
    this.recordingStartTime = Date.now();
    this.currentRecording = {
      gameId,
      hiddenWord,
      steps: [{
        type: 'game_start',
        timestamp: 0
      }],
      duration: 0,
      outcome: 'lost', // will be updated when game ends
      finalAttemptCount: 0
    };
  }

  /**
   * Record a game action
   */
  recordAction(
    type: 'keypress' | 'backspace' | 'submit',
    data?: { letter?: string; guess?: GuessData }
  ): void {
    if (!this.currentRecording) {
      throw new Error('No recording in progress');
    }

    const timestamp = Date.now() - this.recordingStartTime;
    this.currentRecording.steps.push({
      type,
      timestamp,
      data
    });
  }

  /**
   * Finish recording and set final outcome
   */
  finishRecording(outcome: 'won' | 'lost', attemptCount: number = 0): void {
    if (!this.currentRecording) {
      throw new Error('No recording in progress');
    }

    const timestamp = Date.now() - this.recordingStartTime;
    this.currentRecording.steps.push({
      type: 'game_end',
      timestamp,
      data: { outcome }
    });

    this.currentRecording.duration = timestamp;
    this.currentRecording.outcome = outcome;
    this.currentRecording.finalAttemptCount = attemptCount;
  }

  /**
   * Get the current recording (while in progress)
   */
  getCurrentReplay(): GameReplay | null {
    return this.currentRecording;
  }

  /**
   * Get the completed recording
   */
  getCompletedReplay(): GameReplay | null {
    if (!this.currentRecording) {
      return null;
    }

    const completed = { ...this.currentRecording };
    this.currentRecording = null;
    return completed;
  }

  /**
   * Create a playback instance for a saved replay
   */
  createPlayback(replay: GameReplay): ReplayPlayback {
    return new ReplayPlayback(replay);
  }

  /**
   * Create an auto-recorder that monitors a WordleGame instance
   */
  createAutoRecorder(game: WordleGame, gameId: string): AutoRecorder {
    return new AutoRecorder(game, gameId, this);
  }
}

/**
 * Handles playback of a recorded game replay
 */
export class ReplayPlayback {
  private currentStep: number = 0;

  constructor(private replay: GameReplay) {}

  /**
   * Get the current step index
   */
  getCurrentStep(): number {
    return this.currentStep;
  }

  /**
   * Check if there are more steps to play
   */
  hasNextStep(): boolean {
    return this.currentStep < this.replay.steps.length - 1;
  }

  /**
   * Check if playback is complete
   */
  isComplete(): boolean {
    return this.currentStep >= this.replay.steps.length - 1;
  }

  /**
   * Move to the next step and return it
   */
  nextStep(): ReplayStep | null {
    if (!this.hasNextStep()) {
      return null;
    }

    this.currentStep++;
    return this.replay.steps[this.currentStep];
  }

  /**
   * Move to the previous step
   */
  previousStep(): ReplayStep | null {
    if (this.currentStep <= 0) {
      return null;
    }

    this.currentStep--;
    return this.replay.steps[this.currentStep];
  }

  /**
   * Jump to a specific step
   */
  goToStep(stepIndex: number): void {
    if (stepIndex < 0 || stepIndex >= this.replay.steps.length) {
      throw new Error('Step index out of bounds');
    }
    this.currentStep = stepIndex;
  }

  /**
   * Get the current step data
   */
  getCurrentStepData(): ReplayStep | null {
    if (this.currentStep < 0 || this.currentStep >= this.replay.steps.length) {
      return null;
    }
    return this.replay.steps[this.currentStep];
  }

  /**
   * Get total number of steps
   */
  getTotalSteps(): number {
    return this.replay.steps.length;
  }

  /**
   * Get total replay duration
   */
  getDuration(): number {
    return this.replay.duration;
  }

  /**
   * Get current playback progress (0-1)
   */
  getProgress(): number {
    if (this.replay.steps.length <= 1) {
      return 0;
    }
    return this.currentStep / (this.replay.steps.length - 1);
  }

  /**
   * Get the timestamp of the current step
   */
  getCurrentTimestamp(): number {
    const step = this.getCurrentStepData();
    return step?.timestamp || 0;
  }

  /**
   * Get all steps up to the current point
   */
  getStepsUpToCurrent(): ReplayStep[] {
    return this.replay.steps.slice(0, this.currentStep + 1);
  }

  /**
   * Reset playback to the beginning
   */
  reset(): void {
    this.currentStep = 0;
  }

  /**
   * Get replay metadata
   */
  getMetadata(): {
    gameId: string;
    hiddenWord: string;
    outcome: 'won' | 'lost';
    finalAttemptCount: number;
  } {
    return {
      gameId: this.replay.gameId,
      hiddenWord: this.replay.hiddenWord,
      outcome: this.replay.outcome,
      finalAttemptCount: this.replay.finalAttemptCount
    };
  }
}

/**
 * Automatically records game actions by monitoring a WordleGame instance
 */
export class AutoRecorder {
  private isRecording: boolean = false;
  private gameState: any = null;

  constructor(
    private game: WordleGame,
    private gameId: string,
    private replayManager: GameReplayManager
  ) {
    this.start();
  }

  /**
   * Start automatic recording
   */
  start(): void {
    if (this.isRecording) {
      return;
    }

    this.isRecording = true;
    this.gameState = this.game.getState();

    // Start recording with the hidden word
    this.replayManager.startRecording(this.gameId, this.gameState.hiddenWord);

    // Monitor game state changes
    this.monitorGameState();
  }

  /**
   * Stop automatic recording
   */
  stop(): void {
    if (!this.isRecording) {
      return;
    }

    this.isRecording = false;
    const finalState = this.game.getState();

    // Finish recording with final outcome
    const outcome = this.game.hasWon() ? 'won' : (this.game.hasLost() ? 'lost' : 'lost');
    this.replayManager.finishRecording(outcome, finalState.attemptNumber);
  }

  /**
   * Monitor game state for changes and record actions
   */
  private monitorGameState(): void {
    if (!this.isRecording) {
      return;
    }

    const newState = this.game.getState();

    // Check for new guesses
    if (newState.guesses.length > this.gameState.guesses.length) {
      const newGuess = newState.guesses[newState.guesses.length - 1];
      this.replayManager.recordAction('submit', { guess: newGuess });
    }

    // Check for current guess changes (keypress/backspace)
    if (newState.currentGuess !== this.gameState.currentGuess) {
      const oldLength = this.gameState.currentGuess.length;
      const newLength = newState.currentGuess.length;

      if (newLength > oldLength) {
        // Keypress
        const newLetter = newState.currentGuess[newLength - 1];
        this.replayManager.recordAction('keypress', { letter: newLetter });
      } else if (newLength < oldLength) {
        // Backspace
        this.replayManager.recordAction('backspace');
      }
    }

    this.gameState = newState;

    // Continue monitoring if game is not over
    if (!this.game.isGameOver() && this.isRecording) {
      setTimeout(() => this.monitorGameState(), 50); // Check every 50ms
    } else if (this.game.isGameOver()) {
      this.stop();
    }
  }
}