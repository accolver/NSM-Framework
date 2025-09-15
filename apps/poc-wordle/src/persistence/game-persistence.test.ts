import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { GamePersistence } from './game-persistence';

// Mock IndexedDB for testing
let mockData = new Map<string, any>();

const createMockObjectStore = () => ({
  put: (value: any, key?: any) => {
    const actualKey = key || value.id;
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
  delete: (key: any) => {
    const deleted = mockData.delete(key);
    const request = {
      onsuccess: null as any,
      onerror: null as any,
      result: deleted
    };
    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({ target: request });
      }
    }, 0);
    return request;
  },
  createIndex: () => {},
});

const mockTransaction = {
  objectStore: () => mockObjectStore,
  oncomplete: null as any,
  onerror: null as any,

  // Simulate transaction completion
  complete: function() {
    setTimeout(() => {
      if (this.oncomplete) {
        this.oncomplete();
      }
    }, 0);
  }
};

const mockDatabase = {
  transaction: () => {
    const txn = {
      objectStore: () => createMockObjectStore(),
      oncomplete: null as any,
      onerror: null as any,
    };
    // Auto-complete transaction after microtask
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

// Global mock setup
(globalThis as any).indexedDB = {
  open: () => {
    const request = {
      onsuccess: null as any,
      onerror: null as any,
      onupgradeneeded: null as any,
      result: mockDatabase,
    };
    // Simulate database upgrade first, then success
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

describe('GamePersistence', () => {
  let persistence: GamePersistence;

  beforeEach(async () => {
    // Reset mock data between tests
    mockData = new Map<string, any>();
    persistence = new GamePersistence();
    await persistence.init();
  });

  afterEach(async () => {
    if (persistence) {
      await persistence.clearAll();
    }
    mockData.clear();
  });

  describe('Game Storage', () => {
    it('should save a completed game', async () => {
      const gameId = await persistence.saveGame({
        id: 'test-game-1',
        hiddenWord: 'STACK',
        guesses: [{
          word: 'STACK',
          letterStatus: ['correct', 'correct', 'correct', 'correct', 'correct']
        }],
        outcome: 'won',
        startTime: new Date('2025-01-01T10:00:00Z'),
        endTime: new Date('2025-01-01T10:05:00Z'),
        timeToComplete: 300000, // 5 minutes
        attemptCount: 1,
        gameNumber: 1
      });

      expect(gameId).toBe('test-game-1');
    });

    it('should load a saved game', async () => {
      const savedGame = {
        id: 'test-game-2',
        hiddenWord: 'WORDS',
        guesses: [
          { word: 'SWORD', letterStatus: ['absent', 'correct', 'correct', 'correct', 'absent'] }
        ],
        outcome: 'lost' as const,
        startTime: new Date('2025-01-01T11:00:00Z'),
        endTime: new Date('2025-01-01T11:10:00Z'),
        timeToComplete: 600000,
        attemptCount: 6,
        gameNumber: 2
      };

      await persistence.saveGame(savedGame);
      const loadedGame = await persistence.getGame('test-game-2');

      expect(loadedGame).toEqual(savedGame);
    });

    it('should get all saved games', async () => {
      const game1 = {
        id: 'game-1',
        hiddenWord: 'APPLE',
        guesses: [],
        outcome: 'won' as const,
        startTime: new Date('2025-01-01T09:00:00Z'),
        endTime: new Date('2025-01-01T09:03:00Z'),
        timeToComplete: 180000,
        attemptCount: 3,
        gameNumber: 1
      };

      const game2 = {
        id: 'game-2',
        hiddenWord: 'GRAPE',
        guesses: [],
        outcome: 'lost' as const,
        startTime: new Date('2025-01-01T09:15:00Z'),
        endTime: new Date('2025-01-01T09:25:00Z'),
        timeToComplete: 600000,
        attemptCount: 6,
        gameNumber: 2
      };

      await persistence.saveGame(game1);
      await persistence.saveGame(game2);

      const allGames = await persistence.getAllGames();
      expect(allGames).toHaveLength(2);
      expect(allGames).toContainEqual(game1);
      expect(allGames).toContainEqual(game2);
    });

    it('should delete a saved game', async () => {
      const game = {
        id: 'delete-test',
        hiddenWord: 'HELLO',
        guesses: [],
        outcome: 'won' as const,
        startTime: new Date(),
        endTime: new Date(),
        timeToComplete: 120000,
        attemptCount: 2,
        gameNumber: 1
      };

      await persistence.saveGame(game);
      await persistence.deleteGame('delete-test');

      const loadedGame = await persistence.getGame('delete-test');
      expect(loadedGame).toBeNull();
    });
  });

  describe('Statistics Tracking', () => {
    it('should calculate basic statistics', async () => {
      // Save multiple games with different outcomes
      const games = [
        { id: '1', outcome: 'won', attemptCount: 3, timeToComplete: 180000 },
        { id: '2', outcome: 'won', attemptCount: 4, timeToComplete: 240000 },
        { id: '3', outcome: 'lost', attemptCount: 6, timeToComplete: 360000 },
        { id: '4', outcome: 'won', attemptCount: 5, timeToComplete: 300000 },
        { id: '5', outcome: 'won', attemptCount: 2, timeToComplete: 120000 }
      ];

      for (const game of games) {
        await persistence.saveGame({
          ...game,
          hiddenWord: 'WORDS',
          guesses: [],
          startTime: new Date(),
          endTime: new Date(),
          gameNumber: parseInt(game.id)
        });
      }

      const stats = await persistence.getStatistics();

      expect(stats.totalGames).toBe(5);
      expect(stats.gamesWon).toBe(4);
      expect(stats.gamesLost).toBe(1);
      expect(stats.winPercentage).toBe(80);
      expect(stats.averageGuesses).toBe(3.5); // (3+4+5+2)/4 = 3.5 for won games
      expect(stats.averageTime).toBe(210000); // (180+240+300+120)/4 = 210 seconds for won games
    });

    it('should calculate guess distribution', async () => {
      const games = [
        { id: '1', outcome: 'won', attemptCount: 3 },
        { id: '2', outcome: 'won', attemptCount: 3 },
        { id: '3', outcome: 'won', attemptCount: 4 },
        { id: '4', outcome: 'won', attemptCount: 5 },
        { id: '5', outcome: 'lost', attemptCount: 6 }
      ];

      for (const game of games) {
        await persistence.saveGame({
          ...game,
          hiddenWord: 'WORDS',
          guesses: [],
          startTime: new Date(),
          endTime: new Date(),
          timeToComplete: 180000,
          gameNumber: parseInt(game.id)
        });
      }

      const stats = await persistence.getStatistics();

      expect(stats.guessDistribution).toEqual({
        1: 0,
        2: 0,
        3: 2,
        4: 1,
        5: 1,
        6: 0
      });
    });

    it('should calculate current streak', async () => {
      // Create games in chronological order
      const games = [
        { id: '1', outcome: 'won', gameNumber: 1 },
        { id: '2', outcome: 'won', gameNumber: 2 },
        { id: '3', outcome: 'lost', gameNumber: 3 },
        { id: '4', outcome: 'won', gameNumber: 4 },
        { id: '5', outcome: 'won', gameNumber: 5 }
      ];

      for (const game of games) {
        await persistence.saveGame({
          ...game,
          hiddenWord: 'WORDS',
          guesses: [],
          startTime: new Date(),
          endTime: new Date(),
          timeToComplete: 180000,
          attemptCount: 3
        });
      }

      const stats = await persistence.getStatistics();

      expect(stats.currentStreak).toBe(2); // Last 2 games were won
      expect(stats.bestStreak).toBe(2); // Best streak is 2 (games 1-2 or 4-5)
    });
  });

  describe('Data Management', () => {
    it('should handle storage quota limits', async () => {
      // This test would mock storage quota exceeded scenarios
      const largeGame = {
        id: 'large-game',
        hiddenWord: 'WORDS',
        guesses: Array(100).fill({
          word: 'LARGE',
          letterStatus: ['absent', 'absent', 'absent', 'absent', 'absent']
        }),
        outcome: 'won' as const,
        startTime: new Date(),
        endTime: new Date(),
        timeToComplete: 180000,
        attemptCount: 3,
        gameNumber: 1
      };

      const result = await persistence.saveGame(largeGame);
      expect(result).toBe('large-game');
    });

    it('should clean up old games when storage is full', async () => {
      // Save many games to trigger cleanup
      for (let i = 1; i <= 100; i++) {
        await persistence.saveGame({
          id: `game-${i}`,
          hiddenWord: 'WORDS',
          guesses: [],
          outcome: i % 2 === 0 ? 'won' : 'lost',
          startTime: new Date(2025, 0, i),
          endTime: new Date(2025, 0, i),
          timeToComplete: 180000,
          attemptCount: 3,
          gameNumber: i
        });
      }

      // Should maintain reasonable number of games
      const allGames = await persistence.getAllGames();
      expect(allGames.length).toBeLessThanOrEqual(50); // Assuming max 50 games kept
    });
  });
});