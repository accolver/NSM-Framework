/**
 * Clean logging utility for Wordle game
 * Focuses only on state transitions and important game events
 */

import { getLoggingConfig } from '../config/logging';

export type GameLogLevel = 'state' | 'guess' | 'error' | 'game';

export interface GameLogEntry {
  level: GameLogLevel;
  message: string;
  data?: any;
  timestamp: Date;
}

export class GameLogger {
  private static instance: GameLogger;
  private logs: GameLogEntry[] = [];
  private config = getLoggingConfig();

  private constructor() {}

  static getInstance(): GameLogger {
    if (!GameLogger.instance) {
      GameLogger.instance = new GameLogger();
    }
    return GameLogger.instance;
  }

  setEnabled(enabled: boolean): void {
    this.config.gameLogger.enabled = enabled;
  }

  private log(level: GameLogLevel, message: string, data?: any): void {
    if (!this.config.gameLogger.enabled || !this.config.gameLogger.levels.includes(level)) {
      return;
    }

    const entry: GameLogEntry = {
      level,
      message,
      data,
      timestamp: new Date()
    };

    this.logs.push(entry);

    // Format and output to console
    const timeStr = entry.timestamp.toISOString().split('T')[1].slice(0, 8);
    const levelEmoji = this.getLevelEmoji(level);
    const prefix = `[${timeStr}] ${levelEmoji} [${level.toUpperCase()}]`;

    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  private getLevelEmoji(level: GameLogLevel): string {
    switch (level) {
      case 'state': return '🔄';
      case 'guess': return '📝';
      case 'error': return '❌';
      case 'game': return '🎮';
      default: return '📋';
    }
  }

  // State transition logging
  logStateTransition(from: string, to: string, context?: any): void {
    const contextData = context ? {
      currentGuess: context.currentGuess,
      attemptNumber: context.attemptNumber,
      gameOver: context.gameOver
    } : undefined;

    this.log('state', `${from} → ${to}`, contextData);
  }

  // Guess submission logging
  logGuessSubmitted(word: string, result: 'valid' | 'invalid' | 'win' | 'lose', details?: any): void {
    const status = result === 'valid' ? '✅' :
                   result === 'invalid' ? '❌' :
                   result === 'win' ? '🏆' :
                   result === 'lose' ? '💀' : '❓';

    this.log('guess', `${status} '${word}' ${result}`, details);
  }

  // Game event logging
  logGameEvent(event: string, data?: any): void {
    this.log('game', event, data);
  }

  // Error logging
  logError(message: string, error?: any): void {
    this.log('error', message, error);
  }

  // Get logs for debugging
  getLogs(): GameLogEntry[] {
    return [...this.logs];
  }

  // Clear logs
  clearLogs(): void {
    this.logs = [];
  }

  // Enable/disable specific log levels
  setEnabledLevels(levels: GameLogLevel[]): void {
    this.config.gameLogger.levels = levels;
  }

  isLevelEnabled(level: GameLogLevel): boolean {
    return this.config.gameLogger.levels.includes(level);
  }
}

// Export singleton instance
export const gameLogger = GameLogger.getInstance();

// Convenience functions
export const logStateTransition = (from: string, to: string, context?: any) =>
  gameLogger.logStateTransition(from, to, context);

export const logGuessSubmitted = (word: string, result: 'valid' | 'invalid' | 'win' | 'lose', details?: any) =>
  gameLogger.logGuessSubmitted(word, result, details);

export const logGameEvent = (event: string, data?: any) =>
  gameLogger.logGameEvent(event, data);

export const logError = (message: string, error?: any) =>
  gameLogger.logError(message, error);