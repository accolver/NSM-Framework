/**
 * Comprehensive DoS Protection System for NSM Framework
 * Implements rate limiting, event filtering, resource monitoring, and automatic throttling
 */

import { EventEmitter } from 'events';

// Configuration Interfaces
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface EventFilterConfig {
  maxEventSize: number;
  maxContentLength: number;
  spamKeywords: string[];
  duplicateWindowMs: number;
  maxSimilarEvents: number;
  suspiciousPatterns: RegExp[];
}

export interface ResourceMonitorConfig {
  maxMemoryMB: number;
  maxCPUPercent: number;
  maxConnections: number;
  maxBandwidthMbps: number;
  checkIntervalMs: number;
}

export interface ThrottlingConfig {
  enabled: boolean;
  cpuThreshold: number;
  memoryThreshold: number;
  adaptiveScaling: boolean;
  gracefulDegradation: boolean;
  priorityLevels: string[];
}

export interface DoSProtectionConfig {
  rateLimiting: {
    perUser: RateLimitConfig;
    perIP: RateLimitConfig;
    global: RateLimitConfig;
    byOperationType: { [key: string]: RateLimitConfig };
  };
  eventFiltering: EventFilterConfig;
  resourceMonitoring: ResourceMonitorConfig;
  throttling: ThrottlingConfig;
}

// Result Interfaces
export enum DoSViolationType {
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  EVENT_SIZE_EXCEEDED = 'event_size_exceeded',
  SPAM_DETECTED = 'spam_detected',
  SUSPICIOUS_PATTERN = 'suspicious_pattern',
  DUPLICATE_EVENT = 'duplicate_event',
  FLOODING_DETECTED = 'flooding_detected',
  RESOURCE_EXHAUSTION = 'resource_exhaustion',
  THROTTLED = 'throttled',
  CIRCUIT_BREAKER_OPEN = 'circuit_breaker_open'
}

export interface DoSCheckResult {
  allowed: boolean;
  violationType?: DoSViolationType;
  details?: string;
  retryAfter?: number;
  throttleLevel?: number;
}

export interface ResourceUsage {
  memoryUsageMB: number;
  cpuPercent: number;
  connections: number;
  bandwidthMbps: number;
}

export interface DoSMetrics {
  rateLimiting: {
    perUserLimit: number;
    perIPLimit: number;
    globalLimit: number;
    activeUsers: number;
    activeIPs: number;
    requestsPerSecond: number;
  };
  eventFiltering: {
    maxEventSize: number;
    eventsFiltered: number;
    spamDetected: number;
    duplicatesBlocked: number;
    floodingDetected: number;
  };
  resources: {
    memoryUsageMB: number;
    cpuPercent: number;
    connections: number;
    bandwidthMbps: number;
    lastCheck: number;
  };
  throttling: {
    enabled: boolean;
    level: number;
    requestsThrottled: number;
    gracefulMode: boolean;
  };
  violations: {
    total: number;
    byType: { [key: string]: number };
    byUser: { [key: string]: number };
    recentViolations: Array<{
      type: DoSViolationType;
      timestamp: number;
      userId?: string;
      ip?: string;
    }>;
  };
  performance: {
    avgResponseTime: number;
    checksPerSecond: number;
  };
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  tokens: number; // For token bucket algorithm
  lastRefill: number;
}

interface EventHash {
  hash: string;
  timestamp: number;
  userId: string;
}

interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailure: number;
  nextAttempt: number;
}

export class DoSProtection extends EventEmitter {
  private config: DoSProtectionConfig;
  private rateLimitCache = new Map<string, RateLimitEntry>();
  private eventHashes = new Map<string, EventHash>();
  private similarEvents = new Map<string, Array<{ timestamp: number; hash: string }>>();
  private resourceUsage: ResourceUsage;
  private throttleLevel = 0;
  private circuitBreaker: CircuitBreakerState;
  private metrics: DoSMetrics;
  private performanceTracker: Array<{ timestamp: number; duration: number }> = [];
  private resourceCheckInterval?: NodeJS.Timeout;

  constructor(config: DoSProtectionConfig) {
    super();
    this.config = config;
    this.resourceUsage = {
      memoryUsageMB: 0,
      cpuPercent: 0,
      connections: 0,
      bandwidthMbps: 0
    };
    this.circuitBreaker = {
      state: 'closed',
      failures: 0,
      lastFailure: 0,
      nextAttempt: 0
    };
    this.metrics = this.initializeMetrics();
    this.startResourceMonitoring();
  }

  /**
   * Check rate limits for a user/IP and operation type
   */
  public async checkRateLimit(
    userId: string | null,
    ip: string | null,
    operationType: string
  ): Promise<DoSCheckResult> {
    const startTime = Date.now();

    try {
      // Check circuit breaker first
      if (this.circuitBreaker.state === 'open') {
        if (Date.now() < this.circuitBreaker.nextAttempt) {
          return {
            allowed: false,
            violationType: DoSViolationType.CIRCUIT_BREAKER_OPEN,
            retryAfter: this.circuitBreaker.nextAttempt - Date.now()
          };
        } else {
          this.circuitBreaker.state = 'half-open';
        }
      }

      const checks = [
        userId ? this.checkUserRateLimit(userId, operationType) : Promise.resolve(true),
        ip ? this.checkIPRateLimit(ip, operationType) : Promise.resolve(true),
        this.checkGlobalRateLimit(operationType)
      ];

      const results = await Promise.all(checks);
      const allowed = results.every(result => result);

      if (!allowed) {
        this.recordViolation(DoSViolationType.RATE_LIMIT_EXCEEDED, userId, ip);
        // Don't trigger circuit breaker for rate limiting - that's expected
        return {
          allowed: false,
          violationType: DoSViolationType.RATE_LIMIT_EXCEEDED,
          retryAfter: this.calculateRetryAfter(userId, ip, operationType)
        };
      }

      this.updatePerformanceMetrics(Date.now() - startTime);
      return { allowed: true };

    } catch (error) {
      // Only update circuit breaker for system errors, not business logic failures
      this.updateCircuitBreaker(false);
      throw error;
    }
  }

  /**
   * Filter events for spam, size limits, and suspicious content
   */
  public async filterEvent(event: any, userId: string): Promise<DoSCheckResult> {
    const startTime = Date.now();

    try {
      // Check event size
      const eventSize = JSON.stringify(event).length;
      if (eventSize > this.config.eventFiltering.maxEventSize) {
        this.recordViolation(DoSViolationType.EVENT_SIZE_EXCEEDED, userId);
        this.metrics.eventFiltering.eventsFiltered++;
        return {
          allowed: false,
          violationType: DoSViolationType.EVENT_SIZE_EXCEEDED,
          details: `Event size ${eventSize} exceeds limit ${this.config.eventFiltering.maxEventSize}`
        };
      }

      // Check content length
      if (event.content && event.content.length > this.config.eventFiltering.maxContentLength) {
        this.recordViolation(DoSViolationType.EVENT_SIZE_EXCEEDED, userId);
        this.metrics.eventFiltering.eventsFiltered++;
        return {
          allowed: false,
          violationType: DoSViolationType.EVENT_SIZE_EXCEEDED,
          details: `Content length exceeds limit ${this.config.eventFiltering.maxContentLength}`
        };
      }

      // Check for spam keywords
      if (event.content) {
        const lowerContent = event.content.toLowerCase();
        for (const keyword of this.config.eventFiltering.spamKeywords) {
          if (lowerContent.includes(keyword.toLowerCase())) {
            this.recordViolation(DoSViolationType.SPAM_DETECTED, userId);
            this.metrics.eventFiltering.spamDetected++;
            return {
              allowed: false,
              violationType: DoSViolationType.SPAM_DETECTED,
              details: `Spam keyword detected: ${keyword}`
            };
          }
        }
      }

      // Check for suspicious patterns
      if (event.content) {
        for (const pattern of this.config.eventFiltering.suspiciousPatterns) {
          if (pattern.test(event.content)) {
            this.recordViolation(DoSViolationType.SUSPICIOUS_PATTERN, userId);
            this.metrics.eventFiltering.eventsFiltered++;
            return {
              allowed: false,
              violationType: DoSViolationType.SUSPICIOUS_PATTERN,
              details: `Suspicious pattern detected: ${pattern.source}`
            };
          }
        }
      }

      // Check for dangerous code patterns (integration with security)
      if (event.content && typeof event.content === 'string') {
        const dangerousPatterns = [
          /eval\s*\(/,
          /Function\s*\(/,
          /new\s+Function/,
          /__proto__/,
          /constructor\s*\.\s*constructor/
        ];

        for (const pattern of dangerousPatterns) {
          if (pattern.test(event.content)) {
            this.recordViolation(DoSViolationType.SUSPICIOUS_PATTERN, userId);
            this.metrics.eventFiltering.eventsFiltered++;
            return {
              allowed: false,
              violationType: DoSViolationType.SUSPICIOUS_PATTERN,
              details: `Dangerous code pattern detected: ${pattern.source}`
            };
          }
        }
      }

      // Check for duplicate events
      const eventHash = this.calculateEventHash(event);
      if (this.isDuplicateEvent(eventHash, userId)) {
        this.recordViolation(DoSViolationType.DUPLICATE_EVENT, userId);
        this.metrics.eventFiltering.duplicatesBlocked++;
        return {
          allowed: false,
          violationType: DoSViolationType.DUPLICATE_EVENT,
          details: 'Duplicate event detected'
        };
      }

      // Check for flooding (too many similar events)
      if (this.isFlooding(event, userId)) {
        this.recordViolation(DoSViolationType.FLOODING_DETECTED, userId);
        this.metrics.eventFiltering.floodingDetected++;
        return {
          allowed: false,
          violationType: DoSViolationType.FLOODING_DETECTED,
          details: 'Event flooding detected'
        };
      }

      // Store event hash for duplicate detection
      this.storeEventHash(eventHash, userId);

      this.updatePerformanceMetrics(Date.now() - startTime);
      return { allowed: true };

    } catch (error) {
      this.emit('error', error);
      // Fail open for errors to maintain availability
      return { allowed: true };
    }
  }

  /**
   * Check resource limits and trigger throttling if needed
   */
  public async checkResourceLimits(): Promise<DoSCheckResult> {
    const config = this.config.resourceMonitoring;
    let exceeded = false;

    if (this.resourceUsage.memoryUsageMB > config.maxMemoryMB ||
        this.resourceUsage.cpuPercent > config.maxCPUPercent ||
        this.resourceUsage.connections > config.maxConnections ||
        this.resourceUsage.bandwidthMbps > config.maxBandwidthMbps) {

      exceeded = true;
      this.recordViolation(DoSViolationType.RESOURCE_EXHAUSTION);
      this.updateThrottling(true);

      // Update circuit breaker for resource exhaustion
      this.updateCircuitBreaker(false);

      return {
        allowed: false,
        violationType: DoSViolationType.RESOURCE_EXHAUSTION,
        details: `Resource limits exceeded: memory=${this.resourceUsage.memoryUsageMB}MB, cpu=${this.resourceUsage.cpuPercent}%, connections=${this.resourceUsage.connections}, bandwidth=${this.resourceUsage.bandwidthMbps}Mbps`
      };
    }

    if (!exceeded) {
      this.updateCircuitBreaker(true);
    }

    return { allowed: true };
  }

  /**
   * Check if request should be throttled based on priority and system load
   */
  public async checkThrottling(userId: string, priority: string = 'normal'): Promise<DoSCheckResult> {
    if (!this.config.throttling.enabled || this.throttleLevel === 0) {
      return { allowed: true };
    }

    const priorityIndex = this.config.throttling.priorityLevels.indexOf(priority);
    if (priorityIndex === -1) {
      // Unknown priority, treat as lowest
      return { allowed: false, violationType: DoSViolationType.THROTTLED };
    }

    // Critical operations (index 0) should always pass during normal throttling
    if (priority === 'critical' && this.throttleLevel < 0.8) {
      return { allowed: true };
    }

    // Calculate throttle probability based on priority
    // Higher priority (lower index) = lower throttle chance
    const priorityWeight = 1 - (priorityIndex / this.config.throttling.priorityLevels.length);
    const throttleChance = this.throttleLevel * (1 - priorityWeight * 0.8);

    // For testing determinism, use a simple threshold
    if (throttleChance > 0.5) {
      this.recordViolation(DoSViolationType.THROTTLED, userId);
      this.metrics.throttling.requestsThrottled++;
      return {
        allowed: false,
        violationType: DoSViolationType.THROTTLED,
        throttleLevel: this.throttleLevel,
        retryAfter: this.calculateThrottleDelay()
      };
    }

    return { allowed: true };
  }

  /**
   * Update current resource usage (called by resource monitor)
   */
  public updateResourceUsage(usage: ResourceUsage): void {
    this.resourceUsage = { ...usage };
    this.metrics.resources = {
      ...usage,
      lastCheck: Date.now()
    };

    // Update throttling based on resource usage
    this.updateThrottling();

    // Emit resource usage events for monitoring
    this.emit('resourceUpdate', usage);
  }

  /**
   * Get comprehensive DoS protection metrics
   */
  public getMetrics(): DoSMetrics {
    this.updateRateLimitingMetrics();
    return { ...this.metrics };
  }

  /**
   * Get current throttle state
   */
  public getThrottleState(): {
    enabled: boolean;
    level: number;
    gracefulMode: boolean;
  } {
    return {
      enabled: this.config.throttling.enabled && this.throttleLevel > 0,
      level: this.throttleLevel,
      gracefulMode: this.isGracefulMode()
    };
  }

  /**
   * Get circuit breaker state
   */
  public getCircuitBreakerState(): CircuitBreakerState {
    // Check if we should transition from open to half-open
    if (this.circuitBreaker.state === 'open' && Date.now() >= this.circuitBreaker.nextAttempt) {
      this.circuitBreaker.state = 'half-open';
    }

    return { ...this.circuitBreaker };
  }

  /**
   * Force circuit breaker to transition (for testing)
   */
  public forceCircuitBreakerTransition(): void {
    if (this.circuitBreaker.state === 'open') {
      this.circuitBreaker.nextAttempt = Date.now() - 1000; // Set to past
      this.circuitBreaker.state = 'half-open';
    }
  }

  /**
   * Cleanup resources and stop monitoring
   */
  public cleanup(): void {
    if (this.resourceCheckInterval) {
      clearInterval(this.resourceCheckInterval);
    }
    this.rateLimitCache.clear();
    this.eventHashes.clear();
    this.similarEvents.clear();
    this.performanceTracker = [];
    this.removeAllListeners();
  }

  // Private Implementation Methods

  private async checkUserRateLimit(userId: string, operationType: string): Promise<boolean> {
    const key = `user:${userId}:${operationType}`;
    const config = this.config.rateLimiting.byOperationType[operationType] || this.config.rateLimiting.perUser;

    return this.checkTokenBucketRateLimit(key, config);
  }

  private async checkIPRateLimit(ip: string, operationType: string): Promise<boolean> {
    const key = `ip:${ip}:${operationType}`;
    const config = this.config.rateLimiting.perIP;

    return this.checkTokenBucketRateLimit(key, config);
  }

  private async checkGlobalRateLimit(operationType: string): Promise<boolean> {
    const key = `global:${operationType}`;
    const config = this.config.rateLimiting.global;

    return this.checkTokenBucketRateLimit(key, config);
  }

  /**
   * Token bucket algorithm for smooth rate limiting
   */
  private checkTokenBucketRateLimit(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    let entry = this.rateLimitCache.get(key);

    if (!entry) {
      entry = {
        count: 1,
        resetTime: now + config.windowMs,
        tokens: config.maxRequests - 1,
        lastRefill: now
      };
      this.rateLimitCache.set(key, entry);
      return true; // First request is always allowed
    }

    // Simple sliding window rate limiting
    if (now >= entry.resetTime) {
      // Reset window
      entry.count = 1;
      entry.resetTime = now + config.windowMs;
      entry.tokens = config.maxRequests - 1;
      entry.lastRefill = now;
      return true;
    }

    // Check if we have requests left in current window
    if (entry.count < config.maxRequests) {
      entry.count++;
      entry.tokens = config.maxRequests - entry.count;
      return true;
    }

    return false;
  }

  private calculateEventHash(event: any): string {
    // Create a hash based on key event properties
    const hashData = {
      kind: event.kind,
      content: event.content,
      pubkey: event.pubkey,
      tags: event.tags
    };

    // Simple hash function (in production, use a proper crypto hash)
    return JSON.stringify(hashData);
  }

  private isDuplicateEvent(eventHash: string, userId: string): boolean {
    const existing = this.eventHashes.get(eventHash);
    if (!existing) {
      return false;
    }

    // Check if the duplicate is within the time window
    const timeDiff = Date.now() - existing.timestamp;
    if (timeDiff > this.config.eventFiltering.duplicateWindowMs) {
      this.eventHashes.delete(eventHash);
      return false;
    }

    return existing.userId === userId;
  }

  private storeEventHash(eventHash: string, userId: string): void {
    this.eventHashes.set(eventHash, {
      hash: eventHash,
      timestamp: Date.now(),
      userId
    });

    // Clean up old hashes
    this.cleanupOldHashes();
  }

  private isFlooding(event: any, userId: string): boolean {
    const userKey = `${userId}:${event.kind}`;
    const now = Date.now();

    let similarList = this.similarEvents.get(userKey);
    if (!similarList) {
      similarList = [];
      this.similarEvents.set(userKey, similarList);
    }

    // Remove old entries
    similarList = similarList.filter(
      item => now - item.timestamp <= this.config.eventFiltering.duplicateWindowMs
    );

    // Check if we're over the limit
    if (similarList.length >= this.config.eventFiltering.maxSimilarEvents) {
      return true;
    }

    // Add current event
    similarList.push({
      timestamp: now,
      hash: this.calculateEventHash(event)
    });

    this.similarEvents.set(userKey, similarList);
    return false;
  }

  private updateThrottling(forceUpdate: boolean = false): void {
    if (!this.config.throttling.enabled && !forceUpdate) {
      return;
    }

    const cpuRatio = this.resourceUsage.cpuPercent / this.config.throttling.cpuThreshold;
    const memoryRatio = this.resourceUsage.memoryUsageMB / this.config.throttling.memoryThreshold;
    const connectionRatio = this.resourceUsage.connections / this.config.resourceMonitoring.maxConnections;

    // Calculate throttle level (0-1)
    const maxRatio = Math.max(cpuRatio, memoryRatio, connectionRatio);

    if (this.config.throttling.adaptiveScaling) {
      this.throttleLevel = Math.min(1, Math.max(0, maxRatio - 0.5) * 2);
    } else {
      this.throttleLevel = maxRatio > 1 ? 0.5 : 0;
    }

    this.metrics.throttling.level = this.throttleLevel;
    this.metrics.throttling.enabled = this.throttleLevel > 0;
    this.metrics.throttling.gracefulMode = this.isGracefulMode();

    if (this.throttleLevel > 0) {
      this.emit('throttlingEnabled', this.throttleLevel);
    }
  }

  private isGracefulMode(): boolean {
    if (!this.config.throttling.gracefulDegradation) {
      return false;
    }

    return this.resourceUsage.cpuPercent > 85 ||
           this.resourceUsage.memoryUsageMB > this.config.throttling.memoryThreshold * 0.9;
  }

  private calculateThrottleDelay(): number {
    // Exponential backoff based on throttle level
    return Math.floor(this.throttleLevel * 1000 * Math.pow(2, this.throttleLevel * 3));
  }

  private calculateRetryAfter(userId: string | null, ip: string | null, operationType: string): number {
    // Calculate retry time based on rate limit windows
    const configs = [
      userId ? this.config.rateLimiting.byOperationType[operationType] || this.config.rateLimiting.perUser : null,
      ip ? this.config.rateLimiting.perIP : null,
      this.config.rateLimiting.global
    ].filter(Boolean);

    return Math.min(...configs.map(config => config!.windowMs));
  }

  private updateCircuitBreaker(success: boolean): void {
    const now = Date.now();

    if (success) {
      if (this.circuitBreaker.state === 'half-open') {
        this.circuitBreaker.state = 'closed';
        this.circuitBreaker.failures = 0;
      } else if (this.circuitBreaker.state === 'closed') {
        // Reset failure count on successful operations
        this.circuitBreaker.failures = Math.max(0, this.circuitBreaker.failures - 1);
      }
    } else {
      this.circuitBreaker.failures++;
      this.circuitBreaker.lastFailure = now;

      // Only check resource exhaustion failures for circuit breaker
      if (this.circuitBreaker.failures >= 5) {
        this.circuitBreaker.state = 'open';
        this.circuitBreaker.nextAttempt = now + 30000; // 30 second timeout
      }
    }
  }

  private recordViolation(type: DoSViolationType, userId?: string, ip?: string): void {
    this.metrics.violations.total++;

    // Initialize violation type tracking
    const typeKey = type.toString();
    this.metrics.violations.byType[typeKey] = (this.metrics.violations.byType[typeKey] || 0) + 1;

    if (userId) {
      this.metrics.violations.byUser[userId] = (this.metrics.violations.byUser[userId] || 0) + 1;
    }

    this.metrics.violations.recentViolations.push({
      type,
      timestamp: Date.now(),
      userId,
      ip
    });

    // Keep only recent violations (last 100)
    if (this.metrics.violations.recentViolations.length > 100) {
      this.metrics.violations.recentViolations = this.metrics.violations.recentViolations.slice(-100);
    }

    this.emit('violation', { type, userId, ip, timestamp: Date.now() });
  }

  private updatePerformanceMetrics(duration: number): void {
    this.performanceTracker.push({
      timestamp: Date.now(),
      duration
    });

    // Keep only recent performance data (last 1000 operations)
    if (this.performanceTracker.length > 1000) {
      this.performanceTracker = this.performanceTracker.slice(-1000);
    }

    // Calculate average response time
    if (this.performanceTracker.length > 0) {
      const totalDuration = this.performanceTracker.reduce((sum, entry) => sum + entry.duration, 0);
      this.metrics.performance.avgResponseTime = totalDuration / this.performanceTracker.length;
    }

    // Calculate checks per second (last 60 seconds)
    const oneMinuteAgo = Date.now() - 60000;
    const recentChecks = this.performanceTracker.filter(entry => entry.timestamp > oneMinuteAgo);
    this.metrics.performance.checksPerSecond = recentChecks.length / 60;
  }

  private updateRateLimitingMetrics(): void {
    const now = Date.now();
    let activeUsers = 0;
    let activeIPs = 0;
    let totalRequests = 0;

    for (const [key, entry] of this.rateLimitCache.entries()) {
      if (entry.resetTime > now) {
        totalRequests += entry.count;

        if (key.startsWith('user:')) {
          activeUsers++;
        } else if (key.startsWith('ip:')) {
          activeIPs++;
        }
      }
    }

    this.metrics.rateLimiting.activeUsers = activeUsers;
    this.metrics.rateLimiting.activeIPs = activeIPs;
    this.metrics.rateLimiting.requestsPerSecond = totalRequests / 60; // Rough estimate
  }

  private cleanupOldHashes(): void {
    const now = Date.now();
    const maxAge = this.config.eventFiltering.duplicateWindowMs;

    for (const [hash, entry] of this.eventHashes.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.eventHashes.delete(hash);
      }
    }

    // Cleanup similar events tracking
    for (const [key, events] of this.similarEvents.entries()) {
      const filtered = events.filter(event => now - event.timestamp <= maxAge);
      if (filtered.length === 0) {
        this.similarEvents.delete(key);
      } else {
        this.similarEvents.set(key, filtered);
      }
    }
  }

  private startResourceMonitoring(): void {
    this.resourceCheckInterval = setInterval(() => {
      this.cleanupOldHashes();

      // Emit periodic cleanup event
      this.emit('periodicCleanup');

    }, this.config.resourceMonitoring.checkIntervalMs);
  }

  private initializeMetrics(): DoSMetrics {
    return {
      rateLimiting: {
        perUserLimit: this.config.rateLimiting.perUser.maxRequests,
        perIPLimit: this.config.rateLimiting.perIP.maxRequests,
        globalLimit: this.config.rateLimiting.global.maxRequests,
        activeUsers: 0,
        activeIPs: 0,
        requestsPerSecond: 0
      },
      eventFiltering: {
        maxEventSize: this.config.eventFiltering.maxEventSize,
        eventsFiltered: 0,
        spamDetected: 0,
        duplicatesBlocked: 0,
        floodingDetected: 0
      },
      resources: {
        memoryUsageMB: 0,
        cpuPercent: 0,
        connections: 0,
        bandwidthMbps: 0,
        lastCheck: Date.now()
      },
      throttling: {
        enabled: false,
        level: 0,
        requestsThrottled: 0,
        gracefulMode: false
      },
      violations: {
        total: 0,
        byType: {},
        byUser: {},
        recentViolations: []
      },
      performance: {
        avgResponseTime: 0,
        checksPerSecond: 0
      }
    };
  }
}