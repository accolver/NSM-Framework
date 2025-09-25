/**
 * ImplementationLoader - Secure implementation loading and sandboxed execution
 * Provides runtime validation, caching, and security sandbox for downloaded implementations
 */

import { BlossomClient } from './BlossomClient';
import { ImplementationBundle, ExtractedFunction } from './ImplementationBundler';
import type { BlossomImplementationReference, NSMDefinitionContent } from '@nsm/core';

export interface LoaderConfig {
  /** BlossomClient for downloading implementations */
  blossomClient: BlossomClient;
  /** Security context for sandboxed execution */
  securityContext?: SecurityContext;
  /** Cache configuration */
  cacheConfig?: CacheConfig;
  /** Enable offline mode with fallback implementations */
  offlineMode?: boolean;
  /** Fallback implementations for offline mode */
  fallbackImplementations?: Record<string, ImplementationBundle>;
}

export interface SecurityContext {
  /** Allow eval() and Function() constructor (dangerous) */
  allowUnsafeEval?: boolean;
  /** Maximum execution time in milliseconds */
  maxExecutionTime?: number;
  /** Allow network access from sandboxed code */
  allowNetworkAccess?: boolean;
  /** List of trusted domains for network access */
  trustedDomains?: string[];
  /** Content Security Policy for sandbox */
  cspPolicy?: string;
}

export interface CacheConfig {
  /** Maximum number of cached implementations */
  maxSize?: number;
  /** Time-to-live in milliseconds */
  ttl?: number;
  /** Persist cache to disk for offline access */
  persistToDisk?: boolean;
}

export interface ImplementationCache {
  bundle: ImplementationBundle;
  cachedAt: number;
  accessCount: number;
  lastAccess: number;
}

export interface LoadedImplementations {
  functions: Record<string, ExtractedFunction>;
  metadata: {
    functionCount: number;
    createdAt: number;
    dependencies?: string[];
    version?: string;
  };
}

export interface MixedImplementations {
  inline: {
    actions: Record<string, ExtractedFunction>;
    guards: Record<string, ExtractedFunction>;
    actors: Record<string, ExtractedFunction>;
  };
  blossom: LoadedImplementations;
}

export class ImplementationLoader {
  private config: Required<LoaderConfig>;
  private cache: Map<string, ImplementationCache> = new Map();

  constructor(config: LoaderConfig) {
    this.validateConfig(config);

    // Set defaults
    this.config = {
      blossomClient: config.blossomClient,
      securityContext: {
        allowUnsafeEval: false,
        maxExecutionTime: 5000,
        allowNetworkAccess: false,
        trustedDomains: [],
        cspPolicy: "default-src 'self'",
        ...config.securityContext
      },
      cacheConfig: {
        maxSize: 100,
        ttl: 3600000, // 1 hour
        persistToDisk: false,
        ...config.cacheConfig
      },
      offlineMode: config.offlineMode || false,
      fallbackImplementations: config.fallbackImplementations || {}
    };
  }

  private validateConfig(config: LoaderConfig): void {
    if (!config.blossomClient) {
      throw new Error('BlossomClient is required');
    }
  }

  /**
   * Get current loader configuration
   */
  getConfig(): Required<LoaderConfig> {
    return { ...this.config };
  }

  /**
   * Load implementations from Blossom reference with caching
   */
  async loadImplementations(blossomRef: BlossomImplementationReference): Promise<LoadedImplementations> {
    const hash = blossomRef.hash;

    // Check cache first
    const cached = this.getCachedImplementation(hash);
    if (cached) {
      return {
        functions: cached.functions,
        metadata: cached.metadata
      };
    }

    // Check for offline mode first
    if (this.config.offlineMode && this.config.fallbackImplementations[hash]) {
      const fallbackBundle = this.config.fallbackImplementations[hash]!;
      this.cacheImplementation(hash, fallbackBundle);
      return {
        functions: fallbackBundle.functions,
        metadata: fallbackBundle.metadata
      };
    }

    try {
      // Try to download from Blossom
      const bundle = await this.downloadImplementationBundle(blossomRef);

      // Validate bundle integrity
      this.validateBundleIntegrity(bundle, blossomRef);

      // Cache the bundle
      this.cacheImplementation(hash, bundle);

      return {
        functions: bundle.functions,
        metadata: bundle.metadata
      };

    } catch (error) {
      // Check for offline fallback as last resort
      if (this.config.fallbackImplementations[hash]) {
        const fallbackBundle = this.config.fallbackImplementations[hash]!;
        this.cacheImplementation(hash, fallbackBundle);
        return {
          functions: fallbackBundle.functions,
          metadata: fallbackBundle.metadata
        };
      }

      throw new Error(`Failed to load implementations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load implementations with NSM definition validation
   */
  async loadImplementationsWithValidation(
    blossomRef: BlossomImplementationReference,
    nsmDefinition: NSMDefinitionContent
  ): Promise<LoadedImplementations> {
    const implementations = await this.loadImplementations(blossomRef);

    // Validate that all required implementations are present
    this.validateImplementationsAgainstNSM(implementations, nsmDefinition);

    return implementations;
  }

  /**
   * Load mixed inline and Blossom implementations
   */
  async loadMixedImplementations(nsmDefinition: NSMDefinitionContent): Promise<MixedImplementations> {
    const inline = {
      actions: {} as Record<string, ExtractedFunction>,
      guards: {} as Record<string, ExtractedFunction>,
      actors: {} as Record<string, ExtractedFunction>
    };

    let blossomImplementations: LoadedImplementations | null = null;

    // Process setup configuration
    if (nsmDefinition.machineConfig.setup) {
      const setup = nsmDefinition.machineConfig.setup;

      // Extract inline implementations
      ['actions', 'guards', 'actors'].forEach(type => {
        const implementations = setup[type as keyof typeof setup] as Record<string, string> | undefined;
        if (implementations) {
          Object.entries(implementations).forEach(([name, impl]) => {
            if (!impl.startsWith('ref:blossom:')) {
              // Inline implementation
              const extractedFunction: ExtractedFunction = {
                name,
                source: impl,
                type: type.slice(0, -1) as 'action' | 'guard' | 'actor' // Remove 's' suffix
              };
              (inline[type as keyof typeof inline] as Record<string, ExtractedFunction>)[name] = extractedFunction;
            }
          });
        }
      });
    }

    // Load Blossom implementations if available
    if (nsmDefinition.implementations) {
      blossomImplementations = await this.loadImplementations(nsmDefinition.implementations);
    }

    return {
      inline,
      blossom: blossomImplementations || {
        functions: {},
        metadata: {
          functionCount: 0,
          createdAt: Date.now(),
          dependencies: []
        }
      }
    };
  }

  /**
   * Execute function in sandboxed environment
   */
  async executeFunction(
    functionName: string,
    extractedFunction: ExtractedFunction,
    context: any
  ): Promise<any> {
    // Security validation
    this.validateFunctionSecurity(extractedFunction);

    // Create sandbox environment with function-specific context
    const sandbox = this.createSandboxEnvironment(functionName, extractedFunction.type);

    // Execute with timeout
    return this.executeWithTimeout(extractedFunction.source, sandbox, context);
  }

  private async downloadImplementationBundle(blossomRef: BlossomImplementationReference): Promise<ImplementationBundle> {
    return await this.config.blossomClient.downloadImplementations(blossomRef.hash);
  }

  private validateBundleIntegrity(bundle: ImplementationBundle, blossomRef: BlossomImplementationReference): void {
    // Check hash integrity if provided
    if (blossomRef.integrity && blossomRef.integrity.hash !== bundle.hash) {
      throw new Error('Hash verification failed: expected hash does not match bundle hash');
    }

    // Validate content type
    if (bundle.contentType !== 'application/x-nsm-implementation') {
      throw new Error(`Invalid content type: expected 'application/x-nsm-implementation', got '${bundle.contentType}'`);
    }

    // Validate bundle structure
    if (!bundle.functions || !bundle.metadata) {
      throw new Error('Invalid bundle structure: missing functions or metadata');
    }
  }

  private getCachedImplementation(hash: string): ImplementationBundle | null {
    const cached = this.cache.get(hash);
    if (!cached) {
      return null;
    }

    // Check TTL
    const now = Date.now();
    if (now - cached.cachedAt > this.config.cacheConfig.ttl!) {
      this.cache.delete(hash);
      return null;
    }

    // Update access statistics
    cached.accessCount++;
    cached.lastAccess = now;

    return cached.bundle;
  }

  private cacheImplementation(hash: string, bundle: ImplementationBundle): void {
    // Check cache size limit and evict if needed
    if (this.cache.size >= this.config.cacheConfig.maxSize!) {
      // If cache is at capacity and this is a new hash, evict oldest
      if (!this.cache.has(hash)) {
        this.evictOldestCacheEntry();
      }
    }

    const cacheEntry: ImplementationCache = {
      bundle,
      cachedAt: Date.now(),
      accessCount: 1,
      lastAccess: Date.now()
    };

    this.cache.set(hash, cacheEntry);
  }

  private evictOldestCacheEntry(): void {
    if (this.cache.size === 0) {
      return;
    }

    let oldestKey = '';
    let oldestTime = Infinity; // Start with infinity, not current time

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private validateImplementationsAgainstNSM(
    implementations: LoadedImplementations,
    nsmDefinition: NSMDefinitionContent
  ): void {
    if (!nsmDefinition.machineConfig.setup) {
      return; // No setup config to validate against
    }

    const setup = nsmDefinition.machineConfig.setup;
    const requiredFunctions: string[] = [];

    // Collect required Blossom function references
    ['actions', 'guards', 'actors'].forEach(type => {
      const typeImplementations = setup[type as keyof typeof setup] as Record<string, string> | undefined;
      if (typeImplementations) {
        Object.entries(typeImplementations).forEach(([name, impl]) => {
          if (impl.startsWith('ref:blossom:')) {
            requiredFunctions.push(name);
          }
        });
      }
    });

    // Check that all required functions are present
    for (const functionName of requiredFunctions) {
      if (!implementations.functions[functionName]) {
        throw new Error(`Missing required implementation: ${functionName}`);
      }
    }
  }

  private validateFunctionSecurity(extractedFunction: ExtractedFunction): void {
    const source = extractedFunction.source;

    // Check for unsafe operations
    const unsafePatterns = [
      /eval\s*\(/,
      /Function\s*\(/,
      /setTimeout\s*\(/,
      /setInterval\s*\(/,
      /XMLHttpRequest/,
      /fetch\s*\(/,
      /import\s*\(/,
      /require\s*\(/
    ];

    for (const pattern of unsafePatterns) {
      if (pattern.test(source)) {
        throw new Error('Unsafe operation detected: function contains potentially dangerous code');
      }
    }

    // Additional security checks
    if (!this.config.securityContext.allowUnsafeEval) {
      if (source.includes('eval') || source.includes('Function')) {
        throw new Error('Unsafe operation detected: eval and Function constructor are not allowed');
      }
    }

    if (!this.config.securityContext.allowNetworkAccess) {
      if (source.includes('fetch') || source.includes('XMLHttpRequest')) {
        throw new Error('Unsafe operation detected: network access is not allowed');
      }
    }
  }

  private createSandboxEnvironment(functionName?: string, functionType?: string): any {
    // Create a limited sandbox with safe XState utilities
    const baseSandbox: any = {
      // Safe XState functions
      assign: (assignments: any) => ({ type: 'xstate.assign', assignments }),
      send: (event: any) => ({ type: 'xstate.send', event }),
      spawn: (actor: any) => ({ type: 'xstate.spawn', actor }),
      raise: (event: any) => ({ type: 'xstate.raise', event }),

      // Safe JavaScript functions
      console: {
        log: (...args: any[]) => console.log(`[SANDBOX:${functionName || 'unknown'}]`, ...args),
        warn: (...args: any[]) => console.warn(`[SANDBOX:${functionName || 'unknown'}]`, ...args),
        error: (...args: any[]) => console.error(`[SANDBOX:${functionName || 'unknown'}]`, ...args)
      },

      // Safe utility functions
      Math: Math,
      Date: {
        now: () => Date.now(),
        parse: (str: string) => Date.parse(str)
      },
      JSON: {
        parse: JSON.parse.bind(JSON),
        stringify: JSON.stringify.bind(JSON)
      },

      // Prevent access to dangerous globals
      eval: undefined,
      Function: undefined,
      setTimeout: undefined,
      setInterval: undefined,
      fetch: undefined,
      XMLHttpRequest: undefined,
      window: undefined,
      global: undefined,
      process: undefined,
      require: undefined,
      import: undefined,
      document: undefined
    };

    // Add function-type specific utilities
    if (functionType === 'guard') {
      // Guards should have access to comparison utilities
      baseSandbox.Object = {
        keys: Object.keys.bind(Object),
        values: Object.values.bind(Object),
        entries: Object.entries.bind(Object)
      };
    }

    return baseSandbox;
  }

  private async executeWithTimeout(source: string, sandbox: any, context: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Execution timeout: function took too long to execute'));
      }, this.config.securityContext.maxExecutionTime);

      try {
        // Simple approach: create function that has access to sandbox functions by name
        const fn = new Function(
          'context',
          'assign',
          'send',
          'spawn',
          'raise',
          'console',
          'Math',
          'Date',
          'JSON',
          'Object',
          `
          const userFunction = ${source};
          if (typeof userFunction !== 'function') {
            throw new Error('Implementation must be a function');
          }
          return userFunction(context);
          `
        );

        // Execute with context and sandbox functions as explicit arguments
        const result = fn(
          context,
          sandbox.assign,
          sandbox.send,
          sandbox.spawn,
          sandbox.raise,
          sandbox.console,
          sandbox.Math,
          sandbox.Date,
          sandbox.JSON,
          sandbox.Object
        );

        // Handle promises
        if (result && typeof result.then === 'function') {
          result
            .then((asyncResult: any) => {
              clearTimeout(timeout);
              resolve(asyncResult);
            })
            .catch((asyncError: any) => {
              clearTimeout(timeout);
              reject(asyncError);
            });
        } else {
          clearTimeout(timeout);
          resolve(result);
        }
      } catch (error) {
        clearTimeout(timeout);
        // Enhanced error reporting
        const errorMessage = error instanceof Error ? error.message : 'Unknown execution error';
        reject(new Error(`Function execution failed: ${errorMessage}`));
      }
    });
  }
}