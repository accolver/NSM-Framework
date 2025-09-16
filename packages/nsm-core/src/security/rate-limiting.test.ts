/**
 * Comprehensive Rate Limiting Test Suite
 * Tests all rate limiting algorithms and multi-tier scenarios
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  RateLimiter,
  MultiTierRateLimiter,
  RateLimitAlgorithm,
  RateLimitOptions,
  RateLimitResult
} from './rate-limiting';

describe('RateLimiter', () => {
  describe('Token Bucket Algorithm', () => {
    let limiter: RateLimiter;

    beforeEach(() => {
      const options: RateLimitOptions = {
        algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
        capacity: 10,
        refillRate: 2 // 2 tokens per second
      };
      limiter = new RateLimiter(options);
    });

    afterEach(() => {
      limiter.cleanup();
    });

    it('should allow requests within capacity', async () => {
      for (let i = 0; i < 10; i++) {
        const result = await limiter.check('user1');
        expect(result.allowed).toBe(true);
        expect(result.remainingTokens).toBe(9 - i);
      }
    });

    it('should reject requests when bucket is empty', async () => {
      // Fill the bucket
      for (let i = 0; i < 10; i++) {
        await limiter.check('user1');
      }

      // Next request should be rejected
      const result = await limiter.check('user1');
      expect(result.allowed).toBe(false);
      expect(result.remainingTokens).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should refill tokens over time', async () => {
      // Fill the bucket
      for (let i = 0; i < 10; i++) {
        await limiter.check('user1');
      }

      // Wait for refill (simulate time passing)
      await new Promise(resolve => setTimeout(resolve, 1100)); // 1.1 seconds

      // Should have ~2 tokens available
      const result = await limiter.check('user1');
      expect(result.allowed).toBe(true);
      expect(result.remainingTokens).toBeGreaterThanOrEqual(1);
    });

    it('should handle multiple tokens per request', async () => {
      const result = await limiter.check('user1', 5);
      expect(result.allowed).toBe(true);
      expect(result.remainingTokens).toBe(5);

      const result2 = await limiter.check('user1', 6);
      expect(result2.allowed).toBe(false);
    });

    it('should isolate different keys', async () => {
      // Fill bucket for user1
      for (let i = 0; i < 10; i++) {
        await limiter.check('user1');
      }

      // user2 should still have full capacity
      const result = await limiter.check('user2');
      expect(result.allowed).toBe(true);
      expect(result.remainingTokens).toBe(9);
    });
  });

  describe('Sliding Window Algorithm', () => {
    let limiter: RateLimiter;

    beforeEach(() => {
      const options: RateLimitOptions = {
        algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
        capacity: 5,
        refillRate: 1,
        windowMs: 2000 // 2 second window
      };
      limiter = new RateLimiter(options);
    });

    afterEach(() => {
      limiter.cleanup();
    });

    it('should allow requests within window capacity', async () => {
      for (let i = 0; i < 5; i++) {
        const result = await limiter.check('user1');
        expect(result.allowed).toBe(true);
        expect(result.remainingTokens).toBe(4 - i);
      }
    });

    it('should reject requests exceeding window capacity', async () => {
      // Fill the window
      for (let i = 0; i < 5; i++) {
        await limiter.check('user1');
      }

      // Next request should be rejected
      const result = await limiter.check('user1');
      expect(result.allowed).toBe(false);
      expect(result.remainingTokens).toBe(0);
    });

    it('should allow requests after window slides', async () => {
      // Fill the window
      for (let i = 0; i < 5; i++) {
        await limiter.check('user1');
      }

      // Wait for window to slide
      await new Promise(resolve => setTimeout(resolve, 2100));

      // Should be able to make requests again
      const result = await limiter.check('user1');
      expect(result.allowed).toBe(true);
      expect(result.remainingTokens).toBe(4);
    });
  });

  describe('Fixed Window Algorithm', () => {
    let limiter: RateLimiter;

    beforeEach(() => {
      const options: RateLimitOptions = {
        algorithm: RateLimitAlgorithm.FIXED_WINDOW,
        capacity: 3,
        refillRate: 1,
        windowMs: 1000 // 1 second window
      };
      limiter = new RateLimiter(options);
    });

    afterEach(() => {
      limiter.cleanup();
    });

    it('should reset counter at window boundary', async () => {
      // Fill the window
      for (let i = 0; i < 3; i++) {
        const result = await limiter.check('user1');
        expect(result.allowed).toBe(true);
      }

      // Should be rejected
      let result = await limiter.check('user1');
      expect(result.allowed).toBe(false);

      // Wait for next window
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should reset and allow requests
      result = await limiter.check('user1');
      expect(result.allowed).toBe(true);
      expect(result.remainingTokens).toBe(2);
    });
  });

  describe('Leaky Bucket Algorithm', () => {
    let limiter: RateLimiter;

    beforeEach(() => {
      const options: RateLimitOptions = {
        algorithm: RateLimitAlgorithm.LEAKY_BUCKET,
        capacity: 5,
        refillRate: 2 // 2 tokens leak per second
      };
      limiter = new RateLimiter(options);
    });

    afterEach(() => {
      limiter.cleanup();
    });

    it('should accumulate tokens up to capacity', async () => {
      for (let i = 0; i < 5; i++) {
        const result = await limiter.check('user1');
        expect(result.allowed).toBe(true);
      }

      // Should be rejected when full
      const result = await limiter.check('user1');
      expect(result.allowed).toBe(false);
    });

    it('should leak tokens over time', async () => {
      // Fill the bucket
      for (let i = 0; i < 5; i++) {
        await limiter.check('user1');
      }

      // Wait for tokens to leak
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should have capacity again due to leaking
      const result = await limiter.check('user1');
      expect(result.allowed).toBe(true);
    });
  });

  describe('Status and Management', () => {
    let limiter: RateLimiter;

    beforeEach(() => {
      const options: RateLimitOptions = {
        algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
        capacity: 10,
        refillRate: 2
      };
      limiter = new RateLimiter(options);
    });

    afterEach(() => {
      limiter.cleanup();
    });

    it('should provide status without consuming tokens', async () => {
      await limiter.check('user1', 5);

      const status = await limiter.status('user1');
      expect(status.remainingTokens).toBe(5);
      expect(status.totalHits).toBe(5);

      // Status check shouldn't consume tokens
      const status2 = await limiter.status('user1');
      expect(status2.remainingTokens).toBe(status.remainingTokens);
    });

    it('should reset specific keys', async () => {
      await limiter.check('user1', 5);

      limiter.reset('user1');

      const status = await limiter.status('user1');
      expect(status.remainingTokens).toBe(10);
      expect(status.totalHits).toBe(0);
    });

    it('should provide metrics', () => {
      const metrics = limiter.getMetrics();
      expect(metrics.algorithm).toBe(RateLimitAlgorithm.TOKEN_BUCKET);
      expect(metrics.totalKeys).toBe(0);
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
    });

    it('should track active keys', async () => {
      await limiter.check('user1');
      await limiter.check('user2');

      const keys = limiter.getKeys();
      expect(keys).toContain('user1');
      expect(keys).toContain('user2');
      expect(keys.length).toBe(2);
    });
  });
});

describe('MultiTierRateLimiter', () => {
  let multiLimiter: MultiTierRateLimiter;

  beforeEach(() => {
    const tiers = {
      user: {
        algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
        capacity: 100,
        refillRate: 10
      },
      ip: {
        algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
        capacity: 500,
        refillRate: 1,
        windowMs: 60000
      },
      global: {
        algorithm: RateLimitAlgorithm.FIXED_WINDOW,
        capacity: 10000,
        refillRate: 1,
        windowMs: 60000
      }
    };

    multiLimiter = new MultiTierRateLimiter(tiers);
  });

  afterEach(() => {
    multiLimiter.cleanup();
  });

  it('should check individual tiers', async () => {
    const result = await multiLimiter.check('user', 'user123', 5);
    expect(result.allowed).toBe(true);
    expect(result.remainingTokens).toBe(95);
  });

  it('should check multiple tiers simultaneously', async () => {
    const checks = [
      { tier: 'user', key: 'user123', tokens: 10 },
      { tier: 'ip', key: '192.168.1.1', tokens: 5 },
      { tier: 'global', key: 'app', tokens: 1 }
    ];

    const result = await multiLimiter.checkMultiple(checks);
    expect(result.allowed).toBe(true);
    expect(result.results.length).toBe(3);
    expect(result.results.every(r => r.allowed)).toBe(true);
  });

  it('should fail if any tier is exceeded', async () => {
    // Fill up user tier
    for (let i = 0; i < 100; i++) {
      await multiLimiter.check('user', 'user123', 1);
    }

    const checks = [
      { tier: 'user', key: 'user123', tokens: 1 }, // Should fail
      { tier: 'ip', key: '192.168.1.1', tokens: 1 } // Should pass
    ];

    const result = await multiLimiter.checkMultiple(checks);
    expect(result.allowed).toBe(false);
    expect(result.failedTier).toBe('user');
  });

  it('should provide status for all tiers', async () => {
    await multiLimiter.check('user', 'user123', 10);
    await multiLimiter.check('ip', '192.168.1.1', 5);

    const status = await multiLimiter.getStatus();
    expect(status.user?.keys).toContain('user123');
    expect(status.ip?.keys).toContain('192.168.1.1');
    expect(status.global?.keys.length).toBe(0);
  });

  it('should reset all tiers', async () => {
    await multiLimiter.check('user', 'user123', 10);
    await multiLimiter.check('ip', '192.168.1.1', 5);

    multiLimiter.reset();

    const status = await multiLimiter.getStatus();
    expect(status.user?.keys.length).toBe(0);
    expect(status.ip?.keys.length).toBe(0);
  });

  it('should handle unknown tiers', async () => {
    await expect(multiLimiter.check('unknown', 'key', 1)).rejects.toThrow('Unknown rate limit tier: unknown');
  });
});

describe('Rate Limiting Edge Cases', () => {
  it('should handle zero capacity gracefully', () => {
    const options: RateLimitOptions = {
      algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
      capacity: 0,
      refillRate: 1
    };

    const limiter = new RateLimiter(options);

    expect(async () => {
      const result = await limiter.check('user1');
      expect(result.allowed).toBe(false);
    }).not.toThrow();

    limiter.cleanup();
  });

  it('should handle very high refill rates', async () => {
    const options: RateLimitOptions = {
      algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
      capacity: 1000,
      refillRate: 10000 // Very high refill rate
    };

    const limiter = new RateLimiter(options);

    // Should effectively be unlimited
    for (let i = 0; i < 100; i++) {
      const result = await limiter.check('user1');
      expect(result.allowed).toBe(true);
    }

    limiter.cleanup();
  });

  it('should handle concurrent requests', async () => {
    const options: RateLimitOptions = {
      algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
      capacity: 10,
      refillRate: 1
    };

    const limiter = new RateLimiter(options);

    // Make concurrent requests
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(limiter.check('user1'));
    }

    const results = await Promise.all(promises);
    const allowedCount = results.filter(r => r.allowed).length;

    // Should allow exactly 10 requests (the capacity)
    expect(allowedCount).toBe(10);

    limiter.cleanup();
  });

  it('should handle memory cleanup properly', async () => {
    const options: RateLimitOptions = {
      algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
      capacity: 5,
      refillRate: 1,
      windowMs: 100 // Very short window for testing
    };

    const limiter = new RateLimiter(options);

    // Create many entries
    for (let i = 0; i < 100; i++) {
      await limiter.check(`user${i}`);
    }

    const initialKeys = limiter.getKeys().length;
    expect(initialKeys).toBe(100);

    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 200));

    // Trigger internal cleanup by making a new request
    await limiter.check('cleanup-trigger');

    // Memory usage should be reasonable
    const metrics = limiter.getMetrics();
    expect(metrics.memoryUsage).toBeLessThan(100000); // Less than 100KB

    limiter.cleanup();
  });
});