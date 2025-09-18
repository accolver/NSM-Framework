/**
 * LRU (Least Recently Used) Cache implementation
 * High-performance cache with O(1) get/set operations
 */

export class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private readonly maxSize: number;

  constructor(maxSize: number) {
    if (maxSize <= 0) {
      throw new Error('Cache size must be positive');
    }
    this.maxSize = maxSize;
  }

  /**
   * Get a value from the cache
   * Moves the accessed item to the end (most recently used)
   */
  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  /**
   * Set a value in the cache
   * Evicts least recently used item if cache is full
   */
  set(key: K, value: V): void {
    // Remove if exists (to update position)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  /**
   * Check if key exists in cache
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete a key from the cache
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get all keys (ordered from least to most recently used)
   */
  keys(): K[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get all values (ordered from least to most recently used)
   */
  values(): V[] {
    return Array.from(this.cache.values());
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    fillRate: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      fillRate: this.cache.size / this.maxSize
    };
  }
}