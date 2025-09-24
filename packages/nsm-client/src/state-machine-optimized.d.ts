/**
 * Optimized State Machine Implementation for NSM
 *
 * Performance optimizations:
 * - Machine compilation caching
 * - Transition memoization
 * - Efficient memory management
 * - Reduced validation overhead
 * - Lazy evaluation of complex operations
 */
import { type StateMachine, type Actor } from 'xstate';
export interface OptimizationConfig {
    enableCompilationCache?: boolean;
    enableTransitionCache?: boolean;
    enableObjectPooling?: boolean;
    cacheSize?: number;
    poolSize?: number;
    lazyValidation?: boolean;
    batchUpdates?: boolean;
}
export interface CachedMachine {
    machine: StateMachine<any, any, any, any, any, any, any, any, any, any, any, any, any, any>;
    hash: string;
    compiledAt: number;
    accessCount: number;
}
export declare class OptimizedStateMachine {
    private readonly config;
    private readonly machineCache;
    private readonly transitionCache;
    private readonly snapshotPool;
    private readonly contextPool;
    private cacheHits;
    private cacheMisses;
    private transitionCount;
    private readonly UNSAFE_PATTERN_REGEX;
    private readonly validationCache;
    constructor(config?: OptimizationConfig);
    /**
     * Load and compile a machine with caching
     */
    loadMachine(definition: any): StateMachine<any, any, any, any, any, any, any, any, any, any, any, any, any, any>;
    /**
     * Create an optimized interpreter
     */
    interpret(machine: StateMachine<any, any, any, any, any, any, any, any, any, any, any, any, any, any>, options?: any): OptimizedActor;
    /**
     * Optimized machine creation with minimal overhead
     */
    private createMachineOptimized;
    /**
     * Check if machine is simple (no complex features)
     */
    private isSimpleMachine;
    /**
     * Optimize machine definition for better performance
     */
    private optimizeMachineDefinition;
    /**
     * Optimize state definitions
     */
    private optimizeStates;
    /**
     * Optimize individual state
     */
    private optimizeState;
    /**
     * Optimize transition definitions
     */
    private optimizeTransitions;
    /**
     * Check if context is large enough to warrant optimization
     */
    private isLargeContext;
    /**
     * Optimize large context objects
     */
    private optimizeContext;
    /**
     * Optimized validation with caching
     */
    private validateMachineOptimized;
    /**
     * Compute efficient hash for machine definition
     */
    private computeMachineHash;
    /**
     * Create batched inspector for update batching
     */
    private createBatchedInspector;
    /**
     * Get performance statistics
     */
    getPerformanceStats(): {
        cacheHits: number;
        cacheMisses: number;
        cacheHitRate: number;
        transitionCount: number;
        pooledObjects: number;
        averageTransitionTime?: number;
    };
    /**
     * Clear all caches and reset statistics
     */
    clearCaches(): void;
}
/**
 * Optimized Actor wrapper for performance enhancements
 */
export declare class OptimizedActor {
    private readonly actor;
    private readonly optimizedMachine;
    private transitionCache;
    private lastSnapshot;
    private snapshotVersion;
    constructor(actor: Actor<any>, optimizedMachine: OptimizedStateMachine);
    start(): void;
    stop(): void;
    /**
     * Optimized send with transition caching
     */
    send(event: any): void;
    getSnapshot(): any;
    subscribe(observer: any): {
        unsubscribe: () => void;
    };
    private getEventKey;
    private getStateKey;
    private applyCachedTransition;
    private cacheTransitionResult;
}
/**
 * LRU Cache implementation for machine and transition caching
 */
declare class LRUCache<K, V> {
    private readonly maxSize;
    private cache;
    constructor(maxSize: number);
    get(key: K): V | undefined;
    set(key: K, value: V): void;
    clear(): void;
    size(): number;
}
/**
 * Object Pool for efficient memory management
 */
declare class ObjectPool<T> {
    private readonly factory;
    private readonly maxSize;
    private pool;
    private inUse;
    constructor(factory: () => T, maxSize: number);
    acquire(template?: any): T;
    release(obj: T): void;
    size(): number;
    reset(): void;
}
export { LRUCache, ObjectPool };
//# sourceMappingURL=state-machine-optimized.d.ts.map