/**
 * Cache Performance Tests for NSM Framework
 * Comprehensive benchmarks for memory cache, IndexedDB cache, and cache coordination
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { MemoryCache } from '../../packages/nsm-client/src/cache/memory-cache';
import { IndexedDBCache } from '../../packages/nsm-client/src/cache/indexeddb-cache';
import { NostrEventCache } from '../../packages/nsm-client/src/cache/nostr-event-cache';
import { BlossomContentCache } from '../../packages/nsm-client/src/cache/blossom-content-cache';
import { CacheInvalidationManager, createNSMInvalidationManager } from '../../packages/nsm-client/src/cache/cache-invalidation';
import {
  Benchmark,
  TestDataGenerator,
  MemoryMonitor,
  PerformanceTimer,
  PerformanceAssertions
} from './performance-utils';

describe('Cache Performance Tests', () => {
  let benchmark: Benchmark;
  let memoryMonitor: MemoryMonitor;
  let timer: PerformanceTimer;

  beforeEach(() => {
    benchmark = new Benchmark();
    memoryMonitor = new MemoryMonitor();
    timer = new PerformanceTimer();
  });

  afterEach(async () => {
    // Cleanup IndexedDB databases
    if (typeof indexedDB !== 'undefined') {
      try {
        indexedDB.deleteDatabase('test-cache-db');
        indexedDB.deleteDatabase('test-nostr-events');
        indexedDB.deleteDatabase('test-blossom-content');
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('Memory Cache Performance', () => {
    let cache: MemoryCache<any>;

    beforeEach(() => {
      cache = new MemoryCache({
        maxEntries: 10000,
        maxSize: 50 * 1024 * 1024, // 50MB
        defaultTTL: 60000 // 1 minute
      });
    });

    afterEach(() => {
      cache.destroy();
    });

    it('should handle high-frequency read/write operations', async () => {
      const itemCount = 1000;
      const testData = Array.from({ length: itemCount }, (_, i) => ({
        key: `test-key-${i}`,
        value: { id: i, data: 'x'.repeat(100) }
      }));

      // Benchmark writes
      const writeResult = await benchmark.run(
        'Memory Cache Writes',
        () => {
          testData.forEach(({ key, value }) => {
            cache.set(key, value);
          });
        },
        10
      );

      // Benchmark reads
      const readResult = await benchmark.run(
        'Memory Cache Reads',
        () => {
          testData.forEach(({ key }) => {
            cache.get(key);
          });
        },
        100
      );

      console.log(`Memory Cache Performance:`);
      console.log(`  Write: ${writeResult.avgTime.toFixed(2)}ms for ${itemCount} items`);
      console.log(`  Read: ${readResult.avgTime.toFixed(2)}ms for ${itemCount} items`);
      console.log(`  Write throughput: ${writeResult.throughputPerSecond.toFixed(0)} ops/sec`);
      console.log(`  Read throughput: ${readResult.throughputPerSecond.toFixed(0)} ops/sec`);

      const stats = cache.getStats();
      console.log(`  Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
      console.log(`  Memory usage: ${(stats.totalSize / 1024 / 1024).toFixed(2)}MB`);

      // Performance assertions
      expect(writeResult.avgTime).toBeLessThan(50); // Under 50ms for 1000 writes
      expect(readResult.avgTime).toBeLessThan(10); // Under 10ms for 1000 reads
      expect(stats.hitRate).toBeGreaterThan(0.95); // 95%+ hit rate
    });

    it('should efficiently handle memory pressure and eviction', async () => {
      const largeItemSize = 1024; // 1KB per item
      const maxItems = 100; // Will exceed memory limit

      cache = new MemoryCache({
        maxEntries: maxItems,
        maxSize: 50 * 1024, // 50KB limit
        defaultTTL: 60000
      });

      memoryMonitor.reset();
      const initialMemory = memoryMonitor.takeSnapshot();

      // Add items beyond memory limit
      for (let i = 0; i < maxItems * 2; i++) {
        const value = 'x'.repeat(largeItemSize);
        cache.set(`large-item-${i}`, value);
      }

      const stats = cache.getStats();
      const finalMemory = memoryMonitor.takeSnapshot();

      console.log(`Memory Pressure Test:`);
      console.log(`  Final entries: ${stats.entries}`);
      console.log(`  Memory usage: ${(stats.totalSize / 1024).toFixed(2)}KB`);
      console.log(`  Evictions: ${stats.evictions}`);
      console.log(`  Process memory growth: ${((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024).toFixed(2)}MB`);

      // Should stay within memory limits
      expect(stats.totalSize).toBeLessThanOrEqual(55 * 1024); // Allow 10% overhead
      expect(stats.evictions).toBeGreaterThan(0); // Should have evicted items
      expect(stats.entries).toBeLessThanOrEqual(maxItems);
    });

    it('should handle TTL expiration efficiently', async () => {
      const shortTTL = 100; // 100ms
      const itemCount = 500;

      // Add items with short TTL
      for (let i = 0; i < itemCount; i++) {
        cache.set(`short-ttl-${i}`, { data: i }, shortTTL);
      }

      expect(cache.getStats().entries).toBe(itemCount);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Trigger cleanup
      timer.start();
      const cleanedCount = cache.cleanup();
      const cleanupTime = timer.stop();

      console.log(`TTL Expiration Test:`);
      console.log(`  Cleaned items: ${cleanedCount}`);
      console.log(`  Cleanup time: ${cleanupTime.toFixed(2)}ms`);
      console.log(`  Remaining entries: ${cache.getStats().entries}`);

      expect(cleanedCount).toBe(itemCount);
      expect(cleanupTime).toBeLessThan(50); // Cleanup should be fast
      expect(cache.getStats().entries).toBe(0);
    });
  });

  describe('IndexedDB Cache Performance', () => {
    let cache: IndexedDBCache;

    beforeEach(async () => {
      cache = new IndexedDBCache({
        dbName: 'test-cache-db',
        version: 1,
        storeName: 'test-store'
      });

      // Wait for DB to initialize
      await cache.set('init', 'test');
      await cache.delete('init');
    });

    afterEach(() => {
      cache.close();
    });

    it('should handle bulk operations efficiently', async () => {
      const itemCount = 100;
      const testData = Array.from({ length: itemCount }, (_, i) => ({
        key: `bulk-test-${i}`,
        value: { id: i, content: 'data'.repeat(50) },
        options: { ttl: 60000 }
      }));

      // Test bulk writes
      const bulkWriteResult = await benchmark.run(
        'IndexedDB Bulk Writes',
        async () => {
          await cache.setMany(testData);
        },
        5
      );

      // Test bulk reads
      const keys = testData.map(item => item.key);
      const bulkReadResult = await benchmark.run(
        'IndexedDB Bulk Reads',
        async () => {
          await cache.getMany(keys);
        },
        10
      );

      console.log(`IndexedDB Bulk Operations:`);
      console.log(`  Bulk write: ${bulkWriteResult.avgTime.toFixed(2)}ms for ${itemCount} items`);
      console.log(`  Bulk read: ${bulkReadResult.avgTime.toFixed(2)}ms for ${itemCount} items`);

      // Verify data integrity
      const results = await cache.getMany(keys);
      const successfulReads = Array.from(results.values()).filter(v => v !== null).length;
      expect(successfulReads).toBe(itemCount);
    });

    it('should handle large data sets efficiently', async () => {
      const largeDataSize = 10 * 1024; // 10KB per item
      const itemCount = 50;

      const largeItems = Array.from({ length: itemCount }, (_, i) => ({
        key: `large-item-${i}`,
        value: {
          id: i,
          largeData: 'x'.repeat(largeDataSize),
          metadata: { created: Date.now(), index: i }
        }
      }));

      timer.start();
      for (const item of largeItems) {
        await cache.set(item.key, item.value);
      }
      const writeTime = timer.stop();

      timer.start();
      const stats = await cache.getStats();
      const statsTime = timer.stop();

      timer.start();
      for (const item of largeItems) {
        const result = await cache.get(item.key);
        expect(result).toBeTruthy();
      }
      const readTime = timer.stop();

      console.log(`IndexedDB Large Data Test:`);
      console.log(`  Write time: ${writeTime.toFixed(2)}ms for ${itemCount} items`);
      console.log(`  Read time: ${readTime.toFixed(2)}ms for ${itemCount} items`);
      console.log(`  Stats time: ${statsTime.toFixed(2)}ms`);
      console.log(`  Total size: ${(stats.totalSize / 1024 / 1024).toFixed(2)}MB`);

      expect(writeTime).toBeLessThan(5000); // Under 5 seconds
      expect(readTime).toBeLessThan(2000); // Under 2 seconds
      expect(statsTime).toBeLessThan(100); // Stats should be fast
    });

    it('should handle concurrent operations safely', async () => {
      const concurrentCount = 20;
      const itemsPerConcurrent = 10;

      const concurrentOps = Array.from({ length: concurrentCount }, async (_, i) => {
        const items = Array.from({ length: itemsPerConcurrent }, (_, j) => ({
          key: `concurrent-${i}-${j}`,
          value: { batch: i, item: j, data: Math.random() }
        }));

        // Mix reads and writes
        for (const item of items) {
          await cache.set(item.key, item.value);
          const retrieved = await cache.get(item.key);
          expect(retrieved).toEqual(item.value);
        }

        return items.length;
      });

      timer.start();
      const results = await Promise.all(concurrentOps);
      const concurrentTime = timer.stop();

      const totalOperations = results.reduce((sum, count) => sum + count, 0) * 2; // reads + writes

      console.log(`IndexedDB Concurrent Operations:`);
      console.log(`  Total operations: ${totalOperations}`);
      console.log(`  Concurrent time: ${concurrentTime.toFixed(2)}ms`);
      console.log(`  Ops per second: ${(totalOperations / (concurrentTime / 1000)).toFixed(0)}`);

      expect(concurrentTime).toBeLessThan(10000); // Under 10 seconds
      expect(results.every(count => count === itemsPerConcurrent)).toBe(true);
    });
  });

  describe('Nostr Event Cache Performance', () => {
    let cache: NostrEventCache;

    beforeEach(() => {
      cache = new NostrEventCache(
        {
          memoryTTL: 30000,
          persistentTTL: 300000,
          maxMemoryEvents: 500
        },
        { dbName: 'test-nostr-events', version: 1 }
      );
    });

    afterEach(() => {
      cache.destroy();
    });

    it('should efficiently cache and query Nostr events', async () => {
      const eventCount = 200;
      const events = TestDataGenerator.generateNostrEvents(eventCount);

      // Test event storage performance
      const storeResult = await benchmark.run(
        'Nostr Event Storage',
        async () => {
          for (const event of events) {
            await cache.setEvent(event);
          }
        },
        1
      );

      // Test query performance
      const queryResult = await benchmark.run(
        'Nostr Event Queries',
        async () => {
          await cache.queryEvents({ kinds: [1], limit: 50 });
          await cache.queryEvents({ authors: [events[0].pubkey], limit: 20 });
          await cache.queryEvents({ since: Date.now() - 3600 });
        },
        10
      );

      const metrics = await cache.getMetrics();

      console.log(`Nostr Event Cache Performance:`);
      console.log(`  Storage: ${storeResult.avgTime.toFixed(2)}ms for ${eventCount} events`);
      console.log(`  Queries: ${queryResult.avgTime.toFixed(2)}ms per query batch`);
      console.log(`  Hit rate: ${(metrics.hitRate * 100).toFixed(1)}%`);
      console.log(`  Memory events: ${metrics.memoryEvents}`);
      console.log(`  Persistent events: ${metrics.persistentEvents}`);

      expect(storeResult.avgTime).toBeLessThan(10000); // Under 10 seconds
      expect(queryResult.avgTime).toBeLessThan(100); // Under 100ms per query batch
      expect(metrics.totalEvents).toBe(eventCount);
    });

    it('should handle event filtering efficiently', async () => {
      const events = TestDataGenerator.generateNostrEvents(300, {
        kindDistribution: { 1: 0.6, 3: 0.2, 4: 0.2 },
        timeRange: { start: Date.now() - 86400000, end: Date.now() }
      });

      // Store events
      for (const event of events) {
        await cache.setEvent(event);
      }

      // Test various filter types
      const filterTests = [
        { name: 'Kind Filter', filter: { kinds: [1] } },
        { name: 'Author Filter', filter: { authors: [events[0].pubkey] } },
        { name: 'Time Range', filter: { since: Date.now() - 3600000 } },
        { name: 'Complex Filter', filter: { kinds: [1, 3], limit: 25 } }
      ];

      for (const test of filterTests) {
        const result = await benchmark.run(
          test.name,
          async () => {
            await cache.queryEvents(test.filter);
          },
          20
        );

        console.log(`  ${test.name}: ${result.avgTime.toFixed(2)}ms avg`);
        expect(result.avgTime).toBeLessThan(50); // Under 50ms per filter
      }
    });
  });

  describe('Blossom Content Cache Performance', () => {
    let cache: BlossomContentCache;

    beforeEach(() => {
      cache = new BlossomContentCache(
        {
          memoryTTL: 30000,
          persistentTTL: 300000,
          maxMemorySize: 10 * 1024 * 1024 // 10MB
        },
        { dbName: 'test-blossom-content', version: 1 }
      );
    });

    afterEach(() => {
      cache.destroy();
    });

    it('should handle large content efficiently', async () => {
      const contentSizes = [1024, 10240, 102400]; // 1KB, 10KB, 100KB
      const contentTypes = ['application/json', 'text/plain', 'application/javascript'];

      for (let i = 0; i < contentSizes.length; i++) {
        const size = contentSizes[i];
        const contentType = contentTypes[i];
        const content = TestDataGenerator.generateBlossomContent(size, contentType);

        const storeResult = await benchmark.run(
          `Store ${size}B Content`,
          async () => {
            await cache.setContent(content);
          },
          10
        );

        const retrieveResult = await benchmark.run(
          `Retrieve ${size}B Content`,
          async () => {
            await cache.getContent(content.hash);
          },
          20
        );

        console.log(`Blossom Content ${size}B:`);
        console.log(`  Store: ${storeResult.avgTime.toFixed(2)}ms`);
        console.log(`  Retrieve: ${retrieveResult.avgTime.toFixed(2)}ms`);

        expect(storeResult.avgTime).toBeLessThan(500); // Under 500ms
        expect(retrieveResult.avgTime).toBeLessThan(100); // Under 100ms
      }
    });

    it('should handle content compression efficiently', async () => {
      const largeContent = TestDataGenerator.generateBlossomContent(
        50 * 1024, // 50KB
        'application/json'
      );

      // Store with compression
      timer.start();
      await cache.setContent(largeContent);
      const storeTime = timer.stop();

      // Retrieve and verify
      timer.start();
      const retrieved = await cache.getContent(largeContent.hash);
      const retrieveTime = timer.stop();

      const health = await cache.getHealth();

      console.log(`Blossom Content Compression:`);
      console.log(`  Store time: ${storeTime.toFixed(2)}ms`);
      console.log(`  Retrieve time: ${retrieveTime.toFixed(2)}ms`);
      console.log(`  Compression ratio: ${health.compressionRatio.toFixed(2)}`);
      console.log(`  Memory usage: ${(health.memoryUsage / 1024).toFixed(2)}KB`);

      expect(retrieved).toBeTruthy();
      expect(retrieved!.hash).toBe(largeContent.hash);
      expect(storeTime).toBeLessThan(200);
      expect(retrieveTime).toBeLessThan(100);
    });
  });

  describe('Cache Invalidation Performance', () => {
    let memoryCache: MemoryCache<any>;
    let indexedDBCache: IndexedDBCache;
    let invalidationManager: CacheInvalidationManager;

    beforeEach(async () => {
      memoryCache = new MemoryCache({ maxEntries: 1000 });
      indexedDBCache = new IndexedDBCache({
        dbName: 'test-invalidation-db',
        version: 1,
        storeName: 'test'
      });

      invalidationManager = createNSMInvalidationManager({
        memory: memoryCache,
        indexedDB: indexedDBCache
      });

      // Populate caches
      for (let i = 0; i < 100; i++) {
        const key = `test-key-${i}`;
        const value = { id: i, data: `data-${i}` };

        memoryCache.set(key, value);
        await indexedDBCache.set(key, value);
      }
    });

    afterEach(() => {
      invalidationManager.destroy();
      memoryCache.destroy();
      indexedDBCache.close();
    });

    it('should efficiently invalidate individual keys', async () => {
      const keysToInvalidate = ['test-key-0', 'test-key-50', 'test-key-99'];

      const invalidationResult = await benchmark.run(
        'Key Invalidation',
        async () => {
          for (const key of keysToInvalidate) {
            await invalidationManager.invalidateKey(key);
          }
        },
        10
      );

      const metrics = invalidationManager.getMetrics();

      console.log(`Cache Invalidation Performance:`);
      console.log(`  Key invalidation: ${invalidationResult.avgTime.toFixed(2)}ms for ${keysToInvalidate.length} keys`);
      console.log(`  Success rate: ${(metrics.successfulInvalidations / metrics.totalInvalidations * 100).toFixed(1)}%`);
      console.log(`  Avg invalidation time: ${metrics.averageInvalidationTime.toFixed(2)}ms`);

      // Verify invalidation
      for (const key of keysToInvalidate) {
        expect(memoryCache.has(key)).toBe(false);
        expect(await indexedDBCache.get(key)).toBeNull();
      }

      expect(invalidationResult.avgTime).toBeLessThan(100); // Under 100ms
      expect(metrics.successfulInvalidations).toBeGreaterThan(0);
    });

    it('should handle pattern-based invalidation efficiently', async () => {
      const pattern = /test-key-[5-9]/; // Matches test-key-5 through test-key-9

      const patternResult = await benchmark.run(
        'Pattern Invalidation',
        async () => {
          await invalidationManager.invalidatePattern(pattern);
        },
        5
      );

      console.log(`Pattern Invalidation:`);
      console.log(`  Pattern invalidation: ${patternResult.avgTime.toFixed(2)}ms`);

      expect(patternResult.avgTime).toBeLessThan(500); // Under 500ms
    });

    it('should efficiently clear all caches', async () => {
      const clearResult = await benchmark.run(
        'Clear All Caches',
        async () => {
          await invalidationManager.clearAllCaches();
        },
        3
      );

      console.log(`Clear All Caches:`);
      console.log(`  Clear time: ${clearResult.avgTime.toFixed(2)}ms`);

      // Verify all caches are cleared
      expect(memoryCache.getStats().entries).toBe(0);

      const dbStats = await indexedDBCache.getStats();
      expect(dbStats.totalEntries).toBe(0);

      expect(clearResult.avgTime).toBeLessThan(1000); // Under 1 second
    });
  });

  describe('Integrated Cache System Performance', () => {
    it('should handle mixed workload efficiently', async () => {
      const memoryCache = new MemoryCache({ maxEntries: 500 });
      const indexedDBCache = new IndexedDBCache({
        dbName: 'test-mixed-workload',
        version: 1,
        storeName: 'mixed'
      });
      const nostrCache = new NostrEventCache();
      const blossomCache = new BlossomContentCache();
      const invalidationManager = createNSMInvalidationManager({
        memory: memoryCache,
        indexedDB: indexedDBCache,
        nostrEvents: nostrCache,
        blossomContent: blossomCache
      });

      // Generate mixed test data
      const events = TestDataGenerator.generateNostrEvents(50);
      const contents = Array.from({ length: 20 }, (_, i) =>
        TestDataGenerator.generateBlossomContent(5 * 1024, 'application/json')
      );

      // Mixed workload simulation
      const workloadResult = await benchmark.run(
        'Mixed Cache Workload',
        async () => {
          // Store events
          for (const event of events.slice(0, 10)) {
            await nostrCache.setEvent(event);
          }

          // Store content
          for (const content of contents.slice(0, 5)) {
            await blossomCache.setContent(content);
          }

          // Query events
          await nostrCache.queryEvents({ kinds: [1], limit: 5 });

          // Query content
          await blossomCache.queryContent({ limit: 3 });

          // Invalidate some items
          await invalidationManager.invalidateKey(events[0].id);
          await invalidationManager.invalidateKey(contents[0].hash);

          // Store more data
          for (const event of events.slice(10, 15)) {
            await nostrCache.setEvent(event);
          }
        },
        3
      );

      console.log(`Mixed Workload Performance:`);
      console.log(`  Total time: ${workloadResult.avgTime.toFixed(2)}ms`);
      console.log(`  Throughput: ${workloadResult.throughputPerSecond.toFixed(0)} ops/sec`);

      // Cleanup
      invalidationManager.destroy();
      memoryCache.destroy();
      indexedDBCache.close();
      nostrCache.destroy();
      blossomCache.destroy();

      expect(workloadResult.avgTime).toBeLessThan(5000); // Under 5 seconds
    });
  });
});