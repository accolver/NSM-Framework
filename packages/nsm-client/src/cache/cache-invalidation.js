"use strict";
/**
 * Cache Invalidation Strategies for NSM Framework
 * Provides intelligent cache invalidation across memory and persistent storage layers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommonInvalidationRules = exports.CacheInvalidationManager = void 0;
exports.createNSMInvalidationManager = createNSMInvalidationManager;
class CacheInvalidationManager {
    rules = new Map();
    policy;
    scheduledInvalidations = new Map();
    pendingInvalidations = new Map();
    metrics = {
        totalInvalidations: 0,
        successfulInvalidations: 0,
        failedInvalidations: 0,
        averageInvalidationTime: 0,
        cascadedInvalidations: 0,
        rulesTriggered: {},
        lastInvalidation: null
    };
    cacheManagers = new Map();
    eventListeners = new Map();
    constructor(policy = {}) {
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
    registerCache(name, manager) {
        this.cacheManagers.set(name, manager);
    }
    /**
     * Register an invalidation rule
     */
    addRule(rule) {
        this.rules.set(rule.name, rule);
        this.metrics.rulesTriggered[rule.name] = 0;
    }
    /**
     * Remove an invalidation rule
     */
    removeRule(name) {
        const removed = this.rules.delete(name);
        if (removed) {
            delete this.metrics.rulesTriggered[name];
        }
        return removed;
    }
    /**
     * Invalidate a specific cache key across all registered caches
     */
    async invalidateKey(key, options) {
        const startTime = Date.now();
        const event = {
            type: 'manual',
            source: options?.source ?? 'user',
            target: 'key',
            value: key,
            timestamp: startTime,
            metadata: options?.metadata
        };
        const targetCaches = options?.caches ?? Array.from(this.cacheManagers.keys());
        const successful = [];
        const failed = [];
        // Apply rules if not forced
        if (!options?.force && this.policy.enableAutoInvalidation) {
            const matchingRules = this.findMatchingRules(key);
            for (const rule of matchingRules) {
                if (rule.strategy === 'conditional' && rule.condition && !rule.condition(key, options?.metadata)) {
                    continue;
                }
                this.metrics.rulesTriggered[rule.name] = (this.metrics.rulesTriggered[rule.name] || 0) + 1;
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
                }
                else {
                    failed.push(cacheName);
                }
            }
            catch (error) {
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
    async invalidatePattern(pattern, options) {
        const startTime = Date.now();
        const event = {
            type: 'manual',
            source: options?.source ?? 'user',
            target: 'pattern',
            value: pattern,
            timestamp: startTime,
            metadata: options?.metadata
        };
        const targetCaches = options?.caches ?? Array.from(this.cacheManagers.keys());
        const successful = {};
        const failed = [];
        for (const cacheName of targetCaches) {
            const manager = this.cacheManagers.get(cacheName);
            if (!manager || !manager.invalidatePattern) {
                failed.push(cacheName);
                continue;
            }
            try {
                const count = await manager.invalidatePattern(pattern);
                successful[cacheName] = count;
            }
            catch (error) {
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
    async invalidateByTag(tag, options) {
        const startTime = Date.now();
        const event = {
            type: 'manual',
            source: options?.source ?? 'user',
            target: 'tag',
            value: tag,
            timestamp: startTime,
            metadata: options?.metadata
        };
        const targetCaches = options?.caches ?? Array.from(this.cacheManagers.keys());
        const successful = {};
        const failed = [];
        for (const cacheName of targetCaches) {
            const manager = this.cacheManagers.get(cacheName);
            if (!manager || !manager.invalidateByTag) {
                failed.push(cacheName);
                continue;
            }
            try {
                const count = await manager.invalidateByTag(tag);
                successful[cacheName] = count;
            }
            catch (error) {
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
    async clearAllCaches(options) {
        const targetCaches = options?.caches ?? Array.from(this.cacheManagers.keys());
        const successful = [];
        const failed = [];
        for (const cacheName of targetCaches) {
            const manager = this.cacheManagers.get(cacheName);
            if (!manager || !manager.clear) {
                failed.push(cacheName);
                continue;
            }
            try {
                await manager.clear();
                successful.push(cacheName);
            }
            catch (error) {
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
    async processPendingInvalidations() {
        let processedCount = 0;
        const batchSize = this.policy.batchSize;
        for (const [key, events] of this.pendingInvalidations.entries()) {
            if (processedCount >= batchSize)
                break;
            await this.invalidateKey(key, { force: true, source: 'system' });
            this.pendingInvalidations.delete(key);
            processedCount++;
        }
        return processedCount;
    }
    /**
     * Schedule periodic processing of pending invalidations
     */
    startPeriodicProcessing() {
        setInterval(async () => {
            await this.processPendingInvalidations();
        }, this.policy.batchInterval);
    }
    /**
     * Get invalidation metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }
    /**
     * Add event listener
     */
    addEventListener(event, listener) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(listener);
    }
    /**
     * Remove event listener
     */
    removeEventListener(event, listener) {
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
    findMatchingRules(key) {
        const matching = [];
        for (const rule of this.rules.values()) {
            if (typeof rule.pattern === 'string') {
                if (key.includes(rule.pattern)) {
                    matching.push(rule);
                }
            }
            else if (rule.pattern instanceof RegExp) {
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
    scheduleInvalidation(key, rule, event) {
        const delay = this.calculateDelay(rule);
        const timerId = setTimeout(async () => {
            await this.invalidateKey(key, { force: true, source: 'system' });
            this.scheduledInvalidations.delete(key);
        }, delay);
        this.scheduledInvalidations.set(key, timerId);
    }
    calculateDelay(rule) {
        // Default delay based on priority
        const baseDelays = { high: 1000, medium: 5000, low: 30000 };
        return baseDelays[rule.priority];
    }
    addToPendingInvalidations(key, event) {
        if (!this.pendingInvalidations.has(key)) {
            this.pendingInvalidations.set(key, []);
        }
        this.pendingInvalidations.get(key).push(event);
    }
    async handleCascadingInvalidations(key, originalEvent) {
        const matchingRules = this.findMatchingRules(key);
        for (const rule of matchingRules) {
            if (!rule.cascadeRules)
                continue;
            for (const cascadeRuleName of rule.cascadeRules) {
                const cascadeRule = this.rules.get(cascadeRuleName);
                if (!cascadeRule)
                    continue;
                this.metrics.cascadedInvalidations++;
                // Create cascaded event
                const cascadedEvent = {
                    ...originalEvent,
                    type: 'cascaded',
                    source: 'system'
                };
                this.emitEvent('cascade', cascadedEvent);
            }
        }
    }
    updateMetrics(startTime, successful) {
        if (!this.policy.enableMetrics)
            return;
        this.metrics.totalInvalidations++;
        if (successful) {
            this.metrics.successfulInvalidations++;
        }
        else {
            this.metrics.failedInvalidations++;
        }
        const duration = Date.now() - startTime;
        this.metrics.averageInvalidationTime = ((this.metrics.averageInvalidationTime * (this.metrics.totalInvalidations - 1) + duration) /
            this.metrics.totalInvalidations);
        this.metrics.lastInvalidation = Date.now();
    }
    emitEvent(eventType, event) {
        const listeners = this.eventListeners.get(eventType);
        if (listeners) {
            listeners.forEach(listener => listener(event));
        }
    }
    /**
     * Destroy the invalidation manager
     */
    destroy() {
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
exports.CacheInvalidationManager = CacheInvalidationManager;
/**
 * Predefined invalidation rules for common scenarios
 */
exports.CommonInvalidationRules = {
    /**
     * Invalidate user-specific data when user logs out
     */
    userLogout: {
        name: 'user-logout',
        pattern: /^user:/,
        strategy: 'immediate',
        priority: 'high'
    },
    /**
     * Invalidate stale content after 1 hour
     */
    staleContent: {
        name: 'stale-content',
        pattern: /^content:/,
        strategy: 'scheduled',
        priority: 'medium'
    },
    /**
     * Invalidate events when new event is received
     */
    newEvent: {
        name: 'new-event',
        pattern: /^event:/,
        strategy: 'lazy',
        priority: 'low'
    },
    /**
     * Invalidate cached responses when API version changes
     */
    apiVersionChange: {
        name: 'api-version-change',
        pattern: /^api:/,
        strategy: 'immediate',
        priority: 'high',
        cascadeRules: ['stale-content']
    }
};
/**
 * Factory function to create invalidation manager with NSM-specific setup
 */
function createNSMInvalidationManager(caches, policy) {
    const manager = new CacheInvalidationManager(policy);
    // Register cache managers
    if (caches.memory) {
        manager.registerCache('memory', {
            invalidate: (key) => caches.memory.delete(key),
            invalidatePattern: (pattern) => {
                const keys = caches.memory.keys();
                let count = 0;
                for (const key of keys) {
                    if (pattern.test(key)) {
                        caches.memory.delete(key);
                        count++;
                    }
                }
                return count;
            },
            clear: () => caches.memory.clear()
        });
    }
    if (caches.indexedDB) {
        manager.registerCache('indexedDB', {
            invalidate: (key) => caches.indexedDB.delete(key),
            clear: () => caches.indexedDB.clear()
        });
    }
    if (caches.nostrEvents) {
        manager.registerCache('nostrEvents', {
            invalidate: (key) => caches.nostrEvents.deleteEvent(key),
            clear: async () => { await caches.nostrEvents.clearEvents(); }
        });
    }
    if (caches.blossomContent) {
        manager.registerCache('blossomContent', {
            invalidate: (key) => caches.blossomContent.deleteContent(key),
            clear: async () => { await caches.blossomContent.clearContent(); }
        });
    }
    // Add common rules
    Object.values(exports.CommonInvalidationRules).forEach(rule => {
        manager.addRule(rule);
    });
    return manager;
}
