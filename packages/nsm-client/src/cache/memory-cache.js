"use strict";
/**
 * Memory Cache with TTL Support for NSM Framework
 * Provides fast in-memory caching with automatic expiration and memory management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryCache = void 0;
class MemoryCache {
    cache = new Map();
    options;
    cleanupTimer = null;
    // Statistics
    hits = 0;
    misses = 0;
    evictions = 0;
    cleanups = 0;
    totalSize = 0;
    constructor(options = {}) {
        this.options = {
            maxSize: options.maxSize ?? 50 * 1024 * 1024, // 50MB default
            maxEntries: options.maxEntries ?? 10000,
            defaultTTL: options.defaultTTL ?? 30 * 60 * 1000, // 30 minutes default
            cleanupInterval: options.cleanupInterval ?? 5 * 60 * 1000, // 5 minutes default
            onEvict: options.onEvict ?? (() => { }),
            sizeFn: options.sizeFn ?? this.defaultSizeFn
        };
        // Start automatic cleanup if interval is set
        if (this.options.cleanupInterval > 0) {
            this.startCleanupTimer();
        }
    }
    /**
     * Default size calculation function
     */
    defaultSizeFn(value) {
        if (value === null || value === undefined)
            return 0;
        if (typeof value === 'string') {
            return value.length * 2; // UTF-16 encoding
        }
        if (typeof value === 'number') {
            return 8; // 64-bit number
        }
        if (typeof value === 'boolean') {
            return 4;
        }
        if (value instanceof ArrayBuffer) {
            return value.byteLength;
        }
        // For objects, use JSON string length as approximation
        try {
            return JSON.stringify(value).length * 2;
        }
        catch {
            return 1024; // Fallback for non-serializable objects
        }
    }
    /**
     * Start the automatic cleanup timer
     */
    startCleanupTimer() {
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.options.cleanupInterval);
    }
    /**
     * Stop the automatic cleanup timer
     */
    stopCleanupTimer() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }
    /**
     * Check if an entry is expired
     */
    isExpired(entry) {
        return Date.now() > entry.timestamp + entry.ttl;
    }
    /**
     * Evict entries to make space
     */
    evictIfNeeded() {
        // Evict by entry count
        while (this.cache.size >= this.options.maxEntries) {
            this.evictLRU();
        }
        // Evict by size
        while (this.totalSize > this.options.maxSize) {
            this.evictLRU();
        }
    }
    /**
     * Evict the least recently used entry
     */
    evictLRU() {
        let lruKey = null;
        let lruTime = Infinity;
        for (const [key, entry] of this.cache) {
            if (entry.lastAccessed < lruTime) {
                lruTime = entry.lastAccessed;
                lruKey = key;
            }
        }
        if (lruKey) {
            const entry = this.cache.get(lruKey);
            this.cache.delete(lruKey);
            this.totalSize -= entry.size;
            this.evictions++;
            this.options.onEvict(lruKey, entry);
        }
    }
    /**
     * Store a value in the cache
     */
    set(key, value, ttl) {
        const now = Date.now();
        const entryTTL = ttl ?? this.options.defaultTTL;
        const size = this.options.sizeFn(value);
        // Remove existing entry if it exists
        if (this.cache.has(key)) {
            const existingEntry = this.cache.get(key);
            this.totalSize -= existingEntry.size;
        }
        const entry = {
            value,
            timestamp: now,
            ttl: entryTTL,
            size,
            accessCount: 0,
            lastAccessed: now
        };
        this.cache.set(key, entry);
        this.totalSize += size;
        // Evict if necessary
        this.evictIfNeeded();
    }
    /**
     * Retrieve a value from the cache
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            this.misses++;
            return null;
        }
        // Check if expired
        if (this.isExpired(entry)) {
            this.cache.delete(key);
            this.totalSize -= entry.size;
            this.misses++;
            return null;
        }
        // Update access statistics
        entry.accessCount++;
        entry.lastAccessed = Date.now();
        this.hits++;
        return entry.value;
    }
    /**
     * Check if a key exists in the cache (and is not expired)
     */
    has(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return false;
        }
        if (this.isExpired(entry)) {
            this.cache.delete(key);
            this.totalSize -= entry.size;
            return false;
        }
        return true;
    }
    /**
     * Delete a cache entry
     */
    delete(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return false;
        }
        this.cache.delete(key);
        this.totalSize -= entry.size;
        return true;
    }
    /**
     * Clear all cache entries
     */
    clear() {
        this.cache.clear();
        this.totalSize = 0;
        this.hits = 0;
        this.misses = 0;
        this.evictions = 0;
        this.cleanups = 0;
    }
    /**
     * Clean up expired entries
     */
    cleanup() {
        let cleanedCount = 0;
        const now = Date.now();
        for (const [key, entry] of this.cache) {
            if (now > entry.timestamp + entry.ttl) {
                this.cache.delete(key);
                this.totalSize -= entry.size;
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            this.cleanups++;
        }
        return cleanedCount;
    }
    /**
     * Get cache statistics
     */
    getStats() {
        const total = this.hits + this.misses;
        let oldestEntry = null;
        let newestEntry = null;
        for (const entry of this.cache.values()) {
            if (oldestEntry === null || entry.timestamp < oldestEntry) {
                oldestEntry = entry.timestamp;
            }
            if (newestEntry === null || entry.timestamp > newestEntry) {
                newestEntry = entry.timestamp;
            }
        }
        return {
            entries: this.cache.size,
            totalSize: this.totalSize,
            hitRate: total > 0 ? this.hits / total : 0,
            missRate: total > 0 ? this.misses / total : 0,
            hits: this.hits,
            misses: this.misses,
            evictions: this.evictions,
            cleanups: this.cleanups,
            oldestEntry,
            newestEntry
        };
    }
    /**
     * Get all keys in the cache
     */
    keys() {
        return Array.from(this.cache.keys());
    }
    /**
     * Get all values in the cache
     */
    values() {
        return Array.from(this.cache.values()).map(entry => entry.value);
    }
    /**
     * Get entries by key prefix
     */
    getByPrefix(prefix) {
        const results = new Map();
        const now = Date.now();
        for (const [key, entry] of this.cache) {
            if (key.startsWith(prefix)) {
                // Check if expired
                if (now > entry.timestamp + entry.ttl) {
                    this.cache.delete(key);
                    this.totalSize -= entry.size;
                    continue;
                }
                // Update access statistics
                entry.accessCount++;
                entry.lastAccessed = now;
                results.set(key, entry.value);
            }
        }
        return results;
    }
    /**
     * Delete entries by key prefix
     */
    deleteByPrefix(prefix) {
        let deletedCount = 0;
        for (const [key, entry] of this.cache) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
                this.totalSize -= entry.size;
                deletedCount++;
            }
        }
        return deletedCount;
    }
    /**
     * Set multiple entries at once
     */
    setMany(entries) {
        for (const { key, value, ttl } of entries) {
            this.set(key, value, ttl);
        }
    }
    /**
     * Get multiple entries at once
     */
    getMany(keys) {
        const results = new Map();
        for (const key of keys) {
            results.set(key, this.get(key));
        }
        return results;
    }
    /**
     * Touch an entry to update its access time (prevent expiration)
     */
    touch(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return false;
        }
        if (this.isExpired(entry)) {
            this.cache.delete(key);
            this.totalSize -= entry.size;
            return false;
        }
        entry.lastAccessed = Date.now();
        entry.accessCount++;
        return true;
    }
    /**
     * Get entry metadata without updating access time
     */
    peek(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }
        if (this.isExpired(entry)) {
            this.cache.delete(key);
            this.totalSize -= entry.size;
            return null;
        }
        const { value, ...metadata } = entry;
        return { value, metadata };
    }
    /**
     * Set TTL for an existing entry
     */
    setTTL(key, ttl) {
        const entry = this.cache.get(key);
        if (!entry) {
            return false;
        }
        if (this.isExpired(entry)) {
            this.cache.delete(key);
            this.totalSize -= entry.size;
            return false;
        }
        entry.ttl = ttl;
        entry.timestamp = Date.now(); // Reset timestamp
        return true;
    }
    /**
     * Get remaining TTL for an entry
     */
    getTTL(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }
        if (this.isExpired(entry)) {
            this.cache.delete(key);
            this.totalSize -= entry.size;
            return null;
        }
        return Math.max(0, entry.timestamp + entry.ttl - Date.now());
    }
    /**
     * Destroy the cache and stop cleanup timer
     */
    destroy() {
        this.stopCleanupTimer();
        this.clear();
    }
}
exports.MemoryCache = MemoryCache;
