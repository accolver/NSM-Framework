/**
 * Comprehensive DoS Protection System for NSM Framework
 * Implements rate limiting, event filtering, resource monitoring, and automatic throttling
 */
import { EventEmitter } from 'events';
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
        byOperationType: {
            [key: string]: RateLimitConfig;
        };
    };
    eventFiltering: EventFilterConfig;
    resourceMonitoring: ResourceMonitorConfig;
    throttling: ThrottlingConfig;
}
export declare enum DoSViolationType {
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded",
    EVENT_SIZE_EXCEEDED = "event_size_exceeded",
    SPAM_DETECTED = "spam_detected",
    SUSPICIOUS_PATTERN = "suspicious_pattern",
    DUPLICATE_EVENT = "duplicate_event",
    FLOODING_DETECTED = "flooding_detected",
    RESOURCE_EXHAUSTION = "resource_exhaustion",
    THROTTLED = "throttled",
    CIRCUIT_BREAKER_OPEN = "circuit_breaker_open"
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
        byType: {
            [key: string]: number;
        };
        byUser: {
            [key: string]: number;
        };
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
interface CircuitBreakerState {
    state: 'closed' | 'open' | 'half-open';
    failures: number;
    lastFailure: number;
    nextAttempt: number;
}
export declare class DoSProtection extends EventEmitter {
    private config;
    private rateLimitCache;
    private eventHashes;
    private similarEvents;
    private resourceUsage;
    private throttleLevel;
    private circuitBreaker;
    private metrics;
    private performanceTracker;
    private resourceCheckInterval?;
    constructor(config: DoSProtectionConfig);
    /**
     * Check rate limits for a user/IP and operation type
     */
    checkRateLimit(userId: string | null, ip: string | null, operationType: string): Promise<DoSCheckResult>;
    /**
     * Filter events for spam, size limits, and suspicious content
     */
    filterEvent(event: any, userId: string): Promise<DoSCheckResult>;
    /**
     * Check resource limits and trigger throttling if needed
     */
    checkResourceLimits(): Promise<DoSCheckResult>;
    /**
     * Check if request should be throttled based on priority and system load
     */
    checkThrottling(userId: string, priority?: string): Promise<DoSCheckResult>;
    /**
     * Update current resource usage (called by resource monitor)
     */
    updateResourceUsage(usage: ResourceUsage): void;
    /**
     * Get comprehensive DoS protection metrics
     */
    getMetrics(): DoSMetrics;
    /**
     * Get current throttle state
     */
    getThrottleState(): {
        enabled: boolean;
        level: number;
        gracefulMode: boolean;
    };
    /**
     * Get circuit breaker state
     */
    getCircuitBreakerState(): CircuitBreakerState;
    /**
     * Force circuit breaker to transition (for testing)
     */
    forceCircuitBreakerTransition(): void;
    /**
     * Cleanup resources and stop monitoring
     */
    cleanup(): void;
    private checkUserRateLimit;
    private checkIPRateLimit;
    private checkGlobalRateLimit;
    /**
     * Token bucket algorithm for smooth rate limiting
     */
    private checkTokenBucketRateLimit;
    private calculateEventHash;
    private isDuplicateEvent;
    private storeEventHash;
    private isFlooding;
    private updateThrottling;
    private isGracefulMode;
    private calculateThrottleDelay;
    private calculateRetryAfter;
    private updateCircuitBreaker;
    private recordViolation;
    private updatePerformanceMetrics;
    private updateRateLimitingMetrics;
    private cleanupOldHashes;
    private startResourceMonitoring;
    private initializeMetrics;
}
export {};
//# sourceMappingURL=dos-protection.d.ts.map