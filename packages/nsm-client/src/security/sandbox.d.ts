/**
 * Enhanced Security Sandbox for NSM Framework
 * Provides comprehensive security isolation for untrusted state machine code
 */
export interface SecurityPolicy {
    maxExecutionTime: number;
    maxMemoryMB: number;
    allowNetworkAccess: boolean;
    allowedDomains: string[];
    allowedGlobals: string[];
    enableWebWorker: boolean;
    enableCSP: boolean;
    rateLimit: {
        windowMs: number;
        maxExecutions: number;
    };
}
export interface ExecutionContext {
    userId?: string;
    machineId?: string;
    sessionId?: string;
    timestamp: number;
}
export interface SecurityMetrics {
    executionTime: number;
    memoryUsage: number;
    networkRequests: number;
    violationAttempts: number;
}
export declare class SecuritySandbox {
    private static instance;
    private executionCounts;
    private violationLog;
    private readonly DEFAULT_POLICY;
    private readonly DANGEROUS_PATTERNS;
    private readonly SAFE_GLOBALS;
    private constructor();
    static getInstance(): SecuritySandbox;
    /**
     * Execute function in secure sandbox with comprehensive security measures
     */
    executeSecure<T = any>(fn: Function, args: any[], context: ExecutionContext, policy?: Partial<SecurityPolicy>): Promise<{
        result: T;
        metrics: SecurityMetrics;
    }>;
    /**
     * Validate function and execution context for security
     */
    private validateExecution;
    /**
     * Public method to check if a function can be executed (for compatibility)
     */
    canExecute(identifier: string): boolean;
    /**
     * Execute function in Web Worker for maximum isolation
     */
    private executeInWebWorker;
    /**
     * Create Web Worker code with security restrictions
     */
    private createWorkerCode;
    /**
     * Execute function in restricted context (fallback for environments without Web Workers)
     */
    private executeInRestrictedContext;
    /**
     * Create restricted execution context with only safe globals
     */
    private createRestrictedContext;
    /**
     * Validate function source code for security vulnerabilities
     */
    private validateFunctionSecurity;
    /**
     * Rate limiting implementation
     */
    private checkRateLimit;
    /**
     * Record successful execution
     */
    private recordExecution;
    /**
     * Record security violation
     */
    private recordViolation;
    /**
     * Public method to record violation (for testing)
     */
    recordViolationPublic(identifier: string): void;
    /**
     * Get violation count for identifier
     */
    private getViolationCount;
    /**
     * Check if Web Workers are supported
     */
    private supportsWebWorkers;
    /**
     * Get current memory usage
     */
    private getMemoryUsage;
    /**
     * Cleanup expired rate limit records and optionally clear violations
     */
    cleanup(clearViolations?: boolean): void;
    /**
     * Get security metrics for monitoring
     */
    getSecurityMetrics(): {
        activeRateLimits: number;
        totalViolations: number;
        violationsByUser: {
            [key: string]: number;
        };
    };
}
/**
 * Custom security error class
 */
export declare class SecurityError extends Error {
    readonly code = "SECURITY_ERROR";
    readonly details: any;
    constructor(message: string, details?: any);
}
/**
 * Content Security Policy implementation for additional protection
 */
export declare class CSPManager {
    private static readonly CSP_DIRECTIVES;
    static generateCSP(allowNetworkAccess?: boolean, allowedDomains?: string[]): string;
    static applyCSP(policy: string): void;
}
export declare const securitySandbox: SecuritySandbox;
//# sourceMappingURL=sandbox.d.ts.map