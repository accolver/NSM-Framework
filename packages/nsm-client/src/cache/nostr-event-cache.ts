/**
 * Nostr Event Cache System for NSM Framework
 * Provides intelligent caching for Nostr events with memory and persistent storage
 */

import { IndexedDBCache } from './indexeddb-cache';
import { MemoryCache } from './memory-cache';

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
  memoryTTL?: number; // Memory cache TTL in ms
  persistentTTL?: number; // IndexedDB cache TTL in ms
  maxMemoryEvents?: number; // Max events in memory
  priorityKinds?: number[]; // Event kinds to prioritize in memory
  compressionThreshold?: number; // Event size threshold for compression
}

export interface EventCacheEntry {
  event: NostrEvent;
  relays?: string[]; // Relays that provided this event
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

export class NostrEventCache {
  private memoryCache: MemoryCache<EventCacheEntry>;
  private persistentCache: IndexedDBCache;
  private policy: Required<CachePolicy>;
  private metrics = {
    hits: 0,
    misses: 0,
    compressions: 0,
    totalSize: 0,
    compressedSize: 0
  };

  constructor(
    policy: CachePolicy = {},
    persistentCacheOptions?: { dbName?: string; version?: number }
  ) {
    this.policy = {
      memoryTTL: policy.memoryTTL ?? 15 * 60 * 1000, // 15 minutes
      persistentTTL: policy.persistentTTL ?? 24 * 60 * 60 * 1000, // 24 hours
      maxMemoryEvents: policy.maxMemoryEvents ?? 1000,
      priorityKinds: policy.priorityKinds ?? [0, 1, 3, 4, 5, 6, 7], // Common event kinds
      compressionThreshold: policy.compressionThreshold ?? 1024 // 1KB
    };

    // Initialize memory cache
    this.memoryCache = new MemoryCache<EventCacheEntry>({
      maxEntries: this.policy.maxMemoryEvents,
      defaultTTL: this.policy.memoryTTL,
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      onEvict: (key, entry) => {
        // Move evicted events to persistent cache if they're valuable
        const eventEntry = entry as unknown as EventCacheEntry;
        if (eventEntry.event && this.shouldPersist(eventEntry.event)) {
          this.persistEventOnly(key, eventEntry).catch(() => {
            // Ignore persistence errors on eviction
          });
        }
      }
    });

    // Initialize persistent cache
    this.persistentCache = new IndexedDBCache({
      dbName: persistentCacheOptions?.dbName ?? 'nsm-nostr-events',
      version: persistentCacheOptions?.version ?? 1,
      storeName: 'events',
      defaultTTL: this.policy.persistentTTL
    });
  }

  /**
   * Store a Nostr event in the cache
   */
  async setEvent(
    event: NostrEvent,
    options?: {
      relays?: string[];
      forceMemory?: boolean;
      skipPersistent?: boolean;
    }
  ): Promise<void> {
    const now = Date.now();
    const eventSize = this.calculateEventSize(event);
    const shouldCompress = eventSize > this.policy.compressionThreshold;

    // Prepare cache entry
    const entry: EventCacheEntry = {
      event: shouldCompress ? this.compressEvent(event) : event,
      relays: options?.relays,
      firstSeen: now,
      lastAccessed: now,
      accessCount: 0,
      compressed: shouldCompress
    };

    // Update metrics
    this.metrics.totalSize += eventSize;
    if (shouldCompress) {
      this.metrics.compressions++;
      this.metrics.compressedSize += this.calculateEventSize(entry.event);
    }

    // Store in memory cache
    const shouldMemoryCache = options?.forceMemory ||
                             this.isPriorityEvent(event) ||
                             this.memoryCache.getStats().entries < this.policy.maxMemoryEvents;

    if (shouldMemoryCache) {
      this.memoryCache.set(event.id, entry);
    }

    // Store in persistent cache
    if (!options?.skipPersistent) {
      await this.persistentCache.set(event.id, entry, {
        ttl: this.policy.persistentTTL,
        metadata: {
          kind: event.kind,
          pubkey: event.pubkey,
          created_at: event.created_at,
          relays: options?.relays
        }
      });
    }
  }

  /**
   * Retrieve a Nostr event from the cache
   */
  async getEvent(id: string): Promise<NostrEvent | null> {
    // Try memory cache first
    let entry = this.memoryCache.get(id);

    if (entry) {
      this.metrics.hits++;
      entry.lastAccessed = Date.now();
      entry.accessCount++;

      return entry.compressed ? this.decompressEvent(entry.event) : entry.event;
    }

    // Try persistent cache
    entry = await this.persistentCache.get<EventCacheEntry>(id);

    if (entry) {
      this.metrics.hits++;
      entry.lastAccessed = Date.now();
      entry.accessCount++;

      // Promote to memory cache if it's a priority event
      const event = entry.compressed ? this.decompressEvent(entry.event) : entry.event;
      if (this.isPriorityEvent(event)) {
        this.memoryCache.set(id, entry, this.policy.memoryTTL);
      }

      return event;
    }

    this.metrics.misses++;
    return null;
  }

  /**
   * Query events by filter
   */
  async queryEvents(filter: NostrFilter): Promise<NostrEvent[]> {
    const results: NostrEvent[] = [];
    const foundIds = new Set<string>();

    // Query memory cache first
    const memoryKeys = this.memoryCache.keys();
    for (const id of memoryKeys) {
      if (filter.ids && !filter.ids.includes(id)) continue;

      const entry = this.memoryCache.get(id);
      if (!entry) continue;

      const event = entry.compressed ? this.decompressEvent(entry.event) : entry.event;
      if (this.matchesFilter(event, filter)) {
        results.push(event);
        foundIds.add(id);
      }
    }

    // Query persistent cache for missing events
    const persistentQuery = this.buildPersistentQuery(filter, foundIds);
    const persistentResults = await this.persistentCache.query<EventCacheEntry>(persistentQuery);

    for (const entry of persistentResults) {
      if (foundIds.has(entry.key)) continue;

      const event = entry.value.compressed ?
        this.decompressEvent(entry.value.event) :
        entry.value.event;

      if (this.matchesFilter(event, filter)) {
        results.push(event);

        // Promote priority events to memory
        if (this.isPriorityEvent(event)) {
          this.memoryCache.set(event.id, entry.value, this.policy.memoryTTL);
        }
      }
    }

    // Sort by created_at descending
    results.sort((a, b) => b.created_at - a.created_at);

    // Apply limit
    if (filter.limit) {
      return results.slice(0, filter.limit);
    }

    return results;
  }

  /**
   * Remove an event from all caches
   */
  async deleteEvent(id: string): Promise<boolean> {
    const memoryDeleted = this.memoryCache.delete(id);
    const persistentDeleted = await this.persistentCache.delete(id);

    return memoryDeleted || persistentDeleted;
  }

  /**
   * Clear events by criteria
   */
  async clearEvents(options?: {
    olderThan?: number; // Unix timestamp
    kinds?: number[];
    authors?: string[];
    clearMemory?: boolean;
    clearPersistent?: boolean;
  }): Promise<number> {
    let deletedCount = 0;

    if (options?.clearMemory !== false) {
      // Clear memory cache
      const memoryKeys = this.memoryCache.keys();
      for (const id of memoryKeys) {
        const entry = this.memoryCache.peek(id);
        if (!entry) continue;

        const event = entry.value.compressed ?
          this.decompressEvent(entry.value.event) :
          entry.value.event;

        if (this.shouldClear(event, options)) {
          this.memoryCache.delete(id);
          deletedCount++;
        }
      }
    }

    if (options?.clearPersistent !== false) {
      // Clear persistent cache
      const query = this.buildClearQuery(options);
      const entries = await this.persistentCache.query<EventCacheEntry>(query);

      for (const entry of entries) {
        await this.persistentCache.delete(entry.key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Get cache statistics
   */
  async getMetrics(): Promise<CacheMetrics> {
    const memoryStats = this.memoryCache.getStats();
    const persistentStats = await this.persistentCache.getStats();

    const totalEvents = memoryStats.entries + persistentStats.totalEntries;
    const totalHits = this.metrics.hits;
    const totalRequests = this.metrics.hits + this.metrics.misses;

    return {
      totalEvents,
      memoryEvents: memoryStats.entries,
      persistentEvents: persistentStats.totalEntries,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      compressionRatio: this.metrics.totalSize > 0 ?
        this.metrics.compressedSize / this.metrics.totalSize : 0,
      averageEventSize: totalEvents > 0 ? this.metrics.totalSize / totalEvents : 0,
      cacheEfficiency: memoryStats.hitRate
    };
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<{ memory: number; persistent: number }> {
    const memoryCleanup = this.memoryCache.cleanup();
    const persistentCleanup = await this.persistentCache.cleanup();

    return {
      memory: memoryCleanup,
      persistent: persistentCleanup
    };
  }

  /**
   * Check if an event matches the filter
   */
  private matchesFilter(event: NostrEvent, filter: NostrFilter): boolean {
    if (filter.ids && !filter.ids.includes(event.id)) return false;
    if (filter.kinds && !filter.kinds.includes(event.kind)) return false;
    if (filter.authors && !filter.authors.includes(event.pubkey)) return false;
    if (filter.since && event.created_at < filter.since) return false;
    if (filter.until && event.created_at > filter.until) return false;

    // Tag filters
    for (const [key, values] of Object.entries(filter)) {
      if (key.startsWith('#') && values) {
        const tagName = key.slice(1);
        const eventTags = event.tags.filter(tag => tag[0] === tagName);
        if (!eventTags.some(tag => values.includes(tag[1]))) return false;
      }
    }

    // Search filter
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      if (!event.content.toLowerCase().includes(searchLower)) return false;
    }

    return true;
  }

  /**
   * Check if an event should be prioritized in memory
   */
  private isPriorityEvent(event: NostrEvent): boolean {
    return this.policy.priorityKinds.includes(event.kind);
  }

  /**
   * Check if an event should be persisted
   */
  private shouldPersist(event: NostrEvent): boolean {
    // Always persist metadata events and replaceable events
    return event.kind === 0 ||
           event.kind === 3 ||
           (event.kind >= 10000 && event.kind < 20000) ||
           (event.kind >= 30000 && event.kind < 40000);
  }

  /**
   * Calculate event size for metrics
   */
  private calculateEventSize(event: NostrEvent): number {
    return JSON.stringify(event).length * 2; // UTF-16 encoding
  }

  /**
   * Compress event content for storage
   */
  private compressEvent(event: NostrEvent): NostrEvent {
    // Simple compression: remove whitespace from content
    return {
      ...event,
      content: event.content.replace(/\s+/g, ' ').trim()
    };
  }

  /**
   * Decompress event content
   */
  private decompressEvent(event: NostrEvent): NostrEvent {
    // For simple compression, no decompression needed
    return event;
  }

  /**
   * Build query for persistent cache
   */
  private buildPersistentQuery(filter: NostrFilter, excludeIds: Set<string>) {
    const query: any = {};

    if (filter.limit) {
      query.limit = filter.limit * 2; // Get more to account for filtering
    }

    // Use metadata for efficient filtering
    if (filter.kinds?.length === 1) {
      query.metadata = { kind: filter.kinds[0] };
    }

    if (filter.authors?.length === 1) {
      query.metadata = { ...query.metadata, pubkey: filter.authors[0] };
    }

    return query;
  }

  /**
   * Build query for clearing cache
   */
  private buildClearQuery(options: any) {
    const query: any = {};

    if (options.olderThan) {
      query.maxAge = Date.now() - options.olderThan * 1000;
    }

    return query;
  }

  /**
   * Check if event should be cleared
   */
  private shouldClear(event: NostrEvent, options: any): boolean {
    if (options.olderThan && event.created_at > options.olderThan) return false;
    if (options.kinds && !options.kinds.includes(event.kind)) return false;
    if (options.authors && !options.authors.includes(event.pubkey)) return false;
    return true;
  }

  /**
   * Persist event to IndexedDB only
   */
  private async persistEventOnly(id: string, entry: EventCacheEntry): Promise<void> {
    await this.persistentCache.set(id, entry, {
      ttl: this.policy.persistentTTL,
      metadata: {
        kind: entry.event.kind,
        pubkey: entry.event.pubkey,
        created_at: entry.event.created_at,
        relays: entry.relays
      }
    });
  }

  /**
   * Destroy the cache and cleanup resources
   */
  destroy(): void {
    this.memoryCache.destroy();
    this.persistentCache.close();
  }
}