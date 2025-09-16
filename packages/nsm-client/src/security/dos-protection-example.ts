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
}\n\n/**\n * Example: Development/testing DoS protection configuration\n */\nexport function createDevelopmentDoSConfig(): DoSProtectionConfig {\n  return {\n    rateLimiting: {\n      perUser: { windowMs: 60000, maxRequests: 1000 }, // More lenient for development\n      perIP: { windowMs: 60000, maxRequests: 2000 },\n      global: { windowMs: 60000, maxRequests: 100000 },\n      byOperationType: {\n        'publish': { windowMs: 60000, maxRequests: 200 },\n        'subscribe': { windowMs: 60000, maxRequests: 500 },\n        'interact': { windowMs: 60000, maxRequests: 1000 },\n        'query': { windowMs: 60000, maxRequests: 2000 }\n      }\n    },\n    eventFiltering: {\n      maxEventSize: 1048576, // 1MB for testing large events\n      maxContentLength: 524288, // 512KB content\n      spamKeywords: ['test-spam', 'development-block'],\n      duplicateWindowMs: 60000, // Shorter window for testing\n      maxSimilarEvents: 10,\n      suspiciousPatterns: [\n        /eval\\s*\\(/i,\n        /malicious-test/i\n      ]\n    },\n    resourceMonitoring: {\n      maxMemoryMB: 2000, // Higher limits for development\n      maxCPUPercent: 95,\n      maxConnections: 50000,\n      maxBandwidthMbps: 1000,\n      checkIntervalMs: 10000\n    },\n    throttling: {\n      enabled: false, // Disable throttling in development\n      cpuThreshold: 90,\n      memoryThreshold: 1500,\n      adaptiveScaling: false,\n      gracefulDegradation: false,\n      priorityLevels: ['normal']\n    }\n  };\n}\n\n/**\n * Example: Enhanced NSM Client with DoS protection\n */\nexport class SecureNSMClient extends NSMClient {\n  private dosProtection: DoSProtection;\n  private isProduction: boolean;\n\n  constructor(options: any = {}, isProduction: boolean = false) {\n    super(options);\n    this.isProduction = isProduction;\n    \n    // Initialize DoS protection\n    const config = isProduction \n      ? createProductionDoSConfig()\n      : createDevelopmentDoSConfig();\n    \n    this.dosProtection = new DoSProtection(config);\n    \n    // Set up monitoring and alerting\n    this.setupDoSMonitoring();\n  }\n\n  /**\n   * Enhanced publish method with DoS protection\n   */\n  public async publishWithProtection(\n    event: any,\n    userId: string,\n    userIP?: string,\n    priority: string = 'normal'\n  ): Promise<{ success: boolean; reason?: string; event?: any }> {\n    try {\n      // Step 1: Check rate limits\n      const rateLimitResult = await this.dosProtection.checkRateLimit(userId, userIP, 'publish');\n      if (!rateLimitResult.allowed) {\n        return {\n          success: false,\n          reason: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter}ms`\n        };\n      }\n\n      // Step 2: Check resource limits\n      const resourceResult = await this.dosProtection.checkResourceLimits();\n      if (!resourceResult.allowed) {\n        return {\n          success: false,\n          reason: 'Service temporarily unavailable due to high load'\n        };\n      }\n\n      // Step 3: Check throttling\n      const throttleResult = await this.dosProtection.checkThrottling(userId, priority);\n      if (!throttleResult.allowed) {\n        return {\n          success: false,\n          reason: `Request throttled due to system load. Retry in ${throttleResult.retryAfter}ms`\n        };\n      }\n\n      // Step 4: Filter event content\n      const filterResult = await this.dosProtection.filterEvent(event, userId);\n      if (!filterResult.allowed) {\n        return {\n          success: false,\n          reason: `Event blocked: ${filterResult.details}`\n        };\n      }\n\n      // All checks passed, proceed with publishing\n      // Note: In real implementation, this would call the parent class method\n      // return await super.publishEvent(event);\n      \n      return {\n        success: true,\n        event: event\n      };\n\n    } catch (error) {\n      console.error('DoS protection error:', error);\n      // Fail open - allow the request in case of DoS protection failure\n      // But log the error for monitoring\n      return {\n        success: true,\n        event: event\n      };\n    }\n  }\n\n  /**\n   * Update resource usage (called by monitoring system)\n   */\n  public updateResourceMetrics(usage: {\n    memoryUsageMB: number;\n    cpuPercent: number;\n    connections: number;\n    bandwidthMbps: number;\n  }): void {\n    this.dosProtection.updateResourceUsage(usage);\n  }\n\n  /**\n   * Get current DoS protection metrics\n   */\n  public getDoSMetrics() {\n    return this.dosProtection.getMetrics();\n  }\n\n  /**\n   * Set up DoS monitoring and alerting\n   */\n  private setupDoSMonitoring(): void {\n    // Listen for violations\n    this.dosProtection.on('violation', (violation) => {\n      console.warn(`DoS violation detected:`, violation);\n      \n      if (this.isProduction) {\n        // In production, you might want to:\n        // - Send alerts to monitoring system\n        // - Log to security monitoring\n        // - Update firewall rules\n        // - Notify administrators\n      }\n    });\n\n    // Listen for throttling events\n    this.dosProtection.on('throttlingEnabled', (level) => {\n      console.warn(`Throttling enabled at level ${level}`);\n      \n      if (this.isProduction) {\n        // In production:\n        // - Scale up resources\n        // - Enable load balancing\n        // - Notify operations team\n      }\n    });\n\n    // Periodic metrics reporting\n    setInterval(() => {\n      const metrics = this.dosProtection.getMetrics();\n      \n      // Log key metrics\n      console.info('DoS Protection Metrics:', {\n        violations: metrics.violations.total,\n        activeUsers: metrics.rateLimiting.activeUsers,\n        requestsPerSecond: metrics.rateLimiting.requestsPerSecond,\n        throttleLevel: metrics.throttling.level,\n        avgResponseTime: metrics.performance.avgResponseTime\n      });\n      \n      if (this.isProduction) {\n        // In production:\n        // - Send metrics to monitoring dashboard\n        // - Update health check status\n        // - Trigger auto-scaling if needed\n      }\n    }, 60000); // Every minute\n  }\n\n  /**\n   * Cleanup DoS protection resources\n   */\n  public cleanup(): void {\n    this.dosProtection.cleanup();\n    super.cleanup?.();\n  }\n}\n\n/**\n * Example: Usage in an NSM application\n */\nexport async function exampleUsage() {\n  // Create secure client\n  const client = new SecureNSMClient({\n    relayUrls: ['wss://relay.example.com']\n  }, true); // Production mode\n\n  // Simulate resource monitoring\n  setInterval(() => {\n    // In real implementation, get actual system metrics\n    const usage = {\n      memoryUsageMB: Math.random() * 500 + 200,\n      cpuPercent: Math.random() * 60 + 20,\n      connections: Math.floor(Math.random() * 1000),\n      bandwidthMbps: Math.random() * 10 + 5\n    };\n    \n    client.updateResourceMetrics(usage);\n  }, 5000);\n\n  // Example: Publishing an event\n  const event = {\n    kind: 30079,\n    content: JSON.stringify({\n      name: 'Example NSM App',\n      description: 'A secure NSM application'\n    }),\n    tags: [['d', 'example-app']],\n    pubkey: 'user-pubkey',\n    created_at: Math.floor(Date.now() / 1000),\n    id: 'event-id',\n    sig: 'event-signature'\n  };\n\n  const result = await client.publishWithProtection(\n    event,\n    'user123',\n    '192.168.1.100',\n    'normal'\n  );\n\n  if (result.success) {\n    console.log('Event published successfully:', result.event?.id);\n  } else {\n    console.log('Event blocked:', result.reason);\n  }\n\n  // Example: Getting metrics\n  const metrics = client.getDoSMetrics();\n  console.log('Current DoS metrics:', metrics);\n\n  // Cleanup when done\n  // client.cleanup();\n}\n\n/**\n * Example: Custom DoS protection middleware\n */\nexport function createDoSMiddleware(dosProtection: DoSProtection) {\n  return async (req: any, res: any, next: any) => {\n    try {\n      const userId = req.user?.id || 'anonymous';\n      const userIP = req.ip;\n      const operation = req.path.includes('/publish') ? 'publish' : 'query';\n      const priority = req.user?.premium ? 'high' : 'normal';\n\n      // Check all DoS protection layers\n      const checks = await Promise.all([\n        dosProtection.checkRateLimit(userId, userIP, operation),\n        dosProtection.checkResourceLimits(),\n        dosProtection.checkThrottling(userId, priority)\n      ]);\n\n      const blockedCheck = checks.find(check => !check.allowed);\n      if (blockedCheck) {\n        return res.status(429).json({\n          error: 'Too Many Requests',\n          message: 'Request blocked by DoS protection',\n          type: blockedCheck.violationType,\n          retryAfter: blockedCheck.retryAfter\n        });\n      }\n\n      // If publishing, also check event content\n      if (operation === 'publish' && req.body.event) {\n        const filterResult = await dosProtection.filterEvent(req.body.event, userId);\n        if (!filterResult.allowed) {\n          return res.status(400).json({\n            error: 'Bad Request',\n            message: 'Event content blocked',\n            details: filterResult.details\n          });\n        }\n      }\n\n      // All checks passed\n      next();\n      \n    } catch (error) {\n      console.error('DoS middleware error:', error);\n      // Fail open - allow request to proceed\n      next();\n    }\n  };\n}"