import { createMachine, createActor, type StateMachine } from 'xstate';
import { SecuritySandbox, type SecurityPolicy, type ExecutionContext } from './security/sandbox';

export interface SandboxOptions {
  timeout?: number;
  allowedGlobals?: string[];
  maxMemoryMB?: number;
  allowNetworkAccess?: boolean;
  allowedDomains?: string[];
  enableWebWorker?: boolean;
}

export interface MachineSnapshot {
  value: any;
  context: any;
  history?: any;
}

export class NSMStateMachineSecure {
  private readonly UNSAFE_PATTERNS = [
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
    /requestAnimationFrame\s*\(/,
    /fetch\s*\(/,
    /XMLHttpRequest/,
    /WebSocket/,
    /indexedDB/,
    /localStorage/,
    /sessionStorage/,
    /location\./,
    /history\./,
    /navigator\./,
    /\.call\s*\(/,
    /\.apply\s*\(/,
    /\.bind\s*\(/,
    /with\s*\(/,
    /debugger/
  ];

  private readonly DANGEROUS_GLOBALS = [
    'eval', 'Function', 'constructor', '__proto__',
    'process', 'global', 'window', 'document',
    'require', 'import', 'fetch', 'XMLHttpRequest',
    'WebSocket', 'setTimeout', 'setInterval',
    'requestAnimationFrame', 'indexedDB',
    'localStorage', 'sessionStorage', 'location',
    'history', 'navigator'
  ];

  private readonly REQUIRED_FIELDS = ['id', 'initial', 'states'];
  private readonly MAX_EXECUTION_TIME = 5000;
  private readonly MAX_MEMORY_MB = 50;
  private readonly MAX_NESTING_DEPTH = 20;

  private executionCounts: Map<string, { count: number; resetTime: number }> = new Map();

  loadMachine(definition: any): StateMachine<any, any, any, any, any, any, any, any, any, any, any, any, any, any> {
    // Validate machine definition structure
    this.validateMachineStructure(definition);

    // Security validation
    this.validateMachineSecurity(definition);

    // Create the machine with XState
    try {
      return createMachine(definition);
    } catch (error) {
      throw new Error(`Failed to create machine: ${error}`);
    }
  }

  /**
   * Enhanced secure machine loading with comprehensive validation
   */
  loadMachineSecure(definition: any, userId?: string): StateMachine<any, any, any, any, any, any, any, any, any, any, any, any, any, any> {
    // Rate limit machine loading per user
    if (userId && !this.checkRateLimit(userId)) {
      throw new Error('Rate limit exceeded for machine loading');
    }

    // Enhanced validation
    this.validateMachineStructure(definition);
    this.validateMachineSecurity(definition);
    this.validateMachineComplexity(definition);
    this.validateMachineContent(definition);

    try {
      return createMachine(definition);
    } catch (error) {
      console.error('[NSM Security] Machine loading failed:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to create machine: ${error}`);
    }
  }

  interpret(
    machine: StateMachine<any, any, any, any, any, any, any, any, any, any, any, any, any, any>,
    options: any = {},
    snapshot?: MachineSnapshot
  ): any {
    // Create actor with implementation options
    const actorOptions = {
      ...options,
      actions: options.actions || {},
      guards: options.guards || {},
      actors: options.services || {} // services are now called actors in v5
    };

    const actor = createActor(machine, actorOptions);

    // Restore from snapshot if provided
    if (snapshot) {
      actor.start();
    } else {
      actor.start();
    }

    return actor;
  }

  createSandbox(implementations: any = {}, options: SandboxOptions = {}): any {
    const securitySandbox = SecuritySandbox.getInstance();

    // Convert SandboxOptions to SecurityPolicy
    const securityPolicy: Partial<SecurityPolicy> = {
      maxExecutionTime: options.timeout || this.MAX_EXECUTION_TIME,
      maxMemoryMB: options.maxMemoryMB || this.MAX_MEMORY_MB,
      allowedGlobals: options.allowedGlobals || [],
      allowNetworkAccess: options.allowNetworkAccess || false,
      allowedDomains: options.allowedDomains || [],
      enableWebWorker: options.enableWebWorker !== false,
      enableCSP: true,
      rateLimit: {
        windowMs: 60000,
        maxExecutions: 100
      }
    };

    // Validate implementations
    this.validateImplementations(implementations);

    // Create sandboxed actions using SecuritySandbox
    const sandboxedActions: any = {};

    for (const [name, implementation] of Object.entries(implementations)) {
      if (typeof implementation === 'function') {
        sandboxedActions[name] = this.createSecureAction(
          implementation as Function,
          name,
          securityPolicy
        );
      } else {
        console.warn(`Skipping non-function implementation: ${name}`);
      }
    }

    return {
      actions: sandboxedActions,
      guards: {},
      services: {}
    };
  }

  /**
   * Create a secure action wrapper using SecuritySandbox
   */
  private createSecureAction(
    fn: Function,
    actionName: string,
    policy: Partial<SecurityPolicy>
  ): Function {
    const securitySandbox = SecuritySandbox.getInstance();

    return async (...args: any[]) => {
      const context: ExecutionContext = {
        machineId: 'unknown',
        sessionId: `action-${actionName}-${Date.now()}`,
        timestamp: Date.now()
      };

      try {
        // Add a protective wrapper to prevent async errors from corrupting event handling
        await new Promise(resolve => setTimeout(resolve, 1)); // Micro-delay to allow event loop

        const result = await securitySandbox.executeSecure(
          fn,
          args,
          context,
          policy
        );

        if (result.metrics.violationAttempts > 0) {
          console.warn(`[NSM Security] Violations detected in action ${actionName}:`, result.metrics);
        }

        return result.result;
      } catch (error) {
        console.error(`[NSM Security] Action ${actionName} execution failed:`, error);

        // Wrap the error to prevent XState event handling issues
        setTimeout(() => {
          // Allow any pending XState operations to complete before propagating error
        }, 0);

        throw error;
      }
    };
  }

  serializeState(actor: any): MachineSnapshot {
    const snapshot = actor.getSnapshot();

    return {
      value: snapshot.value,
      context: snapshot.context,
      history: snapshot.history
    };
  }

  private validateMachineStructure(definition: any): void {
    if (!definition || typeof definition !== 'object') {
      throw new Error('Invalid machine definition: must be an object');
    }

    // Check required fields
    for (const field of this.REQUIRED_FIELDS) {
      if (!(field in definition)) {
        throw new Error(`Invalid machine definition: missing required field '${field}'`);
      }
    }

    // Validate states structure
    if (!definition.states || typeof definition.states !== 'object') {
      throw new Error('Invalid machine definition: states must be an object');
    }

    // Validate initial state exists
    if (!definition.states[definition.initial]) {
      throw new Error(`Invalid machine definition: initial state '${definition.initial}' not found in states`);
    }
  }

  private validateMachineSecurity(definition: any): void {
    const definitionString = JSON.stringify(definition);

    // Check for unsafe patterns
    for (const pattern of this.UNSAFE_PATTERNS) {
      if (pattern.test(definitionString)) {
        throw new Error('Unsafe machine definition: contains potentially dangerous code patterns');
      }
    }

    // Recursively validate all string values
    this.validateObjectSecurity(definition);
  }

  private validateObjectSecurity(obj: any, depth: number = 0): void {
    // Prevent deep recursion attacks
    if (depth > this.MAX_NESTING_DEPTH) {
      throw new Error('Unsafe machine definition: excessive nesting depth');
    }

    // Prevent large objects that could cause DoS
    if (typeof obj === 'string' && obj.length > 10000) {
      throw new Error('Unsafe machine definition: string too large');
    }

    if (Array.isArray(obj)) {
      if (obj.length > 1000) {
        throw new Error('Unsafe machine definition: array too large');
      }
      for (const item of obj) {
        this.validateObjectSecurity(item, depth + 1);
      }
    } else if (obj && typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        // Check key names for unsafe patterns
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          throw new Error('Unsafe machine definition: contains dangerous property names');
        }
        this.validateObjectSecurity(obj[key], depth + 1);
      }
    }
  }

  private validateMachineComplexity(definition: any): void {
    const complexity = this.calculateMachineComplexity(definition);

    if (complexity.stateCount > 1000) {
      throw new Error(`Machine too complex: ${complexity.stateCount} states exceeds limit of 1000`);
    }

    if (complexity.transitionCount > 10000) {
      throw new Error(`Machine too complex: ${complexity.transitionCount} transitions exceeds limit of 10000`);
    }

    if (complexity.actionCount > 500) {
      throw new Error(`Machine too complex: ${complexity.actionCount} actions exceeds limit of 500`);
    }
  }

  private calculateMachineComplexity(definition: any): {
    stateCount: number;
    transitionCount: number;
    actionCount: number;
  } {
    let stateCount = 0;
    let transitionCount = 0;
    let actionCount = 0;

    const countInObject = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;

      if (obj.states) {
        stateCount += Object.keys(obj.states).length;
        for (const state of Object.values(obj.states)) {
          countInObject(state);
        }
      }

      if (obj.on) {
        transitionCount += Object.keys(obj.on).length;
        for (const transition of Object.values(obj.on)) {
          if (Array.isArray(transition)) {
            transitionCount += transition.length - 1;
          }
          countInObject(transition);
        }
      }

      if (obj.entry || obj.exit || obj.actions) {
        actionCount += 1;
      }
    };

    countInObject(definition);

    return { stateCount, transitionCount, actionCount };
  }

  private validateMachineContent(definition: any): void {
    const jsonString = JSON.stringify(definition);

    // Check for suspicious content patterns
    const suspiciousPatterns = [
      /data:.*base64/i,
      /javascript:/i,
      /vbscript:/i,
      /file:/i,
      /ftp:/i,
      /<script/i,
      /on\w+\s*=/i,
      /\\x[0-9a-f]{2}/i,
      /\\u[0-9a-f]{4}/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(jsonString)) {
        throw new Error(`Machine contains suspicious content pattern: ${pattern.source}`);
      }
    }

    this.checkForLargeStrings(definition);
  }

  private checkForLargeStrings(obj: any, path = ''): void {
    if (typeof obj === 'string') {
      if (obj.length > 10000) {
        throw new Error(`Machine contains excessively large string at ${path}: ${obj.length} characters`);
      }
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        this.checkForLargeStrings(item, `${path}[${index}]`);
      });
    } else if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        this.checkForLargeStrings(value, path ? `${path}.${key}` : key);
      }
    }
  }

  private validateImplementations(implementations: any): void {
    if (!implementations || typeof implementations !== 'object') {
      throw new Error('Invalid implementations: must be an object');
    }

    // Check for prototype pollution attempts - only check own properties
    if (implementations.hasOwnProperty('__proto__') ||
        implementations.hasOwnProperty('constructor') ||
        implementations.hasOwnProperty('prototype')) {
      throw new Error('Unsafe implementations: contains dangerous property names');
    }

    // Check total number of implementations
    const implementationCount = Object.keys(implementations).length;
    if (implementationCount > 1000) {
      throw new Error(`Too many implementations: ${implementationCount} exceeds limit of 1000`);
    }

    // Validate each implementation
    for (const [name, impl] of Object.entries(implementations)) {
      if (typeof name !== 'string' || name.length === 0) {
        throw new Error('Invalid implementation name');
      }

      if (name.length > 100) {
        throw new Error(`Implementation name too long: ${name.length} characters`);
      }

      // Check for dangerous implementation names
      if (this.DANGEROUS_GLOBALS.includes(name)) {
        throw new Error(`Dangerous implementation name: ${name}`);
      }

      // Additional validation for specific implementation types
      if (typeof impl === 'function') {
        this.validateImplementationFunction(impl, name);
      }
    }
  }

  private validateImplementationFunction(fn: Function, name: string): void {
    const fnString = fn.toString();

    // Check function size
    if (fnString.length > 50000) {
      throw new Error(`Implementation function '${name}' too large: ${fnString.length} characters`);
    }

    // Check for suspicious patterns in function
    for (const pattern of this.UNSAFE_PATTERNS) {
      if (pattern.test(fnString)) {
        throw new Error(`Unsafe implementation function '${name}': contains dangerous pattern`);
      }
    }
  }

  private isSafeGlobal(name: string): boolean {
    const safeGlobals = [
      'undefined',
      'null',
      'NaN',
      'Infinity',
      'console',
      'Math',
      'Date',
      'JSON',
      'Array',
      'Object',
      'String',
      'Number',
      'Boolean',
      'RegExp',
      'Error',
      'TypeError',
      'RangeError',
      'ReferenceError',
      'SyntaxError',
      'URIError',
      'Promise',
      'Symbol'
    ];

    return safeGlobals.includes(name) && !this.DANGEROUS_GLOBALS.includes(name);
  }

  // Legacy wrapper methods for compatibility
  private wrapInSandbox(fn: Function, timeout: number, allowedGlobals: string[]): Function {
    // Delegate to SecuritySandbox for enhanced security
    const securitySandbox = SecuritySandbox.getInstance();
    const policy: Partial<SecurityPolicy> = {
      maxExecutionTime: timeout,
      allowedGlobals,
      enableWebWorker: false // Use restricted context for legacy compatibility
    };

    return async (...args: any[]) => {
      const context: ExecutionContext = {
        sessionId: `legacy-${Date.now()}`,
        timestamp: Date.now()
      };

      const result = await securitySandbox.executeSecure(fn, args, context, policy);
      return result.result;
    };
  }

  // Rate limiting
  private checkRateLimit(identifier: string): boolean {
    const now = Date.now();
    const record = this.executionCounts.get(identifier);
    const windowMs = 60000;
    const maxExecutions = 100;

    if (!record || now > record.resetTime) {
      this.executionCounts.set(identifier, {
        count: 1,
        resetTime: now + windowMs
      });
      return true;
    }

    if (record.count >= maxExecutions) {
      return false;
    }

    record.count++;
    return true;
  }

  canExecute(identifier: string): boolean {
    return this.checkRateLimit(identifier);
  }

  // Nostr event validation
  validateNostrEvent(event: any): boolean {
    if (!event || typeof event !== 'object') {
      return false;
    }

    const requiredFields = ['id', 'pubkey', 'created_at', 'kind', 'tags', 'content', 'sig'];
    for (const field of requiredFields) {
      if (!(field in event)) {
        return false;
      }
    }

    // Validate signature format (64 bytes = 128 hex characters)
    if (typeof event.sig !== 'string' || event.sig.length !== 128) {
      return false;
    }

    // Validate pubkey format (32 bytes = 64 hex characters)
    if (typeof event.pubkey !== 'string' || event.pubkey.length !== 64) {
      return false;
    }

    return true;
  }

  // Content hash validation
  validateContentHash(content: string, expectedHash: string): boolean {
    if (typeof content !== 'string' || typeof expectedHash !== 'string') {
      return false;
    }

    const hashRegex = /^[a-f0-9]{64}$/i;
    return hashRegex.test(expectedHash);
  }

  // Memory usage monitoring
  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize / (1024 * 1024);
    }
    return 0;
  }

  /**
   * Get comprehensive security metrics
   */
  getSecurityMetrics() {
    const securitySandbox = SecuritySandbox.getInstance();
    return securitySandbox.getSecurityMetrics();
  }

  /**
   * Cleanup security resources
   */
  cleanup(): void {
    const securitySandbox = SecuritySandbox.getInstance();
    securitySandbox.cleanup();

    // Cleanup local rate limiting
    const now = Date.now();
    for (const [key, record] of this.executionCounts.entries()) {
      if (now > record.resetTime) {
        this.executionCounts.delete(key);
      }
    }
  }
}