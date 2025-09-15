/**
 * Performance testing utilities for NSM Framework
 * Provides benchmarking, memory monitoring, and performance metrics collection
 */

export interface PerformanceMetrics {
  executionTime: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  cpuUsage?: {
    user: number;
    system: number;
  };
}

export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  standardDeviation: number;
  throughputPerSecond: number;
  memoryMetrics: PerformanceMetrics['memoryUsage'];
}

export interface LoadTestOptions {
  concurrency: number;
  duration: number; // milliseconds
  warmupTime?: number; // milliseconds
  targetThroughput?: number; // operations per second
  maxMemoryUsage?: number; // bytes
}

export interface LoadTestResult {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalDuration: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  throughputPerSecond: number;
  errorRate: number;
  memoryPeak: number;
  memoryLeakDetected: boolean;
}

/**
 * High-precision timer for accurate performance measurements
 */
export class PerformanceTimer {
  private startTime: [number, number] | null = null;
  private endTime: [number, number] | null = null;

  start(): void {
    this.startTime = process.hrtime();
    this.endTime = null;
  }

  stop(): number {
    if (!this.startTime) {
      throw new Error('Timer not started');
    }
    this.endTime = process.hrtime(this.startTime);
    return this.getElapsedTime();
  }

  getElapsedTime(): number {
    if (!this.endTime) {
      throw new Error('Timer not stopped');
    }
    return this.endTime[0] * 1000 + this.endTime[1] / 1000000; // milliseconds
  }

  reset(): void {
    this.startTime = null;
    this.endTime = null;
  }
}

/**
 * Memory monitoring utility
 */
export class MemoryMonitor {
  private initialMemory: NodeJS.MemoryUsage;
  private snapshots: NodeJS.MemoryUsage[] = [];

  constructor() {
    this.initialMemory = process.memoryUsage();
  }

  takeSnapshot(): NodeJS.MemoryUsage {
    const snapshot = process.memoryUsage();
    this.snapshots.push(snapshot);
    return snapshot;
  }

  getMemoryGrowth(): number {
    const current = process.memoryUsage();
    return current.heapUsed - this.initialMemory.heapUsed;
  }

  getPeakMemory(): number {
    if (this.snapshots.length === 0) {
      return process.memoryUsage().heapUsed;
    }
    return Math.max(...this.snapshots.map(s => s.heapUsed));
  }

  detectMemoryLeak(threshold: number = 50 * 1024 * 1024): boolean {
    if (this.snapshots.length < 2) {
      return false;
    }

    const growth = this.getMemoryGrowth();
    return growth > threshold;
  }

  reset(): void {
    this.initialMemory = process.memoryUsage();
    this.snapshots = [];
  }
}

/**
 * CPU monitoring utility
 */
export class CPUMonitor {
  private startUsage: NodeJS.CpuUsage | null = null;

  start(): void {
    this.startUsage = process.cpuUsage();
  }

  stop(): { user: number; system: number } {
    if (!this.startUsage) {
      throw new Error('CPU monitoring not started');
    }

    const currentUsage = process.cpuUsage(this.startUsage);
    return {
      user: currentUsage.user / 1000, // Convert to milliseconds
      system: currentUsage.system / 1000
    };
  }
}

/**
 * Benchmark execution utility
 */
export class Benchmark {
  private results: number[] = [];
  private memoryMonitor = new MemoryMonitor();

  async run<T>(
    name: string,
    fn: () => Promise<T> | T,
    iterations: number = 1000
  ): Promise<BenchmarkResult> {
    this.results = [];
    this.memoryMonitor.reset();

    // Warmup
    for (let i = 0; i < Math.min(10, iterations); i++) {
      await fn();
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    this.memoryMonitor.takeSnapshot();
    const timer = new PerformanceTimer();

    // Actual benchmark
    for (let i = 0; i < iterations; i++) {
      timer.start();
      await fn();
      const elapsed = timer.stop();
      this.results.push(elapsed);

      // Take memory snapshot every 100 iterations
      if (i % 100 === 0) {
        this.memoryMonitor.takeSnapshot();
      }
    }

    const finalMemory = this.memoryMonitor.takeSnapshot();

    return this.calculateResults(name, iterations, finalMemory);
  }

  private calculateResults(
    name: string,
    iterations: number,
    memoryMetrics: NodeJS.MemoryUsage
  ): BenchmarkResult {
    const totalTime = this.results.reduce((sum, time) => sum + time, 0);
    const avgTime = totalTime / iterations;
    const minTime = Math.min(...this.results);
    const maxTime = Math.max(...this.results);

    // Calculate standard deviation
    const variance = this.results.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / iterations;
    const standardDeviation = Math.sqrt(variance);

    const throughputPerSecond = 1000 / avgTime; // operations per second

    return {
      name,
      iterations,
      totalTime,
      avgTime,
      minTime,
      maxTime,
      standardDeviation,
      throughputPerSecond,
      memoryMetrics: {
        heapUsed: memoryMetrics.heapUsed,
        heapTotal: memoryMetrics.heapTotal,
        external: memoryMetrics.external,
        rss: memoryMetrics.rss
      }
    };
  }
}

/**
 * Load testing utility for concurrent operations
 */
export class LoadTester {
  private memoryMonitor = new MemoryMonitor();
  private results: number[] = [];
  private errors: Error[] = [];

  async run<T>(
    fn: () => Promise<T> | T,
    options: LoadTestOptions
  ): Promise<LoadTestResult> {
    this.results = [];
    this.errors = [];
    this.memoryMonitor.reset();

    const { concurrency, duration, warmupTime = 1000 } = options;

    // Warmup phase
    if (warmupTime > 0) {
      await this.warmup(fn, warmupTime, Math.ceil(concurrency / 2));
    }

    // Force garbage collection
    if (global.gc) {
      global.gc();
    }

    this.memoryMonitor.takeSnapshot();
    const startTime = Date.now();
    const endTime = startTime + duration;

    const workers: Promise<void>[] = [];

    // Start concurrent workers
    for (let i = 0; i < concurrency; i++) {
      workers.push(this.worker(fn, endTime));
    }

    // Wait for all workers to complete
    await Promise.all(workers);

    const finalMemory = this.memoryMonitor.takeSnapshot();
    const actualDuration = Date.now() - startTime;

    return this.calculateLoadResults(actualDuration, finalMemory);
  }

  private async warmup<T>(
    fn: () => Promise<T> | T,
    warmupTime: number,
    concurrency: number
  ): Promise<void> {
    const endTime = Date.now() + warmupTime;
    const workers: Promise<void>[] = [];

    for (let i = 0; i < concurrency; i++) {
      workers.push(this.worker(fn, endTime, true));
    }

    await Promise.all(workers);
  }

  private async worker<T>(
    fn: () => Promise<T> | T,
    endTime: number,
    isWarmup: boolean = false
  ): Promise<void> {
    while (Date.now() < endTime) {
      const timer = new PerformanceTimer();

      try {
        timer.start();
        await fn();
        const elapsed = timer.stop();

        if (!isWarmup) {
          this.results.push(elapsed);

          // Take memory snapshot periodically
          if (this.results.length % 1000 === 0) {
            this.memoryMonitor.takeSnapshot();
          }
        }
      } catch (error) {
        if (!isWarmup) {
          this.errors.push(error as Error);
        }
      }
    }
  }

  private calculateLoadResults(
    duration: number,
    memoryMetrics: NodeJS.MemoryUsage
  ): LoadTestResult {
    const totalOperations = this.results.length + this.errors.length;
    const successfulOperations = this.results.length;
    const failedOperations = this.errors.length;

    const sortedResults = [...this.results].sort((a, b) => a - b);
    const averageLatency = this.results.reduce((sum, time) => sum + time, 0) / this.results.length || 0;

    const p95Index = Math.floor(sortedResults.length * 0.95);
    const p99Index = Math.floor(sortedResults.length * 0.99);

    const p95Latency = sortedResults[p95Index] || 0;
    const p99Latency = sortedResults[p99Index] || 0;

    const throughputPerSecond = (successfulOperations / duration) * 1000;
    const errorRate = totalOperations > 0 ? failedOperations / totalOperations : 0;

    const memoryPeak = this.memoryMonitor.getPeakMemory();
    const memoryLeakDetected = this.memoryMonitor.detectMemoryLeak();

    return {
      totalOperations,
      successfulOperations,
      failedOperations,
      totalDuration: duration,
      averageLatency,
      p95Latency,
      p99Latency,
      throughputPerSecond,
      errorRate,
      memoryPeak,
      memoryLeakDetected
    };
  }
}

/**
 * Performance assertion utilities
 */
export class PerformanceAssertions {
  static assertExecutionTime(actualMs: number, maxMs: number, operation: string): void {
    if (actualMs > maxMs) {
      throw new Error(
        `Performance assertion failed: ${operation} took ${actualMs.toFixed(2)}ms, ` +
        `expected ≤${maxMs}ms`
      );
    }
  }

  static assertThroughput(actualTps: number, minTps: number, operation: string): void {
    if (actualTps < minTps) {
      throw new Error(
        `Performance assertion failed: ${operation} achieved ${actualTps.toFixed(2)} ops/sec, ` +
        `expected ≥${minTps} ops/sec`
      );
    }
  }

  static assertMemoryUsage(actualBytes: number, maxBytes: number, operation: string): void {
    if (actualBytes > maxBytes) {
      throw new Error(
        `Performance assertion failed: ${operation} used ${(actualBytes / 1024 / 1024).toFixed(2)}MB, ` +
        `expected ≤${(maxBytes / 1024 / 1024).toFixed(2)}MB`
      );
    }
  }

  static assertNoMemoryLeak(detected: boolean, operation: string): void {
    if (detected) {
      throw new Error(`Memory leak detected during ${operation}`);
    }
  }

  static assertErrorRate(errorRate: number, maxErrorRate: number, operation: string): void {
    if (errorRate > maxErrorRate) {
      throw new Error(
        `Performance assertion failed: ${operation} had ${(errorRate * 100).toFixed(2)}% error rate, ` +
        `expected ≤${(maxErrorRate * 100).toFixed(2)}%`
      );
    }
  }
}

/**
 * Test data generators for performance tests
 */
export class TestDataGenerator {
  static generateStateMachine(stateCount: number = 10): any {
    const states: any = {};

    // Generate states
    for (let i = 0; i < stateCount; i++) {
      const stateName = `state_${i}`;
      states[stateName] = {
        on: i < stateCount - 1 ? { NEXT: `state_${i + 1}` } : {}
      };
    }

    return {
      id: `test-machine-${Date.now()}`,
      initial: 'state_0',
      states
    };
  }

  static generateLargeContext(sizeKB: number = 100): any {
    const targetSize = sizeKB * 1024;
    const context: any = {};
    let currentSize = 0;

    let counter = 0;
    while (currentSize < targetSize) {
      const key = `field_${counter++}`;
      const value = 'x'.repeat(Math.min(1000, targetSize - currentSize));
      context[key] = value;
      currentSize += JSON.stringify({ [key]: value }).length;
    }

    return context;
  }

  static generateTestEvents(count: number = 1000): any[] {
    const events = [];
    for (let i = 0; i < count; i++) {
      events.push({
        id: `event_${i}`,
        type: 'TEST_EVENT',
        timestamp: Date.now() + i,
        data: {
          index: i,
          value: Math.random(),
          text: `Test event ${i}`
        }
      });
    }
    return events;
  }
}