/**
 * Nostr Event Cache System for NSM Framework
 * Provides intelligent caching for Nostr events with memory and persistent storage
 */
export interface NostrEvent {
    id: string;
    kind: number;
    pubkey: string;
    created_at: number;
    tags: string[][];
    content: string;
    sig: string;
}
export interface NostrFilter {
    ids?: string[];
    kinds?: number[];
    authors?: string[];
    since?: number;
    until?: number;
    limit?: number;
    search?: string;
    [key: `#${string}`]: string[] | undefined;
}
export interface CachePolicy {
    memoryTTL?: number;
    persistentTTL?: number;
    maxMemoryEvents?: number;
    priorityKinds?: number[];
    compressionThreshold?: number;
}
export interface EventCacheEntry {
    event: NostrEvent;
    relays?: string[];
    firstSeen: number;
    lastAccessed: number;
    accessCount: number;
    compressed?: boolean;
}
export interface CacheMetrics {
    totalEvents: number;
    memoryEvents: number;
    persistentEvents: number;
    hitRate: number;
    compressionRatio: number;
    averageEventSize: number;
    cacheEfficiency: number;
}
export declare class NostrEventCache {
    private memoryCache;
    private persistentCache;
    private policy;
    private metrics;
    constructor(policy?: CachePolicy, persistentCacheOptions?: {
        dbName?: string;
        version?: number;
    });
    /**
     * Store a Nostr event in the cache
     */
    setEvent(event: NostrEvent, options?: {
        relays?: string[];
        forceMemory?: boolean;
        skipPersistent?: boolean;
    }): Promise<void>;
    /**
     * Retrieve a Nostr event from the cache
     */
    getEvent(id: string): Promise<NostrEvent | null>;
    /**
     * Query events by filter
     */
    queryEvents(filter: NostrFilter): Promise<NostrEvent[]>;
    /**
     * Remove an event from all caches
     */
    deleteEvent(id: string): Promise<boolean>;
    /**
     * Clear events by criteria
     */
    clearEvents(options?: {
        olderThan?: number;
        kinds?: number[];
        authors?: string[];
        clearMemory?: boolean;
        clearPersistent?: boolean;
    }): Promise<number>;
    /**
     * Get cache statistics
     */
    getMetrics(): Promise<CacheMetrics>;
    /**
     * Cleanup expired entries
     */
    cleanup(): Promise<{
        memory: number;
        persistent: number;
    }>;
    /**
     * Check if an event matches the filter
     */
    private matchesFilter;
    /**
     * Check if an event should be prioritized in memory
     */
    private isPriorityEvent;
    /**
     * Check if an event should be persisted
     */
    private shouldPersist;
    /**
     * Calculate event size for metrics
     */
    private calculateEventSize;
    /**
     * Compress event content for storage
     */
    private compressEvent;
    /**
     * Decompress event content
     */
    private decompressEvent;
    /**
     * Build query for persistent cache
     */
    private buildPersistentQuery;
    /**
     * Build query for clearing cache
     */
    private buildClearQuery;
    /**
     * Check if event should be cleared
     */
    private shouldClear;
    /**
     * Persist event to IndexedDB only
     */
    private persistEventOnly;
    /**
     * Destroy the cache and cleanup resources
     */
    destroy(): void;
}
//# sourceMappingURL=nostr-event-cache.d.ts.map