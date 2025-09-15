import type { SavedGame, GameStatistics, GameReplay, StorageConfig, StorageInfo } from './types';

/**
 * Manages game persistence using IndexedDB for storing completed games,
 * statistics, and replay data
 */
export class GamePersistence {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'WordleGameDB';
  private readonly dbVersion = 1;
  private readonly config: StorageConfig = {
    maxGames: 50,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    enableReplay: true,
    compressionLevel: 'basic'
  };

  /**
   * Initialize the database connection
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create games store
        if (!db.objectStoreNames.contains('games')) {
          const gamesStore = db.createObjectStore('games', { keyPath: 'id' });
          gamesStore.createIndex('gameNumber', 'gameNumber', { unique: false });
          gamesStore.createIndex('outcome', 'outcome', { unique: false });
          gamesStore.createIndex('endTime', 'endTime', { unique: false });
        }

        // Create replays store
        if (!db.objectStoreNames.contains('replays')) {
          const replaysStore = db.createObjectStore('replays', { keyPath: 'gameId' });
          replaysStore.createIndex('outcome', 'outcome', { unique: false });
          replaysStore.createIndex('duration', 'duration', { unique: false });
        }

        // Create metadata store for settings and counters
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Save a completed game
   */
  async saveGame(game: SavedGame): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['games', 'metadata'], 'readwrite');
      const gamesStore = transaction.objectStore('games');
      const metadataStore = transaction.objectStore('metadata');

      // Save the game
      const gameRequest = gamesStore.put({
        ...game,
        startTime: game.startTime.toISOString(),
        endTime: game.endTime.toISOString()
      });

      gameRequest.onerror = () => reject(new Error('Failed to save game'));

      // Update game counter
      const counterRequest = metadataStore.get('gameCounter');
      counterRequest.onsuccess = () => {
        const counter = counterRequest.result?.value || 0;
        metadataStore.put({ key: 'gameCounter', value: Math.max(counter, game.gameNumber) });
      };

      transaction.oncomplete = () => {
        this.cleanupOldGames().catch(console.warn);
        resolve(game.id);
      };

      transaction.onerror = () => reject(new Error('Transaction failed'));
    });
  }

  /**
   * Get a specific saved game
   */
  async getGame(id: string): Promise<SavedGame | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['games'], 'readonly');
      const store = transaction.objectStore('games');
      const request = store.get(id);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          resolve({
            ...result,
            startTime: new Date(result.startTime),
            endTime: new Date(result.endTime)
          });
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(new Error('Failed to get game'));
    });
  }

  /**
   * Get all saved games
   */
  async getAllGames(): Promise<SavedGame[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['games'], 'readonly');
      const store = transaction.objectStore('games');
      const request = store.getAll();

      request.onsuccess = () => {
        const games = request.result.map((game: any) => ({
          ...game,
          startTime: new Date(game.startTime),
          endTime: new Date(game.endTime)
        }));
        resolve(games);
      };

      request.onerror = () => reject(new Error('Failed to get all games'));
    });
  }

  /**
   * Delete a specific game
   */
  async deleteGame(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['games', 'replays'], 'readwrite');
      const gamesStore = transaction.objectStore('games');
      const replaysStore = transaction.objectStore('replays');

      gamesStore.delete(id);
      replaysStore.delete(id); // Also delete associated replay

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('Failed to delete game'));
    });
  }

  /**
   * Calculate and return game statistics
   */
  async getStatistics(): Promise<GameStatistics> {
    const games = await this.getAllGames();

    if (games.length === 0) {
      return {
        totalGames: 0,
        gamesWon: 0,
        gamesLost: 0,
        winPercentage: 0,
        currentStreak: 0,
        bestStreak: 0,
        averageGuesses: 0,
        averageTime: 0,
        guessDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
        currentGameNumber: 1
      };
    }

    // Sort games by game number to calculate streaks
    const sortedGames = games.sort((a, b) => a.gameNumber - b.gameNumber);
    const wonGames = games.filter(game => game.outcome === 'won');
    const lostGames = games.filter(game => game.outcome === 'lost');

    // Calculate basic statistics
    const totalGames = games.length;
    const gamesWon = wonGames.length;
    const gamesLost = lostGames.length;
    const winPercentage = totalGames > 0 ? Math.round((gamesWon / totalGames) * 100) : 0;

    // Calculate averages for won games only
    const averageGuesses = wonGames.length > 0
      ? wonGames.reduce((sum, game) => sum + game.attemptCount, 0) / wonGames.length
      : 0;

    const averageTime = wonGames.length > 0
      ? wonGames.reduce((sum, game) => sum + game.timeToComplete, 0) / wonGames.length
      : 0;

    // Calculate guess distribution for won games
    const guessDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    wonGames.forEach(game => {
      const attempts = Math.min(game.attemptCount, 6);
      guessDistribution[attempts as keyof typeof guessDistribution]++;
    });

    // Calculate streaks
    const { currentStreak, bestStreak } = this.calculateStreaks(sortedGames);

    // Get latest game number
    const currentGameNumber = Math.max(...games.map(g => g.gameNumber), 0) + 1;

    return {
      totalGames,
      gamesWon,
      gamesLost,
      winPercentage,
      currentStreak,
      bestStreak,
      averageGuesses,
      averageTime,
      guessDistribution,
      lastPlayed: games.length > 0 ? new Date(Math.max(...games.map(g => g.endTime.getTime()))) : undefined,
      fastestWin: wonGames.length > 0 ? Math.min(...wonGames.map(g => g.timeToComplete)) : undefined,
      currentGameNumber
    };
  }

  /**
   * Save replay data for a game
   */
  async saveReplay(replay: GameReplay): Promise<void> {
    if (!this.db || !this.config.enableReplay) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['replays'], 'readwrite');
      const store = transaction.objectStore('replays');
      const request = store.put(replay);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save replay'));
    });
  }

  /**
   * Get replay data for a specific game
   */
  async getReplay(gameId: string): Promise<GameReplay | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['replays'], 'readonly');
      const store = transaction.objectStore('replays');
      const request = store.get(gameId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Failed to get replay'));
    });
  }

  /**
   * Get all replay data
   */
  async getAllReplays(): Promise<GameReplay[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['replays'], 'readonly');
      const store = transaction.objectStore('replays');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Failed to get all replays'));
    });
  }

  /**
   * Clear all stored data
   */
  async clearAll(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['games', 'replays', 'metadata'], 'readwrite');

      const gamesStore = transaction.objectStore('games');
      const replaysStore = transaction.objectStore('replays');
      const metadataStore = transaction.objectStore('metadata');

      gamesStore.clear();
      replaysStore.clear();
      metadataStore.clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('Failed to clear data'));
    });
  }

  /**
   * Get storage usage information
   */
  async getStorageInfo(): Promise<StorageInfo> {
    const games = await this.getAllGames();
    const replays = await this.getAllReplays();

    // Rough estimation of storage usage
    const gameData = JSON.stringify(games);
    const replayData = JSON.stringify(replays);
    const usedBytes = (gameData.length + replayData.length) * 2; // rough UTF-16 estimate

    return {
      usedBytes,
      availableBytes: 10 * 1024 * 1024, // 10MB rough estimate
      gameCount: games.length,
      oldestGame: games.length > 0 ? new Date(Math.min(...games.map(g => g.endTime.getTime()))) : undefined,
      newestGame: games.length > 0 ? new Date(Math.max(...games.map(g => g.endTime.getTime()))) : undefined
    };
  }

  /**
   * Calculate current and best streaks from sorted games
   */
  private calculateStreaks(sortedGames: SavedGame[]): { currentStreak: number; bestStreak: number } {
    if (sortedGames.length === 0) {
      return { currentStreak: 0, bestStreak: 0 };
    }

    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    // Calculate streaks from the end (most recent games)
    for (let i = sortedGames.length - 1; i >= 0; i--) {
      if (sortedGames[i].outcome === 'won') {
        tempStreak++;
        if (i === sortedGames.length - 1 || currentStreak === 0) {
          currentStreak++;
        }
      } else {
        if (i === sortedGames.length - 1) {
          currentStreak = 0;
        }
        bestStreak = Math.max(bestStreak, tempStreak);
        tempStreak = 0;
      }
    }

    bestStreak = Math.max(bestStreak, tempStreak);

    return { currentStreak, bestStreak };
  }

  /**
   * Clean up old games when storage limits are reached
   */
  private async cleanupOldGames(): Promise<void> {
    const games = await this.getAllGames();

    if (games.length <= this.config.maxGames) {
      return;
    }

    // Sort by end time and remove oldest games
    const sortedGames = games.sort((a, b) => a.endTime.getTime() - b.endTime.getTime());
    const gamesToDelete = sortedGames.slice(0, games.length - this.config.maxGames);

    for (const game of gamesToDelete) {
      await this.deleteGame(game.id);
    }
  }
}