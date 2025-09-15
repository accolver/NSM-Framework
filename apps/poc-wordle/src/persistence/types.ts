import { GuessData } from '../wordle-machine';

/**
 * Saved game data structure
 */
export interface SavedGame {
  id: string;
  hiddenWord: string;
  guesses: GuessData[];
  outcome: 'won' | 'lost';
  startTime: Date;
  endTime: Date;
  timeToComplete: number; // milliseconds
  attemptCount: number;
  gameNumber: number; // sequential game number for streak calculation
}

/**
 * Game statistics aggregated from saved games
 */
export interface GameStatistics {
  totalGames: number;
  gamesWon: number;
  gamesLost: number;
  winPercentage: number;
  currentStreak: number;
  bestStreak: number;
  averageGuesses: number; // average for won games only
  averageTime: number; // average time for won games only (milliseconds)
  guessDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
    6: number;
  };
  lastPlayed?: Date;
  fastestWin?: number; // fastest completion time in milliseconds
  currentGameNumber: number; // next game number to assign
}

/**
 * Replay step represents a single action in game replay
 */
export interface ReplayStep {
  type: 'keypress' | 'backspace' | 'submit' | 'game_start' | 'game_end';
  timestamp: number; // milliseconds from game start
  data?: {
    letter?: string; // for keypress
    guess?: GuessData; // for submit
    outcome?: 'won' | 'lost'; // for game_end
  };
}

/**
 * Replay data for a complete game
 */
export interface GameReplay {
  gameId: string;
  hiddenWord: string;
  steps: ReplayStep[];
  duration: number; // total game duration in milliseconds
  outcome: 'won' | 'lost';
  finalAttemptCount: number;
}

/**
 * Configuration for storage management
 */
export interface StorageConfig {
  maxGames: number; // maximum games to keep in storage
  maxAge: number; // maximum age of games in milliseconds
  enableReplay: boolean; // whether to save replay data
  compressionLevel: 'none' | 'basic' | 'aggressive';
}

/**
 * Storage usage information
 */
export interface StorageInfo {
  usedBytes: number;
  availableBytes: number;
  gameCount: number;
  oldestGame?: Date;
  newestGame?: Date;
}