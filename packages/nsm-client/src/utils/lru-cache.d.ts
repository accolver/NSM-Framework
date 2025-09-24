/**
 * LRU (Least Recently Used) Cache implementation
 * High-performance cache with O(1) get/set operations
 */
export declare class LRUCache<K, V> {
    private cache;
    private readonly maxSize;
    constructor(maxSize: number);
    /**
     * Get a value from the cache
     * Moves the accessed item to the end (most recently used)
     */
    get(key: K): V | undefined;
    /**
     * Set a value in the cache
     * Evicts least recently used item if cache is full
     */
    set(key: K, value: V): void;
    /**
     * Check if key exists in cache
     */
    has(key: K): boolean;
    /**
     * Delete a key from the cache
     */
    delete(key: K): boolean;
    /**
     * Clear all entries
     */
    clear(): void;
    /**
     * Get current cache size
     */
    size(): number;
    /**
     * Get all keys (ordered from least to most recently used)
     */
    keys(): K[];
    /**
     * Get all values (ordered from least to most recently used)
     */
    values(): V[];
    /**
     * Get cache statistics
     */
    getStats(): {
        size: number;
        maxSize: number;
        fillRate: number;
    };
}
//# sourceMappingURL=lru-cache.d.ts.map