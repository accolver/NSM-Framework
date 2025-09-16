/**
 * Blossom Content Cache for NSM Framework
 * Provides intelligent caching for Blossom protocol content with multi-layer storage
 */

import { IndexedDBCache } from './indexeddb-cache';
import { MemoryCache } from './memory-cache';

export interface BlossomContent {
  hash: string;
  data: Uint8Array | string;
  contentType: string;
  size: number;
  url?: string;
  servers?: string[];
  verified?: boolean;
}

export interface BlossomCacheEntry {
  content: BlossomContent;
  metadata: {
    uploadedAt: number;
    lastVerified: number;
    accessCount: number;
    compressionType?: 'none' | 'gzip' | 'brotli';
    originalSize?: number;
    quality?: 'high' | 'medium' | 'low'; // Content quality for prioritization
    tags?: string[]; // For categorization
  };
}

export interface BlossomCachePolicy {
  memoryTTL?: number; // Memory cache TTL in ms
  persistentTTL?: number; // IndexedDB cache TTL in ms
  maxMemorySize?: number; // Max memory cache size in bytes
  maxPersistentSize?: number; // Max persistent cache size in bytes
  compressionEnabled?: boolean; // Enable content compression
  compressionThreshold?: number; // Size threshold for compression
  priorityContentTypes?: string[]; // Content types to prioritize in memory
  maxContentSize?: number; // Maximum individual content size to cache
}

export interface ContentQuery {
  hashes?: string[];
  contentTypes?: string[];
  servers?: string[];
  minSize?: number;
  maxSize?: number;
  quality?: 'high' | 'medium' | 'low';
  tags?: string[];
  uploadedAfter?: number;
  uploadedBefore?: number;
  limit?: number;
}

export interface CacheHealth {
  memoryUsage: number;
  persistentUsage: number;
  totalContents: number;
  compressionRatio: number;
  hitRate: number;
  verificationFailures: number;
  integrityScore: number;
}

export class BlossomContentCache {
  private memoryCache: MemoryCache<BlossomCacheEntry>;
  private persistentCache: IndexedDBCache;
  private policy: Required<BlossomCachePolicy>;
  private metrics = {
    hits: 0,
    misses: 0,
    verificationFailures: 0,
    totalCompressions: 0,
    totalUncompressions: 0,
    bandwidthSaved: 0
  };

  constructor(
    policy: BlossomCachePolicy = {},
    persistentOptions?: { dbName?: string; version?: number }
  ) {
    this.policy = {
      memoryTTL: policy.memoryTTL ?? 30 * 60 * 1000, // 30 minutes
      persistentTTL: policy.persistentTTL ?? 7 * 24 * 60 * 60 * 1000, // 7 days
      maxMemorySize: policy.maxMemorySize ?? 100 * 1024 * 1024, // 100MB
      maxPersistentSize: policy.maxPersistentSize ?? 1024 * 1024 * 1024, // 1GB
      compressionEnabled: policy.compressionEnabled ?? true,
      compressionThreshold: policy.compressionThreshold ?? 10 * 1024, // 10KB
      priorityContentTypes: policy.priorityContentTypes ?? [
        'application/javascript',
        'application/json',
        'text/css',
        'text/html'
      ],
      maxContentSize: policy.maxContentSize ?? 10 * 1024 * 1024 // 10MB
    };

    // Initialize memory cache
    this.memoryCache = new MemoryCache<BlossomCacheEntry>({
      maxSize: this.policy.maxMemorySize,
      defaultTTL: this.policy.memoryTTL,
      cleanupInterval: 10 * 60 * 1000, // 10 minutes
      sizeFn: (entry) => this.calculateEntrySize(entry)
    });

    // Initialize persistent cache
    this.persistentCache = new IndexedDBCache({
      dbName: persistentOptions?.dbName ?? 'nsm-blossom-content',
      version: persistentOptions?.version ?? 1,
      storeName: 'content',
      defaultTTL: this.policy.persistentTTL
    });
  }

  /**
   * Store Blossom content in the cache
   */
  async setContent(
    content: BlossomContent,
    options?: {
      quality?: 'high' | 'medium' | 'low';
      tags?: string[];
      forceMemory?: boolean;
      skipPersistent?: boolean;
      skipCompression?: boolean;
    }
  ): Promise<void> {
    // Validate content size
    if (content.size > this.policy.maxContentSize) {
      throw new Error(`Content size ${content.size} exceeds maximum ${this.policy.maxContentSize}`);
    }

    // Verify content integrity
    if (!await this.verifyContentIntegrity(content)) {
      this.metrics.verificationFailures++;
      throw new Error(`Content integrity verification failed for hash ${content.hash}`);
    }

    const now = Date.now();
    const shouldCompress = this.shouldCompressContent(content, options?.skipCompression);

    // Prepare cache entry
    const entry: BlossomCacheEntry = {
      content: shouldCompress ? await this.compressContent(content) : content,
      metadata: {
        uploadedAt: now,
        lastVerified: now,
        accessCount: 0,
        compressionType: shouldCompress ? 'gzip' : 'none',
        originalSize: shouldCompress ? content.size : undefined,
        quality: options?.quality ?? 'medium',
        tags: options?.tags
      }
    };

    // Store in memory cache
    const shouldMemoryCache = options?.forceMemory ||
                             this.isPriorityContent(content) ||
                             this.memoryCache.getStats().totalSize < this.policy.maxMemorySize * 0.8;

    if (shouldMemoryCache) {
      this.memoryCache.set(content.hash, entry);
    }

    // Store in persistent cache
    if (!options?.skipPersistent) {
      await this.persistentCache.set(content.hash, entry, {
        ttl: this.policy.persistentTTL,
        metadata: {
          contentType: content.contentType,
          size: content.size,
          quality: entry.metadata.quality,
          servers: content.servers,
          tags: entry.metadata.tags
        }
      });
    }
  }

  /**
   * Retrieve Blossom content from the cache
   */
  async getContent(hash: string): Promise<BlossomContent | null> {
    // Try memory cache first
    let entry = this.memoryCache.get(hash);

    if (entry) {
      this.metrics.hits++;
      entry.metadata.accessCount++;
      entry.metadata.lastVerified = Date.now();

      return await this.decompressContent(entry.content);
    }

    // Try persistent cache
    entry = await this.persistentCache.get<BlossomCacheEntry>(hash);

    if (entry) {
      this.metrics.hits++;
      entry.metadata.accessCount++;
      entry.metadata.lastVerified = Date.now();

      const content = await this.decompressContent(entry.content);

      // Promote to memory cache if it's priority content
      if (this.isPriorityContent(content)) {
        this.memoryCache.set(hash, entry, this.policy.memoryTTL);
      }

      return content;
    }

    this.metrics.misses++;
    return null;
  }

  /**
   * Query content by criteria
   */
  async queryContent(query: ContentQuery): Promise<BlossomContent[]> {
    const results: BlossomContent[] = [];
    const foundHashes = new Set<string>();

    // Query memory cache first
    const memoryKeys = this.memoryCache.keys();
    for (const hash of memoryKeys) {
      if (query.hashes && !query.hashes.includes(hash)) continue;

      const entry = this.memoryCache.get(hash);
      if (!entry) continue;

      if (this.matchesContentQuery(entry, query)) {
        const content = await this.decompressContent(entry.content);
        results.push(content);
        foundHashes.add(hash);
      }
    }

    // Query persistent cache
    const persistentQuery = this.buildPersistentQuery(query, foundHashes);
    const persistentResults = await this.persistentCache.query<BlossomCacheEntry>(persistentQuery);

    for (const persistentEntry of persistentResults) {
      if (foundHashes.has(persistentEntry.key)) continue;

      if (this.matchesContentQuery(persistentEntry.value, query)) {
        const content = await this.decompressContent(persistentEntry.value.content);
        results.push(content);

        // Promote priority content to memory
        if (this.isPriorityContent(content)) {
          this.memoryCache.set(content.hash, persistentEntry.value, this.policy.memoryTTL);
        }
      }
    }

    // Sort by access count and upload time
    results.sort((a, b) => {
      const entryA = this.memoryCache.peek(a.hash);
      const entryB = this.memoryCache.peek(b.hash);

      if (entryA && entryB) {
        return entryB.metadata.accessCount - entryA.metadata.accessCount;
      }
      return 0;
    });

    // Apply limit
    if (query.limit) {
      return results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Prefetch content from remote servers
   */
  async prefetchContent(
    hashes: string[],
    fetchFn: (hash: string) => Promise<BlossomContent | null>
  ): Promise<{ successful: number; failed: string[] }> {
    let successful = 0;
    const failed: string[] = [];

    const prefetchPromises = hashes.map(async (hash) => {
      try {
        // Check if already cached
        if (await this.getContent(hash)) {
          successful++;
          return;
        }

        // Fetch from remote
        const content = await fetchFn(hash);
        if (content) {
          await this.setContent(content, { quality: 'low' }); // Lower priority for prefetched content
          successful++;
        } else {
          failed.push(hash);
        }
      } catch (error) {
        failed.push(hash);
      }
    });

    await Promise.allSettled(prefetchPromises);

    return { successful, failed };
  }

  /**
   * Verify and refresh content integrity
   */
  async verifyAndRefresh(
    hash: string,
    refreshFn?: (hash: string) => Promise<BlossomContent | null>
  ): Promise<boolean> {
    const entry = await this.getContentEntry(hash);
    if (!entry) return false;

    const isValid = await this.verifyContentIntegrity(entry.content);

    if (!isValid) {
      // Remove corrupted content
      await this.deleteContent(hash);

      // Try to refresh from remote if function provided
      if (refreshFn) {
        try {
          const freshContent = await refreshFn(hash);
          if (freshContent) {
            await this.setContent(freshContent);
            return true;
          }
        } catch (error) {
          // Ignore refresh errors
        }
      }

      this.metrics.verificationFailures++;
      return false;
    }

    return true;
  }

  /**
   * Delete content from all caches
   */
  async deleteContent(hash: string): Promise<boolean> {
    const memoryDeleted = this.memoryCache.delete(hash);
    const persistentDeleted = await this.persistentCache.delete(hash);

    return memoryDeleted || persistentDeleted;
  }

  /**
   * Clear content by criteria
   */
  async clearContent(options?: {
    olderThan?: number;
    contentTypes?: string[];
    quality?: 'high' | 'medium' | 'low';
    clearMemory?: boolean;
    clearPersistent?: boolean;
  }): Promise<number> {
    let deletedCount = 0;

    if (options?.clearMemory !== false) {
      // Clear memory cache
      const memoryKeys = this.memoryCache.keys();
      for (const hash of memoryKeys) {
        const entry = this.memoryCache.peek(hash);
        if (!entry) continue;

        if (this.shouldClearEntry(entry.value, options)) {
          this.memoryCache.delete(hash);
          deletedCount++;
        }
      }
    }

    if (options?.clearPersistent !== false) {
      // Clear persistent cache
      const query = this.buildClearQuery(options);
      const entries = await this.persistentCache.query<BlossomCacheEntry>(query);

      for (const entry of entries) {
        if (this.shouldClearEntry(entry.value, options)) {
          await this.persistentCache.delete(entry.key);
          deletedCount++;
        }
      }
    }

    return deletedCount;
  }

  /**
   * Get cache health metrics
   */
  async getHealth(): Promise<CacheHealth> {
    const memoryStats = this.memoryCache.getStats();
    const persistentStats = await this.persistentCache.getStats();

    const totalRequests = this.metrics.hits + this.metrics.misses;
    const hitRate = totalRequests > 0 ? this.metrics.hits / totalRequests : 0;

    return {
      memoryUsage: memoryStats.totalSize,
      persistentUsage: persistentStats.totalSize,
      totalContents: memoryStats.entries + persistentStats.totalEntries,
      compressionRatio: this.metrics.totalCompressions > 0 ?
        this.metrics.bandwidthSaved / (this.metrics.totalCompressions * 1024) : 0,
      hitRate,
      verificationFailures: this.metrics.verificationFailures,
      integrityScore: Math.max(0, 1 - (this.metrics.verificationFailures / Math.max(1, totalRequests)))
    };
  }

  /**
   * Cleanup expired and corrupted content
   */
  async cleanup(): Promise<{ memory: number; persistent: number; corrupted: number }> {
    const memoryCleanup = this.memoryCache.cleanup();
    const persistentCleanup = await this.persistentCache.cleanup();

    // Verify and clean corrupted content
    let corruptedCount = 0;
    const allKeys = [...this.memoryCache.keys()];

    for (const hash of allKeys) {
      if (!(await this.verifyAndRefresh(hash))) {
        corruptedCount++;
      }
    }

    return {
      memory: memoryCleanup,
      persistent: persistentCleanup,
      corrupted: corruptedCount
    };
  }

  /**
   * Private helper methods
   */

  private async getContentEntry(hash: string): Promise<BlossomCacheEntry | null> {
    let entry = this.memoryCache.get(hash);
    if (entry) return entry;

    return await this.persistentCache.get<BlossomCacheEntry>(hash);
  }

  private calculateEntrySize(entry: BlossomCacheEntry): number {
    return entry.content.size + JSON.stringify(entry.metadata).length * 2;
  }

  private shouldCompressContent(content: BlossomContent, skipCompression?: boolean): boolean {
    if (skipCompression || !this.policy.compressionEnabled) return false;
    if (content.size < this.policy.compressionThreshold) return false;

    // Don't compress already compressed formats
    const compressedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/', 'audio/'];
    return !compressedTypes.some(type => content.contentType.startsWith(type));
  }

  private async compressContent(content: BlossomContent): Promise<BlossomContent> {
    // Simple gzip compression simulation
    this.metrics.totalCompressions++;
    const originalSize = content.size;
    const compressedSize = Math.floor(content.size * 0.7); // Simulate 30% compression
    this.metrics.bandwidthSaved += originalSize - compressedSize;

    return {
      ...content,
      size: compressedSize
    };
  }

  private async decompressContent(content: BlossomContent): Promise<BlossomContent> {
    // For this implementation, content is already decompressed
    this.metrics.totalUncompressions++;
    return content;
  }

  private isPriorityContent(content: BlossomContent): boolean {
    return this.policy.priorityContentTypes.some(type =>
      content.contentType.startsWith(type)
    );
  }

  private async verifyContentIntegrity(content: BlossomContent): Promise<boolean> {
    try {
      // Calculate hash and verify
      const data = typeof content.data === 'string' ?
        new TextEncoder().encode(content.data) :
        content.data;

      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      return computedHash === content.hash;
    } catch (error) {
      return false;
    }
  }

  private matchesContentQuery(entry: BlossomCacheEntry, query: ContentQuery): boolean {
    const { content, metadata } = entry;

    if (query.contentTypes && !query.contentTypes.includes(content.contentType)) return false;
    if (query.servers && content.servers && !query.servers.some(s => content.servers!.includes(s))) return false;
    if (query.minSize && content.size < query.minSize) return false;
    if (query.maxSize && content.size > query.maxSize) return false;
    if (query.quality && metadata.quality !== query.quality) return false;
    if (query.tags && metadata.tags && !query.tags.some(t => metadata.tags!.includes(t))) return false;
    if (query.uploadedAfter && metadata.uploadedAt < query.uploadedAfter) return false;
    if (query.uploadedBefore && metadata.uploadedAt > query.uploadedBefore) return false;

    return true;
  }

  private buildPersistentQuery(query: ContentQuery, excludeHashes: Set<string>) {
    const persistentQuery: any = {};

    if (query.limit) {
      persistentQuery.limit = query.limit * 2; // Get more to account for filtering
    }

    if (query.contentTypes?.length === 1) {
      persistentQuery.metadata = { contentType: query.contentTypes[0] };
    }

    return persistentQuery;
  }

  private buildClearQuery(options: any) {
    const query: any = {};

    if (options?.olderThan) {
      query.maxAge = Date.now() - options.olderThan;
    }

    return query;
  }

  private shouldClearEntry(entry: BlossomCacheEntry, options: any): boolean {
    if (options?.olderThan && entry.metadata.uploadedAt > options.olderThan) return false;
    if (options?.contentTypes && !options.contentTypes.includes(entry.content.contentType)) return false;
    if (options?.quality && entry.metadata.quality !== options.quality) return false;

    return true;
  }

  /**
   * Destroy the cache and cleanup resources
   */
  destroy(): void {
    this.memoryCache.destroy();
    this.persistentCache.close();
  }
}