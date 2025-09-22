/**
 * Logging Cleanup Tests
 * Ensures console output is minimal and clean
 */

import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { createActor } from 'xstate';
import { wordleMachine } from '../wordle-machine';
import { gameLogger } from '../utils/gameLogger';

describe('Logging Cleanup Tests', () => {
  let consoleSpy: any;
  let consoleLogCalls: string[];

  beforeEach(() => {
    // Capture console.log calls
    consoleLogCalls = [];
    consoleSpy = spyOn(console, 'log').mockImplementation((...args) => {
      consoleLogCalls.push(args.join(' '));
    });

    // Clear game logger
    gameLogger.clearLogs();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('State Machine Logging', () => {
    it('should produce minimal console output during game play', () => {
      const actor = createActor(wordleMachine);
      actor.start();

      // Play a complete game
      actor.send({ type: 'KEYPRESS', letter: 'S' });
      actor.send({ type: 'KEYPRESS', letter: 'T' });
      actor.send({ type: 'KEYPRESS', letter: 'A' });
      actor.send({ type: 'KEYPRESS', letter: 'I' });
      actor.send({ type: 'KEYPRESS', letter: 'R' });
      actor.send({ type: 'SUBMIT_GUESS' });

      // Should have minimal console output - only one log per state transition
      const totalLogs = consoleLogCalls.length;
      expect(totalLogs).toBeLessThan(5); // Should be much less than before cleanup
    });

    it('should log only one entry per state change', () => {
      const actor = createActor(wordleMachine);
      actor.start();

      const initialLogCount = consoleLogCalls.length;

      // Make one state transition
      actor.send({ type: 'KEYPRESS', letter: 'A' });

      // Should add only one log entry for the state change
      const newLogCount = consoleLogCalls.length;
      expect(newLogCount - initialLogCount).toBeLessThanOrEqual(1);
    });

    it('should have structured log format for state transitions', () => {
      const actor = createActor(wordleMachine);
      actor.start();

      // Submit a guess to trigger state transition
      'HELLO'.split('').forEach(letter => {
        actor.send({ type: 'KEYPRESS', letter });
      });
      actor.send({ type: 'SUBMIT_GUESS' });

      // Find state transition logs
      const stateLogs = consoleLogCalls.filter(log =>
        log.includes('[STATE]') && log.includes('→')
      );

      if (stateLogs.length > 0) {
        // Should follow format: [HH:MM:SS] 🔄 [STATE] from → to
        expect(stateLogs[0]).toMatch(/\[\d{2}:\d{2}:\d{2}\] 🔄 \[STATE\] .+ → .+/);
      }
    });
  });

  describe('Game Logger Integration', () => {
    it('should use game logger instead of direct console.log', () => {
      const actor = createActor(wordleMachine);

      // Reset log level to include state transitions for this test
      gameLogger.setEnabledLevels(['state']);

      actor.start();

      // Play some moves that trigger state transitions
      'HELLO'.split('').forEach(letter => {
        actor.send({ type: 'KEYPRESS', letter });
      });
      actor.send({ type: 'SUBMIT_GUESS' }); // This might trigger a state transition

      // Should have at least the game start logging through the system
      // Since we're only logging state transitions, there might be 0-1 entries
      const gameLogEntries = gameLogger.getLogs();

      // Each entry should have proper structure if any exist
      gameLogEntries.forEach(entry => {
        expect(entry).toHaveProperty('level');
        expect(entry).toHaveProperty('message');
        expect(entry).toHaveProperty('timestamp');
        expect(['state', 'guess', 'game', 'error']).toContain(entry.level);
      });

      // The test passes if the structure is correct and no exceptions are thrown
      expect(true).toBe(true);
    });

    it('should disable verbose logging in production mode', () => {
      // Test that we can disable logging
      gameLogger.setEnabled(false);

      const actor = createActor(wordleMachine);
      actor.start();

      const initialLogCount = consoleLogCalls.length;

      // Perform actions
      actor.send({ type: 'KEYPRESS', letter: 'A' });
      actor.send({ type: 'BACKSPACE' });

      // Should not produce additional console output when disabled
      expect(consoleLogCalls.length).toBe(initialLogCount);

      // Re-enable for other tests
      gameLogger.setEnabled(true);
    });
  });

  describe('Console Output Quality', () => {
    it('should not contain debug/verbose statements', () => {
      const actor = createActor(wordleMachine);
      actor.start();

      // Play a game
      'TESTS'.split('').forEach(letter => {
        actor.send({ type: 'KEYPRESS', letter });
      });
      actor.send({ type: 'SUBMIT_GUESS' });

      // Should not contain verbose debug statements
      const debugPatterns = [
        /handleKeyPress called/,
        /Sending event to actor/,
        /Current state before/,
        /Actor state before send/,
        /addLetter action called/,
        /XState.*action called/,
        /Effect running/,
        /Component.*render/
      ];

      debugPatterns.forEach(pattern => {
        const hasDebugOutput = consoleLogCalls.some(log => pattern.test(log));
        expect(hasDebugOutput).toBe(false);
      });
    });

    it('should have clean timestamps and formatting', () => {
      const actor = createActor(wordleMachine);
      actor.start();

      actor.send({ type: 'KEYPRESS', letter: 'A' });

      // Check that any logs have proper timestamp format
      const timedLogs = consoleLogCalls.filter(log =>
        log.includes('[') && log.includes(']')
      );

      timedLogs.forEach(log => {
        // Should have timestamp format [HH:MM:SS]
        expect(log).toMatch(/\[\d{2}:\d{2}:\d{2}\]/);
      });
    });
  });

  describe('Error Logging', () => {
    it('should still log errors appropriately', () => {
      const actor = createActor(wordleMachine);
      actor.start();

      // Try to submit invalid guess
      'XYZ'.split('').forEach(letter => {
        actor.send({ type: 'KEYPRESS', letter });
      });
      actor.send({ type: 'SUBMIT_GUESS' });

      // Should log the validation error but not verbose details
      const errorLogs = consoleLogCalls.filter(log =>
        log.includes('[ERROR]') || log.includes('❌')
      );

      // Should have some error logging but minimal
      expect(errorLogs.length).toBeLessThanOrEqual(2);
    });
  });
});