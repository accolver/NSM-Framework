/**
 * Memory Cache with TTL Support for NSM Framework
 * Provides fast in-memory caching with automatic expiration and memory management
 */
export interface MemoryCacheEntry<T = any> {
    value: T;
    timestamp: number;
    ttl: number;
    size: number;
    accessCount: number;
    lastAccessed: number;
}
export interface MemoryCacheOptions {
    maxSize?: number;
    maxEntries?: number;
    defaultTTL?: number;
    cleanupInterval?: number;
    onEvict?: (key: string, entry: MemoryCacheEntry) => void;
    sizeFn?: (value: any) => number;
}
export interface CacheStats {
    entries: number;
    totalSize: number;
    hitRate: number;
    missRate: number;
    hits: number;
    misses: number;
    evictions: number;
    cleanups: number;
    oldestEntry: number | null;
    newestEntry: number | null;
}
export declare class MemoryCache<T = any> {
    private cache;
    private readonly options;
    private cleanupTimer;
    private hits;
    private misses;
    private evictions;
    private cleanups;
    private totalSize;
    constructor(options?: MemoryCacheOptions);
    /**
     * Default size calculation function
     */
    private defaultSizeFn;
    /**
     * Start the automatic cleanup timer
     */
    private startCleanupTimer;
    /**
     * Stop the automatic cleanup timer
     */
    private stopCleanupTimer;
    /**
     * Check if an entry is expired
     */
    private isExpired;
    /**
     * Evict entries to make space
     */
    private evictIfNeeded;
    /**
     * Evict the least recently used entry
     */
    private evictLRU;
    /**
     * Store a value in the cache
     */
    set(key: string, value: T, ttl?: number): void;
    /**
     * Retrieve a value from the cache
     */
    get(key: string): T | null;
    /**
     * Check if a key exists in the cache (and is not expired)
     */
    has(key: string): boolean;
    /**
     * Delete a cache entry
     */
    delete(key: string): boolean;
    /**
     * Clear all cache entries
     */
    clear(): void;
    /**
     * Clean up expired entries
     */
    cleanup(): number;
    /**
     * Get cache statistics
     */
    getStats(): CacheStats;
    /**
     * Get all keys in the cache
     */
    keys(): string[];
    /**
     * Get all values in the cache
     */
    values(): T[];
    /**
     * Get entries by key prefix
     */
    getByPrefix(prefix: string): Map<string, T>;
    /**
     * Delete entries by key prefix
     */
    deleteByPrefix(prefix: string): number;
    /**
     * Set multiple entries at once
     */
    setMany(entries: Array<{
        key: string;
        value: T;
        ttl?: number;
    }>): void;
    /**
     * Get multiple entries at once
     */
    getMany(keys: string[]): Map<string, T | null>;
    /**
     * Touch an entry to update its access time (prevent expiration)
     */
    touch(key: string): boolean;
    /**
     * Get entry metadata without updating access time
     */
    peek(key: string): {
        value: T;
        metadata: Omit<MemoryCacheEntry<T>, 'value'>;
    } | null;
    /**
     * Set TTL for an existing entry
     */
    setTTL(key: string, ttl: number): boolean;
    /**
     * Get remaining TTL for an entry
     */
    getTTL(key: string): number | null;
    /**
     * Destroy the cache and stop cleanup timer
     */
    destroy(): void;
}
//# sourceMappingURL=memory-cache.d.ts.map