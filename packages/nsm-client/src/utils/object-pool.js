"use strict";
/**
 * Object Pool implementation for efficient memory management
 * Reduces garbage collection pressure by reusing objects
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectPool = void 0;
class ObjectPool {
    pool = [];
    inUse = new Set();
    factory;
    maxSize;
    resetFn;
    constructor(factory, maxSize, resetFn) {
        if (maxSize <= 0) {
            throw new Error('Pool size must be positive');
        }
        this.factory = factory;
        this.maxSize = maxSize;
        this.resetFn = resetFn;
        // Pre-populate pool with initial objects
        this.preallocate(Math.min(10, maxSize));
    }
    /**
     * Pre-allocate objects to the pool
     */
    preallocate(count) {
        for (let i = 0; i < count; i++) {
            this.pool.push(this.factory());
        }
    }
    /**
     * Acquire an object from the pool
     * Creates a new one if pool is empty
     */
    acquire(template) {
        let obj;
        if (this.pool.length > 0) {
            obj = this.pool.pop();
        }
        else {
            obj = this.factory();
        }
        // Initialize with template if provided
        if (template && typeof obj === 'object' && obj !== null) {
            Object.assign(obj, template);
        }
        this.inUse.add(obj);
        return obj;
    }
    /**
     * Release an object back to the pool
     * Object is reset before being returned to pool
     */
    release(obj) {
        if (!this.inUse.has(obj)) {
            return; // Object not from this pool
        }
        this.inUse.delete(obj);
        // Reset object for reuse
        if (this.resetFn) {
            this.resetFn(obj);
        }
        else if (typeof obj === 'object' && obj !== null) {
            // Default reset: clear all properties
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    delete obj[key];
                }
            }
        }
        // Return to pool if not at capacity
        if (this.pool.length < this.maxSize) {
            this.pool.push(obj);
        }
        // Otherwise, let it be garbage collected
    }
    /**
     * Release all objects currently in use
     */
    releaseAll() {
        const objectsToRelease = Array.from(this.inUse);
        for (const obj of objectsToRelease) {
            this.release(obj);
        }
    }
    /**
     * Get current pool size
     */
    size() {
        return this.pool.length + this.inUse.size;
    }
    /**
     * Get number of available objects
     */
    available() {
        return this.pool.length;
    }
    /**
     * Get number of objects in use
     */
    used() {
        return this.inUse.size;
    }
    /**
     * Reset the pool, clearing all objects
     */
    reset() {
        this.pool = [];
        this.inUse.clear();
    }
    /**
     * Get pool statistics
     */
    getStats() {
        const available = this.pool.length;
        const inUse = this.inUse.size;
        const total = available + inUse;
        return {
            available,
            inUse,
            total,
            maxSize: this.maxSize,
            utilizationRate: inUse / this.maxSize
        };
    }
    /**
     * Ensure minimum number of available objects
     */
    ensureAvailable(count) {
        const needed = count - this.pool.length;
        if (needed > 0) {
            const toAllocate = Math.min(needed, this.maxSize - this.size());
            this.preallocate(toAllocate);
        }
    }
}
exports.ObjectPool = ObjectPool;
