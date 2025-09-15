import { describe, it, expect, beforeEach } from 'bun:test';
import { GamePersistence, GameReplayManager } from './index';

// Simple mock for IndexedDB
let mockData = new Map<string, any>();

const createMockObjectStore = () => ({
  put: (value: any, key?: any) => {
    const actualKey = key || value.gameId || value.id;
    mockData.set(actualKey, value);
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
      result: mockData.get(key)
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
      result: Array.from(mockData.values())
    };
    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({ target: request });
      }
    }, 0);
    return request;
  },
  clear: () => {
    mockData.clear();
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

describe('Persistence Integration', () => {
  let persistence: GamePersistence;
  let replayManager: GameReplayManager;

  beforeEach(async () => {
    mockData = new Map<string, any>();
    persistence = new GamePersistence();
    replayManager = new GameReplayManager(persistence);
    await persistence.init();
  });

  it('should complete full game persistence and replay workflow', async () => {
    // 1. Save a completed game
    const savedGame = {
      id: 'integration-test',
      hiddenWord: 'WORDS',
      guesses: [
        { word: 'SWORD', letterStatus: ['absent', 'correct', 'correct', 'correct', 'absent'] },
        { word: 'WORDS', letterStatus: ['correct', 'correct', 'correct', 'correct', 'correct'] }
      ],
      outcome: 'won' as const,
      startTime: new Date('2025-01-01T10:00:00Z'),
      endTime: new Date('2025-01-01T10:05:00Z'),
      timeToComplete: 300000,
      attemptCount: 2,
      gameNumber: 1
    };

    const gameId = await persistence.saveGame(savedGame);
    expect(gameId).toBe('integration-test');

    // 2. Create and save a replay
    replayManager.startRecording('integration-test', 'WORDS');
    replayManager.recordAction('keypress', { letter: 'S' });
    replayManager.recordAction('keypress', { letter: 'W' });
    replayManager.recordAction('keypress', { letter: 'O' });
    replayManager.recordAction('keypress', { letter: 'R' });
    replayManager.recordAction('keypress', { letter: 'D' });
    replayManager.recordAction('submit', { guess: savedGame.guesses[0] });
    replayManager.finishRecording('won', 2);

    const replay = replayManager.getCompletedReplay();
    expect(replay).toBeTruthy();
    expect(replay?.outcome).toBe('won');

    if (replay) {
      await persistence.saveReplay(replay);
    }

    // 3. Verify statistics calculation
    const stats = await persistence.getStatistics();
    expect(stats.totalGames).toBe(1);
    expect(stats.gamesWon).toBe(1);
    expect(stats.winPercentage).toBe(100);
    expect(stats.averageGuesses).toBe(2);

    // 4. Verify game retrieval
    const retrievedGame = await persistence.getGame('integration-test');
    expect(retrievedGame).toBeTruthy();
    expect(retrievedGame?.hiddenWord).toBe('WORDS');

    // 5. Verify replay retrieval
    const retrievedReplay = await persistence.getReplay('integration-test');
    expect(retrievedReplay).toBeTruthy();
    expect(retrievedReplay?.steps.length).toBeGreaterThan(0);

    // 6. Test replay playback
    if (retrievedReplay) {
      const playback = replayManager.createPlayback(retrievedReplay);
      expect(playback.getTotalSteps()).toBeGreaterThan(0);
      expect(playback.hasNextStep()).toBe(true);

      const firstStep = playback.nextStep();
      expect(firstStep?.type).toBe('keypress');
      expect(firstStep?.data?.letter).toBe('S');
    }
  });

  it('should handle multiple games for statistics', async () => {
    // Save multiple games
    const games = [
      {
        id: 'game-1',
        hiddenWord: 'APPLE',
        guesses: [{ word: 'APPLE', letterStatus: ['correct', 'correct', 'correct', 'correct', 'correct'] }],
        outcome: 'won' as const,
        startTime: new Date('2025-01-01T09:00:00Z'),
        endTime: new Date('2025-01-01T09:03:00Z'),
        timeToComplete: 180000,
        attemptCount: 1,
        gameNumber: 1
      },
      {
        id: 'game-2',
        hiddenWord: 'GRAPE',
        guesses: [
          { word: 'WRONG', letterStatus: ['absent', 'correct', 'absent', 'absent', 'absent'] },
          { word: 'GRAPE', letterStatus: ['correct', 'correct', 'correct', 'correct', 'correct'] }
        ],
        outcome: 'won' as const,
        startTime: new Date('2025-01-01T09:15:00Z'),
        endTime: new Date('2025-01-01T09:20:00Z'),
        timeToComplete: 300000,
        attemptCount: 2,
        gameNumber: 2
      }
    ];

    for (const game of games) {
      await persistence.saveGame(game);
    }

    const stats = await persistence.getStatistics();
    expect(stats.totalGames).toBe(2);
    expect(stats.gamesWon).toBe(2);
    expect(stats.winPercentage).toBe(100);
    expect(stats.averageGuesses).toBe(1.5); // (1 + 2) / 2
    expect(stats.currentStreak).toBe(2);
    expect(stats.bestStreak).toBe(2);

    // Check guess distribution
    expect(stats.guessDistribution[1]).toBe(1); // One game won in 1 guess
    expect(stats.guessDistribution[2]).toBe(1); // One game won in 2 guesses
  });
});