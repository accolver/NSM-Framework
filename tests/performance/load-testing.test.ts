/**
 * Load Testing Scenarios for NSM Framework
 * Tests high-usage patterns, scalability limits, and stress scenarios
 * Following TDD approach with comprehensive load testing
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'bun:test';
import { NSMStateMachine } from '../../packages/nsm-client/src/state-machine';
import { NSMClient } from '../../packages/nsm-client/src/nsm-client';
import {
  Benchmark,
  LoadTester,
  PerformanceAssertions,
  TestDataGenerator,
  MemoryMonitor,
  PerformanceTimer,
  type LoadTestOptions,
  type LoadTestResult
} from './performance-utils';
import { NSMDefinition } from '../../packages/nsm-core/src/types';

// Simulated client pool for load testing
class LoadTestClientPool {
  private clients: Map<string, NSMStateMachine> = new Map();
  private activeInstances: Map<string, any> = new Map();
  private memoryMonitor = new MemoryMonitor();

  constructor(private poolSize: number = 100) {
    this.initializePool();
  }

  private initializePool(): void {
    for (let i = 0; i < this.poolSize; i++) {
      const clientId = `client_${i}`;
      this.clients.set(clientId, new NSMStateMachine());
    }
  }

  getClient(clientId?: string): NSMStateMachine {
    if (clientId && this.clients.has(clientId)) {
      return this.clients.get(clientId)!;
    }

    // Get random client
    const clientIds = Array.from(this.clients.keys());
    const randomId = clientIds[Math.floor(Math.random() * clientIds.length)];
    return this.clients.get(randomId)!;
  }

  createInstance(machineDefinition: any, clientId?: string): { client: NSMStateMachine; interpreter: any; instanceId: string } {
    const client = this.getClient(clientId);
    const machine = client.loadMachine(machineDefinition);
    const interpreter = client.interpret(machine);
    interpreter.start();

    const instanceId = `instance_${Date.now()}_${Math.random()}`;
    this.activeInstances.set(instanceId, { client, interpreter });

    return { client, interpreter, instanceId };
  }

  stopInstance(instanceId: string): void {
    const instance = this.activeInstances.get(instanceId);
    if (instance) {
      instance.interpreter.stop();
      this.activeInstances.delete(instanceId);
    }
  }

  stopAllInstances(): void {
    this.activeInstances.forEach((instance, instanceId) => {
      instance.interpreter.stop();
    });
    this.activeInstances.clear();
  }

  getActiveInstanceCount(): number {
    return this.activeInstances.size;
  }

  getMemoryUsage(): NodeJS.MemoryUsage {
    return this.memoryMonitor.takeSnapshot();
  }

  getMemoryGrowth(): number {
    return this.memoryMonitor.getMemoryGrowth();
  }

  resetMemoryTracking(): void {
    this.memoryMonitor.reset();
  }
}

describe('Load Testing Scenarios', () => {
  let clientPool: LoadTestClientPool;
  let loadTester: LoadTester;
  let memoryMonitor: MemoryMonitor;

  beforeAll(() => {
    if (global.gc) {
      global.gc();
    }
  });

  beforeEach(() => {
    clientPool = new LoadTestClientPool(50);
    loadTester = new LoadTester();
    memoryMonitor = new MemoryMonitor();
    clientPool.resetMemoryTracking();
  });

  afterEach(() => {
    clientPool.stopAllInstances();
  });

  describe('High Concurrency Load Tests', () => {
    it('should handle thousands of concurrent state machines', async () => {
      const testMachine = TestDataGenerator.generateStateMachine(5);

      const loadTestOptions: LoadTestOptions = {
        concurrency: 100,
        duration: 10000, // 10 seconds
        warmupTime: 2000,
        maxMemoryUsage: 200 * 1024 * 1024 // 200MB
      };

      const result = await loadTester.run(async () => {
        const { interpreter, instanceId } = clientPool.createInstance(testMachine);

        // Perform some operations
        interpreter.send({ type: 'TOGGLE' });
        const snapshot = interpreter.getSnapshot();

        // Clean up 50% of instances to simulate realistic usage
        if (Math.random() > 0.5) {
          clientPool.stopInstance(instanceId);
        }

        return snapshot;
      }, loadTestOptions);

      // High concurrency assertions
      PerformanceAssertions.assertThroughput(result.throughputPerSecond, 50, 'High concurrency state machines');
      PerformanceAssertions.assertErrorRate(result.errorRate, 0.02, 'High concurrency state machines');
      PerformanceAssertions.assertMemoryUsage(result.memoryPeak, 200 * 1024 * 1024, 'High concurrency state machines');
      PerformanceAssertions.assertNoMemoryLeak(result.memoryLeakDetected, 'High concurrency state machines');

      expect(result.successfulOperations).toBeGreaterThan(500);
      expect(result.averageLatency).toBeLessThan(100);
      expect(result.p95Latency).toBeLessThan(200);
      expect(result.p99Latency).toBeLessThan(500);
    });

    it('should scale state transitions under extreme load', async () => {
      const complexMachine = {
        id: 'stress-test',
        initial: 'idle',
        states: {
          idle: { on: { START: 'processing' } },
          processing: {
            on: {
              PROCESS: 'processing',
              COMPLETE: 'completed',
              ERROR: 'error'
            }
          },
          completed: { on: { RESET: 'idle' } },
          error: { on: { RETRY: 'processing', RESET: 'idle' } }
        }
      };

      // Pre-create instances for stress testing
      const instances: { interpreter: any; instanceId: string }[] = [];
      for (let i = 0; i < 50; i++) {
        const { interpreter, instanceId } = clientPool.createInstance(complexMachine);
        instances.push({ interpreter, instanceId });
      }

      const loadTestOptions: LoadTestOptions = {
        concurrency: 200,
        duration: 15000, // 15 seconds
        warmupTime: 3000
      };

      const result = await loadTester.run(async () => {
        const instance = instances[Math.floor(Math.random() * instances.length)];
        const transitions = ['START', 'PROCESS', 'COMPLETE', 'RESET'];
        const transition = transitions[Math.floor(Math.random() * transitions.length)];

        instance.interpreter.send({ type: transition });
        return instance.interpreter.getSnapshot();
      }, loadTestOptions);

      // Cleanup
      instances.forEach(({ instanceId }) => clientPool.stopInstance(instanceId));

      PerformanceAssertions.assertThroughput(result.throughputPerSecond, 100, 'Extreme load transitions');
      PerformanceAssertions.assertErrorRate(result.errorRate, 0.01, 'Extreme load transitions');

      expect(result.throughputPerSecond).toBeGreaterThan(100);
      expect(result.p99Latency).toBeLessThan(100);
    });
  });

  describe('Memory Stress Tests', () => {
    it('should handle large context data under load', async () => {
      const largeContextMachine = {
        id: 'large-context-stress',
        initial: 'idle',
        context: TestDataGenerator.generateLargeContext(100), // 100KB context
        states: {
          idle: { on: { PROCESS: 'processing' } },
          processing: { on: { DONE: 'idle' } }
        }
      };

      const loadTestOptions: LoadTestOptions = {
        concurrency: 50,
        duration: 8000,
        warmupTime: 2000,
        maxMemoryUsage: 500 * 1024 * 1024 // 500MB limit
      };

      const result = await loadTester.run(async () => {
        const { interpreter, instanceId } = clientPool.createInstance(largeContextMachine);

        // Update context with more data
        const newContext = { ...TestDataGenerator.generateLargeContext(50) };
        interpreter.send({ type: 'PROCESS', data: newContext });

        const snapshot = interpreter.getSnapshot();

        // Clean up to prevent memory accumulation
        clientPool.stopInstance(instanceId);

        return snapshot;
      }, loadTestOptions);

      PerformanceAssertions.assertThroughput(result.throughputPerSecond, 25, 'Large context stress test');
      PerformanceAssertions.assertMemoryUsage(result.memoryPeak, 500 * 1024 * 1024, 'Large context stress test');
      PerformanceAssertions.assertNoMemoryLeak(result.memoryLeakDetected, 'Large context stress test');

      expect(result.errorRate).toBeLessThan(0.05);
    });

    it('should handle memory pressure gracefully', async () => {
      const testMachine = TestDataGenerator.generateStateMachine(10);

      // Fill memory with instances
      const instances: string[] = [];
      const maxInstances = 1000;

      const timer = new PerformanceTimer();
      timer.start();

      for (let i = 0; i < maxInstances; i++) {
        try {
          const { instanceId } = clientPool.createInstance(testMachine);
          instances.push(instanceId);

          // Check memory usage every 100 instances
          if (i % 100 === 0) {
            const memUsage = clientPool.getMemoryUsage();
            if (memUsage.heapUsed > 400 * 1024 * 1024) { // 400MB limit
              break;
            }
          }
        } catch (error) {
          // Expected to fail under extreme memory pressure
          break;
        }
      }

      const elapsed = timer.stop();
      const finalMemory = clientPool.getMemoryUsage();

      // Should create many instances efficiently
      expect(instances.length).toBeGreaterThan(100);
      expect(elapsed).toBeLessThan(30000); // Should complete within 30 seconds
      expect(finalMemory.heapUsed).toBeLessThan(500 * 1024 * 1024); // Stay under 500MB

      // Cleanup
      instances.forEach(instanceId => clientPool.stopInstance(instanceId));
    });
  });

  describe('Rapid State Change Scenarios', () => {
    it('should handle rapid state transitions without degradation', async () => {
      const rapidMachine = {
        id: 'rapid-transitions',
        initial: 'state1',
        states: {
          state1: { on: { NEXT: 'state2' } },
          state2: { on: { NEXT: 'state3' } },
          state3: { on: { NEXT: 'state4' } },
          state4: { on: { NEXT: 'state1' } }
        }
      };

      const { interpreter, instanceId } = clientPool.createInstance(rapidMachine);

      const transitionsPerSecond = 1000;
      const testDuration = 5000; // 5 seconds
      const expectedTransitions = (transitionsPerSecond * testDuration) / 1000;

      let transitionCount = 0;
      const timer = new PerformanceTimer();
      timer.start();

      const rapidFireTest = setInterval(() => {
        interpreter.send({ type: 'NEXT' });
        transitionCount++;
      }, 1); // 1ms intervals = ~1000 transitions/second

      await new Promise(resolve => setTimeout(resolve, testDuration));
      clearInterval(rapidFireTest);

      const elapsed = timer.stop();
      clientPool.stopInstance(instanceId);

      const actualTps = (transitionCount / elapsed) * 1000;

      PerformanceAssertions.assertThroughput(actualTps, 500, 'Rapid state transitions');
      expect(transitionCount).toBeGreaterThan(expectedTransitions * 0.8); // At least 80% of target
      expect(actualTps).toBeGreaterThan(500);
    });

    it('should maintain performance with burst traffic patterns', async () => {
      const burstMachine = TestDataGenerator.generateStateMachine(8);
      const instances: { interpreter: any; instanceId: string }[] = [];

      // Create a pool of instances
      for (let i = 0; i < 20; i++) {
        const { interpreter, instanceId } = clientPool.createInstance(burstMachine);
        instances.push({ interpreter, instanceId });
      }

      // Simulate burst patterns: high activity followed by quiet periods
      const burstCount = 5;
      const burstDuration = 1000; // 1 second bursts
      const quietDuration = 500; // 500ms quiet periods

      const results: number[] = [];

      for (let burst = 0; burst < burstCount; burst++) {
        const timer = new PerformanceTimer();
        timer.start();

        // High activity burst
        const burstPromises = [];
        for (let i = 0; i < 100; i++) {
          const instance = instances[Math.floor(Math.random() * instances.length)];
          burstPromises.push(
            Promise.resolve().then(() => {
              instance.interpreter.send({ type: 'TOGGLE' });
              return instance.interpreter.getSnapshot();
            })
          );
        }

        await Promise.all(burstPromises);
        const burstTime = timer.stop();
        results.push(burstTime);

        // Quiet period
        await new Promise(resolve => setTimeout(resolve, quietDuration));
      }

      // Cleanup
      instances.forEach(({ instanceId }) => clientPool.stopInstance(instanceId));

      // Analyze burst performance
      const avgBurstTime = results.reduce((sum, time) => sum + time, 0) / results.length;
      const maxBurstTime = Math.max(...results);

      PerformanceAssertions.assertExecutionTime(avgBurstTime, 1000, 'Burst traffic average');
      PerformanceAssertions.assertExecutionTime(maxBurstTime, 2000, 'Burst traffic maximum');

      expect(avgBurstTime).toBeLessThan(1000);
      expect(maxBurstTime).toBeLessThan(2000);
    });
  });

  describe('Resource Exhaustion Tests', () => {
    it('should handle file descriptor limits gracefully', async () => {
      const testMachine = TestDataGenerator.generateStateMachine(3);
      const instances: string[] = [];

      let creationFailures = 0;
      const maxAttempts = 500;

      // Attempt to create many instances until resource limits
      for (let i = 0; i < maxAttempts; i++) {
        try {
          const { instanceId } = clientPool.createInstance(testMachine);
          instances.push(instanceId);
        } catch (error) {
          creationFailures++;
          if (creationFailures > 10) {
            break; // Stop if consistent failures
          }
        }
      }

      // Should create many instances before hitting limits
      expect(instances.length).toBeGreaterThan(50);
      expect(creationFailures / maxAttempts).toBeLessThan(0.1); // Less than 10% failure rate

      // Cleanup
      instances.forEach(instanceId => clientPool.stopInstance(instanceId));
    });

    it('should recover from temporary resource constraints', async () => {
      const testMachine = TestDataGenerator.generateStateMachine(5);

      // Fill up resources
      const instances: string[] = [];
      for (let i = 0; i < 200; i++) {
        const { instanceId } = clientPool.createInstance(testMachine);
        instances.push(instanceId);
      }

      const initialMemory = clientPool.getMemoryUsage();

      // Clean up half the instances (simulate resource recovery)
      const instancesToCleanup = instances.splice(0, Math.floor(instances.length / 2));
      instancesToCleanup.forEach(instanceId => clientPool.stopInstance(instanceId));

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      await new Promise(resolve => setTimeout(resolve, 1000)); // Allow cleanup

      const postCleanupMemory = clientPool.getMemoryUsage();

      // Create new instances to test recovery
      const newInstances: string[] = [];
      for (let i = 0; i < 100; i++) {
        const { instanceId } = clientPool.createInstance(testMachine);
        newInstances.push(instanceId);
      }

      // Should successfully create new instances after cleanup
      expect(newInstances.length).toBe(100);
      expect(postCleanupMemory.heapUsed).toBeLessThan(initialMemory.heapUsed);

      // Cleanup all
      [...instances, ...newInstances].forEach(instanceId => clientPool.stopInstance(instanceId));
    });
  });

  describe('Long-Running Performance Tests', () => {
    it('should maintain stable performance over extended periods', async () => {
      const testMachine = TestDataGenerator.generateStateMachine(10);
      const testDuration = 30000; // 30 seconds
      const sampleInterval = 5000; // 5 second intervals

      const performanceSamples: { throughput: number; latency: number; memory: number }[] = [];
      const instances: { interpreter: any; instanceId: string }[] = [];

      // Create baseline instances
      for (let i = 0; i < 20; i++) {
        const { interpreter, instanceId } = clientPool.createInstance(testMachine);
        instances.push({ interpreter, instanceId });
      }

      const startTime = Date.now();
      let operationCount = 0;
      let totalLatency = 0;

      // Long-running test with periodic sampling
      const testInterval = setInterval(() => {
        const timer = new PerformanceTimer();
        timer.start();

        // Perform batch operations
        for (let i = 0; i < 10; i++) {
          const instance = instances[Math.floor(Math.random() * instances.length)];
          instance.interpreter.send({ type: 'TOGGLE' });
          operationCount++;
        }

        const batchLatency = timer.stop();
        totalLatency += batchLatency;

        // Take performance sample every interval
        if ((Date.now() - startTime) % sampleInterval < 100) {
          const currentThroughput = (operationCount / (Date.now() - startTime)) * 1000;
          const avgLatency = totalLatency / operationCount;
          const memoryUsage = clientPool.getMemoryUsage().heapUsed;

          performanceSamples.push({
            throughput: currentThroughput,
            latency: avgLatency,
            memory: memoryUsage
          });
        }
      }, 100); // Every 100ms

      // Run for the test duration
      await new Promise(resolve => setTimeout(resolve, testDuration));
      clearInterval(testInterval);

      // Cleanup
      instances.forEach(({ instanceId }) => clientPool.stopInstance(instanceId));

      // Analyze performance stability
      expect(performanceSamples.length).toBeGreaterThan(3);

      const throughputs = performanceSamples.map(s => s.throughput);
      const latencies = performanceSamples.map(s => s.latency);
      const memories = performanceSamples.map(s => s.memory);

      const throughputVariance = this.calculateVariance(throughputs);
      const latencyVariance = this.calculateVariance(latencies);
      const memoryGrowth = Math.max(...memories) - Math.min(...memories);

      // Performance should remain stable
      expect(throughputVariance).toBeLessThan(Math.pow(throughputs[0] * 0.2, 2)); // Less than 20% variance
      expect(latencyVariance).toBeLessThan(Math.pow(latencies[0] * 0.3, 2)); // Less than 30% variance
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
    });
  });

  describe('Stress Recovery Tests', () => {
    it('should recover gracefully from stress conditions', async () => {
      const testMachine = TestDataGenerator.generateStateMachine(5);

      // Phase 1: Normal load
      const normalResult = await loadTester.run(async () => {
        const { interpreter, instanceId } = clientPool.createInstance(testMachine);
        interpreter.send({ type: 'TOGGLE' });
        const snapshot = interpreter.getSnapshot();
        clientPool.stopInstance(instanceId);
        return snapshot;
      }, {
        concurrency: 10,
        duration: 3000
      });

      // Phase 2: Stress load
      const stressResult = await loadTester.run(async () => {
        const { interpreter, instanceId } = clientPool.createInstance(testMachine);
        interpreter.send({ type: 'TOGGLE' });
        const snapshot = interpreter.getSnapshot();
        // Don't cleanup immediately to create stress
        setTimeout(() => clientPool.stopInstance(instanceId), 100);
        return snapshot;
      }, {
        concurrency: 100,
        duration: 5000
      });

      // Phase 3: Recovery check
      await new Promise(resolve => setTimeout(resolve, 2000)); // Recovery period
      clientPool.stopAllInstances();
      if (global.gc) global.gc();

      const recoveryResult = await loadTester.run(async () => {
        const { interpreter, instanceId } = clientPool.createInstance(testMachine);
        interpreter.send({ type: 'TOGGLE' });
        const snapshot = interpreter.getSnapshot();
        clientPool.stopInstance(instanceId);
        return snapshot;
      }, {
        concurrency: 10,
        duration: 3000
      });

      // Recovery performance should be similar to normal load
      const recoveryThroughputRatio = recoveryResult.throughputPerSecond / normalResult.throughputPerSecond;
      const recoveryLatencyRatio = recoveryResult.averageLatency / normalResult.averageLatency;

      expect(recoveryThroughputRatio).toBeGreaterThan(0.8); // At least 80% of normal throughput
      expect(recoveryLatencyRatio).toBeLessThan(1.5); // No more than 50% latency increase
      expect(stressResult.errorRate).toBeLessThan(0.1); // Stress should be manageable
    });
  });

  // Helper method for variance calculation
  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }
});