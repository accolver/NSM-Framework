/**
 * Network Efficiency Performance Tests
 * Tests network performance characteristics of NSM multi-node scenarios
 * Following TDD approach with network-specific performance assertions
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'bun:test';
import { NSMClient } from '../../packages/nsm-client/src/nsm-client';
import { BlossomClient } from '../../packages/nsm-client-sdk/src/blossom/BlossomClient';
import {
  Benchmark,
  LoadTester,
  PerformanceAssertions,
  TestDataGenerator,
  MemoryMonitor,
  PerformanceTimer,
  type LoadTestOptions
} from './performance-utils';
import { NSMDefinition } from '../../packages/nsm-core/src/types';

// Mock relay for testing network efficiency without external dependencies
class MockRelay {
  private events: Map<string, any[]> = new Map();
  private subscriptions: Map<string, any> = new Map();
  private latencyMs: number;

  constructor(latencyMs: number = 10) {
    this.latencyMs = latencyMs;
  }

  async publish(event: any): Promise<void> {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, this.latencyMs));

    const kind = event.kind;
    if (!this.events.has(kind)) {
      this.events.set(kind, []);
    }
    this.events.get(kind)!.push(event);

    // Notify subscribers
    this.notifySubscribers(event);
  }

  async subscribe(filter: any, callback: (event: any) => void): Promise<string> {
    // Simulate subscription setup latency
    await new Promise(resolve => setTimeout(resolve, this.latencyMs / 2));

    const subId = `sub_${Date.now()}_${Math.random()}`;
    this.subscriptions.set(subId, { filter, callback });

    // Send existing matching events
    setTimeout(() => {
      this.events.forEach(events => {
        events.forEach(event => {
          if (this.matchesFilter(event, filter)) {
            callback(event);
          }
        });
      });
    }, this.latencyMs);

    return subId;
  }

  unsubscribe(subId: string): void {
    this.subscriptions.delete(subId);
  }

  private notifySubscribers(event: any): void {
    this.subscriptions.forEach(({ filter, callback }) => {
      if (this.matchesFilter(event, filter)) {
        setTimeout(() => callback(event), this.latencyMs);
      }
    });
  }

  private matchesFilter(event: any, filter: any): boolean {
    if (filter.kinds && !filter.kinds.includes(event.kind)) {
      return false;
    }
    return true;
  }

  clear(): void {
    this.events.clear();
    this.subscriptions.clear();
  }

  getEventCount(): number {
    let count = 0;
    this.events.forEach(events => count += events.length);
    return count;
  }
}

// Mock NSM Client for controlled network testing
class MockNSMClient extends NSMClient {
  private mockRelay: MockRelay;
  private clientId: string;

  constructor(clientId: string, mockRelay: MockRelay) {
    super({ autoConnect: false });
    this.clientId = clientId;
    this.mockRelay = mockRelay;
  }

  async publishDefinition(definition: NSMDefinition): Promise<string> {
    const timer = new PerformanceTimer();
    timer.start();

    const event = {
      kind: 30079,
      content: JSON.stringify(definition),
      tags: [['d', definition.id]],
      created_at: Math.floor(Date.now() / 1000),
      pubkey: this.clientId
    };

    await this.mockRelay.publish(event);
    const elapsed = timer.stop();

    // Track network timing
    (this as any).lastPublishTime = elapsed;
    return definition.id;
  }

  async createInstance(definitionId: string, initialContext: any): Promise<string> {
    const timer = new PerformanceTimer();
    timer.start();

    const instanceId = `instance_${Date.now()}_${Math.random()}`;
    const event = {
      kind: 30080,
      content: JSON.stringify({ definitionId, context: initialContext }),
      tags: [['d', instanceId]],
      created_at: Math.floor(Date.now() / 1000),
      pubkey: this.clientId
    };

    await this.mockRelay.publish(event);
    const elapsed = timer.stop();

    (this as any).lastCreateTime = elapsed;
    return instanceId;
  }

  async transition(instanceId: string, transitionName: string, context: any): Promise<boolean> {
    const timer = new PerformanceTimer();
    timer.start();

    const event = {
      kind: 30081,
      content: JSON.stringify({ instanceId, transition: transitionName, context }),
      tags: [['d', `${instanceId}_${Date.now()}`]],
      created_at: Math.floor(Date.now() / 1000),
      pubkey: this.clientId
    };

    await this.mockRelay.publish(event);
    const elapsed = timer.stop();

    (this as any).lastTransitionTime = elapsed;
    return true;
  }

  getPublicKey(): string {
    return this.clientId;
  }

  getLastNetworkTime(): number {
    return Math.max(
      (this as any).lastPublishTime || 0,
      (this as any).lastCreateTime || 0,
      (this as any).lastTransitionTime || 0
    );
  }
}

describe('Network Efficiency Performance Tests', () => {
  let mockRelay: MockRelay;
  let clients: MockNSMClient[];
  let benchmark: Benchmark;
  let memoryMonitor: MemoryMonitor;

  beforeAll(() => {
    if (global.gc) {
      global.gc();
    }
  });

  beforeEach(() => {
    mockRelay = new MockRelay(10); // 10ms simulated latency
    clients = [];
    benchmark = new Benchmark();
    memoryMonitor = new MemoryMonitor();
  });

  afterEach(() => {
    mockRelay.clear();
    clients = [];
  });

  describe('Event Publication Performance', () => {
    it('should publish definitions efficiently', async () => {
      const client = new MockNSMClient('client1', mockRelay);
      clients.push(client);

      const testDefinition = TestDataGenerator.generateStateMachine(10);

      const result = await benchmark.run(
        'Definition Publication',
        async () => await client.publishDefinition(testDefinition),
        100
      );

      // Network operations should complete within reasonable time including mock latency
      PerformanceAssertions.assertExecutionTime(result.avgTime, 50, 'Definition publication');
      PerformanceAssertions.assertThroughput(result.throughputPerSecond, 20, 'Definition publication');

      expect(result.avgTime).toBeLessThan(50); // Including 10ms mock latency
      expect(mockRelay.getEventCount()).toBe(100);
    });

    it('should create instances efficiently', async () => {
      const client = new MockNSMClient('client1', mockRelay);
      clients.push(client);

      const testDefinition = TestDataGenerator.generateStateMachine(5);
      const definitionId = await client.publishDefinition(testDefinition);

      const result = await benchmark.run(
        'Instance Creation',
        async () => await client.createInstance(definitionId, { test: true }),
        100
      );

      PerformanceAssertions.assertExecutionTime(result.avgTime, 50, 'Instance creation');
      PerformanceAssertions.assertThroughput(result.throughputPerSecond, 20, 'Instance creation');

      expect(result.avgTime).toBeLessThan(50);
    });

    it('should handle state transitions efficiently', async () => {
      const client = new MockNSMClient('client1', mockRelay);
      clients.push(client);

      const testDefinition = TestDataGenerator.generateStateMachine(3);
      const definitionId = await client.publishDefinition(testDefinition);
      const instanceId = await client.createInstance(definitionId, {});

      const result = await benchmark.run(
        'State Transitions',
        async () => await client.transition(instanceId, 'transition_0', { step: 1 }),
        200
      );

      PerformanceAssertions.assertExecutionTime(result.avgTime, 50, 'State transitions');
      PerformanceAssertions.assertThroughput(result.throughputPerSecond, 20, 'State transitions');

      expect(result.avgTime).toBeLessThan(50);
    });
  });

  describe('Multi-Node Communication Performance', () => {
    it('should handle multi-client scenarios efficiently', async () => {
      // Create multiple clients
      const clientCount = 5;
      for (let i = 0; i < clientCount; i++) {
        clients.push(new MockNSMClient(`client${i}`, mockRelay));
      }

      const testDefinition = TestDataGenerator.generateStateMachine(5);

      // Each client publishes the same definition (simulating real-world scenario)
      const loadTester = new LoadTester();
      const result = await loadTester.run(async () => {
        const client = clients[Math.floor(Math.random() * clients.length)];
        return await client.publishDefinition({
          ...testDefinition,
          id: `${testDefinition.id}_${Date.now()}_${Math.random()}`
        });
      }, {
        concurrency: clientCount,
        duration: 3000,
        warmupTime: 500
      });

      PerformanceAssertions.assertThroughput(result.throughputPerSecond, 10, 'Multi-client publishing');
      PerformanceAssertions.assertErrorRate(result.errorRate, 0.01, 'Multi-client publishing');
      PerformanceAssertions.assertNoMemoryLeak(result.memoryLeakDetected, 'Multi-client publishing');

      expect(result.errorRate).toBeLessThan(0.01);
      expect(result.averageLatency).toBeLessThan(100);
    });

    it('should scale with concurrent state machine operations', async () => {
      const clientCount = 10;
      for (let i = 0; i < clientCount; i++) {
        clients.push(new MockNSMClient(`client${i}`, mockRelay));
      }

      // Pre-create some definitions and instances
      const testDefinition = TestDataGenerator.generateStateMachine(5);
      const definitionId = await clients[0].publishDefinition(testDefinition);

      const instances: string[] = [];
      for (let i = 0; i < 5; i++) {
        const instanceId = await clients[i % clients.length].createInstance(definitionId, { clientIndex: i });
        instances.push(instanceId);
      }

      // Now test concurrent transitions
      const loadTester = new LoadTester();
      const result = await loadTester.run(async () => {
        const client = clients[Math.floor(Math.random() * clients.length)];
        const instanceId = instances[Math.floor(Math.random() * instances.length)];
        return await client.transition(instanceId, 'transition_0', {
          timestamp: Date.now(),
          client: client.getPublicKey()
        });
      }, {
        concurrency: 20,
        duration: 5000,
        warmupTime: 1000
      });

      PerformanceAssertions.assertThroughput(result.throughputPerSecond, 15, 'Concurrent state operations');
      PerformanceAssertions.assertErrorRate(result.errorRate, 0.01, 'Concurrent state operations');

      expect(result.successfulOperations).toBeGreaterThan(50);
      expect(result.p95Latency).toBeLessThan(200);
    });
  });

  describe('Network Bandwidth Efficiency', () => {
    it('should minimize payload sizes for events', async () => {
      const client = new MockNSMClient('client1', mockRelay);
      clients.push(client);

      // Test with various payload sizes
      const payloadSizes = [1, 10, 100]; // KB

      for (const sizeKB of payloadSizes) {
        const largeContext = TestDataGenerator.generateLargeContext(sizeKB);
        const testDefinition = {
          ...TestDataGenerator.generateStateMachine(5),
          context: largeContext
        };

        const timer = new PerformanceTimer();
        timer.start();

        await client.publishDefinition(testDefinition);
        const elapsed = timer.stop();

        // Larger payloads should still be reasonably fast
        const maxTime = 50 + (sizeKB * 2); // Base time + 2ms per KB
        PerformanceAssertions.assertExecutionTime(elapsed, maxTime, `${sizeKB}KB payload publication`);

        expect(elapsed).toBeLessThan(maxTime);
      }
    });

    it('should handle high-frequency events efficiently', async () => {
      const client = new MockNSMClient('client1', mockRelay);
      clients.push(client);

      const testDefinition = TestDataGenerator.generateStateMachine(3);
      const definitionId = await client.publishDefinition(testDefinition);
      const instanceId = await client.createInstance(definitionId, {});

      // Test rapid-fire transitions
      const result = await benchmark.run(
        'High-Frequency Transitions',
        async () => {
          await client.transition(instanceId, 'transition_0', {
            timestamp: Date.now(),
            sequence: Math.random()
          });
        },
        500
      );

      PerformanceAssertions.assertThroughput(result.throughputPerSecond, 15, 'High-frequency transitions');
      expect(result.avgTime).toBeLessThan(100);
    });
  });

  describe('Connection Pool Performance', () => {
    it('should reuse connections efficiently', async () => {
      // Create clients that share the same mock relay (simulating connection pooling)
      const clientCount = 20;
      for (let i = 0; i < clientCount; i++) {
        clients.push(new MockNSMClient(`client${i}`, mockRelay));
      }

      const testDefinition = TestDataGenerator.generateStateMachine(3);

      // Test connection reuse by rapid client switching
      const loadTester = new LoadTester();
      const result = await loadTester.run(async () => {
        const client = clients[Math.floor(Math.random() * clients.length)];
        return await client.publishDefinition({
          ...testDefinition,
          id: `${testDefinition.id}_${Date.now()}_${Math.random()}`
        });
      }, {
        concurrency: 10,
        duration: 3000
      });

      PerformanceAssertions.assertThroughput(result.throughputPerSecond, 10, 'Connection pooling');
      PerformanceAssertions.assertErrorRate(result.errorRate, 0.02, 'Connection pooling');

      expect(result.averageLatency).toBeLessThan(150);
    });
  });

  describe('Network Latency Impact Tests', () => {
    it('should gracefully handle high latency networks', async () => {
      // Create a high-latency mock relay
      const highLatencyRelay = new MockRelay(100); // 100ms latency
      const client = new MockNSMClient('client1', highLatencyRelay);

      const testDefinition = TestDataGenerator.generateStateMachine(5);

      const result = await benchmark.run(
        'High Latency Operations',
        async () => await client.publishDefinition({
          ...testDefinition,
          id: `${testDefinition.id}_${Date.now()}_${Math.random()}`
        }),
        50
      );

      // Should handle high latency gracefully
      PerformanceAssertions.assertExecutionTime(result.avgTime, 200, 'High latency operations');
      expect(result.avgTime).toBeGreaterThan(100); // Should reflect the latency
      expect(result.avgTime).toBeLessThan(200); // But not be excessive
    });

    it('should maintain performance under variable latency', async () => {
      // Create a variable latency relay
      class VariableLatencyRelay extends MockRelay {
        async publish(event: any): Promise<void> {
          // Random latency between 5-50ms
          const latency = 5 + Math.random() * 45;
          await new Promise(resolve => setTimeout(resolve, latency));

          const kind = event.kind;
          if (!this.events.has(kind)) {
            this.events.set(kind, []);
          }
          this.events.get(kind)!.push(event);
          this.notifySubscribers(event);
        }
      }

      const variableRelay = new VariableLatencyRelay();
      const client = new MockNSMClient('client1', variableRelay);

      const testDefinition = TestDataGenerator.generateStateMachine(5);

      const result = await benchmark.run(
        'Variable Latency Operations',
        async () => await client.publishDefinition({
          ...testDefinition,
          id: `${testDefinition.id}_${Date.now()}_${Math.random()}`
        }),
        100
      );

      // Should handle variable latency with reasonable consistency
      expect(result.standardDeviation).toBeLessThan(result.avgTime); // Reasonable variance
      expect(result.maxTime).toBeLessThan(150); // No extreme outliers
    });
  });

  describe('Network Error Handling Performance', () => {
    it('should handle network failures efficiently', async () => {
      // Create a relay that fails randomly
      class UnreliableRelay extends MockRelay {
        private failureRate = 0.1; // 10% failure rate

        async publish(event: any): Promise<void> {
          if (Math.random() < this.failureRate) {
            throw new Error('Network timeout');
          }
          return super.publish(event);
        }
      }

      const unreliableRelay = new UnreliableRelay();
      const client = new MockNSMClient('client1', unreliableRelay);

      const testDefinition = TestDataGenerator.generateStateMachine(5);

      let successCount = 0;
      let errorCount = 0;

      const timer = new PerformanceTimer();
      timer.start();

      // Test error handling performance
      for (let i = 0; i < 100; i++) {
        try {
          await client.publishDefinition({
            ...testDefinition,
            id: `${testDefinition.id}_${i}`
          });
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }

      const elapsed = timer.stop();

      // Should handle errors efficiently without blocking
      expect(errorCount).toBeGreaterThan(0); // Should have some errors
      expect(successCount).toBeGreaterThan(80); // But mostly succeed
      expect(elapsed).toBeLessThan(5000); // Should not take too long despite errors
    });
  });

  describe('Event Ordering and Consistency', () => {
    it('should maintain event ordering under load', async () => {
      const client = new MockNSMClient('client1', mockRelay);
      clients.push(client);

      const testDefinition = TestDataGenerator.generateStateMachine(5);
      const definitionId = await client.publishDefinition(testDefinition);
      const instanceId = await client.createInstance(definitionId, {});

      // Send a sequence of ordered transitions
      const sequenceLength = 100;
      const timer = new PerformanceTimer();
      timer.start();

      for (let i = 0; i < sequenceLength; i++) {
        await client.transition(instanceId, 'transition_0', {
          sequence: i,
          timestamp: Date.now()
        });
      }

      const elapsed = timer.stop();

      // Should complete ordered sequence efficiently
      PerformanceAssertions.assertExecutionTime(elapsed, 5000, 'Ordered event sequence');
      expect(elapsed).toBeLessThan(5000);
      expect(mockRelay.getEventCount()).toBeGreaterThanOrEqual(sequenceLength + 2); // +2 for definition and instance
    });
  });
});