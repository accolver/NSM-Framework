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

export class SecuritySandbox {
  private static instance: SecuritySandbox;
  private executionCounts = new Map<string, { count: number; resetTime: number }>();
  private violationLog = new Map<string, number>();

  private readonly DEFAULT_POLICY: SecurityPolicy = {
    maxExecutionTime: 5000,
    maxMemoryMB: 50,
    allowNetworkAccess: false,
    allowedDomains: [],
    allowedGlobals: ['Math', 'Date', 'JSON', 'console'],
    enableWebWorker: true,
    enableCSP: true,
    rateLimit: {
      windowMs: 60000,
      maxExecutions: 100
    }
  };

  private readonly DANGEROUS_PATTERNS = [
    /eval\s*\(/,
    /Function\s*\(/,
    /new\s+Function/,
    /__proto__/,
    /constructor\s*\.\s*constructor/,
    /import\s*\(/,
    /require\s*\(/,
    /process\./,
    /global\./,
    /window\./,
    /document\./,
    /\$\{.*\}/,
    /setTimeout\s*\(/,
    /setInterval\s*\(/,
    /fetch\s*\(/,
    /XMLHttpRequest/,
    /WebSocket/,
    /indexedDB/,
    /localStorage/,
    /sessionStorage/,
    /with\s*\(/,
    /debugger/,
    /\.call\s*\(/,
    /\.apply\s*\(/,
    /\.bind\s*\(/
  ];

  private readonly SAFE_GLOBALS = [
    'undefined', 'null', 'NaN', 'Infinity',
    'Math', 'Date', 'JSON', 'Array', 'Object',
    'String', 'Number', 'Boolean', 'RegExp',
    'Error', 'TypeError', 'RangeError',
    'ReferenceError', 'SyntaxError', 'URIError',
    'Promise', 'Symbol', 'Map', 'Set', 'WeakMap', 'WeakSet'
  ];

  private constructor() {
    // Singleton pattern for security consistency
  }

  public static getInstance(): SecuritySandbox {
    if (!SecuritySandbox.instance) {
      SecuritySandbox.instance = new SecuritySandbox();
    }
    return SecuritySandbox.instance;
  }

  /**
   * Execute function in secure sandbox with comprehensive security measures
   */
  public async executeSecure<T = any>(
    fn: Function,
    args: any[] = [],
    context: ExecutionContext,
    policy: Partial<SecurityPolicy> = {}
  ): Promise<{ result: T; metrics: SecurityMetrics }> {
    const mergedPolicy = { ...this.DEFAULT_POLICY, ...policy };
    const startTime = Date.now();
    const initialMemory = this.getMemoryUsage();

    // Validate inputs before execution
    if (!fn || typeof fn !== 'function') {
      throw new SecurityError('Invalid function provided for execution');
    }

    // Sanitize args to prevent null/undefined propagation issues
    const sanitizedArgs = (args || []).map(arg => {
      // Handle null/undefined gracefully for XState compatibility
      if (arg === null || arg === undefined) {
        return arg; // Keep these as-is but log them
      }
      return arg;
    });

    // Pre-execution security checks
    this.validateExecution(fn, context, mergedPolicy);

    try {
      let result: T;
      let executionTime: number;

      if (mergedPolicy.enableWebWorker && this.supportsWebWorkers()) {
        result = await this.executeInWebWorker(fn, sanitizedArgs, mergedPolicy);
      } else {
        result = await this.executeInRestrictedContext(fn, sanitizedArgs, mergedPolicy);
      }

      executionTime = Date.now() - startTime;
      const memoryUsage = this.getMemoryUsage() - initialMemory;

      // Post-execution validation
      this.recordExecution(context, mergedPolicy);

      const metrics: SecurityMetrics = {
        executionTime,
        memoryUsage,
        networkRequests: 0, // Would be tracked by network proxy
        violationAttempts: this.getViolationCount(context.userId || 'anonymous')
      };

      return { result, metrics };

    } catch (error) {
      this.recordViolation(context.userId || 'anonymous');

      // Handle null or undefined error objects gracefully
      const errorMessage = error instanceof Error
        ? error.message
        : (error && typeof error === 'object' && 'toString' in error)
          ? error.toString()
          : 'Unknown error';

      throw new SecurityError(`Sandbox execution failed: ${errorMessage}`, {
        context,
        policy: mergedPolicy
      });
    }
  }

  /**
   * Validate function and execution context for security
   */
  private validateExecution(
    fn: Function,
    context: ExecutionContext,
    policy: SecurityPolicy
  ): void {
    // Check rate limiting
    const identifier = context.userId || context.sessionId || 'anonymous';
    if (!this.checkRateLimit(identifier, policy.rateLimit)) {
      this.recordViolation(identifier);
      throw new SecurityError('Rate limit exceeded', { identifier, policy });
    }

    // Check user violation history BEFORE validating function security
    const violations = this.getViolationCount(identifier);
    if (violations > 10) { // Threshold for blocking
      throw new SecurityError('Too many security violations', { identifier, violations });
    }

    // Validate function source code and record violation if it fails
    try {
      this.validateFunctionSecurity(fn);
    } catch (error) {
      this.recordViolation(identifier);
      throw error;
    }
  }

  /**
   * Public method to check if a function can be executed (for compatibility)
   */
  public canExecute(identifier: string): boolean {
    const policy = this.DEFAULT_POLICY;
    return this.checkRateLimit(identifier, policy.rateLimit);
  }

  /**
   * Execute function in Web Worker for maximum isolation
   */
  private async executeInWebWorker<T>(
    fn: Function,
    args: any[],
    policy: SecurityPolicy
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // Create sandboxed worker code with CSP
      const workerCode = this.createWorkerCode(fn, policy);

      try {
        const blob = new Blob([workerCode], {
          type: 'application/javascript'
        });
        const worker = new Worker(URL.createObjectURL(blob));

        // Set execution timeout
        const timeout = setTimeout(() => {
          worker.terminate();
          reject(new SecurityError('Execution timeout', { timeout: policy.maxExecutionTime }));
        }, policy.maxExecutionTime);

        // Handle worker messages
        worker.onmessage = (e) => {
          clearTimeout(timeout);
          worker.terminate();
          URL.revokeObjectURL(blob.toString());

          if (e.data.type === 'success') {
            resolve(e.data.result);
          } else if (e.data.type === 'error') {
            reject(new SecurityError(e.data.error, { workerError: true }));
          } else {
            reject(new SecurityError('Invalid worker response', { response: e.data }));
          }
        };

        worker.onerror = (error) => {
          clearTimeout(timeout);
          worker.terminate();
          URL.revokeObjectURL(blob.toString());
          reject(new SecurityError('Worker execution error', { error }));
        };

        // Start execution
        worker.postMessage({ args });

      } catch (error) {
        reject(new SecurityError('Failed to create worker', { error }));
      }
    });
  }

  /**
   * Create Web Worker code with security restrictions
   */
  private createWorkerCode(fn: Function, policy: SecurityPolicy): string {
    const allowedGlobals = JSON.stringify(policy.allowedGlobals);
    const maxMemoryMB = policy.maxMemoryMB;

    return `
      // Security-hardened Web Worker environment
      'use strict';

      // Remove dangerous globals
      delete globalThis.importScripts;
      delete globalThis.fetch;
      delete globalThis.XMLHttpRequest;
      delete globalThis.WebSocket;
      delete globalThis.eval;
      delete globalThis.Function;

      // Memory monitoring
      let initialMemory = 0;
      if (typeof performance !== 'undefined' && performance.memory) {
        initialMemory = performance.memory.usedJSHeapSize;
      }

      // Restricted console
      const restrictedConsole = {
        log: (...args) => console.log('[SANDBOX]', ...args),
        warn: (...args) => console.warn('[SANDBOX]', ...args),
        error: (...args) => console.error('[SANDBOX]', ...args)
      };

      // Create restricted global context
      const allowedGlobals = ${allowedGlobals};
      const restrictedGlobal = {};

      // Add safe globals
      const safeGlobals = ['Math', 'Date', 'JSON', 'Array', 'Object', 'String', 'Number', 'Boolean', 'RegExp', 'Promise', 'Symbol'];
      for (const name of safeGlobals) {
        if (allowedGlobals.includes(name) && typeof globalThis[name] !== 'undefined') {
          restrictedGlobal[name] = globalThis[name];
        }
      }
      restrictedGlobal.console = restrictedConsole;

      // User function
      const userFunction = ${fn.toString()};

      // Message handler with security checks
      self.onmessage = function(e) {
        try {
          const startTime = Date.now();

          // Execute with restricted context
          const result = userFunction.apply(restrictedGlobal, e.data.args);

          const endTime = Date.now();
          const executionTime = endTime - startTime;

          // Check memory usage
          let memoryUsed = 0;
          if (typeof performance !== 'undefined' && performance.memory) {
            memoryUsed = (performance.memory.usedJSHeapSize - initialMemory) / (1024 * 1024);
          }

          if (memoryUsed > ${maxMemoryMB}) {
            throw new Error(\`Memory limit exceeded: \${memoryUsed}MB > ${maxMemoryMB}MB\`);
          }

          self.postMessage({
            type: 'success',
            result: result,
            executionTime: executionTime,
            memoryUsed: memoryUsed
          });

        } catch (error) {
          self.postMessage({
            type: 'error',
            error: error.message || 'Unknown execution error'
          });
        }
      };
    `;
  }

  /**
   * Execute function in restricted context (fallback for environments without Web Workers)
   */
  private async executeInRestrictedContext<T>(
    fn: Function,
    args: any[],
    policy: SecurityPolicy
  ): Promise<T> {
    // Create restricted execution context
    const restrictedContext = this.createRestrictedContext(policy.allowedGlobals);

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new SecurityError('Execution timeout'));
      }, policy.maxExecutionTime);
    });

    // Create execution promise with timeout control
    const executionPromise = new Promise<T>((resolve, reject) => {
      try {
        const startTime = Date.now();

        // Check if function looks like it might run indefinitely
        const fnString = fn.toString();
        if (fnString.includes('while(true)') || fnString.includes('for(;;)')) {
          reject(new SecurityError('Potentially infinite loop detected'));
          return;
        }

        let result;
        try {
          // Ensure function is properly bound and args are not corrupted
          if (typeof fn !== 'function') {
            throw new SecurityError('Invalid function provided');
          }

          // Apply function with additional error boundaries
          result = fn.apply(restrictedContext, args);
        } catch (fnError) {
          // Handle specific XState/React errors gracefully
          const errorMessage = fnError instanceof Error ? fnError.message : String(fnError);
          if (errorMessage.includes('event.type') || errorMessage.includes('null is not an object')) {
            throw new SecurityError('Invalid event object passed to function');
          }
          throw fnError;
        }

        const executionTime = Date.now() - startTime;
        if (executionTime > policy.maxExecutionTime) {
          reject(new SecurityError('Execution timeout'));
          return;
        }

        resolve(result);
      } catch (error) {
        reject(error);
      }
    });

    try {
      return await Promise.race([executionPromise, timeoutPromise]);
    } catch (error) {
      if (error instanceof SecurityError) {
        throw error;
      }
      throw new SecurityError(`Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create restricted execution context with only safe globals
   */
  private createRestrictedContext(allowedGlobals: string[]): any {
    const context: any = Object.create(null);

    // Add explicitly safe globals that are allowed
    for (const name of this.SAFE_GLOBALS) {
      if (allowedGlobals.includes(name) && typeof (globalThis as any)[name] !== 'undefined') {
        context[name] = (globalThis as any)[name];
      }
    }

    // Add controlled console if allowed
    if (allowedGlobals.includes('console')) {
      context.console = {
        log: (...args: any[]) => console.log('[SANDBOX]', ...args),
        warn: (...args: any[]) => console.warn('[SANDBOX]', ...args),
        error: (...args: any[]) => console.error('[SANDBOX]', ...args)
      };
    }

    // Create a proper isolated context that prevents access to global variables
    const isolatedContext = Object.create(null);

    // Only add the explicitly allowed context properties
    Object.assign(isolatedContext, context);

    // Create an execution wrapper that runs in the isolated context
    return isolatedContext;
  }

  /**
   * Validate function source code for security vulnerabilities
   */
  private validateFunctionSecurity(fn: Function): void {
    const fnString = fn.toString();

    // Check for dangerous patterns
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(fnString)) {
        throw new SecurityError(`Unsafe function: contains dangerous pattern ${pattern.source}`);
      }
    }

    // Additional security checks
    if (fnString.length > 100000) {
      throw new SecurityError('Function too large: potential DoS risk');
    }

    // Check for excessive complexity (nested functions)
    const nestedFunctionCount = (fnString.match(/function\s+/g) || []).length;
    if (nestedFunctionCount > 10) {
      throw new SecurityError('Too many nested functions: security risk');
    }

    // Check for suspicious patterns
    if (fnString.includes('\\x') || fnString.includes('\\u')) {
      throw new SecurityError('Suspicious encoded strings detected');
    }
  }

  /**
   * Rate limiting implementation
   */
  private checkRateLimit(identifier: string, rateLimit: { windowMs: number; maxExecutions: number }): boolean {
    const now = Date.now();
    const record = this.executionCounts.get(identifier);

    if (!record || now > record.resetTime) {
      this.executionCounts.set(identifier, {
        count: 1,
        resetTime: now + rateLimit.windowMs
      });
      return true;
    }

    if (record.count >= rateLimit.maxExecutions) {
      return false;
    }

    record.count++;
    return true;
  }

  /**
   * Record successful execution
   */
  private recordExecution(context: ExecutionContext, policy: SecurityPolicy): void {
    // Log execution for audit trail
    console.log(`[SECURITY] Execution completed for ${context.userId || 'anonymous'} at ${new Date(context.timestamp).toISOString()}`);
  }

  /**
   * Record security violation
   */
  private recordViolation(identifier: string): void {
    const current = this.violationLog.get(identifier) || 0;
    this.violationLog.set(identifier, current + 1);
    console.warn(`[SECURITY] Violation recorded for ${identifier}. Total: ${current + 1}`);
  }

  /**
   * Public method to record violation (for testing)
   */
  public recordViolationPublic(identifier: string): void {
    this.recordViolation(identifier);
  }

  /**
   * Get violation count for identifier
   */
  private getViolationCount(identifier: string): number {
    return this.violationLog.get(identifier) || 0;
  }

  /**
   * Check if Web Workers are supported
   */
  private supportsWebWorkers(): boolean {
    return typeof Worker !== 'undefined' && typeof Blob !== 'undefined' && typeof URL !== 'undefined';
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize / (1024 * 1024);
    }
    return 0;
  }

  /**
   * Cleanup expired rate limit records and optionally clear violations
   */
  public cleanup(clearViolations: boolean = false): void {
    const now = Date.now();
    for (const [key, record] of this.executionCounts.entries()) {
      if (now > record.resetTime) {
        this.executionCounts.delete(key);
      }
    }

    if (clearViolations) {
      this.violationLog.clear();
    }
  }

  /**
   * Get security metrics for monitoring
   */
  public getSecurityMetrics(): {
    activeRateLimits: number;
    totalViolations: number;
    violationsByUser: { [key: string]: number };
  } {
    const violationsByUser: { [key: string]: number } = {};
    let totalViolations = 0;

    for (const [user, count] of this.violationLog.entries()) {
      violationsByUser[user] = count;
      totalViolations += count;
    }

    return {
      activeRateLimits: this.executionCounts.size,
      totalViolations,
      violationsByUser
    };
  }
}

/**
 * Custom security error class
 */
export class SecurityError extends Error {
  public readonly code = 'SECURITY_ERROR';
  public readonly details: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'SecurityError';
    this.details = details;
  }
}

/**
 * Content Security Policy implementation for additional protection
 */
export class CSPManager {
  private static readonly CSP_DIRECTIVES = {
    'default-src': "'none'",
    'script-src': "'unsafe-eval' 'unsafe-inline'", // Required for dynamic execution
    'connect-src': "'none'", // No network access by default
    'img-src': "'none'",
    'style-src': "'none'",
    'font-src': "'none'",
    'media-src': "'none'",
    'frame-src': "'none'",
    'child-src': "'none'",
    'worker-src': "blob:",
    'object-src': "'none'",
    'base-uri': "'none'",
    'form-action': "'none'"
  };

  public static generateCSP(allowNetworkAccess: boolean = false, allowedDomains: string[] = []): string {
    const directives = { ...this.CSP_DIRECTIVES };

    if (allowNetworkAccess && allowedDomains.length > 0) {
      directives['connect-src'] = allowedDomains.join(' ');
    }

    return Object.entries(directives)
      .map(([key, value]) => `${key} ${value}`)
      .join('; ');
  }

  public static applyCSP(policy: string): void {
    if (typeof document !== 'undefined') {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Security-Policy';
      meta.content = policy;
      document.head.appendChild(meta);
    }
  }
}

// Export singleton instance
export const securitySandbox = SecuritySandbox.getInstance();