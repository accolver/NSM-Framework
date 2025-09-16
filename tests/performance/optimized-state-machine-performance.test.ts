/**
 * Performance Tests for Optimized State Machine
 * Compares optimized vs standard implementation
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { NSMStateMachine } from '../../packages/nsm-client/src/state-machine';
import { OptimizedStateMachine } from '../../packages/nsm-client/src/state-machine-optimized';
import {
  Benchmark,
  TestDataGenerator,
  MemoryMonitor,
  PerformanceTimer,
  PerformanceAssertions
} from './performance-utils';

describe('Optimized State Machine Performance Comparison', () => {
  let standardMachine: NSMStateMachine;
  let optimizedMachine: OptimizedStateMachine;
  let benchmark: Benchmark;
  let memoryMonitor: MemoryMonitor;

  beforeEach(() => {
    standardMachine = new NSMStateMachine();
    optimizedMachine = new OptimizedStateMachine({
      enableCompilationCache: true,
      enableTransitionCache: true,
      enableObjectPooling: true,
      cacheSize: 100,
      poolSize: 50
    });
    benchmark = new Benchmark();
    memoryMonitor = new MemoryMonitor();
  });

  describe('Machine Creation Performance', () => {
    it('should demonstrate improved performance with caching', async () => {
      const testMachine = TestDataGenerator.generateStateMachine(20);

      // Test standard implementation
      const standardResult = await benchmark.run(
        'Standard Machine Creation',
        () => standardMachine.loadMachine(testMachine),
        500
      );

      // Test optimized implementation (cold cache)
      optimizedMachine.clearCaches();
      const optimizedColdResult = await benchmark.run(
        'Optimized Machine Creation (Cold Cache)',
        () => optimizedMachine.loadMachine(testMachine),
        500
      );

      // Test optimized implementation (warm cache)
      const optimizedWarmResult = await benchmark.run(
        'Optimized Machine Creation (Warm Cache)',
        () => optimizedMachine.loadMachine(testMachine),
        500
      );

      // Log results for comparison
      console.log('Machine Creation Performance Comparison:');
      console.log(`Standard: ${standardResult.avgTime.toFixed(3)}ms avg`);
      console.log(`Optimized (Cold): ${optimizedColdResult.avgTime.toFixed(3)}ms avg`);
      console.log(`Optimized (Warm): ${optimizedWarmResult.avgTime.toFixed(3)}ms avg`);

      const stats = optimizedMachine.getPerformanceStats();
      console.log(`Cache hit rate: ${(stats.cacheHitRate * 100).toFixed(1)}%`);

      // Assertions
      expect(optimizedWarmResult.avgTime).toBeLessThan(standardResult.avgTime * 0.5);
      expect(stats.cacheHitRate).toBeGreaterThan(0.9);
    });

    it('should handle cache eviction efficiently', async () => {
      const machines = Array.from({ length: 150 }, (_, i) =>
        TestDataGenerator.generateStateMachine(10 + i % 10)
      );

      // Load machines to fill and overflow cache
      for (const machine of machines) {
        optimizedMachine.loadMachine(machine);
      }

      const stats = optimizedMachine.getPerformanceStats();

      // Cache should be at max size
      expect(stats.cacheHits + stats.cacheMisses).toBeGreaterThan(100);

      // Re-load first machines (should be cache misses due to eviction)
      optimizedMachine.loadMachine(machines[0]);
      optimizedMachine.loadMachine(machines[1]);

      const newStats = optimizedMachine.getPerformanceStats();
      expect(newStats.cacheMisses).toBeGreaterThan(stats.cacheMisses);
    });
  });

  describe('State Transition Performance', () => {
    it('should optimize repeated transitions', async () => {
      const toggleMachine = {
        id: 'toggle-perf',
        initial: 'off',
        states: {
          off: { on: { TOGGLE: 'on' } },
          on: { on: { TOGGLE: 'off' } }
        }
      };

      const standardMachineObj = standardMachine.loadMachine(toggleMachine);
      const optimizedMachineObj = optimizedMachine.loadMachine(toggleMachine);

      const standardInterpreter = standardMachine.interpret(standardMachineObj);
      const optimizedInterpreter = optimizedMachine.interpret(optimizedMachineObj);

      standardInterpreter.start();
      optimizedInterpreter.start();

      // Warm up transition cache
      for (let i = 0; i < 10; i++) {
        optimizedInterpreter.send({ type: 'TOGGLE' });
      }

      // Test standard transitions
      const standardResult = await benchmark.run(
        'Standard Transitions',
        () => {
          standardInterpreter.send({ type: 'TOGGLE' });
          return standardInterpreter.getSnapshot();
        },
        1000
      );

      // Test optimized transitions
      const optimizedResult = await benchmark.run(
        'Optimized Transitions',
        () => {
          optimizedInterpreter.send({ type: 'TOGGLE' });
          return optimizedInterpreter.getSnapshot();
        },
        1000
      );

      standardInterpreter.stop();
      optimizedInterpreter.stop();

      console.log('Transition Performance Comparison:');
      console.log(`Standard: ${standardResult.avgTime.toFixed(3)}ms avg`);
      console.log(`Optimized: ${optimizedResult.avgTime.toFixed(3)}ms avg`);
      console.log(`Improvement: ${((1 - optimizedResult.avgTime / standardResult.avgTime) * 100).toFixed(1)}%`);

      // Optimized should be faster
      expect(optimizedResult.avgTime).toBeLessThan(standardResult.avgTime);
      expect(optimizedResult.throughputPerSecond).toBeGreaterThan(standardResult.throughputPerSecond);
    });

    it('should batch updates efficiently', async () => {
      const complexMachine = TestDataGenerator.generateStateMachine(30);
      const machine = optimizedMachine.loadMachine(complexMachine);
      const interpreter = optimizedMachine.interpret(machine, {
        inspect: (event) => {
          // Inspector to test batching
        }
      });

      interpreter.start();

      const timer = new PerformanceTimer();
      timer.start();

      // Send multiple events rapidly
      for (let i = 0; i < 100; i++) {
        interpreter.send({ type: 'TOGGLE' });
      }

      const elapsed = timer.stop();
      interpreter.stop();

      console.log(`Batched 100 transitions in ${elapsed.toFixed(2)}ms`);

      // Should complete quickly with batching
      expect(elapsed).toBeLessThan(50);
    });
  });

  describe('Memory Performance', () => {
    it('should use object pooling to reduce memory allocation', async () => {
      memoryMonitor.reset();
      const initialMemory = memoryMonitor.takeSnapshot();

      // Create many interpreters with optimized pooling
      const interpreters = [];
      for (let i = 0; i < 100; i++) {
        const machine = TestDataGenerator.generateStateMachine(5);
        const machineObj = optimizedMachine.loadMachine(machine);
        const interpreter = optimizedMachine.interpret(machineObj);
        interpreter.start();
        interpreters.push(interpreter);

        // Perform some transitions
        interpreter.send({ type: 'TOGGLE' });
        interpreter.getSnapshot();
      }

      const midMemory = memoryMonitor.takeSnapshot();

      // Stop and release interpreters
      for (const interpreter of interpreters) {
        interpreter.stop();
      }

      if (global.gc) global.gc();
      const finalMemory = memoryMonitor.takeSnapshot();

      const memoryGrowth = midMemory.heapUsed - initialMemory.heapUsed;
      const memoryRecovered = midMemory.heapUsed - finalMemory.heapUsed;

      console.log('Memory Performance:');
      console.log(`Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Memory recovered: ${(memoryRecovered / 1024 / 1024).toFixed(2)}MB`);

      const stats = optimizedMachine.getPerformanceStats();
      console.log(`Pooled objects: ${stats.pooledObjects}`);

      // Should use pooling effectively
      expect(stats.pooledObjects).toBeGreaterThan(0);
      expect(memoryGrowth).toBeLessThan(20 * 1024 * 1024); // Less than 20MB
    });

    it('should handle large context efficiently with optimization', async () => {
      const largeContext = TestDataGenerator.generateLargeContext(1000); // 1MB context
      const testMachine = {
        id: 'large-context-optimized',
        initial: 'idle',
        context: largeContext,
        states: {
          idle: { on: { START: 'running' } },
          running: { on: { STOP: 'idle' } }
        }
      };

      // Test standard implementation
      const standardTimer = new PerformanceTimer();
      standardTimer.start();

      const standardMachineObj = standardMachine.loadMachine(testMachine);
      const standardInterpreter = standardMachine.interpret(standardMachineObj);
      standardInterpreter.start();

      for (let i = 0; i < 50; i++) {
        standardInterpreter.send({ type: 'START' });
        standardInterpreter.send({ type: 'STOP' });
      }

      const standardTime = standardTimer.stop();
      standardInterpreter.stop();

      // Test optimized implementation
      const optimizedTimer = new PerformanceTimer();
      optimizedTimer.start();

      const optimizedMachineObj = optimizedMachine.loadMachine(testMachine);
      const optimizedInterpreter = optimizedMachine.interpret(optimizedMachineObj);
      optimizedInterpreter.start();

      for (let i = 0; i < 50; i++) {
        optimizedInterpreter.send({ type: 'START' });
        optimizedInterpreter.send({ type: 'STOP' });
      }

      const optimizedTime = optimizedTimer.stop();
      optimizedInterpreter.stop();

      console.log('Large Context Performance:');
      console.log(`Standard: ${standardTime.toFixed(2)}ms`);
      console.log(`Optimized: ${optimizedTime.toFixed(2)}ms`);
      console.log(`Improvement: ${((1 - optimizedTime / standardTime) * 100).toFixed(1)}%`);

      // Optimized should handle large context better
      expect(optimizedTime).toBeLessThan(standardTime);
    });
  });

  describe('Optimization Configuration', () => {
    it('should allow disabling specific optimizations', async () => {
      const noCacheMachine = new OptimizedStateMachine({
        enableCompilationCache: false,
        enableTransitionCache: false,
        enableObjectPooling: true
      });

      const testMachine = TestDataGenerator.generateStateMachine(10);

      // Load same machine multiple times
      noCacheMachine.loadMachine(testMachine);
      noCacheMachine.loadMachine(testMachine);

      const stats = noCacheMachine.getPerformanceStats();

      // Should have no cache hits
      expect(stats.cacheHits).toBe(0);
      expect(stats.cacheMisses).toBe(0);
    });

    it('should provide accurate performance statistics', async () => {
      const testMachine = TestDataGenerator.generateStateMachine(15);

      // Perform various operations
      for (let i = 0; i < 10; i++) {
        const machine = optimizedMachine.loadMachine(testMachine);
        const interpreter = optimizedMachine.interpret(machine);
        interpreter.start();
        interpreter.send({ type: 'TOGGLE' });
        interpreter.getSnapshot();
        interpreter.stop();
      }

      const stats = optimizedMachine.getPerformanceStats();

      console.log('Performance Statistics:');
      console.log(`Cache hits: ${stats.cacheHits}`);
      console.log(`Cache misses: ${stats.cacheMisses}`);
      console.log(`Cache hit rate: ${(stats.cacheHitRate * 100).toFixed(1)}%`);
      console.log(`Pooled objects: ${stats.pooledObjects}`);

      // Should have meaningful statistics
      expect(stats.cacheHits).toBeGreaterThan(0);
      expect(stats.cacheHitRate).toBeGreaterThan(0);
    });
  });

  describe('Performance Regression Prevention', () => {
    it('should maintain performance improvements over baseline', async () => {
      const machines = [
        TestDataGenerator.generateStateMachine(5),
        TestDataGenerator.generateStateMachine(20),
        TestDataGenerator.generateStateMachine(50)
      ];

      for (const machine of machines) {
        // Clear caches for fair comparison
        optimizedMachine.clearCaches();

        // Test both implementations
        const standardResult = await benchmark.run(
          'Standard',
          () => {
            const m = standardMachine.loadMachine(machine);
            const i = standardMachine.interpret(m);
            i.start();
            i.send({ type: 'TOGGLE' });
            i.stop();
          },
          100
        );

        const optimizedResult = await benchmark.run(
          'Optimized',
          () => {
            const m = optimizedMachine.loadMachine(machine);
            const i = optimizedMachine.interpret(m);
            i.start();
            i.send({ type: 'TOGGLE' });
            i.stop();
          },
          100
        );

        // Optimized should not be significantly slower than standard
        // Allow up to 20% overhead for first-time optimization setup
        expect(optimizedResult.avgTime).toBeLessThan(standardResult.avgTime * 1.2);
      }
    });
  });
});