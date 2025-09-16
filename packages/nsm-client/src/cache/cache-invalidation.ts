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
  cascadeRules?: string[]; // Names of other rules to trigger
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
  batchSize?: number; // Number of items to invalidate per batch
  batchInterval?: number; // Interval between batches in ms
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

export class CacheInvalidationManager {
  private rules = new Map<string, InvalidationRule>();
  private policy: Required<InvalidationPolicy>;
  private scheduledInvalidations = new Map<string, NodeJS.Timeout>();
  private pendingInvalidations = new Map<string, InvalidationEvent[]>();
  private metrics: InvalidationMetrics = {
    totalInvalidations: 0,
    successfulInvalidations: 0,
    failedInvalidations: 0,
    averageInvalidationTime: 0,
    cascadedInvalidations: 0,
    rulesTriggered: {},
    lastInvalidation: null
  };

  private cacheManagers = new Map<string, CacheManager>();
  private eventListeners = new Map<string, ((event: InvalidationEvent) => void)[]>();

  constructor(policy: InvalidationPolicy = {}) {
    this.policy = {
      enableAutoInvalidation: policy.enableAutoInvalidation ?? true,
      defaultStrategy: policy.defaultStrategy ?? 'immediate',
      batchSize: policy.batchSize ?? 100,
      batchInterval: policy.batchInterval ?? 1000,
      maxRetries: policy.maxRetries ?? 3,
      retryDelay: policy.retryDelay ?? 5000,
      enableCascading: policy.enableCascading ?? true,
      enableMetrics: policy.enableMetrics ?? true
    };
  }

  /**
   * Register a cache manager
   */
  registerCache(name: string, manager: CacheManager): void {
    this.cacheManagers.set(name, manager);
  }

  /**
   * Register an invalidation rule
   */
  addRule(rule: InvalidationRule): void {
    this.rules.set(rule.name, rule);
    this.metrics.rulesTriggered[rule.name] = 0;
  }

  /**
   * Remove an invalidation rule
   */
  removeRule(name: string): boolean {
    const removed = this.rules.delete(name);
    if (removed) {
      delete this.metrics.rulesTriggered[name];
    }
    return removed;
  }

  /**
   * Invalidate a specific cache key across all registered caches
   */
  async invalidateKey(
    key: string,
    options?: {
      caches?: string[]; // Specific caches to target
      source?: 'user' | 'system' | 'external';
      metadata?: Record<string, any>;
      force?: boolean; // Skip rule evaluation
    }
  ): Promise<{ successful: string[]; failed: string[] }> {
    const startTime = Date.now();
    const event: InvalidationEvent = {
      type: 'manual',
      source: options?.source ?? 'user',
      target: 'key',
      value: key,
      timestamp: startTime,
      metadata: options?.metadata
    };

    const targetCaches = options?.caches ?? Array.from(this.cacheManagers.keys());
    const successful: string[] = [];
    const failed: string[] = [];

    // Apply rules if not forced
    if (!options?.force && this.policy.enableAutoInvalidation) {
      const matchingRules = this.findMatchingRules(key);
      for (const rule of matchingRules) {
        if (rule.strategy === 'conditional' && rule.condition && !rule.condition(key, options?.metadata)) {
          continue;
        }

        this.metrics.rulesTriggered[rule.name]++;

        // Handle different strategies
        switch (rule.strategy) {
          case 'scheduled':
            this.scheduleInvalidation(key, rule, event);
            continue;
          case 'lazy':
            this.addToPendingInvalidations(key, event);
            continue;
        }
      }
    }

    // Immediate invalidation
    for (const cacheName of targetCaches) {
      const manager = this.cacheManagers.get(cacheName);
      if (!manager) {
        failed.push(cacheName);
        continue;
      }

      try {
        const result = await manager.invalidate(key);
        if (result) {
          successful.push(cacheName);
        } else {
          failed.push(cacheName);
        }
      } catch (error) {
        failed.push(cacheName);
      }
    }

    // Handle cascading invalidations
    if (this.policy.enableCascading && successful.length > 0) {
      await this.handleCascadingInvalidations(key, event);
    }

    // Update metrics
    this.updateMetrics(startTime, successful.length > 0);

    // Emit event
    this.emitEvent('invalidation', event);

    return { successful, failed };
  }

  /**
   * Invalidate keys by pattern
   */
  async invalidatePattern(
    pattern: RegExp,
    options?: {
      caches?: string[];
      source?: 'user' | 'system' | 'external';
      metadata?: Record<string, any>;
    }
  ): Promise<{ successful: Record<string, number>; failed: string[] }> {
    const startTime = Date.now();
    const event: InvalidationEvent = {
      type: 'manual',
      source: options?.source ?? 'user',
      target: 'pattern',
      value: pattern,
      timestamp: startTime,
      metadata: options?.metadata
    };

    const targetCaches = options?.caches ?? Array.from(this.cacheManagers.keys());
    const successful: Record<string, number> = {};
    const failed: string[] = [];

    for (const cacheName of targetCaches) {
      const manager = this.cacheManagers.get(cacheName);
      if (!manager || !manager.invalidatePattern) {
        failed.push(cacheName);
        continue;
      }

      try {
        const count = await manager.invalidatePattern(pattern);
        successful[cacheName] = count;
      } catch (error) {
        failed.push(cacheName);
      }
    }

    this.updateMetrics(startTime, Object.keys(successful).length > 0);
    this.emitEvent('invalidation', event);

    return { successful, failed };
  }

  /**
   * Invalidate keys by tag
   */
  async invalidateByTag(
    tag: string,
    options?: {
      caches?: string[];
      source?: 'user' | 'system' | 'external';
      metadata?: Record<string, any>;
    }
  ): Promise<{ successful: Record<string, number>; failed: string[] }> {
    const startTime = Date.now();
    const event: InvalidationEvent = {
      type: 'manual',
      source: options?.source ?? 'user',
      target: 'tag',
      value: tag,
      timestamp: startTime,
      metadata: options?.metadata
    };

    const targetCaches = options?.caches ?? Array.from(this.cacheManagers.keys());
    const successful: Record<string, number> = {};
    const failed: string[] = [];

    for (const cacheName of targetCaches) {
      const manager = this.cacheManagers.get(cacheName);
      if (!manager || !manager.invalidateByTag) {
        failed.push(cacheName);
        continue;
      }

      try {
        const count = await manager.invalidateByTag(tag);
        successful[cacheName] = count;
      } catch (error) {
        failed.push(cacheName);
      }
    }

    this.updateMetrics(startTime, Object.keys(successful).length > 0);
    this.emitEvent('invalidation', event);

    return { successful, failed };
  }

  /**
   * Clear all caches
   */
  async clearAllCaches(options?: { caches?: string[] }): Promise<{ successful: string[]; failed: string[] }> {
    const targetCaches = options?.caches ?? Array.from(this.cacheManagers.keys());
    const successful: string[] = [];
    const failed: string[] = [];

    for (const cacheName of targetCaches) {
      const manager = this.cacheManagers.get(cacheName);
      if (!manager || !manager.clear) {
        failed.push(cacheName);
        continue;
      }

      try {
        await manager.clear();
        successful.push(cacheName);
      } catch (error) {
        failed.push(cacheName);
      }
    }

    // Clear all scheduled invalidations
    for (const timer of this.scheduledInvalidations.values()) {
      clearTimeout(timer);
    }
    this.scheduledInvalidations.clear();
    this.pendingInvalidations.clear();

    return { successful, failed };
  }

  /**
   * Process pending invalidations
   */
  async processPendingInvalidations(): Promise<number> {
    let processedCount = 0;
    const batchSize = this.policy.batchSize;

    for (const [key, events] of this.pendingInvalidations.entries()) {
      if (processedCount >= batchSize) break;

      await this.invalidateKey(key, { force: true, source: 'system' });
      this.pendingInvalidations.delete(key);
      processedCount++;
    }

    return processedCount;
  }

  /**
   * Schedule periodic processing of pending invalidations
   */
  startPeriodicProcessing(): void {
    setInterval(async () => {
      await this.processPendingInvalidations();
    }, this.policy.batchInterval);
  }

  /**
   * Get invalidation metrics
   */
  getMetrics(): InvalidationMetrics {
    return { ...this.metrics };
  }

  /**
   * Add event listener
   */
  addEventListener(event: string, listener: (event: InvalidationEvent) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(event: string, listener: (event: InvalidationEvent) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Private helper methods
   */

  private findMatchingRules(key: string): InvalidationRule[] {
    const matching: InvalidationRule[] = [];

    for (const rule of this.rules.values()) {
      if (typeof rule.pattern === 'string') {
        if (key.includes(rule.pattern)) {
          matching.push(rule);
        }
      } else if (rule.pattern instanceof RegExp) {
        if (rule.pattern.test(key)) {
          matching.push(rule);
        }
      }
    }

    // Sort by priority
    return matching.sort((a, b) => {
      const priorities = { high: 3, medium: 2, low: 1 };
      return priorities[b.priority] - priorities[a.priority];
    });
  }

  private scheduleInvalidation(key: string, rule: InvalidationRule, event: InvalidationEvent): void {
    const delay = this.calculateDelay(rule);
    const timerId = setTimeout(async () => {
      await this.invalidateKey(key, { force: true, source: 'system' });
      this.scheduledInvalidations.delete(key);
    }, delay);

    this.scheduledInvalidations.set(key, timerId);
  }

  private calculateDelay(rule: InvalidationRule): number {
    // Default delay based on priority
    const baseDelays = { high: 1000, medium: 5000, low: 30000 };
    return baseDelays[rule.priority];
  }

  private addToPendingInvalidations(key: string, event: InvalidationEvent): void {
    if (!this.pendingInvalidations.has(key)) {
      this.pendingInvalidations.set(key, []);
    }
    this.pendingInvalidations.get(key)!.push(event);
  }

  private async handleCascadingInvalidations(key: string, originalEvent: InvalidationEvent): Promise<void> {
    const matchingRules = this.findMatchingRules(key);

    for (const rule of matchingRules) {
      if (!rule.cascadeRules) continue;

      for (const cascadeRuleName of rule.cascadeRules) {
        const cascadeRule = this.rules.get(cascadeRuleName);
        if (!cascadeRule) continue;

        this.metrics.cascadedInvalidations++;

        // Create cascaded event
        const cascadedEvent: InvalidationEvent = {
          ...originalEvent,
          type: 'cascaded',
          source: 'system'
        };

        this.emitEvent('cascade', cascadedEvent);
      }
    }
  }

  private updateMetrics(startTime: number, successful: boolean): void {
    if (!this.policy.enableMetrics) return;

    this.metrics.totalInvalidations++;
    if (successful) {
      this.metrics.successfulInvalidations++;
    } else {
      this.metrics.failedInvalidations++;
    }

    const duration = Date.now() - startTime;
    this.metrics.averageInvalidationTime = (
      (this.metrics.averageInvalidationTime * (this.metrics.totalInvalidations - 1) + duration) /
      this.metrics.totalInvalidations
    );

    this.metrics.lastInvalidation = Date.now();
  }

  private emitEvent(eventType: string, event: InvalidationEvent): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }
  }

  /**
   * Destroy the invalidation manager
   */
  destroy(): void {
    // Clear all scheduled invalidations
    for (const timer of this.scheduledInvalidations.values()) {
      clearTimeout(timer);
    }
    this.scheduledInvalidations.clear();
    this.pendingInvalidations.clear();
    this.eventListeners.clear();
    this.rules.clear();
    this.cacheManagers.clear();
  }
}

/**
 * Predefined invalidation rules for common scenarios
 */
export const CommonInvalidationRules = {
  /**
   * Invalidate user-specific data when user logs out
   */
  userLogout: {
    name: 'user-logout',
    pattern: /^user:/,
    strategy: 'immediate' as const,
    priority: 'high' as const
  },

  /**
   * Invalidate stale content after 1 hour
   */
  staleContent: {
    name: 'stale-content',
    pattern: /^content:/,
    strategy: 'scheduled' as const,
    priority: 'medium' as const
  },

  /**
   * Invalidate events when new event is received
   */
  newEvent: {
    name: 'new-event',
    pattern: /^event:/,
    strategy: 'lazy' as const,
    priority: 'low' as const
  },

  /**
   * Invalidate cached responses when API version changes
   */
  apiVersionChange: {
    name: 'api-version-change',
    pattern: /^api:/,
    strategy: 'immediate' as const,
    priority: 'high' as const,
    cascadeRules: ['stale-content']
  }
};

/**
 * Factory function to create invalidation manager with NSM-specific setup
 */
export function createNSMInvalidationManager(
  caches: {
    memory?: MemoryCache<any>;
    indexedDB?: IndexedDBCache;
    nostrEvents?: NostrEventCache;
    blossomContent?: BlossomContentCache;
  },
  policy?: InvalidationPolicy
): CacheInvalidationManager {
  const manager = new CacheInvalidationManager(policy);

  // Register cache managers
  if (caches.memory) {
    manager.registerCache('memory', {
      invalidate: (key) => caches.memory!.delete(key),
      invalidatePattern: (pattern) => {
        const keys = caches.memory!.keys();
        let count = 0;
        for (const key of keys) {
          if (pattern.test(key)) {
            caches.memory!.delete(key);
            count++;
          }
        }
        return count;
      },
      clear: () => caches.memory!.clear()
    });
  }

  if (caches.indexedDB) {
    manager.registerCache('indexedDB', {
      invalidate: (key) => caches.indexedDB!.delete(key),
      clear: () => caches.indexedDB!.clear()
    });
  }

  if (caches.nostrEvents) {
    manager.registerCache('nostrEvents', {
      invalidate: (key) => caches.nostrEvents!.deleteEvent(key),
      clear: () => caches.nostrEvents!.clearEvents()
    });
  }

  if (caches.blossomContent) {
    manager.registerCache('blossomContent', {
      invalidate: (key) => caches.blossomContent!.deleteContent(key),
      clear: () => caches.blossomContent!.clearContent()
    });
  }

  // Add common rules
  Object.values(CommonInvalidationRules).forEach(rule => {
    manager.addRule(rule);
  });

  return manager;
}