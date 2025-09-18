/**
 * DoS Protection Usage Example
 * Demonstrates how to integrate DoS protection with NSM applications
 */

import {
  DoSProtection,
  DoSProtectionConfig,
  DoSViolationType
} from './dos-protection';
import { NSMClient } from '../nsm-client';

/**
 * Example: Production-ready DoS protection configuration
 */
export function createProductionDoSConfig(): DoSProtectionConfig {
  return {
    rateLimiting: {
      perUser: { windowMs: 60000, maxRequests: 100 }, // 100 requests per minute per user
      perIP: { windowMs: 60000, maxRequests: 300 }, // 300 requests per minute per IP
      global: { windowMs: 60000, maxRequests: 50000 }, // 50K requests per minute globally
      byOperationType: {
        'publish': { windowMs: 60000, maxRequests: 20 }, // Publishing is more expensive
        'subscribe': { windowMs: 60000, maxRequests: 50 }, // Subscriptions are cheaper
        'interact': { windowMs: 60000, maxRequests: 100 }, // Interactions are moderate
        'query': { windowMs: 60000, maxRequests: 200 } // Queries are cheap
      }
    },
    eventFiltering: {
      maxEventSize: 65536, // 64KB max event size
      maxContentLength: 32768, // 32KB max content length
      spamKeywords: [
        // Common spam patterns
        'urgent', 'claim now', 'limited time', 'act fast',
        'free money', 'get rich', 'guaranteed profit',
        'click here', 'download now', 'virus', 'malware',
        // Crypto spam
        'free crypto', 'airdrop', 'pump and dump', 'moon',
        'to the moon', 'diamond hands', 'wen lambo'
      ],
      duplicateWindowMs: 300000, // 5 minutes for duplicate detection
      maxSimilarEvents: 5, // Max 5 similar events per user per window
      suspiciousPatterns: [
        // Code injection patterns
        /eval\s*\(/i,
        /Function\s*\(/i,
        /new\s+Function/i,
        /__proto__/i,
        /constructor\s*\.\s*constructor/i,
        // Script injection
        /<script[^>]*>/i,
        /javascript\s*:/i,
        /on\w+\s*=/i,
        // URL patterns that might be malicious
        /bit\.ly|tinyurl|t\.co/i,
        // Suspicious financial terms
        /send\s+\$?\d+.*bitcoin/i,
        /wallet\s+seed/i,
        /private\s+key/i
      ]
    },
    resourceMonitoring: {
      maxMemoryMB: 1000, // 1GB memory limit
      maxCPUPercent: 85, // 85% CPU limit
      maxConnections: 10000, // 10K concurrent connections
      maxBandwidthMbps: 100, // 100Mbps bandwidth limit
      checkIntervalMs: 5000 // Check every 5 seconds
    },
    throttling: {
      enabled: true,
      cpuThreshold: 70, // Start throttling at 70% CPU
      memoryThreshold: 800, // Start throttling at 800MB memory
      adaptiveScaling: true,
      gracefulDegradation: true,
      priorityLevels: ['critical', 'high', 'normal', 'low']
    }
  };
}

/**
 * Example: Development/testing DoS protection configuration
 */
export function createDevelopmentDoSConfig(): DoSProtectionConfig {
  return {
    rateLimiting: {
      perUser: { windowMs: 60000, maxRequests: 1000 }, // More lenient for development
      perIP: { windowMs: 60000, maxRequests: 2000 },
      global: { windowMs: 60000, maxRequests: 100000 },
      byOperationType: {
        'publish': { windowMs: 60000, maxRequests: 200 },
        'subscribe': { windowMs: 60000, maxRequests: 500 },
        'interact': { windowMs: 60000, maxRequests: 1000 },
        'query': { windowMs: 60000, maxRequests: 2000 }
      }
    },
    eventFiltering: {
      maxEventSize: 1048576, // 1MB for testing large events
      maxContentLength: 524288, // 512KB content
      spamKeywords: ['test-spam', 'development-block'],
      duplicateWindowMs: 60000, // Shorter window for testing
      maxSimilarEvents: 10,
      suspiciousPatterns: [
        /eval\s*\(/i,
        /malicious-test/i
      ]
    },
    resourceMonitoring: {
      maxMemoryMB: 2000, // Higher limits for development
      maxCPUPercent: 95,
      maxConnections: 50000,
      maxBandwidthMbps: 1000,
      checkIntervalMs: 10000
    },
    throttling: {
      enabled: false, // Disable throttling in development
      cpuThreshold: 90,
      memoryThreshold: 1500,
      adaptiveScaling: false,
      gracefulDegradation: false,
      priorityLevels: ['normal']
    }
  };
}

/**
 * Example: Enhanced NSM Client with DoS protection
 */
export class SecureNSMClient extends NSMClient {
  private dosProtection: DoSProtection;
  private isProduction: boolean;

  constructor(options: any = {}, isProduction: boolean = false) {
    super(options);
    this.isProduction = isProduction;

    // Initialize DoS protection
    const config = isProduction
      ? createProductionDoSConfig()
      : createDevelopmentDoSConfig();

    this.dosProtection = new DoSProtection(config);

    // Set up monitoring and alerting
    this.setupDoSMonitoring();
  }

  /**
   * Enhanced publish method with DoS protection
   */
  public async publishWithProtection(
    event: any,
    userId: string,
    userIP?: string,
    priority: string = 'normal'
  ): Promise<{ success: boolean; reason?: string; event?: any }> {
    try {
      // Step 1: Check rate limits
      const rateLimitResult = await this.dosProtection.checkRateLimit(userId, userIP || null, 'publish');
      if (!rateLimitResult.allowed) {
        return {
          success: false,
          reason: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter}ms`
        };
      }

      // Step 2: Check resource limits
      const resourceResult = await this.dosProtection.checkResourceLimits();
      if (!resourceResult.allowed) {
        return {
          success: false,
          reason: 'Service temporarily unavailable due to high load'
        };
      }

      // Step 3: Check throttling
      const throttleResult = await this.dosProtection.checkThrottling(userId, priority);
      if (!throttleResult.allowed) {
        return {
          success: false,
          reason: `Request throttled due to system load. Retry in ${throttleResult.retryAfter}ms`
        };
      }

      // Step 4: Filter event content
      const filterResult = await this.dosProtection.filterEvent(event, userId);
      if (!filterResult.allowed) {
        return {
          success: false,
          reason: `Event blocked: ${filterResult.details}`
        };
      }

      // All checks passed, proceed with publishing
      // Note: In real implementation, this would call the parent class method
      // return await super.publishEvent(event);

      return {
        success: true,
        event: event
      };

    } catch (error) {
      console.error('DoS protection error:', error);
      // Fail open - allow the request in case of DoS protection failure
      // But log the error for monitoring
      return {
        success: true,
        event: event
      };
    }
  }

  /**
   * Update resource usage (called by monitoring system)
   */
  public updateResourceMetrics(usage: {
    memoryUsageMB: number;
    cpuPercent: number;
    connections: number;
    bandwidthMbps: number;
  }): void {
    this.dosProtection.updateResourceUsage(usage);
  }

  /**
   * Get current DoS protection metrics
   */
  public getDoSMetrics() {
    return this.dosProtection.getMetrics();
  }

  /**
   * Set up DoS monitoring and alerting
   */
  private setupDoSMonitoring(): void {
    // Listen for violations
    this.dosProtection.on('violation', (violation) => {
      console.warn(`DoS violation detected:`, violation);

      if (this.isProduction) {
        // In production, you might want to:
        // - Send alerts to monitoring system
        // - Log to security monitoring
        // - Update firewall rules
        // - Notify administrators
      }
    });

    // Listen for throttling events
    this.dosProtection.on('throttlingEnabled', (level) => {
      console.warn(`Throttling enabled at level ${level}`);

      if (this.isProduction) {
        // In production:
        // - Scale up resources
        // - Enable load balancing
        // - Notify operations team
      }
    });

    // Periodic metrics reporting
    setInterval(() => {
      const metrics = this.dosProtection.getMetrics();

      // Log key metrics
      console.info('DoS Protection Metrics:', {
        violations: metrics.violations.total,
        activeUsers: metrics.rateLimiting.activeUsers,
        requestsPerSecond: metrics.rateLimiting.requestsPerSecond,
        throttleLevel: metrics.throttling.level,
        avgResponseTime: metrics.performance.avgResponseTime
      });

      if (this.isProduction) {
        // In production:
        // - Send metrics to monitoring dashboard
        // - Update health check status
        // - Trigger auto-scaling if needed
      }
    }, 60000); // Every minute
  }

  /**
   * Cleanup DoS protection resources
   */
  public cleanup(): void {
    this.dosProtection.cleanup();
    // NSMClient doesn't have a cleanup method, but we can call disconnect
    this.disconnect();
  }
}

/**
 * Example: Usage in an NSM application
 */
export async function exampleUsage() {
  // Create secure client
  const client = new SecureNSMClient({
    relayUrls: ['wss://relay.example.com']
  }, true); // Production mode

  // Simulate resource monitoring
  setInterval(() => {
    // In real implementation, get actual system metrics
    const usage = {
      memoryUsageMB: Math.random() * 500 + 200,
      cpuPercent: Math.random() * 60 + 20,
      connections: Math.floor(Math.random() * 1000),
      bandwidthMbps: Math.random() * 10 + 5
    };

    client.updateResourceMetrics(usage);
  }, 5000);

  // Example: Publishing an event
  const event = {
    kind: 30079,
    content: JSON.stringify({
      name: 'Example NSM App',
      description: 'A secure NSM application'
    }),
    tags: [['d', 'example-app']],
    pubkey: 'user-pubkey',
    created_at: Math.floor(Date.now() / 1000),
    id: 'event-id',
    sig: 'event-signature'
  };

  const result = await client.publishWithProtection(
    event,
    'user123',
    '192.168.1.100',
    'normal'
  );

  if (result.success) {
    console.log('Event published successfully:', result.event?.id);
  } else {
    console.log('Event blocked:', result.reason);
  }

  // Example: Getting metrics
  const metrics = client.getDoSMetrics();
  console.log('Current DoS metrics:', metrics);

  // Cleanup when done
  // client.cleanup();
}

/**
 * Example: Custom DoS protection middleware
 */
export function createDoSMiddleware(dosProtection: DoSProtection) {
  return async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.id || 'anonymous';
      const userIP = req.ip;
      const operation = req.path.includes('/publish') ? 'publish' : 'query';
      const priority = req.user?.premium ? 'high' : 'normal';

      // Check all DoS protection layers
      const checks = await Promise.all([
        dosProtection.checkRateLimit(userId, userIP, operation),
        dosProtection.checkResourceLimits(),
        dosProtection.checkThrottling(userId, priority)
      ]);

      const blockedCheck = checks.find(check => !check.allowed);
      if (blockedCheck) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Request blocked by DoS protection',
          type: blockedCheck.violationType,
          retryAfter: blockedCheck.retryAfter
        });
      }

      // If publishing, also check event content
      if (operation === 'publish' && req.body.event) {
        const filterResult = await dosProtection.filterEvent(req.body.event, userId);
        if (!filterResult.allowed) {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Event content blocked',
            details: filterResult.details
          });
        }
      }

      // All checks passed
      next();

    } catch (error) {
      console.error('DoS middleware error:', error);
      // Fail open - allow request to proceed
      next();
    }
  };
}