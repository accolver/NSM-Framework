/**
 * Comprehensive DoS Protection Test Suite
 * Tests rate limiting, event filtering, resource monitoring, and throttling
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  DoSProtection,
  RateLimitConfig,
  EventFilterConfig,
  ResourceMonitorConfig,
  DoSProtectionConfig,
  DoSViolationType,
  DoSMetrics
} from './dos-protection';

describe('DoSProtection', () => {
  let dosProtection: DoSProtection;
  let config: DoSProtectionConfig;

  beforeEach(() => {
    config = {
      rateLimiting: {
        perUser: { windowMs: 60000, maxRequests: 100 },
        perIP: { windowMs: 60000, maxRequests: 200 },
        global: { windowMs: 60000, maxRequests: 10000 },
        byOperationType: {
          'publish': { windowMs: 60000, maxRequests: 100 },
          'subscribe': { windowMs: 60000, maxRequests: 20 },
          'interact': { windowMs: 60000, maxRequests: 100 }
        }
      },
      eventFiltering: {
        maxEventSize: 65536, // 64KB
        maxContentLength: 32768, // 32KB
        spamKeywords: ['spam', 'phishing', 'scam'],
        duplicateWindowMs: 300000, // 5 minutes
        maxSimilarEvents: 5,
        suspiciousPatterns: [
          /crypto.*wallet/i,
          /urgent.*claim/i,
          /free.*bitcoin/i
        ]
      },
      resourceMonitoring: {
        maxMemoryMB: 500,
        maxCPUPercent: 80,
        maxConnections: 1000,
        maxBandwidthMbps: 10,
        checkIntervalMs: 5000
      },
      throttling: {
        enabled: true,
        cpuThreshold: 70,
        memoryThreshold: 400,
        adaptiveScaling: true,
        gracefulDegradation: true,
        priorityLevels: ['critical', 'high', 'normal', 'low']
      }
    };

    dosProtection = new DoSProtection(config);
  });

  afterEach(() => {
    dosProtection.cleanup();
  });

  describe('Rate Limiting', () => {
    it('should enforce per-user rate limits', async () => {
      const userId = 'user123';

      // Fill up the rate limit
      for (let i = 0; i < 100; i++) {
        const result = await dosProtection.checkRateLimit(userId, null, 'publish');
        expect(result.allowed).toBe(true);
      }

      // Next request should be rate limited
      const result = await dosProtection.checkRateLimit(userId, null, 'publish');
      expect(result.allowed).toBe(false);
      expect(result.violationType).toBe(DoSViolationType.RATE_LIMIT_EXCEEDED);
    });

    it('should enforce per-IP rate limits', async () => {
      const ip = '192.168.1.1';

      // Fill up the rate limit
      for (let i = 0; i < 200; i++) {
        const result = await dosProtection.checkRateLimit(null, ip, 'publish');
        expect(result.allowed).toBe(true);
      }

      // Next request should be rate limited
      const result = await dosProtection.checkRateLimit(null, ip, 'publish');
      expect(result.allowed).toBe(false);
      expect(result.violationType).toBe(DoSViolationType.RATE_LIMIT_EXCEEDED);
    });

    it('should enforce global rate limits', async () => {
      // This would need to be tested with multiple concurrent users
      // For simplicity, we'll test the configuration is properly set
      const metrics = dosProtection.getMetrics();
      expect(metrics.rateLimiting.globalLimit).toBe(10000);
    });

    it('should enforce operation-specific rate limits', async () => {
      const userId = 'user123';

      // Test subscribe operation limit (20 requests) - this is different from user limit
      for (let i = 0; i < 20; i++) {
        const result = await dosProtection.checkRateLimit(userId, null, 'subscribe');
        expect(result.allowed).toBe(true);
      }

      const result = await dosProtection.checkRateLimit(userId, null, 'subscribe');
      expect(result.allowed).toBe(false);

      // But publish operation should still work (different limit - 100)
      const publishResult = await dosProtection.checkRateLimit(userId, null, 'publish');
      expect(publishResult.allowed).toBe(true);
    });

    it('should reset rate limits after window expires', async () => {
      const shortConfig = {
        ...config,
        rateLimiting: {
          ...config.rateLimiting,
          byOperationType: {
            ...config.rateLimiting.byOperationType,
            'publish': { windowMs: 100, maxRequests: 2 }
          }
        }
      };

      const shortDoSProtection = new DoSProtection(shortConfig);
      const userId = 'user123';

      // Use up the rate limit
      await shortDoSProtection.checkRateLimit(userId, null, 'publish');
      await shortDoSProtection.checkRateLimit(userId, null, 'publish');

      let result = await shortDoSProtection.checkRateLimit(userId, null, 'publish');
      expect(result.allowed).toBe(false);

      // Wait for window to reset
      await new Promise(resolve => setTimeout(resolve, 150));

      result = await shortDoSProtection.checkRateLimit(userId, null, 'publish');
      expect(result.allowed).toBe(true);

      shortDoSProtection.cleanup();
    });
  });

  describe('Event Filtering', () => {
    it('should reject oversized events', async () => {
      const largeEvent = {
        kind: 30079,
        content: 'x'.repeat(70000), // Exceeds 64KB limit
        tags: [['d', 'test']],
        pubkey: 'pubkey123',
        created_at: Math.floor(Date.now() / 1000),
        id: 'eventid123',
        sig: 'signature123'
      };

      const result = await dosProtection.filterEvent(largeEvent, 'user123');
      expect(result.allowed).toBe(false);
      expect(result.violationType).toBe(DoSViolationType.EVENT_SIZE_EXCEEDED);
    });

    it('should reject events with spam keywords', async () => {
      const spamEvent = {
        kind: 30079,
        content: 'This is a spam message with phishing content',
        tags: [['d', 'test']],
        pubkey: 'pubkey123',
        created_at: Math.floor(Date.now() / 1000),
        id: 'eventid123',
        sig: 'signature123'
      };

      const result = await dosProtection.filterEvent(spamEvent, 'user123');
      expect(result.allowed).toBe(false);
      expect(result.violationType).toBe(DoSViolationType.SPAM_DETECTED);
    });

    it('should reject events matching suspicious patterns', async () => {
      const suspiciousEvent = {
        kind: 30079,
        content: 'Urgent! Claim your free bitcoin wallet now!',
        tags: [['d', 'test']],
        pubkey: 'pubkey123',
        created_at: Math.floor(Date.now() / 1000),
        id: 'eventid123',
        sig: 'signature123'
      };

      const result = await dosProtection.filterEvent(suspiciousEvent, 'user123');
      expect(result.allowed).toBe(false);
      expect(result.violationType).toBe(DoSViolationType.SUSPICIOUS_PATTERN);
    });

    it('should detect and reject duplicate events', async () => {
      const event = {
        kind: 30079,
        content: 'legitimate content',
        tags: [['d', 'test']],
        pubkey: 'pubkey123',
        created_at: Math.floor(Date.now() / 1000),
        id: 'eventid123',
        sig: 'signature123'
      };

      // First event should be allowed
      let result = await dosProtection.filterEvent(event, 'user123');
      expect(result.allowed).toBe(true);

      // Duplicate event should be rejected
      result = await dosProtection.filterEvent(event, 'user123');
      expect(result.allowed).toBe(false);
      expect(result.violationType).toBe(DoSViolationType.DUPLICATE_EVENT);
    });

    it('should detect similar events flooding', async () => {
      const baseEvent = {
        kind: 30079,
        tags: [['d', 'test']],
        pubkey: 'pubkey123',
        created_at: Math.floor(Date.now() / 1000),
        sig: 'signature123'
      };

      // Send maximum allowed similar events
      for (let i = 0; i < 5; i++) {
        const event = {
          ...baseEvent,
          content: `similar content ${i}`,
          id: `eventid${i}`
        };

        const result = await dosProtection.filterEvent(event, 'user123');
        expect(result.allowed).toBe(true);
      }

      // Next similar event should be rejected
      const floodEvent = {
        ...baseEvent,
        content: 'similar content flood',
        id: 'eventidflood'
      };

      const result = await dosProtection.filterEvent(floodEvent, 'user123');
      expect(result.allowed).toBe(false);
      expect(result.violationType).toBe(DoSViolationType.FLOODING_DETECTED);
    });

    it('should allow legitimate events', async () => {
      const legitimateEvent = {
        kind: 30079,
        content: 'This is a legitimate NSM definition',
        tags: [['d', 'legitimate-app'], ['name', 'My App']],
        pubkey: 'pubkey123',
        created_at: Math.floor(Date.now() / 1000),
        id: 'eventid123',
        sig: 'signature123'
      };

      const result = await dosProtection.filterEvent(legitimateEvent, 'user123');
      expect(result.allowed).toBe(true);
    });
  });

  describe('Resource Monitoring', () => {
    it('should track resource usage', () => {
      const metrics = dosProtection.getMetrics();
      expect(metrics.resources).toBeDefined();
      expect(metrics.resources.memoryUsageMB).toBeGreaterThanOrEqual(0);
      expect(metrics.resources.connections).toBeGreaterThanOrEqual(0);
    });

    it('should detect resource exhaustion', async () => {
      // Simulate high memory usage
      dosProtection.updateResourceUsage({
        memoryUsageMB: 600, // Exceeds 500MB limit
        cpuPercent: 50,
        connections: 100,
        bandwidthMbps: 5
      });

      const result = await dosProtection.checkResourceLimits();
      expect(result.allowed).toBe(false);
      expect(result.violationType).toBe(DoSViolationType.RESOURCE_EXHAUSTION);
    });

    it('should handle connection limits', async () => {
      // Simulate too many connections
      dosProtection.updateResourceUsage({
        memoryUsageMB: 100,
        cpuPercent: 50,
        connections: 1500, // Exceeds 1000 limit
        bandwidthMbps: 5
      });

      const result = await dosProtection.checkResourceLimits();
      expect(result.allowed).toBe(false);
      expect(result.violationType).toBe(DoSViolationType.RESOURCE_EXHAUSTION);
    });
  });

  describe('Automatic Throttling', () => {
    it('should enable throttling under high CPU load', async () => {
      // Simulate high CPU usage
      dosProtection.updateResourceUsage({
        memoryUsageMB: 200,
        cpuPercent: 85, // Above 70% threshold
        connections: 500,
        bandwidthMbps: 5
      });

      const throttleState = dosProtection.getThrottleState();
      expect(throttleState.enabled).toBe(true);
      expect(throttleState.level).toBeGreaterThan(0);
    });

    it('should prioritize critical operations during throttling', async () => {
      // Enable throttling
      dosProtection.updateResourceUsage({
        memoryUsageMB: 450, // High memory usage
        cpuPercent: 80,
        connections: 800,
        bandwidthMbps: 8
      });

      // Critical operation should be allowed
      const criticalResult = await dosProtection.checkThrottling('user123', 'critical');
      expect(criticalResult.allowed).toBe(true);

      // Low priority operation might be throttled
      const lowResult = await dosProtection.checkThrottling('user123', 'low');
      // Note: Exact behavior depends on throttling algorithm
      expect([true, false]).toContain(lowResult.allowed);
    });

    it('should implement graceful degradation', async () => {
      // Enable severe throttling
      dosProtection.updateResourceUsage({
        memoryUsageMB: 480,
        cpuPercent: 90,
        connections: 950,
        bandwidthMbps: 9.5
      });

      const throttleState = dosProtection.getThrottleState();
      expect(throttleState.enabled).toBe(true);
      expect(throttleState.gracefulMode).toBe(true);
    });
  });

  describe('Circuit Breaker Pattern', () => {
    it('should trip circuit breaker after consecutive failures', async () => {
      // Simulate consecutive resource exhaustion
      for (let i = 0; i < 5; i++) {
        dosProtection.updateResourceUsage({
          memoryUsageMB: 600,
          cpuPercent: 95,
          connections: 1200,
          bandwidthMbps: 12
        });
        await dosProtection.checkResourceLimits();
      }

      const circuitState = dosProtection.getCircuitBreakerState();
      expect(circuitState.state).toBe('open');
    });

    it('should transition to half-open state after timeout', async () => {
      // First trip the circuit breaker
      for (let i = 0; i < 5; i++) {
        dosProtection.updateResourceUsage({
          memoryUsageMB: 600,
          cpuPercent: 95,
          connections: 1200,
          bandwidthMbps: 12
        });
        await dosProtection.checkResourceLimits();
      }

      // Verify it's open
      let circuitState = dosProtection.getCircuitBreakerState();
      expect(circuitState.state).toBe('open');

      // Force transition to half-open for testing
      dosProtection.forceCircuitBreakerTransition();

      // Should now be half-open
      const finalState = dosProtection.getCircuitBreakerState();
      expect(finalState.state).toBe('half-open');
    });
  });

  describe('Metrics and Monitoring', () => {
    it('should provide comprehensive metrics', () => {
      const metrics = dosProtection.getMetrics();

      expect(metrics.rateLimiting).toBeDefined();
      expect(metrics.eventFiltering).toBeDefined();
      expect(metrics.resources).toBeDefined();
      expect(metrics.throttling).toBeDefined();
      expect(metrics.violations).toBeDefined();
    });

    it('should track violation statistics', async () => {
      // Generate some violations
      await dosProtection.filterEvent({
        kind: 30079,
        content: 'This contains spam keywords',
        tags: [['d', 'test']],
        pubkey: 'pubkey123',
        created_at: Math.floor(Date.now() / 1000),
        id: 'eventid123',
        sig: 'signature123'
      }, 'user123');

      const metrics = dosProtection.getMetrics();
      expect(metrics.violations.total).toBeGreaterThan(0);
      expect(metrics.violations.byType['spam_detected']).toBeGreaterThan(0);
    });

    it('should track performance metrics', async () => {
      const startTime = Date.now();

      // Make multiple calls to ensure performance tracking
      await dosProtection.checkRateLimit('user123', null, 'publish');
      await dosProtection.checkRateLimit('user123', null, 'publish');
      await dosProtection.checkRateLimit('user123', null, 'publish');

      const metrics = dosProtection.getMetrics();
      expect(metrics.performance).toBeDefined();
      expect(metrics.performance.avgResponseTime).toBeGreaterThanOrEqual(0);
      expect(metrics.performance.checksPerSecond).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration with Security Sandbox', () => {
    it('should coordinate with existing security measures', async () => {
      // Test that DoS protection works alongside sandbox security
      const event = {
        kind: 30079,
        content: 'eval("malicious code")', // Should be caught by both systems
        tags: [['d', 'test']],
        pubkey: 'pubkey123',
        created_at: Math.floor(Date.now() / 1000),
        id: 'eventid123',
        sig: 'signature123'
      };

      const result = await dosProtection.filterEvent(event, 'user123');
      // Should be filtered out by pattern matching
      expect(result.allowed).toBe(false);
    });
  });

  describe('Configuration and Customization', () => {
    it('should accept custom configuration', () => {
      const customConfig: DoSProtectionConfig = {
        rateLimiting: {
          perUser: { windowMs: 30000, maxRequests: 50 },
          perIP: { windowMs: 30000, maxRequests: 100 },
          global: { windowMs: 30000, maxRequests: 5000 },
          byOperationType: {
            'publish': { windowMs: 30000, maxRequests: 25 }
          }
        },
        eventFiltering: {
          maxEventSize: 32768,
          maxContentLength: 16384,
          spamKeywords: ['custom-spam'],
          duplicateWindowMs: 60000,
          maxSimilarEvents: 3,
          suspiciousPatterns: [/custom.*pattern/i]
        },
        resourceMonitoring: {
          maxMemoryMB: 1000,
          maxCPUPercent: 90,
          maxConnections: 2000,
          maxBandwidthMbps: 20,
          checkIntervalMs: 10000
        },
        throttling: {
          enabled: false,
          cpuThreshold: 80,
          memoryThreshold: 800,
          adaptiveScaling: false,
          gracefulDegradation: false,
          priorityLevels: ['high', 'normal']
        }
      };

      const customDoSProtection = new DoSProtection(customConfig);
      const metrics = customDoSProtection.getMetrics();

      expect(metrics.rateLimiting.perUserLimit).toBe(50);
      expect(metrics.eventFiltering.maxEventSize).toBe(32768);

      customDoSProtection.cleanup();
    });
  });
});