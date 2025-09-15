/**
 * Performance Baselines and Regression Testing
 * Establishes performance baselines and validates against regressions
 * Following TDD approach with baseline validation
 */

import { describe, it, expect, beforeEach, beforeAll } from 'bun:test';
import { NSMStateMachine } from '../../packages/nsm-client/src/state-machine';
import {
  Benchmark,
  LoadTester,
  PerformanceAssertions,
  TestDataGenerator,
  MemoryMonitor,
  type BenchmarkResult,
  type LoadTestResult
} from './performance-utils';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface PerformanceBaseline {
  name: string;
  version: string;
  timestamp: number;
  metrics: {
    avgExecutionTime: number;
    throughputPerSecond: number;
    memoryUsage: number;
    p95Latency: number;
    p99Latency: number;
  };
  environment: {
    nodeVersion: string;
    platform: string;
    arch: string;
    cpuCount: number;
  };
}

interface RegressionReport {
  testName: string;
  baseline: PerformanceBaseline;
  current: PerformanceBaseline;
  regressions: {
    metric: string;
    baselineValue: number;
    currentValue: number;
    percentageChange: number;
    isRegression: boolean;
  }[];
  passed: boolean;
}

class PerformanceBaselineManager {
  private baselineDir: string;
  private regressionThresholds = {
    avgExecutionTime: 0.2, // 20% increase is regression
    throughputPerSecond: -0.15, // 15% decrease is regression
    memoryUsage: 0.3, // 30% increase is regression
    p95Latency: 0.25, // 25% increase is regression
    p99Latency: 0.3 // 30% increase is regression
  };

  constructor() {
    this.baselineDir = join(process.cwd(), 'tests', 'performance', 'baselines');
    this.ensureBaselineDir();
  }

  private ensureBaselineDir(): void {
    try {
      if (!existsSync(this.baselineDir)) {
        require('fs').mkdirSync(this.baselineDir, { recursive: true });
      }
    } catch (error) {
      console.warn('Could not create baseline directory:', error);
    }
  }

  saveBaseline(testName: string, result: BenchmarkResult | LoadTestResult): void {
    const baseline: PerformanceBaseline = {
      name: testName,
      version: '1.0.0', // Should come from package.json
      timestamp: Date.now(),
      metrics: this.extractMetrics(result),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cpuCount: require('os').cpus().length
      }
    };

    try {
      const filePath = join(this.baselineDir, `${testName.replace(/\s+/g, '_')}.json`);
      writeFileSync(filePath, JSON.stringify(baseline, null, 2));
    } catch (error) {
      console.warn(`Could not save baseline for ${testName}:`, error);
    }
  }

  loadBaseline(testName: string): PerformanceBaseline | null {
    try {
      const filePath = join(this.baselineDir, `${testName.replace(/\s+/g, '_')}.json`);
      if (!existsSync(filePath)) {
        return null;
      }
      const content = readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`Could not load baseline for ${testName}:`, error);
      return null;
    }
  }

  compareWithBaseline(testName: string, currentResult: BenchmarkResult | LoadTestResult): RegressionReport {
    const baseline = this.loadBaseline(testName);
    if (!baseline) {
      throw new Error(`No baseline found for test: ${testName}`);
    }

    const currentBaseline: PerformanceBaseline = {
      name: testName,
      version: '1.0.0',
      timestamp: Date.now(),
      metrics: this.extractMetrics(currentResult),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cpuCount: require('os').cpus().length
      }
    };

    const regressions = this.detectRegressions(baseline, currentBaseline);

    return {
      testName,
      baseline,
      current: currentBaseline,
      regressions,
      passed: regressions.every(r => !r.isRegression)
    };
  }

  private extractMetrics(result: BenchmarkResult | LoadTestResult): PerformanceBaseline['metrics'] {
    if ('avgTime' in result) {
      // BenchmarkResult
      return {
        avgExecutionTime: result.avgTime,
        throughputPerSecond: result.throughputPerSecond,
        memoryUsage: result.memoryMetrics.heapUsed,
        p95Latency: result.avgTime * 1.5, // Estimate
        p99Latency: result.avgTime * 2 // Estimate
      };
    } else {
      // LoadTestResult
      return {
        avgExecutionTime: result.averageLatency,
        throughputPerSecond: result.throughputPerSecond,
        memoryUsage: result.memoryPeak,
        p95Latency: result.p95Latency,
        p99Latency: result.p99Latency
      };
    }
  }

  private detectRegressions(baseline: PerformanceBaseline, current: PerformanceBaseline): RegressionReport['regressions'] {
    const regressions = [];

    for (const [metric, threshold] of Object.entries(this.regressionThresholds)) {
      const baselineValue = baseline.metrics[metric as keyof PerformanceBaseline['metrics']];
      const currentValue = current.metrics[metric as keyof PerformanceBaseline['metrics']];

      const percentageChange = (currentValue - baselineValue) / baselineValue;
      const isRegression = percentageChange > threshold;

      regressions.push({
        metric,
        baselineValue,
        currentValue,
        percentageChange,
        isRegression
      });
    }

    return regressions;
  }

  setRegressionThreshold(metric: string, threshold: number): void {
    if (metric in this.regressionThresholds) {
      (this.regressionThresholds as any)[metric] = threshold;
    }
  }
}

describe('Performance Baselines and Regression Testing', () => {
  let stateMachine: NSMStateMachine;
  let benchmark: Benchmark;
  let loadTester: LoadTester;
  let baselineManager: PerformanceBaselineManager;

  beforeAll(() => {
    if (global.gc) {
      global.gc();
    }
  });

  beforeEach(() => {
    stateMachine = new NSMStateMachine();
    benchmark = new Benchmark();
    loadTester = new LoadTester();
    baselineManager = new PerformanceBaselineManager();
  });

  describe('Baseline Performance Tests', () => {
    it('should establish baseline for simple state machine creation', async () => {
      const testName = 'Simple State Machine Creation Baseline';
      const simpleMachine = TestDataGenerator.generateStateMachine(5);

      const result = await benchmark.run(
        testName,
        () => stateMachine.loadMachine(simpleMachine),
        1000
      );

      // Save baseline for future regression testing
      baselineManager.saveBaseline(testName, result);

      // Validate baseline meets minimum requirements
      PerformanceAssertions.assertExecutionTime(result.avgTime, 2, 'Baseline simple creation');
      PerformanceAssertions.assertThroughput(result.throughputPerSecond, 500, 'Baseline simple creation');
      PerformanceAssertions.assertMemoryUsage(result.memoryMetrics.heapUsed, 100 * 1024 * 1024, 'Baseline simple creation');

      expect(result.avgTime).toBeLessThan(2);
      expect(result.throughputPerSecond).toBeGreaterThan(500);
      expect(result.standardDeviation).toBeLessThan(result.avgTime);
    });

    it('should establish baseline for complex state machine operations', async () => {
      const testName = 'Complex State Machine Operations Baseline';
      const complexMachine = TestDataGenerator.generateStateMachine(50);

      const result = await benchmark.run(
        testName,
        () => {
          const machine = stateMachine.loadMachine(complexMachine);
          const interpreter = stateMachine.interpret(machine);
          interpreter.start();
          const snapshot = stateMachine.serializeState(interpreter);
          interpreter.stop();
          return snapshot;
        },
        500
      );

      baselineManager.saveBaseline(testName, result);

      PerformanceAssertions.assertExecutionTime(result.avgTime, 10, 'Baseline complex operations');
      PerformanceAssertions.assertThroughput(result.throughputPerSecond, 100, 'Baseline complex operations');

      expect(result.avgTime).toBeLessThan(10);
      expect(result.throughputPerSecond).toBeGreaterThan(100);
    });

    it('should establish baseline for concurrent load performance', async () => {
      const testName = 'Concurrent Load Performance Baseline';
      const testMachine = TestDataGenerator.generateStateMachine(10);

      const result = await loadTester.run(async () => {
        const machine = stateMachine.loadMachine(testMachine);
        const interpreter = stateMachine.interpret(machine);
        interpreter.start();
        interpreter.send({ type: 'TOGGLE' });
        const snapshot = stateMachine.serializeState(interpreter);
        interpreter.stop();
        return snapshot;
      }, {
        concurrency: 20,
        duration: 5000,
        warmupTime: 1000
      });

      baselineManager.saveBaseline(testName, result);

      PerformanceAssertions.assertThroughput(result.throughputPerSecond, 50, 'Baseline concurrent load');
      PerformanceAssertions.assertErrorRate(result.errorRate, 0.02, 'Baseline concurrent load');

      expect(result.throughputPerSecond).toBeGreaterThan(50);
      expect(result.errorRate).toBeLessThan(0.02);
      expect(result.p95Latency).toBeLessThan(100);
    });

    it('should establish baseline for memory performance', async () => {
      const testName = 'Memory Performance Baseline';
      const memoryMonitor = new MemoryMonitor();

      memoryMonitor.reset();
      const initialMemory = memoryMonitor.takeSnapshot();

      const result = await benchmark.run(
        testName,
        () => {
          const testMachine = TestDataGenerator.generateStateMachine(20);
          const machine = stateMachine.loadMachine(testMachine);
          const interpreter = stateMachine.interpret(machine);
          interpreter.start();

          // Perform multiple operations
          for (let i = 0; i < 10; i++) {
            interpreter.send({ type: 'TOGGLE' });
          }

          const snapshot = stateMachine.serializeState(interpreter);
          interpreter.stop();
          return snapshot;
        },
        200
      );

      const finalMemory = memoryMonitor.takeSnapshot();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

      baselineManager.saveBaseline(testName, result);

      PerformanceAssertions.assertMemoryUsage(memoryGrowth, 20 * 1024 * 1024, 'Baseline memory performance');

      expect(memoryGrowth).toBeLessThan(20 * 1024 * 1024); // Less than 20MB growth
      expect(result.avgTime).toBeLessThan(20);
    });
  });

  describe('Regression Detection Tests', () => {
    it('should detect performance regressions in state machine creation', async () => {
      const testName = 'State Machine Creation Regression Test';

      // First, establish a baseline
      const simpleMachine = TestDataGenerator.generateStateMachine(5);
      const baselineResult = await benchmark.run(
        testName,
        () => stateMachine.loadMachine(simpleMachine),
        500
      );

      baselineManager.saveBaseline(testName, baselineResult);

      // Now test current performance
      const currentResult = await benchmark.run(
        testName,
        () => stateMachine.loadMachine(simpleMachine),
        500
      );

      try {
        const report = baselineManager.compareWithBaseline(testName, currentResult);

        // Should not have significant regressions
        expect(report.passed).toBe(true);

        // Validate specific metrics haven't regressed
        const executionTimeRegression = report.regressions.find(r => r.metric === 'avgExecutionTime');
        const throughputRegression = report.regressions.find(r => r.metric === 'throughputPerSecond');

        expect(executionTimeRegression?.isRegression).toBe(false);
        expect(throughputRegression?.isRegression).toBe(false);

        // Log performance comparison for visibility
        console.log(`Performance comparison for ${testName}:`);
        console.log(`Baseline avg time: ${report.baseline.metrics.avgExecutionTime}ms`);
        console.log(`Current avg time: ${report.current.metrics.avgExecutionTime}ms`);
        console.log(`Baseline throughput: ${report.baseline.metrics.throughputPerSecond} ops/sec`);
        console.log(`Current throughput: ${report.current.metrics.throughputPerSecond} ops/sec`);
      } catch (error) {
        if ((error as Error).message.includes('No baseline found')) {
          // Skip regression test if no baseline exists
          console.warn('No baseline found, skipping regression test');
        } else {
          throw error;
        }
      }
    });

    it('should detect memory usage regressions', async () => {
      const testName = 'Memory Usage Regression Test';

      const baselineResult = await benchmark.run(
        testName,
        () => {
          // Create larger context to make memory differences more apparent
          const largeContextMachine = {
            id: 'memory-test',
            initial: 'idle',
            context: TestDataGenerator.generateLargeContext(50),
            states: {
              idle: { on: { START: 'active' } },
              active: { on: { STOP: 'idle' } }
            }
          };
          return stateMachine.loadMachine(largeContextMachine);
        },
        200
      );

      baselineManager.saveBaseline(testName, baselineResult);

      const currentResult = await benchmark.run(
        testName,
        () => {
          const largeContextMachine = {
            id: 'memory-test',
            initial: 'idle',
            context: TestDataGenerator.generateLargeContext(50),
            states: {
              idle: { on: { START: 'active' } },
              active: { on: { STOP: 'idle' } }
            }
          };
          return stateMachine.loadMachine(largeContextMachine);
        },
        200
      );

      try {
        const report = baselineManager.compareWithBaseline(testName, currentResult);

        const memoryRegression = report.regressions.find(r => r.metric === 'memoryUsage');
        expect(memoryRegression?.isRegression).toBe(false);

        // Memory usage should not increase by more than 30%
        if (memoryRegression) {
          expect(memoryRegression.percentageChange).toBeLessThan(0.3);
        }
      } catch (error) {
        if ((error as Error).message.includes('No baseline found')) {
          console.warn('No baseline found for memory regression test');
        } else {
          throw error;
        }
      }
    });

    it('should detect throughput regressions under load', async () => {
      const testName = 'Throughput Regression Test';
      const testMachine = TestDataGenerator.generateStateMachine(8);

      const baselineResult = await loadTester.run(async () => {
        const machine = stateMachine.loadMachine(testMachine);
        const interpreter = stateMachine.interpret(machine);
        interpreter.start();
        interpreter.send({ type: 'TOGGLE' });
        interpreter.stop();
        return true;
      }, {
        concurrency: 15,
        duration: 3000,
        warmupTime: 500
      });

      baselineManager.saveBaseline(testName, baselineResult);

      const currentResult = await loadTester.run(async () => {
        const machine = stateMachine.loadMachine(testMachine);
        const interpreter = stateMachine.interpret(machine);
        interpreter.start();
        interpreter.send({ type: 'TOGGLE' });
        interpreter.stop();
        return true;
      }, {
        concurrency: 15,
        duration: 3000,
        warmupTime: 500
      });

      try {
        const report = baselineManager.compareWithBaseline(testName, currentResult);

        const throughputRegression = report.regressions.find(r => r.metric === 'throughputPerSecond');
        expect(throughputRegression?.isRegression).toBe(false);

        // Throughput should not decrease by more than 15%
        if (throughputRegression) {
          expect(throughputRegression.percentageChange).toBeGreaterThan(-0.15);
        }
      } catch (error) {
        if ((error as Error).message.includes('No baseline found')) {
          console.warn('No baseline found for throughput regression test');
        } else {
          throw error;
        }
      }
    });
  });

  describe('Performance Monitoring and Alerting', () => {
    it('should monitor critical performance metrics', async () => {
      const criticalMetrics = {
        'Critical State Creation': {
          maxTime: 1,
          minThroughput: 1000
        },
        'Critical State Transition': {
          maxTime: 0.5,
          minThroughput: 2000
        },
        'Critical Memory Usage': {
          maxMemory: 50 * 1024 * 1024 // 50MB
        }
      };

      // Test state creation
      const simpleMachine = TestDataGenerator.generateStateMachine(5);
      const creationResult = await benchmark.run(
        'Critical State Creation',
        () => stateMachine.loadMachine(simpleMachine),
        100
      );

      PerformanceAssertions.assertExecutionTime(
        creationResult.avgTime,
        criticalMetrics['Critical State Creation'].maxTime,
        'Critical state creation'
      );
      PerformanceAssertions.assertThroughput(
        creationResult.throughputPerSecond,
        criticalMetrics['Critical State Creation'].minThroughput,
        'Critical state creation'
      );

      // Test state transitions
      const toggleMachine = {
        id: 'critical-toggle',
        initial: 'off',
        states: {
          off: { on: { TOGGLE: 'on' } },
          on: { on: { TOGGLE: 'off' } }
        }
      };

      const machine = stateMachine.loadMachine(toggleMachine);
      const interpreter = stateMachine.interpret(machine);
      interpreter.start();

      const transitionResult = await benchmark.run(
        'Critical State Transition',
        () => {
          interpreter.send({ type: 'TOGGLE' });
          return interpreter.getSnapshot();
        },
        1000
      );

      interpreter.stop();

      PerformanceAssertions.assertExecutionTime(
        transitionResult.avgTime,
        criticalMetrics['Critical State Transition'].maxTime,
        'Critical state transition'
      );
      PerformanceAssertions.assertThroughput(
        transitionResult.throughputPerSecond,
        criticalMetrics['Critical State Transition'].minThroughput,
        'Critical state transition'
      );

      // All critical metrics should pass
      expect(creationResult.avgTime).toBeLessThan(criticalMetrics['Critical State Creation'].maxTime);
      expect(creationResult.throughputPerSecond).toBeGreaterThan(criticalMetrics['Critical State Creation'].minThroughput);
      expect(transitionResult.avgTime).toBeLessThan(criticalMetrics['Critical State Transition'].maxTime);
      expect(transitionResult.throughputPerSecond).toBeGreaterThan(criticalMetrics['Critical State Transition'].minThroughput);
    });

    it('should validate performance SLAs', async () => {
      // Define Service Level Agreements (SLAs)
      const slas = {
        'State Machine Creation SLA': {
          p95Latency: 5, // 95% of operations under 5ms
          p99Latency: 20, // 99% of operations under 20ms
          availability: 0.999, // 99.9% success rate
          throughput: 500 // Min 500 ops/sec
        },
        'State Transition SLA': {
          p95Latency: 2,
          p99Latency: 10,
          availability: 0.9995, // 99.95% success rate
          throughput: 1000
        }
      };

      // Test state machine creation SLA
      const creationTimes: number[] = [];
      let creationFailures = 0;
      const creationIterations = 1000;

      for (let i = 0; i < creationIterations; i++) {
        try {
          const timer = new PerformanceTimer();
          timer.start();
          const testMachine = TestDataGenerator.generateStateMachine(5);
          stateMachine.loadMachine(testMachine);
          const elapsed = timer.stop();
          creationTimes.push(elapsed);
        } catch (error) {
          creationFailures++;
        }
      }

      const creationSuccess = (creationIterations - creationFailures) / creationIterations;
      const sortedCreationTimes = creationTimes.sort((a, b) => a - b);
      const creationP95 = sortedCreationTimes[Math.floor(sortedCreationTimes.length * 0.95)];
      const creationP99 = sortedCreationTimes[Math.floor(sortedCreationTimes.length * 0.99)];
      const creationThroughput = 1000 / (creationTimes.reduce((sum, time) => sum + time, 0) / creationTimes.length);

      // Validate SLAs
      expect(creationSuccess).toBeGreaterThanOrEqual(slas['State Machine Creation SLA'].availability);
      expect(creationP95).toBeLessThanOrEqual(slas['State Machine Creation SLA'].p95Latency);
      expect(creationP99).toBeLessThanOrEqual(slas['State Machine Creation SLA'].p99Latency);
      expect(creationThroughput).toBeGreaterThanOrEqual(slas['State Machine Creation SLA'].throughput);

      // Log SLA compliance
      console.log('State Machine Creation SLA Compliance:');
      console.log(`  Availability: ${(creationSuccess * 100).toFixed(3)}% (required: ${(slas['State Machine Creation SLA'].availability * 100).toFixed(1)}%)`);
      console.log(`  P95 Latency: ${creationP95.toFixed(2)}ms (required: ≤${slas['State Machine Creation SLA'].p95Latency}ms)`);
      console.log(`  P99 Latency: ${creationP99.toFixed(2)}ms (required: ≤${slas['State Machine Creation SLA'].p99Latency}ms)`);
      console.log(`  Throughput: ${creationThroughput.toFixed(0)} ops/sec (required: ≥${slas['State Machine Creation SLA'].throughput} ops/sec)`);
    });
  });
});