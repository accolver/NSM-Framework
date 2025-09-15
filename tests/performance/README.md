# NSM Framework Performance Testing Suite

Comprehensive performance and load testing infrastructure for the Network State Manager (NSM) framework, designed following Test-Driven Development (TDD) principles with extensive performance assertions and baseline validation.

## Overview

This performance testing suite validates the NSM framework's performance characteristics across multiple dimensions:

- **State Machine Performance**: Creation, interpretation, transitions, and memory usage
- **Network Efficiency**: Multi-node communication, event propagation, and bandwidth optimization
- **Load Testing**: High concurrency, stress conditions, and scalability limits
- **Performance Baselines**: Regression detection and SLA validation

## Quick Start

```bash
# Run all performance tests
npm run test:performance

# Quick performance check (skip long-running tests)
npm run test:performance:quick

# Generate new performance baselines
npm run test:performance:baselines

# Run specific test suites
npm run test:performance:state-machine
npm run test:performance:network
npm run test:performance:load
```

## Test Structure

### 1. Performance Utilities (`performance-utils.ts`)

Core utilities providing:
- **High-precision timing** with `PerformanceTimer`
- **Memory monitoring** with `MemoryMonitor`
- **CPU usage tracking** with `CPUMonitor`
- **Benchmarking framework** with `Benchmark`
- **Load testing engine** with `LoadTester`
- **Performance assertions** with `PerformanceAssertions`
- **Test data generators** with `TestDataGenerator`

### 2. State Machine Performance (`state-machine-performance.test.ts`)

Tests state machine operations:

```typescript
// Example performance test
it('should create simple state machines within performance thresholds', async () => {
  const result = await benchmark.run(
    'Simple State Machine Creation',
    () => stateMachine.loadMachine(simpleMachine),
    1000
  );

  PerformanceAssertions.assertExecutionTime(result.avgTime, 1, 'State machine creation');
  PerformanceAssertions.assertThroughput(result.throughputPerSecond, 1000, 'State machine creation');
  PerformanceAssertions.assertMemoryUsage(result.memoryMetrics.heapUsed, 50 * 1024 * 1024, 'State machine creation');
});
```

**Test Categories:**
- State machine creation performance
- Interpretation and transition speed
- Memory performance and leak detection
- Concurrent state machine handling
- Security validation performance

### 3. Network Efficiency (`network-efficiency.test.ts`)

Tests multi-node network scenarios:

```typescript
// Example network efficiency test
it('should handle multi-client scenarios efficiently', async () => {
  const result = await loadTester.run(async () => {
    const client = clients[Math.floor(Math.random() * clients.length)];
    return await client.publishDefinition(definition);
  }, {
    concurrency: 5,
    duration: 3000,
    warmupTime: 500
  });

  PerformanceAssertions.assertThroughput(result.throughputPerSecond, 10, 'Multi-client publishing');
  PerformanceAssertions.assertErrorRate(result.errorRate, 0.01, 'Multi-client publishing');
});
```

**Test Categories:**
- Event publication performance
- Multi-node communication efficiency
- Network bandwidth optimization
- Connection pooling performance
- Network latency impact handling
- Error handling performance

### 4. Load Testing (`load-testing.test.ts`)

Tests high-usage scenarios:

```typescript
// Example load test
it('should handle thousands of concurrent state machines', async () => {
  const result = await loadTester.run(async () => {
    const { interpreter, instanceId } = clientPool.createInstance(testMachine);
    interpreter.send({ type: 'TOGGLE' });
    return interpreter.getSnapshot();
  }, {
    concurrency: 100,
    duration: 10000,
    maxMemoryUsage: 200 * 1024 * 1024
  });

  PerformanceAssertions.assertThroughput(result.throughputPerSecond, 50, 'High concurrency');
  PerformanceAssertions.assertNoMemoryLeak(result.memoryLeakDetected, 'High concurrency');
});
```

**Test Categories:**
- High concurrency load tests
- Memory stress testing
- Rapid state change scenarios
- Resource exhaustion handling
- Long-running performance stability
- Stress recovery validation

### 5. Performance Baselines (`performance-baselines.test.ts`)

Establishes and validates performance baselines:

```typescript
// Example baseline test
it('should maintain baseline performance metrics', async () => {
  const result = await benchmark.run('Baseline Test', testFunction, iterations);

  const report = baselineManager.compareWithBaseline('Baseline Test', result);
  expect(report.passed).toBe(true);

  // Validate no significant regressions
  report.regressions.forEach(regression => {
    expect(regression.isRegression).toBe(false);
  });
});
```

**Features:**
- Baseline establishment and storage
- Regression detection with configurable thresholds
- Performance SLA validation
- Environment-aware comparisons
- Automated performance monitoring

## Performance Assertions

The testing suite includes comprehensive performance assertions:

```typescript
// Execution time assertions
PerformanceAssertions.assertExecutionTime(actualMs, maxMs, 'operation');

// Throughput assertions
PerformanceAssertions.assertThroughput(actualTps, minTps, 'operation');

// Memory usage assertions
PerformanceAssertions.assertMemoryUsage(actualBytes, maxBytes, 'operation');

// Memory leak detection
PerformanceAssertions.assertNoMemoryLeak(detected, 'operation');

// Error rate validation
PerformanceAssertions.assertErrorRate(errorRate, maxErrorRate, 'operation');
```

## Performance Targets

### State Machine Operations

| Operation | Target | Metric |
|-----------|--------|--------|
| Simple creation | <1ms | Average execution time |
| Complex creation | <5ms | Average execution time |
| State transitions | <0.5ms | Average execution time |
| Serialization | <1ms | Average execution time |
| Simple throughput | >1000 ops/sec | Operations per second |
| Complex throughput | >200 ops/sec | Operations per second |

### Network Operations

| Operation | Target | Metric |
|-----------|--------|--------|
| Event publication | <50ms | Including network latency |
| Multi-client ops | >10 ops/sec | Concurrent throughput |
| Error rate | <1% | Failure percentage |
| Memory usage | <200MB | Peak memory consumption |

### Load Testing Limits

| Scenario | Target | Metric |
|----------|--------|--------|
| Concurrent instances | >500 | Successful operations |
| High-frequency ops | >500 ops/sec | Rapid transitions |
| Memory stress | <500MB | Peak memory usage |
| Error recovery | >80% | Throughput recovery ratio |

## Test Runner Features

The performance test runner (`run-performance-tests.ts`) provides:

### Command Line Options

```bash
# Run specific test suite
bun run-performance-tests.ts --suite "state machine"

# Generate new baselines
bun run-performance-tests.ts --generate-baselines

# Skip long-running tests
bun run-performance-tests.ts --skip-long-running

# Enable verbose output
bun run-performance-tests.ts --verbose
```

### Report Generation

The runner generates comprehensive reports:

- **JSON Report**: Machine-readable results with detailed metrics
- **HTML Report**: Visual dashboard with charts and summaries
- **Markdown Summary**: Human-readable summary for documentation

### Environment Detection

Automatically captures environment information:
- Node.js version and platform details
- CPU count and memory capacity
- Performance baseline compatibility

## Integration with CI/CD

### GitHub Actions Integration

```yaml
name: Performance Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: npm run test:performance:quick
      - uses: actions/upload-artifact@v3
        with:
          name: performance-reports
          path: tests/performance/reports/
```

### Performance Monitoring

Set up automated performance monitoring:

1. **Baseline Updates**: Regularly update baselines with approved performance changes
2. **Regression Alerts**: Configure alerts for performance regressions
3. **Trend Analysis**: Track performance trends over time
4. **SLA Monitoring**: Validate service level agreements

## Memory Management

The test suite includes sophisticated memory management:

### Memory Leak Detection

```typescript
const memoryMonitor = new MemoryMonitor();
// Run operations...
const leakDetected = memoryMonitor.detectMemoryLeak(threshold);
PerformanceAssertions.assertNoMemoryLeak(leakDetected, 'operation');
```

### Garbage Collection Control

```typescript
// Force garbage collection between tests
if (global.gc) {
  global.gc();
}
```

### Memory Pressure Testing

Tests validate behavior under memory constraints and recovery scenarios.

## Advanced Features

### Custom Performance Metrics

Extend the testing suite with custom metrics:

```typescript
class CustomBenchmark extends Benchmark {
  async runWithMetrics<T>(
    name: string,
    fn: () => Promise<T> | T,
    customMetrics: (result: T) => any
  ): Promise<BenchmarkResult & { custom: any }> {
    const result = await this.run(name, fn);
    const custom = await customMetrics(result);
    return { ...result, custom };
  }
}
```

### Load Testing Patterns

Simulate realistic usage patterns:

```typescript
// Burst traffic pattern
const burstPattern = {
  phases: [
    { duration: 1000, concurrency: 10 },  // Normal load
    { duration: 2000, concurrency: 50 },  // Burst
    { duration: 1000, concurrency: 10 }   // Recovery
  ]
};
```

### Performance Profiling

Integration with Node.js profiling tools:

```typescript
// CPU profiling
const session = new inspector.Session();
session.connect();
session.post('Profiler.enable');
session.post('Profiler.start');
// Run tests...
session.post('Profiler.stop', (err, { profile }) => {
  // Analyze CPU profile
});
```

## Troubleshooting

### Common Issues

1. **Memory Leaks**: Use `MemoryMonitor` to track memory growth
2. **Performance Regressions**: Compare against baselines with detailed metrics
3. **Test Timeouts**: Adjust timeout values for slower environments
4. **Flaky Tests**: Use multiple iterations to establish stable baselines

### Debug Mode

Enable debug output for detailed analysis:

```bash
NSM_VERBOSE=true npm run test:performance
```

### Performance Analysis

Analyze performance bottlenecks:

1. Review detailed timing breakdowns in reports
2. Check memory allocation patterns
3. Analyze CPU usage during tests
4. Validate network efficiency metrics

## Contributing

When adding new performance tests:

1. **Follow TDD**: Write failing performance tests first
2. **Use Assertions**: Include comprehensive performance assertions
3. **Document Targets**: Clearly specify performance targets
4. **Update Baselines**: Generate new baselines when adding features
5. **Test Coverage**: Ensure all critical paths have performance tests

### Performance Test Checklist

- [ ] Performance targets clearly defined
- [ ] Comprehensive performance assertions included
- [ ] Memory leak detection implemented
- [ ] Error rate validation included
- [ ] Baseline comparison integrated
- [ ] Documentation updated
- [ ] CI/CD integration tested

## Future Enhancements

Planned improvements to the performance testing suite:

1. **Real-time Monitoring**: Integration with APM tools
2. **Distributed Testing**: Multi-node load testing scenarios
3. **Performance Budgets**: Automated performance budget enforcement
4. **Visual Metrics**: Browser-based performance metrics for UI components
5. **Chaos Testing**: Network partition and failure scenario testing

---

This performance testing suite ensures the NSM framework maintains high performance standards and provides early detection of performance regressions, supporting reliable and scalable deployment in production environments.