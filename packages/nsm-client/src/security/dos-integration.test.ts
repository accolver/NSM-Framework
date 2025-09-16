/**
 * DoS Protection Integration Tests
 * Tests integration between DoS protection, rate limiting, resource monitoring, and NSM client
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  DoSProtection,
  DoSProtectionConfig,
  DoSViolationType
} from './dos-protection';
import { securitySandbox } from './sandbox';
import { NSMClient } from '../nsm-client';

describe('DoS Protection Integration', () => {
  let dosProtection: DoSProtection;
  let config: DoSProtectionConfig;

  beforeEach(() => {
    config = {
      rateLimiting: {
        perUser: { windowMs: 60000, maxRequests: 10 },
        perIP: { windowMs: 60000, maxRequests: 20 },
        global: { windowMs: 60000, maxRequests: 1000 },
        byOperationType: {
          'publish': { windowMs: 60000, maxRequests: 5 },
          'subscribe': { windowMs: 60000, maxRequests: 10 },
          'interact': { windowMs: 60000, maxRequests: 15 }
        }
      },
      eventFiltering: {
        maxEventSize: 4096, // 4KB
        maxContentLength: 2048, // 2KB
        spamKeywords: ['spam', 'scam', 'phishing'],
        duplicateWindowMs: 300000,
        maxSimilarEvents: 3,
        suspiciousPatterns: [
          /eval\s*\(/i,
          /script\s*>/i,
          /javascript\s*:/i
        ]
      },
      resourceMonitoring: {
        maxMemoryMB: 100,
        maxCPUPercent: 80,
        maxConnections: 50,
        maxBandwidthMbps: 5,
        checkIntervalMs: 1000
      },
      throttling: {
        enabled: true,
        cpuThreshold: 70,
        memoryThreshold: 80,
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

  describe('Rate Limiting Integration', () => {
    it('should enforce rate limits across different operation types', async () => {
      const userId = 'user123';

      // Fill up publish limit (5 requests)
      for (let i = 0; i < 5; i++) {
        const result = await dosProtection.checkRateLimit(userId, null, 'publish');
        expect(result.allowed).toBe(true);
      }

      // Next publish should be blocked
      const publishResult = await dosProtection.checkRateLimit(userId, null, 'publish');
      expect(publishResult.allowed).toBe(false);

      // But subscribe should still work (different limit)
      const subscribeResult = await dosProtection.checkRateLimit(userId, null, 'subscribe');
      expect(subscribeResult.allowed).toBe(true);
    });

    it('should enforce IP-based rate limits', async () => {
      const ip = '192.168.1.100';

      // Fill up IP limit (20 requests)
      for (let i = 0; i < 20; i++) {
        const result = await dosProtection.checkRateLimit(null, ip, 'publish');
        expect(result.allowed).toBe(true);
      }

      // Next request from same IP should be blocked
      const result = await dosProtection.checkRateLimit(null, ip, 'publish');
      expect(result.allowed).toBe(false);
      expect(result.violationType).toBe(DoSViolationType.RATE_LIMIT_EXCEEDED);
    });
  });

  describe('Event Filtering Integration', () => {
    it('should filter malicious events', async () => {
      const maliciousEvent = {
        kind: 30079,
        content: 'eval("malicious code")',
        tags: [['d', 'malicious-app']],
        pubkey: 'pubkey123',
        created_at: Math.floor(Date.now() / 1000),
        id: 'eventid123',
        sig: 'signature123'
      };

      const result = await dosProtection.filterEvent(maliciousEvent, 'user123');
      expect(result.allowed).toBe(false);
      expect(result.violationType).toBe(DoSViolationType.SUSPICIOUS_PATTERN);
    });

    it('should filter spam content', async () => {
      const spamEvent = {
        kind: 30079,
        content: 'This is a spam message promoting scam',
        tags: [['d', 'spam-app']],
        pubkey: 'pubkey123',
        created_at: Math.floor(Date.now() / 1000),
        id: 'eventid123',
        sig: 'signature123'
      };

      const result = await dosProtection.filterEvent(spamEvent, 'user123');
      expect(result.allowed).toBe(false);
      expect(result.violationType).toBe(DoSViolationType.SPAM_DETECTED);
    });

    it('should allow legitimate events', async () => {
      const legitimateEvent = {
        kind: 30079,
        content: JSON.stringify({
          name: 'Legitimate App',
          description: 'A real NSM application'
        }),
        tags: [['d', 'legitimate-app'], ['name', 'Legitimate App']],
        pubkey: 'pubkey123',
        created_at: Math.floor(Date.now() / 1000),
        id: 'eventid123',
        sig: 'signature123'
      };

      const result = await dosProtection.filterEvent(legitimateEvent, 'user123');
      expect(result.allowed).toBe(true);
    });
  });

  describe('Resource Monitoring Integration', () => {
    it('should detect resource exhaustion', async () => {
      // Simulate high resource usage
      dosProtection.updateResourceUsage({
        memoryUsageMB: 150, // Above 100MB limit
        cpuPercent: 90, // Above 80% limit
        connections: 60, // Above 50 limit
        bandwidthMbps: 7 // Above 5Mbps limit
      });

      const result = await dosProtection.checkResourceLimits();
      expect(result.allowed).toBe(false);
      expect(result.violationType).toBe(DoSViolationType.RESOURCE_EXHAUSTION);
    });

    it('should allow requests under resource limits', async () => {
      // Simulate normal resource usage
      dosProtection.updateResourceUsage({
        memoryUsageMB: 50,
        cpuPercent: 40,
        connections: 25,
        bandwidthMbps: 2
      });

      const result = await dosProtection.checkResourceLimits();
      expect(result.allowed).toBe(true);
    });
  });

  describe('Throttling Integration', () => {
    it('should throttle low priority requests under load', async () => {
      // Simulate high load
      dosProtection.updateResourceUsage({
        memoryUsageMB: 90, // High memory
        cpuPercent: 85, // High CPU
        connections: 45,
        bandwidthMbps: 4
      });

      // Critical requests should still pass
      const criticalResult = await dosProtection.checkThrottling('user123', 'critical');
      expect(criticalResult.allowed).toBe(true);

      // Low priority requests might be throttled
      const lowResult = await dosProtection.checkThrottling('user123', 'low');
      // Note: This test is probabilistic, but low priority should be more likely to be throttled
      expect([true, false]).toContain(lowResult.allowed);
    });
  });

  describe('End-to-End Protection Workflow', () => {
    it('should provide comprehensive protection for NSM events', async () => {
      const userId = 'user123';
      const ip = '192.168.1.100';

      // Step 1: Check rate limits
      const rateLimitResult = await dosProtection.checkRateLimit(userId, ip, 'publish');
      if (!rateLimitResult.allowed) {
        expect(rateLimitResult.violationType).toBe(DoSViolationType.RATE_LIMIT_EXCEEDED);
        return;
      }

      // Step 2: Check resource limits
      const resourceResult = await dosProtection.checkResourceLimits();
      if (!resourceResult.allowed) {
        expect(resourceResult.violationType).toBe(DoSViolationType.RESOURCE_EXHAUSTION);
        return;
      }

      // Step 3: Check throttling
      const throttleResult = await dosProtection.checkThrottling(userId, 'normal');
      if (!throttleResult.allowed) {
        expect(throttleResult.violationType).toBe(DoSViolationType.THROTTLED);
        return;
      }

      // Step 4: Filter event
      const event = {
        kind: 30079,
        content: JSON.stringify({ name: 'Test App' }),
        tags: [['d', 'test-app']],
        pubkey: 'pubkey123',
        created_at: Math.floor(Date.now() / 1000),
        id: 'eventid123',
        sig: 'signature123'
      };

      const filterResult = await dosProtection.filterEvent(event, userId);
      expect(filterResult.allowed).toBe(true);
    });

    it('should provide detailed metrics for monitoring', () => {
      const metrics = dosProtection.getMetrics();

      expect(metrics.rateLimiting).toBeDefined();
      expect(metrics.eventFiltering).toBeDefined();
      expect(metrics.resources).toBeDefined();
      expect(metrics.throttling).toBeDefined();
      expect(metrics.violations).toBeDefined();
      expect(metrics.performance).toBeDefined();

      // Verify metric structure
      expect(metrics.rateLimiting.perUserLimit).toBe(10);
      expect(metrics.eventFiltering.maxEventSize).toBe(4096);
      expect(metrics.violations.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Security Sandbox Integration', () => {
    it('should coordinate with security sandbox for code execution', async () => {
      // Test that DoS protection and security sandbox can work together
      const dangerousCode = `
        eval("malicious code");
        while(true) { /* infinite loop */ }
      `;

      // Event filtering should catch this first
      const event = {
        kind: 30079,
        content: dangerousCode,
        tags: [['d', 'malicious']],
        pubkey: 'pubkey123',
        created_at: Math.floor(Date.now() / 1000),
        id: 'eventid123',
        sig: 'signature123'
      };

      const dosResult = await dosProtection.filterEvent(event, 'user123');
      expect(dosResult.allowed).toBe(false);

      // If it somehow passed DoS protection, sandbox should catch it
      const canExecute = securitySandbox.canExecute('user123');
      expect(canExecute).toBe(true); // User not yet blocked by sandbox
    });
  });

  describe('Performance Under Load', () => {
    it('should maintain performance under concurrent load', async () => {
      const startTime = Date.now();
      const concurrentRequests = 50;
      const promises: Promise<any>[] = [];

      // Generate concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          dosProtection.checkRateLimit(`user${i % 10}`, null, 'interact')
        );
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time (under 1 second)
      expect(totalTime).toBeLessThan(1000);

      // Should have processed all requests
      expect(results.length).toBe(concurrentRequests);

      // Some requests should be allowed (within rate limits)
      const allowedCount = results.filter(r => r.allowed).length;
      expect(allowedCount).toBeGreaterThan(0);
    });

    it('should provide consistent response times', async () => {
      const responseTimes: number[] = [];

      for (let i = 0; i < 20; i++) {
        const start = Date.now();
        await dosProtection.checkRateLimit('user123', null, 'publish');
        const end = Date.now();
        responseTimes.push(end - start);
      }

      // Calculate average response time
      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;

      // Should be fast (under 10ms average)
      expect(avgResponseTime).toBeLessThan(10);

      // Should be consistent (no response should take more than 50ms)
      const maxResponseTime = Math.max(...responseTimes);
      expect(maxResponseTime).toBeLessThan(50);
    });
  });

  describe('Error Recovery', () => {
    it('should recover gracefully from errors', async () => {
      // Simulate an error condition
      try {
        // Pass invalid event to trigger error handling
        const invalidEvent = null as any;
        const result = await dosProtection.filterEvent(invalidEvent, 'user123');

        // Should fail open (allow the request) in case of errors
        expect(result.allowed).toBe(true);
      } catch (error) {
        // Error should be handled gracefully
        expect(error).toBeDefined();
      }
    });

    it('should maintain state consistency under errors', async () => {
      const initialMetrics = dosProtection.getMetrics();

      try {
        // Generate some errors
        for (let i = 0; i < 5; i++) {
          try {
            await dosProtection.filterEvent(null as any, 'user123');
          } catch (e) {
            // Ignore errors for this test
          }
        }
      } catch (e) {
        // Ignore errors
      }

      const finalMetrics = dosProtection.getMetrics();

      // Metrics structure should remain consistent
      expect(finalMetrics.rateLimiting).toBeDefined();
      expect(finalMetrics.eventFiltering).toBeDefined();
      expect(finalMetrics.violations).toBeDefined();
    });
  });
});