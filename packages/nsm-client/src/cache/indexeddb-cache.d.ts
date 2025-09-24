/**
 * IndexedDB Cache Manager for NSM Framework
 * Provides persistent caching with TTL support and efficient querying
 */
export interface CacheEntry<T = any> {
    key: string;
    value: T;
    timestamp: number;
    ttl?: number;
    version?: string;
    metadata?: Record<string, any>;
}
export interface CacheOptions {
    dbName: string;
    version: number;
    storeName: string;
    defaultTTL?: number;
}
export interface CacheQuery {
    keyPrefix?: string;
    keyPattern?: RegExp;
    maxAge?: number;
    metadata?: Record<string, any>;
    limit?: number;
    offset?: number;
}
export declare class IndexedDBCache {
    private db;
    private readonly options;
    private readonly openPromise;
    constructor(options: CacheOptions);
    /**
     * Open or upgrade the IndexedDB database
     */
    private openDatabase;
    /**
     * Ensure database is ready
     */
    private ensureReady;
    /**
     * Check if a cache entry is expired
     */
    private isExpired;
    /**
     * Store a value in the cache
     */
    set<T>(key: string, value: T, options?: {
        ttl?: number;
        version?: string;
        metadata?: Record<string, any>;
    }): Promise<void>;
    /**
     * Retrieve a value from the cache
     */
    get<T>(key: string): Promise<T | null>;
    /**
     * Check if a key exists in the cache (and is not expired)
     */
    has(key: string): Promise<boolean>;
    /**
     * Delete a cache entry
     */
    delete(key: string): Promise<boolean>;
    /**
     * Query cache entries with filtering options
     */
    query<T>(query?: CacheQuery): Promise<CacheEntry<T>[]>;
    /**
     * Check if an entry matches the query criteria
     */
    private matchesQuery;
    /**
     * Clear all cache entries
     */
    clear(): Promise<void>;
    /**
     * Clean up expired entries
     */
    cleanup(): Promise<number>;
    /**
     * Get cache statistics
     */
    getStats(): Promise<{
        totalEntries: number;
        expiredEntries: number;
        totalSize: number;
        oldestEntry: number | null;
        newestEntry: number | null;
    }>;
    /**
     * Close the database connection
     */
    close(): void;
    /**
     * Bulk operations for efficiency
     */
    setMany<T>(entries: Array<{
        key: string;
        value: T;
        options?: {
            ttl?: number;
            version?: string;
            metadata?: Record<string, any>;
        };
    }>): Promise<void>;
    /**
     * Get many entries efficiently
     */
    getMany<T>(keys: string[]): Promise<Map<string, T | null>>;
}
//# sourceMappingURL=indexeddb-cache.d.ts.map