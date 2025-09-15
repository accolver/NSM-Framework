/**
 * Demo script showing persistence and replay functionality
 * This would be used in a real app to demonstrate the features
 */
import { GamePersistence, GameReplayManager } from './index';
import type { SavedGame, GameReplay } from './types';

// Mock IndexedDB for demo
if (typeof globalThis !== 'undefined' && !globalThis.indexedDB) {
  const mockData = new Map<string, any>();

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
}

export async function demonstratePersistence(): Promise<string> {
  const results: string[] = [];

  try {
    // Initialize persistence
    const persistence = new GamePersistence();
    const replayManager = new GameReplayManager(persistence);
    await persistence.init();

    results.push('✅ Persistence initialized successfully');

    // Demo 1: Save a completed game
    const game1: SavedGame = {
      id: 'demo-game-1',
      hiddenWord: 'STACK',
      guesses: [{
        word: 'STACK',
        letterStatus: ['correct', 'correct', 'correct', 'correct', 'correct']
      }],
      outcome: 'won',
      startTime: new Date('2025-01-15T10:00:00Z'),
      endTime: new Date('2025-01-15T10:02:00Z'),
      timeToComplete: 120000, // 2 minutes
      attemptCount: 1,
      gameNumber: 1
    };

    await persistence.saveGame(game1);
    results.push('✅ Game saved successfully');

    // Demo 2: Create and save a replay
    replayManager.startRecording('demo-game-1', 'STACK');
    replayManager.recordAction('keypress', { letter: 'S' });
    replayManager.recordAction('keypress', { letter: 'T' });
    replayManager.recordAction('keypress', { letter: 'A' });
    replayManager.recordAction('keypress', { letter: 'C' });
    replayManager.recordAction('keypress', { letter: 'K' });
    replayManager.recordAction('submit', { guess: game1.guesses[0] });
    replayManager.finishRecording('won', 1);

    const replay = replayManager.getCompletedReplay();
    if (replay) {
      await persistence.saveReplay(replay);
      results.push('✅ Replay saved successfully');
    }

    // Demo 3: Calculate statistics
    const stats = await persistence.getStatistics();
    results.push(`✅ Statistics calculated: ${stats.totalGames} games, ${stats.winPercentage}% win rate`);

    // Demo 4: Retrieve and test replay playback
    const savedReplay = await persistence.getReplay('demo-game-1');
    if (savedReplay) {
      const playback = replayManager.createPlayback(savedReplay);
      results.push(`✅ Replay loaded: ${playback.getTotalSteps()} steps, ${playback.getDuration()}ms duration`);

      // Test stepping through replay
      const firstStep = playback.nextStep();
      if (firstStep?.type === 'keypress' && firstStep.data?.letter === 'S') {
        results.push('✅ Replay playback working correctly');
      }
    }

    // Demo 5: Save another game for statistics
    const game2: SavedGame = {
      id: 'demo-game-2',
      hiddenWord: 'WORDS',
      guesses: [
        { word: 'WRONG', letterStatus: ['correct', 'absent', 'absent', 'absent', 'absent'] },
        { word: 'WORDS', letterStatus: ['correct', 'correct', 'correct', 'correct', 'correct'] }
      ],
      outcome: 'won',
      startTime: new Date('2025-01-15T11:00:00Z'),
      endTime: new Date('2025-01-15T11:04:00Z'),
      timeToComplete: 240000, // 4 minutes
      attemptCount: 2,
      gameNumber: 2
    };

    await persistence.saveGame(game2);

    // Updated statistics
    const updatedStats = await persistence.getStatistics();
    results.push(`✅ Updated statistics: ${updatedStats.totalGames} games, ${updatedStats.averageGuesses.toFixed(1)} avg guesses`);

    // Demo 6: Test storage info
    const storageInfo = await persistence.getStorageInfo();
    results.push(`✅ Storage info: ${storageInfo.gameCount} games stored, ~${Math.round(storageInfo.usedBytes / 1024)}KB used`);

    return results.join('\n');

  } catch (error) {
    results.push(`❌ Demo failed: ${error}`);
    return results.join('\n');
  }
}

// Export for potential use in browser console or tests
export { GamePersistence, GameReplayManager };