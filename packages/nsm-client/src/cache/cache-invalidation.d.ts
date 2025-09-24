/**
 * Cache Invalidation Strategies for NSM Framework
 * Provides intelligent cache invalidation across memory and persistent storage layers
 */
import { MemoryCache } from './memory-cache';
import { IndexedDBCache } from './indexeddb-cache';
import { NostrEventCache } from './nostr-event-cache';
import { BlossomContentCache } from './blossom-content-cache';
export interface InvalidationRule {
    name: string;
    pattern: RegExp | string;
    strategy: 'immediate' | 'lazy' | 'scheduled' | 'conditional';
    condition?: (key: string, metadata?: any) => boolean;
    priority: 'high' | 'medium' | 'low';
    cascadeRules?: string[];
}
export interface InvalidationEvent {
    type: 'manual' | 'automatic' | 'scheduled' | 'cascaded';
    source: 'user' | 'system' | 'external' | 'timer';
    target: 'key' | 'pattern' | 'tag' | 'condition';
    value: string | RegExp | ((key: string) => boolean);
    timestamp: number;
    metadata?: Record<string, any>;
}
export interface InvalidationPolicy {
    enableAutoInvalidation?: boolean;
    defaultStrategy?: 'immediate' | 'lazy' | 'scheduled';
    batchSize?: number;
    batchInterval?: number;
    maxRetries?: number;
    retryDelay?: number;
    enableCascading?: boolean;
    enableMetrics?: boolean;
}
export interface InvalidationMetrics {
    totalInvalidations: number;
    successfulInvalidations: number;
    failedInvalidations: number;
    averageInvalidationTime: number;
    cascadedInvalidations: number;
    rulesTriggered: Record<string, number>;
    lastInvalidation: number | null;
}
export interface CacheManager {
    invalidate: (key: string) => Promise<boolean> | boolean;
    invalidatePattern?: (pattern: RegExp) => Promise<number> | number;
    invalidateByTag?: (tag: string) => Promise<number> | number;
    clear?: () => Promise<void> | void;
    has?: (key: string) => Promise<boolean> | boolean;
}
export declare class CacheInvalidationManager {
    private rules;
    private policy;
    private scheduledInvalidations;
    private pendingInvalidations;
    private metrics;
    private cacheManagers;
    private eventListeners;
    constructor(policy?: InvalidationPolicy);
    /**
     * Register a cache manager
     */
    registerCache(name: string, manager: CacheManager): void;
    /**
     * Register an invalidation rule
     */
    addRule(rule: InvalidationRule): void;
    /**
     * Remove an invalidation rule
     */
    removeRule(name: string): boolean;
    /**
     * Invalidate a specific cache key across all registered caches
     */
    invalidateKey(key: string, options?: {
        caches?: string[];
        source?: 'user' | 'system' | 'external';
        metadata?: Record<string, any>;
        force?: boolean;
    }): Promise<{
        successful: string[];
        failed: string[];
    }>;
    /**
     * Invalidate keys by pattern
     */
    invalidatePattern(pattern: RegExp, options?: {
        caches?: string[];
        source?: 'user' | 'system' | 'external';
        metadata?: Record<string, any>;
    }): Promise<{
        successful: Record<string, number>;
        failed: string[];
    }>;
    /**
     * Invalidate keys by tag
     */
    invalidateByTag(tag: string, options?: {
        caches?: string[];
        source?: 'user' | 'system' | 'external';
        metadata?: Record<string, any>;
    }): Promise<{
        successful: Record<string, number>;
        failed: string[];
    }>;
    /**
     * Clear all caches
     */
    clearAllCaches(options?: {
        caches?: string[];
    }): Promise<{
        successful: string[];
        failed: string[];
    }>;
    /**
     * Process pending invalidations
     */
    processPendingInvalidations(): Promise<number>;
    /**
     * Schedule periodic processing of pending invalidations
     */
    startPeriodicProcessing(): void;
    /**
     * Get invalidation metrics
     */
    getMetrics(): InvalidationMetrics;
    /**
     * Add event listener
     */
    addEventListener(event: string, listener: (event: InvalidationEvent) => void): void;
    /**
     * Remove event listener
     */
    removeEventListener(event: string, listener: (event: InvalidationEvent) => void): void;
    /**
     * Private helper methods
     */
    private findMatchingRules;
    private scheduleInvalidation;
    private calculateDelay;
    private addToPendingInvalidations;
    private handleCascadingInvalidations;
    private updateMetrics;
    private emitEvent;
    /**
     * Destroy the invalidation manager
     */
    destroy(): void;
}
/**
 * Predefined invalidation rules for common scenarios
 */
export declare const CommonInvalidationRules: {
    /**
     * Invalidate user-specific data when user logs out
     */
    userLogout: {
        name: string;
        pattern: RegExp;
        strategy: "immediate";
        priority: "high";
    };
    /**
     * Invalidate stale content after 1 hour
     */
    staleContent: {
        name: string;
        pattern: RegExp;
        strategy: "scheduled";
        priority: "medium";
    };
    /**
     * Invalidate events when new event is received
     */
    newEvent: {
        name: string;
        pattern: RegExp;
        strategy: "lazy";
        priority: "low";
    };
    /**
     * Invalidate cached responses when API version changes
     */
    apiVersionChange: {
        name: string;
        pattern: RegExp;
        strategy: "immediate";
        priority: "high";
        cascadeRules: string[];
    };
};
/**
 * Factory function to create invalidation manager with NSM-specific setup
 */
export declare function createNSMInvalidationManager(caches: {
    memory?: MemoryCache<any>;
    indexedDB?: IndexedDBCache;
    nostrEvents?: NostrEventCache;
    blossomContent?: BlossomContentCache;
}, policy?: InvalidationPolicy): CacheInvalidationManager;
//# sourceMappingURL=cache-invalidation.d.ts.map