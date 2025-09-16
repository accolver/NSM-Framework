/**
 * IndexedDB Cache Manager for NSM Framework
 * Provides persistent caching with TTL support and efficient querying
 */

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  ttl?: number; // Time to live in milliseconds
  version?: string;
  metadata?: Record<string, any>;
}

export interface CacheOptions {
  dbName: string;
  version: number;
  storeName: string;
  defaultTTL?: number; // Default TTL in milliseconds
}

export interface CacheQuery {
  keyPrefix?: string;
  keyPattern?: RegExp;
  maxAge?: number; // Filter by age in milliseconds
  metadata?: Record<string, any>; // Filter by metadata
  limit?: number;
  offset?: number;
}

export class IndexedDBCache {
  private db: IDBDatabase | null = null;
  private readonly options: Required<CacheOptions>;
  private readonly openPromise: Promise<IDBDatabase>;

  constructor(options: CacheOptions) {
    this.options = {
      defaultTTL: 24 * 60 * 60 * 1000, // 24 hours default
      ...options
    };

    this.openPromise = this.openDatabase();
  }

  /**
   * Open or upgrade the IndexedDB database
   */
  private async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.options.dbName, this.options.version);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;

        // Handle unexpected database closure
        this.db.onversionchange = () => {
          this.db?.close();
          this.db = null;
        };

        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.options.storeName)) {
          const store = db.createObjectStore(this.options.storeName, { keyPath: 'key' });

          // Create indexes for efficient querying
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('ttl', 'ttl', { unique: false });
          store.createIndex('version', 'version', { unique: false });
        }
      };
    });
  }

  /**
   * Ensure database is ready
   */
  private async ensureReady(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }
    return this.openPromise;
  }

  /**
   * Check if a cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    if (!entry.ttl) return false;
    return Date.now() > entry.timestamp + entry.ttl;
  }

  /**
   * Store a value in the cache
   */
  async set<T>(
    key: string,
    value: T,
    options?: {
      ttl?: number;
      version?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    const db = await this.ensureReady();

    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      ttl: options?.ttl ?? this.options.defaultTTL,
      version: options?.version,
      metadata: options?.metadata
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.options.storeName], 'readwrite');
      const store = transaction.objectStore(this.options.storeName);

      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to set cache entry: ${request.error?.message}`));
    });
  }

  /**
   * Retrieve a value from the cache
   */
  async get<T>(key: string): Promise<T | null> {
    const db = await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.options.storeName], 'readonly');
      const store = transaction.objectStore(this.options.storeName);

      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result as CacheEntry<T> | undefined;

        if (!entry) {
          resolve(null);
          return;
        }

        // Check if expired
        if (this.isExpired(entry)) {
          // Remove expired entry asynchronously
          this.delete(key).catch(() => {
            // Ignore cleanup errors
          });
          resolve(null);
          return;
        }

        resolve(entry.value);
      };

      request.onerror = () => reject(new Error(`Failed to get cache entry: ${request.error?.message}`));
    });
  }

  /**
   * Check if a key exists in the cache (and is not expired)
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  /**
   * Delete a cache entry
   */
  async delete(key: string): Promise<boolean> {
    const db = await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.options.storeName], 'readwrite');
      const store = transaction.objectStore(this.options.storeName);

      const request = store.delete(key);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(new Error(`Failed to delete cache entry: ${request.error?.message}`));
    });
  }

  /**
   * Query cache entries with filtering options
   */
  async query<T>(query: CacheQuery = {}): Promise<CacheEntry<T>[]> {
    const db = await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.options.storeName], 'readonly');
      const store = transaction.objectStore(this.options.storeName);

      const results: CacheEntry<T>[] = [];
      const request = store.openCursor();

      let skipped = 0;
      const offset = query.offset ?? 0;
      const limit = query.limit;

      request.onsuccess = () => {
        const cursor = request.result;

        if (!cursor) {
          resolve(results);
          return;
        }

        const entry = cursor.value as CacheEntry<T>;

        // Apply filters
        if (this.matchesQuery(entry, query)) {
          if (skipped < offset) {
            skipped++;
          } else {
            results.push(entry);

            // Check limit
            if (limit && results.length >= limit) {
              resolve(results);
              return;
            }
          }
        }

        cursor.continue();
      };

      request.onerror = () => reject(new Error(`Failed to query cache: ${request.error?.message}`));
    });
  }

  /**
   * Check if an entry matches the query criteria
   */
  private matchesQuery(entry: CacheEntry, query: CacheQuery): boolean {
    // Check if expired
    if (this.isExpired(entry)) {
      return false;
    }

    // Key prefix filter
    if (query.keyPrefix && !entry.key.startsWith(query.keyPrefix)) {
      return false;
    }

    // Key pattern filter
    if (query.keyPattern && !query.keyPattern.test(entry.key)) {
      return false;
    }

    // Age filter
    if (query.maxAge) {
      const age = Date.now() - entry.timestamp;
      if (age > query.maxAge) {
        return false;
      }
    }

    // Metadata filter
    if (query.metadata && entry.metadata) {
      for (const [key, value] of Object.entries(query.metadata)) {
        if (entry.metadata[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    const db = await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.options.storeName], 'readwrite');
      const store = transaction.objectStore(this.options.storeName);

      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to clear cache: ${request.error?.message}`));
    });
  }

  /**
   * Clean up expired entries
   */
  async cleanup(): Promise<number> {
    const db = await this.ensureReady();
    let deletedCount = 0;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.options.storeName], 'readwrite');
      const store = transaction.objectStore(this.options.storeName);

      const request = store.openCursor();

      request.onsuccess = () => {
        const cursor = request.result;

        if (!cursor) {
          resolve(deletedCount);
          return;
        }

        const entry = cursor.value as CacheEntry;

        if (this.isExpired(entry)) {
          cursor.delete();
          deletedCount++;
        }

        cursor.continue();
      };

      request.onerror = () => reject(new Error(`Failed to cleanup cache: ${request.error?.message}`));
    });
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    expiredEntries: number;
    totalSize: number; // Approximate size in bytes
    oldestEntry: number | null;
    newestEntry: number | null;
  }> {
    const db = await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.options.storeName], 'readonly');
      const store = transaction.objectStore(this.options.storeName);

      let totalEntries = 0;
      let expiredEntries = 0;
      let totalSize = 0;
      let oldestEntry: number | null = null;
      let newestEntry: number | null = null;

      const request = store.openCursor();

      request.onsuccess = () => {
        const cursor = request.result;

        if (!cursor) {
          resolve({
            totalEntries,
            expiredEntries,
            totalSize,
            oldestEntry,
            newestEntry
          });
          return;
        }

        const entry = cursor.value as CacheEntry;
        totalEntries++;

        if (this.isExpired(entry)) {
          expiredEntries++;
        }

        // Approximate size calculation
        totalSize += JSON.stringify(entry).length;

        // Track oldest and newest
        if (oldestEntry === null || entry.timestamp < oldestEntry) {
          oldestEntry = entry.timestamp;
        }
        if (newestEntry === null || entry.timestamp > newestEntry) {
          newestEntry = entry.timestamp;
        }

        cursor.continue();
      };

      request.onerror = () => reject(new Error(`Failed to get cache stats: ${request.error?.message}`));
    });
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Bulk operations for efficiency
   */
  async setMany<T>(entries: Array<{
    key: string;
    value: T;
    options?: {
      ttl?: number;
      version?: string;
      metadata?: Record<string, any>;
    };
  }>): Promise<void> {
    const db = await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.options.storeName], 'readwrite');
      const store = transaction.objectStore(this.options.storeName);

      let completed = 0;
      const total = entries.length;

      if (total === 0) {
        resolve();
        return;
      }

      const onComplete = () => {
        completed++;
        if (completed === total) {
          resolve();
        }
      };

      entries.forEach(({ key, value, options }) => {
        const entry: CacheEntry<T> = {
          key,
          value,
          timestamp: Date.now(),
          ttl: options?.ttl ?? this.options.defaultTTL,
          version: options?.version,
          metadata: options?.metadata
        };

        const request = store.put(entry);
        request.onsuccess = onComplete;
        request.onerror = () => reject(new Error(`Failed to set cache entry ${key}: ${request.error?.message}`));
      });
    });
  }

  /**
   * Get many entries efficiently
   */
  async getMany<T>(keys: string[]): Promise<Map<string, T | null>> {
    const db = await this.ensureReady();
    const results = new Map<string, T | null>();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.options.storeName], 'readonly');
      const store = transaction.objectStore(this.options.storeName);

      let completed = 0;
      const total = keys.length;

      if (total === 0) {
        resolve(results);
        return;
      }

      const onComplete = () => {
        completed++;
        if (completed === total) {
          resolve(results);
        }
      };

      keys.forEach(key => {
        const request = store.get(key);

        request.onsuccess = () => {
          const entry = request.result as CacheEntry<T> | undefined;

          if (!entry || this.isExpired(entry)) {
            results.set(key, null);
          } else {
            results.set(key, entry.value);
          }

          onComplete();
        };

        request.onerror = () => reject(new Error(`Failed to get cache entry ${key}: ${request.error?.message}`));
      });
    });
  }
}