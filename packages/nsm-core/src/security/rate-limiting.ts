/**
 * Advanced Rate Limiting Utilities for NSM Framework
 * Implements multiple rate limiting algorithms optimized for Nostr protocol
 */

import { EventEmitter } from 'events';

// Rate Limiting Algorithm Types
export enum RateLimitAlgorithm {
  TOKEN_BUCKET = 'token_bucket',
  SLIDING_WINDOW = 'sliding_window',
  FIXED_WINDOW = 'fixed_window',
  LEAKY_BUCKET = 'leaky_bucket'
}

// Configuration Interfaces
export interface RateLimitOptions {
  algorithm: RateLimitAlgorithm;
  capacity: number; // Maximum tokens/requests
  refillRate: number; // Tokens per second or window size
  windowMs?: number; // Window duration for sliding/fixed window
  burstCapacity?: number; // Maximum burst size for token bucket
}

export interface RateLimitResult {
  allowed: boolean;
  remainingTokens: number;
  resetTime: number;
  retryAfter?: number;
  totalHits: number;
}

export interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
  windowStart: number;
  requests: number[];
  totalRequests: number;
}

export class RateLimiter extends EventEmitter {
  protected cache = new Map<string, RateLimitEntry>();
  protected options: RateLimitOptions;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(options: RateLimitOptions) {
    super();
    this.options = {
      burstCapacity: options.capacity,
      ...options
    };
    this.startCleanup();
  }

  /**
   * Check if a request should be allowed through the rate limiter
   */
  public async check(key: string, tokens: number = 1): Promise<RateLimitResult> {
    const entry = this.getOrCreateEntry(key);

    switch (this.options.algorithm) {
      case RateLimitAlgorithm.TOKEN_BUCKET:
        return this.checkTokenBucket(entry, tokens);
      case RateLimitAlgorithm.SLIDING_WINDOW:
        return this.checkSlidingWindow(entry, tokens);
      case RateLimitAlgorithm.FIXED_WINDOW:
        return this.checkFixedWindow(entry, tokens);
      case RateLimitAlgorithm.LEAKY_BUCKET:
        return this.checkLeakyBucket(entry, tokens);
      default:
        throw new Error(`Unsupported algorithm: ${this.options.algorithm}`);
    }
  }

  /**
   * Get current rate limit status without consuming tokens
   */
  public async status(key: string): Promise<RateLimitResult> {
    const entry = this.getOrCreateEntry(key);

    switch (this.options.algorithm) {
      case RateLimitAlgorithm.TOKEN_BUCKET:
        return this.statusTokenBucket(entry);
      case RateLimitAlgorithm.SLIDING_WINDOW:
        return this.statusSlidingWindow(entry);
      case RateLimitAlgorithm.FIXED_WINDOW:
        return this.statusFixedWindow(entry);
      case RateLimitAlgorithm.LEAKY_BUCKET:
        return this.statusLeakyBucket(entry);
      default:
        throw new Error(`Unsupported algorithm: ${this.options.algorithm}`);
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  public reset(key: string): void {
    this.cache.delete(key);
    this.emit('reset', { key });
  }

  /**
   * Clear all rate limit entries
   */
  public clear(): void {
    this.cache.clear();
    this.emit('clear');
  }

  /**
   * Get all active rate limit keys
   */
  public getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get metrics about the rate limiter
   */
  public getMetrics(): {
    totalKeys: number;
    memoryUsage: number;
    algorithm: RateLimitAlgorithm;
    options: RateLimitOptions;
  } {
    return {
      totalKeys: this.cache.size,
      memoryUsage: this.estimateMemoryUsage(),
      algorithm: this.options.algorithm,
      options: this.options
    };
  }

  /**
   * Cleanup expired entries and stop timers
   */
  public cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
    this.removeAllListeners();
  }

  // Algorithm Implementations

  private checkTokenBucket(entry: RateLimitEntry, tokens: number): RateLimitResult {
    const now = Date.now();

    // Refill tokens based on time passed
    const timePassed = (now - entry.lastRefill) / 1000;
    const tokensToAdd = Math.floor(timePassed * this.options.refillRate);
    entry.tokens = Math.min(this.options.capacity, entry.tokens + tokensToAdd);
    entry.lastRefill = now;

    const allowed = entry.tokens >= tokens;

    if (allowed) {
      entry.tokens -= tokens;
      entry.totalRequests += tokens;
    }

    return {
      allowed,
      remainingTokens: entry.tokens,
      resetTime: now + ((this.options.capacity - entry.tokens) / this.options.refillRate * 1000),
      retryAfter: allowed ? undefined : Math.ceil(tokens / this.options.refillRate * 1000),
      totalHits: entry.totalRequests
    };
  }

  private statusTokenBucket(entry: RateLimitEntry): RateLimitResult {
    const now = Date.now();

    // Calculate available tokens without consuming
    const timePassed = (now - entry.lastRefill) / 1000;
    const tokensToAdd = Math.floor(timePassed * this.options.refillRate);
    const availableTokens = Math.min(this.options.capacity, entry.tokens + tokensToAdd);

    return {
      allowed: availableTokens >= 1,
      remainingTokens: availableTokens,
      resetTime: now + ((this.options.capacity - availableTokens) / this.options.refillRate * 1000),
      totalHits: entry.totalRequests
    };
  }

  private checkSlidingWindow(entry: RateLimitEntry, tokens: number): RateLimitResult {
    const now = Date.now();
    const windowMs = this.options.windowMs || 60000;

    // Remove old requests outside the sliding window
    entry.requests = entry.requests.filter(timestamp => now - timestamp < windowMs);

    const allowed = entry.requests.length + tokens <= this.options.capacity;

    if (allowed) {
      // Add new request timestamps
      for (let i = 0; i < tokens; i++) {
        entry.requests.push(now);
      }
      entry.totalRequests += tokens;
    }

    const oldestRequest = entry.requests[0];
    const resetTime = oldestRequest ? oldestRequest + windowMs : now + windowMs;

    return {
      allowed,
      remainingTokens: this.options.capacity - entry.requests.length,
      resetTime,
      retryAfter: allowed ? undefined : (oldestRequest ? oldestRequest + windowMs - now : windowMs),
      totalHits: entry.totalRequests
    };
  }

  private statusSlidingWindow(entry: RateLimitEntry): RateLimitResult {
    const now = Date.now();
    const windowMs = this.options.windowMs || 60000;

    // Calculate current window status without modifying
    const activeRequests = entry.requests.filter(timestamp => now - timestamp < windowMs);
    const oldestRequest = activeRequests[0];
    const resetTime = oldestRequest ? oldestRequest + windowMs : now + windowMs;

    return {
      allowed: activeRequests.length < this.options.capacity,
      remainingTokens: this.options.capacity - activeRequests.length,
      resetTime,
      totalHits: entry.totalRequests
    };
  }

  private checkFixedWindow(entry: RateLimitEntry, tokens: number): RateLimitResult {
    const now = Date.now();
    const windowMs = this.options.windowMs || 60000;
    const windowStart = Math.floor(now / windowMs) * windowMs;

    // Reset counter if we're in a new window
    if (entry.windowStart !== windowStart) {
      entry.requests = [];
      entry.windowStart = windowStart;
    }

    const allowed = entry.requests.length + tokens <= this.options.capacity;

    if (allowed) {
      for (let i = 0; i < tokens; i++) {
        entry.requests.push(now);
      }
      entry.totalRequests += tokens;
    }

    return {
      allowed,
      remainingTokens: this.options.capacity - entry.requests.length,
      resetTime: windowStart + windowMs,
      retryAfter: allowed ? undefined : (windowStart + windowMs - now),
      totalHits: entry.totalRequests
    };
  }

  private statusFixedWindow(entry: RateLimitEntry): RateLimitResult {
    const now = Date.now();
    const windowMs = this.options.windowMs || 60000;
    const windowStart = Math.floor(now / windowMs) * windowMs;

    // Check if we need a reset for status calculation
    const currentRequests = entry.windowStart === windowStart ? entry.requests.length : 0;

    return {
      allowed: currentRequests < this.options.capacity,
      remainingTokens: this.options.capacity - currentRequests,
      resetTime: windowStart + windowMs,
      totalHits: entry.totalRequests
    };
  }

  private checkLeakyBucket(entry: RateLimitEntry, tokens: number): RateLimitResult {
    const now = Date.now();

    // Leak tokens at the specified rate
    const timePassed = (now - entry.lastRefill) / 1000;
    const leakedTokens = Math.floor(timePassed * this.options.refillRate);
    entry.tokens = Math.max(0, entry.tokens - leakedTokens);
    entry.lastRefill = now;

    const allowed = entry.tokens + tokens <= this.options.capacity;

    if (allowed) {
      entry.tokens += tokens;
      entry.totalRequests += tokens;
    }

    return {
      allowed,
      remainingTokens: this.options.capacity - entry.tokens,
      resetTime: now + (entry.tokens / this.options.refillRate * 1000),
      retryAfter: allowed ? undefined : Math.ceil(tokens / this.options.refillRate * 1000),
      totalHits: entry.totalRequests
    };
  }

  private statusLeakyBucket(entry: RateLimitEntry): RateLimitResult {
    const now = Date.now();

    // Calculate leaked tokens without modifying state
    const timePassed = (now - entry.lastRefill) / 1000;
    const leakedTokens = Math.floor(timePassed * this.options.refillRate);
    const currentTokens = Math.max(0, entry.tokens - leakedTokens);

    return {
      allowed: currentTokens < this.options.capacity,
      remainingTokens: this.options.capacity - currentTokens,
      resetTime: now + (currentTokens / this.options.refillRate * 1000),
      totalHits: entry.totalRequests
    };
  }

  private getOrCreateEntry(key: string): RateLimitEntry {
    let entry = this.cache.get(key);

    if (!entry) {
      let initialTokens = this.options.capacity;

      // Leaky bucket starts empty (tokens represent current load)
      if (this.options.algorithm === RateLimitAlgorithm.LEAKY_BUCKET) {
        initialTokens = 0;
      }

      entry = {
        tokens: initialTokens,
        lastRefill: Date.now(),
        windowStart: 0,
        requests: [],
        totalRequests: 0
      };
      this.cache.set(key, entry);
    }

    return entry;
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 300000); // Cleanup every 5 minutes
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const windowMs = this.options.windowMs || 60000;

    for (const [key, entry] of this.cache.entries()) {
      let shouldDelete = false;

      switch (this.options.algorithm) {
        case RateLimitAlgorithm.TOKEN_BUCKET:
        case RateLimitAlgorithm.LEAKY_BUCKET:
          // Keep token bucket entries as they don't expire
          shouldDelete = now - entry.lastRefill > windowMs * 2;
          break;
        case RateLimitAlgorithm.SLIDING_WINDOW:
          shouldDelete = entry.requests.length === 0 &&
                        now - entry.lastRefill > windowMs;
          break;
        case RateLimitAlgorithm.FIXED_WINDOW:
          shouldDelete = now - entry.windowStart > windowMs * 2;
          break;
      }

      if (shouldDelete) {
        this.cache.delete(key);
        this.emit('expired', { key, entry });
      }
    }
  }

  private estimateMemoryUsage(): number {
    let totalSize = 0;

    for (const [key, entry] of this.cache.entries()) {
      // Rough estimation of memory usage
      totalSize += key.length * 2; // String characters
      totalSize += 8 * 4; // Numbers in entry
      totalSize += entry.requests.length * 8; // Request timestamps
    }

    return totalSize;
  }
}

/**
 * Multi-tier rate limiting system for different operation types
 */
export class MultiTierRateLimiter {
  private limiters = new Map<string, RateLimiter>();
  private tiers: { [key: string]: RateLimitOptions };

  constructor(tiers: { [key: string]: RateLimitOptions }) {
    this.tiers = tiers;

    for (const [tierName, options] of Object.entries(tiers)) {
      this.limiters.set(tierName, new RateLimiter(options));
    }
  }

  /**
   * Check rate limit for a specific tier and key
   */
  public async check(tier: string, key: string, tokens: number = 1): Promise<RateLimitResult> {
    const limiter = this.limiters.get(tier);
    if (!limiter) {
      throw new Error(`Unknown rate limit tier: ${tier}`);
    }

    return limiter.check(key, tokens);
  }

  /**
   * Check multiple tiers simultaneously (all must pass)
   */
  public async checkMultiple(
    checks: Array<{ tier: string; key: string; tokens?: number }>
  ): Promise<{ allowed: boolean; results: RateLimitResult[]; failedTier?: string }> {
    const results: RateLimitResult[] = [];

    for (const check of checks) {
      const result = await this.check(check.tier, check.key, check.tokens);
      results.push(result);

      if (!result.allowed) {
        return {
          allowed: false,
          results,
          failedTier: check.tier
        };
      }
    }

    return {
      allowed: true,
      results
    };
  }

  /**
   * Get status for all tiers
   */
  public async getStatus(): Promise<{ [tier: string]: { keys: string[]; metrics: any } }> {
    const status: { [tier: string]: { keys: string[]; metrics: any } } = {};

    for (const [tierName, limiter] of this.limiters.entries()) {
      status[tierName] = {
        keys: limiter.getKeys(),
        metrics: limiter.getMetrics()
      };
    }

    return status;
  }

  /**
   * Reset all limiters
   */
  public reset(): void {
    for (const limiter of this.limiters.values()) {
      limiter.clear();
    }
  }

  /**
   * Cleanup all resources
   */
  public cleanup(): void {
    for (const limiter of this.limiters.values()) {
      limiter.cleanup();
    }
    this.limiters.clear();
  }
}

/**
 * Distributed rate limiting using a shared backend (for multi-instance deployments)
 */
export interface DistributedRateLimitBackend {
  get(key: string): Promise<RateLimitEntry | null>;
  set(key: string, entry: RateLimitEntry, ttlMs?: number): Promise<void>;
  increment(key: string, tokens: number): Promise<number>;
  expire(key: string): Promise<void>;
}

export class DistributedRateLimiter extends RateLimiter {
  private backend: DistributedRateLimitBackend;
  private localCache = new Map<string, { entry: RateLimitEntry; lastSync: number }>();
  private syncInterval = 1000; // Sync with backend every second

  constructor(options: RateLimitOptions, backend: DistributedRateLimitBackend) {
    super(options);
    this.backend = backend;
  }

  public async check(key: string, tokens: number = 1): Promise<RateLimitResult> {
    // Try to use local cache first for performance
    const cached = this.localCache.get(key);
    const now = Date.now();

    if (cached && now - cached.lastSync < this.syncInterval) {
      // Use local cache
      return super.check(key, tokens);
    }

    // Sync with distributed backend
    try {
      const backendEntry = await this.backend.get(key);
      if (backendEntry) {
        this.cache.set(key, backendEntry);
        this.localCache.set(key, { entry: backendEntry, lastSync: now });
      }

      const result = await super.check(key, tokens);

      // Update backend if request was processed
      if (result.allowed) {
        const entry = this.cache.get(key)!;
        await this.backend.set(key, entry, this.options.windowMs);
      }

      return result;

    } catch (error) {
      // Fallback to local cache if backend is unavailable
      console.warn('Distributed rate limiter backend unavailable, using local cache:', error);
      return super.check(key, tokens);
    }
  }
}