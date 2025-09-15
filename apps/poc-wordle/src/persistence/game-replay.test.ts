import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { GameReplayManager } from './game-replay';
import { GamePersistence } from './game-persistence';
import type { ReplayStep, GameReplay } from './types';

// Mock IndexedDB for testing (same as game-persistence.test.ts)
let mockReplayData = new Map<string, any>();

const createMockObjectStore = () => ({
  put: (value: any, key?: any) => {
    const actualKey = key || value.gameId || value.id;
    mockReplayData.set(actualKey, value);
    const request = {
      onsuccess: null as any,
      onerror: null as any,
      result: actualKey
    };
    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({ target: request });
      }
    }, 0);
    return request;
  },
  get: (key: any) => {
    const request = {
      onsuccess: null as any,
      onerror: null as any,
      result: mockReplayData.get(key)
    };
    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({ target: request });
      }
    }, 0);
    return request;
  },
  getAll: () => {
    const request = {
      onsuccess: null as any,
      onerror: null as any,
      result: Array.from(mockReplayData.values())
    };
    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({ target: request });
      }
    }, 0);
    return request;
  },
  clear: () => {
    mockReplayData.clear();
    const request = { onsuccess: null as any, onerror: null as any };
    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({ target: request });
      }
    }, 0);
    return request;
  },
  createIndex: () => {},
});

const mockDatabase = {
  transaction: () => {
    const txn = {
      objectStore: () => createMockObjectStore(),
      oncomplete: null as any,
      onerror: null as any,
    };
    setTimeout(() => {
      if (txn.oncomplete) {
        txn.oncomplete();
      }
    }, 0);
    return txn;
  },
  objectStoreNames: { contains: () => false },
  createObjectStore: () => createMockObjectStore(),
};

(globalThis as any).indexedDB = {
  open: () => {
    const request = {
      onsuccess: null as any,
      onerror: null as any,
      onupgradeneeded: null as any,
      result: mockDatabase,
    };
    setTimeout(() => {
      if (request.onupgradeneeded) {
        request.onupgradeneeded({ target: request });
      }
      if (request.onsuccess) {
        request.onsuccess({ target: request });
      }
    }, 0);
    return request;
  },
};

describe('GameReplayManager', () => {
  let replayManager: GameReplayManager;
  let persistence: GamePersistence;

  beforeEach(async () => {
    // Reset mock data between tests
    mockReplayData = new Map<string, any>();
    persistence = new GamePersistence();
    replayManager = new GameReplayManager(persistence);
    await persistence.init();
  });

  afterEach(async () => {
    if (persistence) {
      await persistence.clearAll();
    }
    mockReplayData.clear();
  });

  describe('Recording Game Actions', () => {
    it('should record keypress actions', () => {
      const gameId = 'test-game';
      replayManager.startRecording(gameId, 'STACK');

      replayManager.recordAction('keypress', { letter: 'S' });
      replayManager.recordAction('keypress', { letter: 'T' });
      replayManager.recordAction('keypress', { letter: 'A' });

      const replay = replayManager.getCurrentReplay();
      expect(replay?.steps).toHaveLength(4); // including game_start
      expect(replay?.steps[1]).toEqual({
        type: 'keypress',
        timestamp: expect.any(Number),
        data: { letter: 'S' }
      });
    });

    it('should record backspace actions', () => {
      const gameId = 'test-game';
      replayManager.startRecording(gameId, 'STACK');

      replayManager.recordAction('keypress', { letter: 'S' });
      replayManager.recordAction('backspace');

      const replay = replayManager.getCurrentReplay();
      expect(replay?.steps).toHaveLength(3); // game_start, keypress, backspace
      expect(replay?.steps[2]).toEqual({
        type: 'backspace',
        timestamp: expect.any(Number),
        data: undefined
      });
    });

    it('should record guess submissions', () => {
      const gameId = 'test-game';
      replayManager.startRecording(gameId, 'STACK');

      const guess = {
        word: 'HELLO',
        letterStatus: ['absent', 'absent', 'absent', 'absent', 'absent'] as const
      };

      replayManager.recordAction('submit', { guess });

      const replay = replayManager.getCurrentReplay();
      expect(replay?.steps[1]).toEqual({
        type: 'submit',
        timestamp: expect.any(Number),
        data: { guess }
      });
    });

    it('should record game completion', () => {
      const gameId = 'test-game';
      replayManager.startRecording(gameId, 'STACK');

      replayManager.finishRecording('won');

      const replay = replayManager.getCompletedReplay();
      expect(replay?.outcome).toBe('won');
      expect(replay?.steps[replay.steps.length - 1]).toEqual({
        type: 'game_end',
        timestamp: expect.any(Number),
        data: { outcome: 'won' }
      });
    });
  });

  describe('Replay Playback', () => {
    it('should create a playback instance from saved replay', async () => {
      // Create and save a replay
      const gameId = 'replay-test';
      replayManager.startRecording(gameId, 'STACK');
      replayManager.recordAction('keypress', { letter: 'S' });
      replayManager.recordAction('keypress', { letter: 'T' });
      replayManager.recordAction('keypress', { letter: 'A' });
      replayManager.recordAction('keypress', { letter: 'C' });
      replayManager.recordAction('keypress', { letter: 'K' });
      replayManager.recordAction('submit', {
        guess: {
          word: 'STACK',
          letterStatus: ['correct', 'correct', 'correct', 'correct', 'correct']
        }
      });
      replayManager.finishRecording('won');

      const replay = replayManager.getCompletedReplay();
      await persistence.saveReplay(replay!);

      // Load and create playback
      const loadedReplay = await persistence.getReplay(gameId);
      const playback = replayManager.createPlayback(loadedReplay!);

      expect(playback).toBeDefined();
      expect(playback.isComplete()).toBe(false);
      expect(playback.getCurrentStep()).toBe(0);
    });

    it('should step through replay actions', async () => {
      const replay: GameReplay = {
        gameId: 'step-test',
        hiddenWord: 'WORDS',
        steps: [
          { type: 'game_start', timestamp: 0 },
          { type: 'keypress', timestamp: 100, data: { letter: 'W' } },
          { type: 'keypress', timestamp: 200, data: { letter: 'O' } },
          { type: 'keypress', timestamp: 300, data: { letter: 'R' } },
          { type: 'keypress', timestamp: 400, data: { letter: 'D' } },
          { type: 'keypress', timestamp: 500, data: { letter: 'S' } },
          { type: 'submit', timestamp: 600, data: {
            guess: {
              word: 'WORDS',
              letterStatus: ['correct', 'correct', 'correct', 'correct', 'correct']
            }
          }},
          { type: 'game_end', timestamp: 700, data: { outcome: 'won' } }
        ],
        duration: 700,
        outcome: 'won',
        finalAttemptCount: 1
      };

      const playback = replayManager.createPlayback(replay);

      // Step through each action
      expect(playback.getCurrentStep()).toBe(0);
      expect(playback.hasNextStep()).toBe(true);

      const step1 = playback.nextStep();
      expect(step1?.type).toBe('keypress');
      expect(step1?.data?.letter).toBe('W');

      const step2 = playback.nextStep();
      expect(step2?.type).toBe('keypress');
      expect(step2?.data?.letter).toBe('O');

      // Jump to specific step
      playback.goToStep(6); // submit step (index 6 in the array)
      const submitStep = playback.getCurrentStepData();
      expect(submitStep?.type).toBe('submit');
      expect(submitStep?.data?.guess?.word).toBe('WORDS');
    });

    it('should provide playback state information', async () => {
      const replay: GameReplay = {
        gameId: 'state-test',
        hiddenWord: 'HELLO',
        steps: [
          { type: 'game_start', timestamp: 0 },
          { type: 'keypress', timestamp: 100, data: { letter: 'H' } },
          { type: 'keypress', timestamp: 200, data: { letter: 'E' } },
          { type: 'game_end', timestamp: 300, data: { outcome: 'lost' } }
        ],
        duration: 300,
        outcome: 'lost',
        finalAttemptCount: 6
      };

      const playback = replayManager.createPlayback(replay);

      expect(playback.getTotalSteps()).toBe(4);
      expect(playback.getDuration()).toBe(300);
      expect(playback.getProgress()).toBe(0); // at beginning

      playback.nextStep();
      playback.nextStep();
      expect(playback.getProgress()).toBeCloseTo(0.67, 1); // 2/3 through
    });
  });

  describe('Automatic Recording Integration', () => {
    it.skip('should automatically record a complete game', () => {
      // TODO: Implement auto-recording tests with proper mocking
      expect(true).toBe(true);
    });

    it.skip('should handle backspace actions in auto recording', () => {
      // TODO: Implement auto-recording tests with proper mocking
      expect(true).toBe(true);
    });
  });

  describe('Replay Persistence', () => {
    it('should save and load replay data', async () => {
      const replay: GameReplay = {
        gameId: 'persist-test',
        hiddenWord: 'SAVED',
        steps: [
          { type: 'game_start', timestamp: 0 },
          { type: 'keypress', timestamp: 100, data: { letter: 'S' } },
          { type: 'game_end', timestamp: 200, data: { outcome: 'lost' } }
        ],
        duration: 200,
        outcome: 'lost',
        finalAttemptCount: 6
      };

      await persistence.saveReplay(replay);
      const loadedReplay = await persistence.getReplay('persist-test');

      expect(loadedReplay).toEqual(replay);
    });

    it('should list all available replays', async () => {
      const replay1: GameReplay = {
        gameId: 'list-1',
        hiddenWord: 'FIRST',
        steps: [{ type: 'game_start', timestamp: 0 }],
        duration: 100,
        outcome: 'won',
        finalAttemptCount: 1
      };

      const replay2: GameReplay = {
        gameId: 'list-2',
        hiddenWord: 'SECOND',
        steps: [{ type: 'game_start', timestamp: 0 }],
        duration: 200,
        outcome: 'lost',
        finalAttemptCount: 6
      };

      await persistence.saveReplay(replay1);
      await persistence.saveReplay(replay2);

      const allReplays = await persistence.getAllReplays();
      expect(allReplays).toHaveLength(2);
      expect(allReplays).toContainEqual(replay1);
      expect(allReplays).toContainEqual(replay2);
    });
  });
});