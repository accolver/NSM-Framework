/**
 * Tests for the clean game logger
 */

import { GameLogger, gameLogger } from './gameLogger';

// Mock console methods
const originalConsoleLog = console.log;
const mockConsoleLog = jest.fn();

beforeEach(() => {
  console.log = mockConsoleLog;
  gameLogger.clearLogs();
  gameLogger.setEnabled(true);
  gameLogger.setEnabledLevels(['state', 'guess', 'game', 'error']);
  mockConsoleLog.mockClear();
});

afterAll(() => {
  console.log = originalConsoleLog;
});

describe('GameLogger', () => {
  it('should be a singleton', () => {
    const instance1 = GameLogger.getInstance();
    const instance2 = GameLogger.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should log state transitions with proper format', () => {
    gameLogger.logStateTransition('playing', 'won', { currentGuess: 'WORDS' });

    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringMatching(/\[\d{2}:\d{2}:\d{2}\] 🔄 \[STATE\] playing → won/),
      { currentGuess: 'WORDS', attemptNumber: undefined, gameOver: undefined }
    );
  });

  it('should log guess submissions with proper format', () => {
    gameLogger.logGuessSubmitted('CRANE', 'valid', { letterStatus: ['correct', 'absent', 'present', 'absent', 'correct'] });

    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringMatching(/\[\d{2}:\d{2}:\d{2}\] 📝 \[GUESS\] ✅ 'CRANE' valid/),
      { letterStatus: ['correct', 'absent', 'present', 'absent', 'correct'] }
    );
  });

  it('should log invalid guesses with proper format', () => {
    gameLogger.logGuessSubmitted('XYZZZ', 'invalid', { reason: 'Word not in dictionary' });

    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringMatching(/\[\d{2}:\d{2}:\d{2}\] 📝 \[GUESS\] ❌ 'XYZZZ' invalid/),
      { reason: 'Word not in dictionary' }
    );
  });

  it('should log winning guesses with proper format', () => {
    gameLogger.logGuessSubmitted('WORDS', 'win', { attempts: 3, hiddenWord: 'WORDS' });

    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringMatching(/\[\d{2}:\d{2}:\d{2}\] 📝 \[GUESS\] 🏆 'WORDS' win/),
      { attempts: 3, hiddenWord: 'WORDS' }
    );
  });

  it('should log game events', () => {
    gameLogger.logGameEvent('New game started', { hiddenWord: 'TESTS' });

    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringMatching(/\[\d{2}:\d{2}:\d{2}\] 🎮 \[GAME\] New game started/),
      { hiddenWord: 'TESTS' }
    );
  });

  it('should log errors', () => {
    gameLogger.logError('Validation failed', { code: 'INVALID_WORD' });

    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringMatching(/\[\d{2}:\d{2}:\d{2}\] ❌ \[ERROR\] Validation failed/),
      { code: 'INVALID_WORD' }
    );
  });

  it('should store logs for retrieval', () => {
    gameLogger.logStateTransition('playing', 'won');
    gameLogger.logGuessSubmitted('WORDS', 'win');

    const logs = gameLogger.getLogs();
    expect(logs).toHaveLength(2);
    expect(logs[0].level).toBe('state');
    expect(logs[1].level).toBe('guess');
  });

  it('should clear logs', () => {
    gameLogger.logGameEvent('Test event');
    expect(gameLogger.getLogs()).toHaveLength(1);

    gameLogger.clearLogs();
    expect(gameLogger.getLogs()).toHaveLength(0);
  });

  it('should respect enabled/disabled state', () => {
    gameLogger.setEnabled(false);
    gameLogger.logGameEvent('Should not appear');

    expect(mockConsoleLog).not.toHaveBeenCalled();

    gameLogger.setEnabled(true);
    gameLogger.logGameEvent('Should appear');

    expect(mockConsoleLog).toHaveBeenCalled();
  });

  it('should respect enabled log levels', () => {
    gameLogger.setEnabledLevels(['state', 'error']);

    gameLogger.logStateTransition('playing', 'won');
    gameLogger.logGuessSubmitted('WORDS', 'valid'); // This should be filtered out
    gameLogger.logError('Test error');

    expect(mockConsoleLog).toHaveBeenCalledTimes(2); // Only state and error logs
  });

  it('should format timestamps correctly', () => {
    gameLogger.logGameEvent('Test');

    expect(mockConsoleLog).toHaveBeenCalled();
    const logCall = mockConsoleLog.mock.calls[0][0];
    expect(logCall).toMatch(/\[\d{2}:\d{2}:\d{2}\]/);
  });
});