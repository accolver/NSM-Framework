/**
 * Blossom Content Cache for NSM Framework
 * Provides intelligent caching for Blossom protocol content with multi-layer storage
 */
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
        quality?: 'high' | 'medium' | 'low';
        tags?: string[];
    };
}
export interface BlossomCachePolicy {
    memoryTTL?: number;
    persistentTTL?: number;
    maxMemorySize?: number;
    maxPersistentSize?: number;
    compressionEnabled?: boolean;
    compressionThreshold?: number;
    priorityContentTypes?: string[];
    maxContentSize?: number;
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
export declare class BlossomContentCache {
    private memoryCache;
    private persistentCache;
    private policy;
    private metrics;
    constructor(policy?: BlossomCachePolicy, persistentOptions?: {
        dbName?: string;
        version?: number;
    });
    /**
     * Store Blossom content in the cache
     */
    setContent(content: BlossomContent, options?: {
        quality?: 'high' | 'medium' | 'low';
        tags?: string[];
        forceMemory?: boolean;
        skipPersistent?: boolean;
        skipCompression?: boolean;
    }): Promise<void>;
    /**
     * Retrieve Blossom content from the cache
     */
    getContent(hash: string): Promise<BlossomContent | null>;
    /**
     * Query content by criteria
     */
    queryContent(query: ContentQuery): Promise<BlossomContent[]>;
    /**
     * Prefetch content from remote servers
     */
    prefetchContent(hashes: string[], fetchFn: (hash: string) => Promise<BlossomContent | null>): Promise<{
        successful: number;
        failed: string[];
    }>;
    /**
     * Verify and refresh content integrity
     */
    verifyAndRefresh(hash: string, refreshFn?: (hash: string) => Promise<BlossomContent | null>): Promise<boolean>;
    /**
     * Delete content from all caches
     */
    deleteContent(hash: string): Promise<boolean>;
    /**
     * Clear content by criteria
     */
    clearContent(options?: {
        olderThan?: number;
        contentTypes?: string[];
        quality?: 'high' | 'medium' | 'low';
        clearMemory?: boolean;
        clearPersistent?: boolean;
    }): Promise<number>;
    /**
     * Get cache health metrics
     */
    getHealth(): Promise<CacheHealth>;
    /**
     * Cleanup expired and corrupted content
     */
    cleanup(): Promise<{
        memory: number;
        persistent: number;
        corrupted: number;
    }>;
    /**
     * Private helper methods
     */
    private getContentEntry;
    private calculateEntrySize;
    private shouldCompressContent;
    private compressContent;
    private decompressContent;
    private isPriorityContent;
    private verifyContentIntegrity;
    private matchesContentQuery;
    private buildPersistentQuery;
    private buildClearQuery;
    private shouldClearEntry;
    /**
     * Destroy the cache and cleanup resources
     */
    destroy(): void;
}
//# sourceMappingURL=blossom-content-cache.d.ts.map