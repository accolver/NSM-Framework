/**
 * State Machine Performance Tests
 * Tests performance characteristics of NSM state machine operations
 * Following TDD approach with performance-specific assertions
 */

import { describe, it, expect, beforeEach, beforeAll } from 'bun:test';
import { NSMStateMachine } from '../../packages/nsm-client/src/state-machine';
import {
  Benchmark,
  LoadTester,
  PerformanceAssertions,
  TestDataGenerator,
  MemoryMonitor,
  PerformanceTimer,
  type LoadTestOptions
} from './performance-utils';

describe('State Machine Performance Tests', () => {
  let stateMachine: NSMStateMachine;
  let benchmark: Benchmark;
  let memoryMonitor: MemoryMonitor;

  beforeAll(() => {
    // Enable garbage collection for memory tests
    if (global.gc) {
      global.gc();
    }
  });

  beforeEach(() => {
    stateMachine = new NSMStateMachine();
    benchmark = new Benchmark();
    memoryMonitor = new MemoryMonitor();
  });

  describe('State Machine Creation Performance', () => {
    it('should create simple state machines within performance thresholds', async () => {
      const simpleMachine = TestDataGenerator.generateStateMachine(5);

      const result = await benchmark.run(
        'Simple State Machine Creation',
        () => stateMachine.loadMachine(simpleMachine),
        1000
      );

      // Performance assertions - TDD approach
      PerformanceAssertions.assertExecutionTime(result.avgTime, 1, 'State machine creation');
      PerformanceAssertions.assertThroughput(result.throughputPerSecond, 1000, 'State machine creation');
      PerformanceAssertions.assertMemoryUsage(result.memoryMetrics.heapUsed, 50 * 1024 * 1024, 'State machine creation');

      expect(result.iterations).toBe(1000);
      expect(result.avgTime).toBeLessThan(1); // Less than 1ms average
      expect(result.standardDeviation).toBeLessThan(result.avgTime); // Consistent performance
    });

    it('should create complex state machines efficiently', async () => {
      const complexMachine = TestDataGenerator.generateStateMachine(50);

      const result = await benchmark.run(
        'Complex State Machine Creation',
        () => stateMachine.loadMachine(complexMachine),
        500
      );

      // Complex machines should still be fast
      PerformanceAssertions.assertExecutionTime(result.avgTime, 5, 'Complex state machine creation');
      PerformanceAssertions.assertThroughput(result.throughputPerSecond, 200, 'Complex state machine creation');

      expect(result.avgTime).toBeLessThan(5); // Less than 5ms average
      expect(result.maxTime).toBeLessThan(20); // No single operation over 20ms
    });

    it('should handle large state machines with performance degradation limits', async () => {
      const largeMachine = TestDataGenerator.generateStateMachine(200);

      const result = await benchmark.run(
        'Large State Machine Creation',
        () => stateMachine.loadMachine(largeMachine),
        100
      );

      // Larger machines can be slower but within limits
      PerformanceAssertions.assertExecutionTime(result.avgTime, 20, 'Large state machine creation');
      PerformanceAssertions.assertThroughput(result.throughputPerSecond, 50, 'Large state machine creation');

      expect(result.avgTime).toBeLessThan(20); // Less than 20ms average
      expect(result.maxTime).toBeLessThan(100); // No single operation over 100ms
    });
  });

  describe('State Machine Interpretation Performance', () => {
    it('should start interpreters quickly', async () => {
      const testMachine = TestDataGenerator.generateStateMachine(10);
      const machine = stateMachine.loadMachine(testMachine);

      const result = await benchmark.run(
        'State Machine Interpretation Start',
        () => {
          const interpreter = stateMachine.interpret(machine);
          interpreter.stop();
          return interpreter;
        },
        1000
      );

      PerformanceAssertions.assertExecutionTime(result.avgTime, 2, 'Interpreter start');
      PerformanceAssertions.assertThroughput(result.throughputPerSecond, 500, 'Interpreter start');

      expect(result.avgTime).toBeLessThan(2);
    });

    it('should handle state transitions efficiently', async () => {
      const toggleMachine = {
        id: 'toggle-perf',
        initial: 'off',
        states: {
          off: { on: { TOGGLE: 'on' } },
          on: { on: { TOGGLE: 'off' } }
        }
      };

      const machine = stateMachine.loadMachine(toggleMachine);
      const interpreter = stateMachine.interpret(machine);
      interpreter.start();

      const result = await benchmark.run(
        'State Transitions',
        () => {
          interpreter.send({ type: 'TOGGLE' });
          return interpreter.getSnapshot();
        },
        2000
      );

      interpreter.stop();

      PerformanceAssertions.assertExecutionTime(result.avgTime, 0.5, 'State transitions');
      PerformanceAssertions.assertThroughput(result.throughputPerSecond, 2000, 'State transitions');

      expect(result.avgTime).toBeLessThan(0.5); // Very fast transitions
      expect(result.throughputPerSecond).toBeGreaterThan(2000);
    });

    it('should serialize state efficiently', async () => {
      const testMachine = TestDataGenerator.generateStateMachine(20);
      const machine = stateMachine.loadMachine(testMachine);
      const interpreter = stateMachine.interpret(machine);
      interpreter.start();

      const result = await benchmark.run(
        'State Serialization',
        () => stateMachine.serializeState(interpreter),
        1000
      );

      interpreter.stop();

      PerformanceAssertions.assertExecutionTime(result.avgTime, 1, 'State serialization');
      PerformanceAssertions.assertThroughput(result.throughputPerSecond, 1000, 'State serialization');

      expect(result.avgTime).toBeLessThan(1);
    });
  });

  describe('Memory Performance Tests', () => {
    it('should not leak memory during repeated state machine creation', async () => {
      memoryMonitor.reset();
      const initialMemory = memoryMonitor.takeSnapshot();

      // Create and destroy many state machines
      for (let i = 0; i < 1000; i++) {
        const testMachine = TestDataGenerator.generateStateMachine(10);
        const machine = stateMachine.loadMachine(testMachine);
        const interpreter = stateMachine.interpret(machine);
        interpreter.start();
        interpreter.stop();

        if (i % 100 === 0) {
          memoryMonitor.takeSnapshot();
          if (global.gc) {
            global.gc();
          }
        }
      }

      const finalMemory = memoryMonitor.takeSnapshot();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory growth should be minimal (less than 10MB)
      PerformanceAssertions.assertMemoryUsage(memoryGrowth, 10 * 1024 * 1024, 'Repeated state machine creation');
      PerformanceAssertions.assertNoMemoryLeak(memoryMonitor.detectMemoryLeak(20 * 1024 * 1024), 'State machine lifecycle');

      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // Less than 10MB growth
    });

    it('should handle large context data efficiently', async () => {
      const largeContext = TestDataGenerator.generateLargeContext(500); // 500KB context
      const testMachine = {
        id: 'large-context',
        initial: 'idle',
        context: largeContext,
        states: {
          idle: { on: { START: 'running' } },
          running: { on: { STOP: 'idle' } }
        }
      };

      const timer = new PerformanceTimer();
      timer.start();

      const machine = stateMachine.loadMachine(testMachine);
      const interpreter = stateMachine.interpret(machine);
      interpreter.start();

      // Perform multiple state transitions
      for (let i = 0; i < 100; i++) {
        interpreter.send({ type: 'START' });
        interpreter.send({ type: 'STOP' });
      }

      const elapsed = timer.stop();
      interpreter.stop();

      // Should handle large context within reasonable time
      PerformanceAssertions.assertExecutionTime(elapsed, 100, 'Large context handling');
      expect(elapsed).toBeLessThan(100); // Less than 100ms for 100 transitions
    });
  });

  describe('Concurrent State Machine Performance', () => {
    it('should handle multiple concurrent state machines', async () => {
      const loadTester = new LoadTester();
      const testMachine = TestDataGenerator.generateStateMachine(5);

      const loadTestOptions: LoadTestOptions = {
        concurrency: 10,
        duration: 5000, // 5 seconds
        warmupTime: 1000,
        maxMemoryUsage: 100 * 1024 * 1024 // 100MB
      };

      const result = await loadTester.run(async () => {
        const machine = stateMachine.loadMachine(testMachine);
        const interpreter = stateMachine.interpret(machine);
        interpreter.start();

        // Perform some state transitions
        interpreter.send({ type: 'TOGGLE' });
        const snapshot = stateMachine.serializeState(interpreter);

        interpreter.stop();
        return snapshot;
      }, loadTestOptions);

      // Load test assertions
      PerformanceAssertions.assertThroughput(result.throughputPerSecond, 100, 'Concurrent state machines');
      PerformanceAssertions.assertErrorRate(result.errorRate, 0.01, 'Concurrent state machines'); // Less than 1% error rate
      PerformanceAssertions.assertMemoryUsage(result.memoryPeak, 100 * 1024 * 1024, 'Concurrent state machines');
      PerformanceAssertions.assertNoMemoryLeak(result.memoryLeakDetected, 'Concurrent state machines');

      expect(result.successfulOperations).toBeGreaterThan(500); // Should complete many operations
      expect(result.errorRate).toBeLessThan(0.01); // Less than 1% error rate
      expect(result.averageLatency).toBeLessThan(50); // Less than 50ms average latency
    });

    it('should scale state transitions under load', async () => {
      const simpleMachine = {
        id: 'transition-load',
        initial: 'state1',
        states: {
          state1: { on: { NEXT: 'state2' } },
          state2: { on: { NEXT: 'state3' } },
          state3: { on: { NEXT: 'state1' } }
        }
      };

      const machine = stateMachine.loadMachine(simpleMachine);
      const interpreters: any[] = [];

      // Create multiple interpreters
      for (let i = 0; i < 20; i++) {
        const interpreter = stateMachine.interpret(machine);
        interpreter.start();
        interpreters.push(interpreter);
      }

      const loadTester = new LoadTester();
      const result = await loadTester.run(async () => {
        const interpreter = interpreters[Math.floor(Math.random() * interpreters.length)];
        interpreter.send({ type: 'NEXT' });
        return interpreter.getSnapshot();
      }, {
        concurrency: 50,
        duration: 3000,
        warmupTime: 500
      });

      // Cleanup
      interpreters.forEach(interpreter => interpreter.stop());

      PerformanceAssertions.assertThroughput(result.throughputPerSecond, 1000, 'Transition scaling');
      PerformanceAssertions.assertErrorRate(result.errorRate, 0.005, 'Transition scaling');

      expect(result.throughputPerSecond).toBeGreaterThan(1000);
      expect(result.p95Latency).toBeLessThan(10); // 95th percentile under 10ms
    });
  });

  describe('Security Performance Tests', () => {
    it('should validate machine security efficiently', async () => {
      const safeMachine = TestDataGenerator.generateStateMachine(30);

      const result = await benchmark.run(
        'Security Validation',
        () => stateMachine.loadMachine(safeMachine),
        500
      );

      // Security validation should not significantly impact performance
      PerformanceAssertions.assertExecutionTime(result.avgTime, 10, 'Security validation');
      expect(result.avgTime).toBeLessThan(10);
    });

    it('should reject unsafe machines quickly', async () => {
      const unsafeMachine = {
        id: 'unsafe',
        initial: 'idle',
        states: {
          idle: {
            entry: 'eval("malicious code")'
          }
        }
      };

      const timer = new PerformanceTimer();
      timer.start();

      try {
        stateMachine.loadMachine(unsafeMachine);
        throw new Error('Should have rejected unsafe machine');
      } catch (error) {
        const elapsed = timer.stop();

        // Should reject quickly
        PerformanceAssertions.assertExecutionTime(elapsed, 5, 'Unsafe machine rejection');
        expect(elapsed).toBeLessThan(5);
        expect((error as Error).message).toContain('Unsafe machine definition');
      }
    });
  });

  describe('Performance Regression Tests', () => {
    it('should maintain baseline performance metrics', async () => {
      // Define baseline performance expectations
      const baselines = {
        simpleCreation: { maxTime: 1, minThroughput: 1000 },
        complexCreation: { maxTime: 5, minThroughput: 200 },
        stateTransition: { maxTime: 0.5, minThroughput: 2000 },
        serialization: { maxTime: 1, minThroughput: 1000 }
      };

      // Test simple creation baseline
      const simpleMachine = TestDataGenerator.generateStateMachine(5);
      const simpleResult = await benchmark.run(
        'Baseline Simple Creation',
        () => stateMachine.loadMachine(simpleMachine),
        100
      );

      PerformanceAssertions.assertExecutionTime(simpleResult.avgTime, baselines.simpleCreation.maxTime, 'Baseline simple creation');
      PerformanceAssertions.assertThroughput(simpleResult.throughputPerSecond, baselines.simpleCreation.minThroughput, 'Baseline simple creation');

      // Test complex creation baseline
      const complexMachine = TestDataGenerator.generateStateMachine(50);
      const complexResult = await benchmark.run(
        'Baseline Complex Creation',
        () => stateMachine.loadMachine(complexMachine),
        100
      );

      PerformanceAssertions.assertExecutionTime(complexResult.avgTime, baselines.complexCreation.maxTime, 'Baseline complex creation');
      PerformanceAssertions.assertThroughput(complexResult.throughputPerSecond, baselines.complexCreation.minThroughput, 'Baseline complex creation');

      expect(simpleResult.avgTime).toBeLessThan(baselines.simpleCreation.maxTime);
      expect(complexResult.avgTime).toBeLessThan(baselines.complexCreation.maxTime);
    });
  });
});