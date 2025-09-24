/**
 * Object Pool implementation for efficient memory management
 * Reduces garbage collection pressure by reusing objects
 */
export declare class ObjectPool<T> {
    private pool;
    private inUse;
    private readonly factory;
    private readonly maxSize;
    private readonly resetFn?;
    constructor(factory: () => T, maxSize: number, resetFn?: (obj: T) => void);
    /**
     * Pre-allocate objects to the pool
     */
    private preallocate;
    /**
     * Acquire an object from the pool
     * Creates a new one if pool is empty
     */
    acquire(template?: any): T;
    /**
     * Release an object back to the pool
     * Object is reset before being returned to pool
     */
    release(obj: T): void;
    /**
     * Release all objects currently in use
     */
    releaseAll(): void;
    /**
     * Get current pool size
     */
    size(): number;
    /**
     * Get number of available objects
     */
    available(): number;
    /**
     * Get number of objects in use
     */
    used(): number;
    /**
     * Reset the pool, clearing all objects
     */
    reset(): void;
    /**
     * Get pool statistics
     */
    getStats(): {
        available: number;
        inUse: number;
        total: number;
        maxSize: number;
        utilizationRate: number;
    };
    /**
     * Ensure minimum number of available objects
     */
    ensureAvailable(count: number): void;
}
//# sourceMappingURL=object-pool.d.ts.map