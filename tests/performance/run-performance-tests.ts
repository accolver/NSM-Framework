#!/usr/bin/env bun
/**
 * Performance Test Runner for NSM Framework
 * Executes all performance tests and generates comprehensive reports
 */

import { spawn } from 'child_process';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  details?: string;
}

interface PerformanceReport {
  timestamp: string;
  environment: {
    nodeVersion: string;
    platform: string;
    arch: string;
    cpuCount: number;
    totalMemory: number;
  };
  testSuites: {
    name: string;
    results: TestResult[];
    summary: {
      total: number;
      passed: number;
      failed: number;
      skipped: number;
      duration: number;
    };
  }[];
  overall: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    success: boolean;
  };
}

class PerformanceTestRunner {
  private testSuites = [
    {
      name: 'State Machine Performance',
      file: './state-machine-performance.test.ts',
      timeout: 60000, // 1 minute
      critical: true
    },
    {
      name: 'Network Efficiency',
      file: './network-efficiency.test.ts',
      timeout: 120000, // 2 minutes
      critical: true
    },
    {
      name: 'Load Testing',
      file: './load-testing.test.ts',
      timeout: 300000, // 5 minutes
      critical: false
    },
    {
      name: 'Performance Baselines',
      file: './performance-baselines.test.ts',
      timeout: 180000, // 3 minutes
      critical: true
    }
  ];

  private reportDir: string;

  constructor() {
    this.reportDir = join(process.cwd(), 'tests', 'performance', 'reports');
    this.ensureReportDir();
  }

  private ensureReportDir(): void {
    if (!existsSync(this.reportDir)) {
      mkdirSync(this.reportDir, { recursive: true });
    }
  }

  async run(options: {
    suite?: string;
    generateBaselines?: boolean;
    skipLongRunning?: boolean;
    verbose?: boolean;
  } = {}): Promise<PerformanceReport> {
    console.log('🚀 Starting NSM Framework Performance Tests');
    console.log('=' .repeat(50));

    const startTime = Date.now();
    const report: PerformanceReport = {
      timestamp: new Date().toISOString(),
      environment: this.getEnvironmentInfo(),
      testSuites: [],
      overall: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        success: false
      }
    };

    // Filter test suites based on options
    let suitesToRun = this.testSuites;

    if (options.suite) {
      suitesToRun = this.testSuites.filter(suite =>
        suite.name.toLowerCase().includes(options.suite!.toLowerCase())
      );
    }

    if (options.skipLongRunning) {
      suitesToRun = suitesToRun.filter(suite => suite.name !== 'Load Testing');
    }

    // Set environment variables for tests
    process.env.NSM_PERFORMANCE_TEST = 'true';
    if (options.generateBaselines) {
      process.env.NSM_GENERATE_BASELINES = 'true';
    }
    if (options.verbose) {
      process.env.NSM_VERBOSE = 'true';
    }

    // Run each test suite
    for (const suite of suitesToRun) {
      console.log(`\n📊 Running ${suite.name}...`);
      const suiteResult = await this.runTestSuite(suite);
      report.testSuites.push(suiteResult);

      // Update overall stats
      report.overall.total += suiteResult.summary.total;
      report.overall.passed += suiteResult.summary.passed;
      report.overall.failed += suiteResult.summary.failed;
      report.overall.skipped += suiteResult.summary.skipped;

      // Stop on critical failures
      if (suite.critical && suiteResult.summary.failed > 0) {
        console.log(`❌ Critical test suite failed: ${suite.name}`);
        break;
      }
    }

    report.overall.duration = Date.now() - startTime;
    report.overall.success = report.overall.failed === 0;

    // Generate reports
    await this.generateReports(report);

    // Print summary
    this.printSummary(report);

    return report;
  }

  private async runTestSuite(suite: {
    name: string;
    file: string;
    timeout: number;
    critical: boolean;
  }): Promise<PerformanceReport['testSuites'][0]> {
    const startTime = Date.now();
    const results: TestResult[] = [];

    try {
      const testOutput = await this.runBunTest(suite.file, suite.timeout);

      // Parse test output (simplified - in reality would parse detailed Bun output)
      const passed = !testOutput.includes('error') && !testOutput.includes('failed');

      results.push({
        name: suite.name,
        status: passed ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        details: passed ? undefined : testOutput
      });

    } catch (error) {
      results.push({
        name: suite.name,
        status: 'failed',
        duration: Date.now() - startTime,
        details: (error as Error).message
      });
    }

    const summary = {
      total: results.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      duration: Date.now() - startTime
    };

    return {
      name: suite.name,
      results,
      summary
    };
  }

  private runBunTest(testFile: string, timeout: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const testPath = join(__dirname, testFile);

      const bunProcess = spawn('bun', ['test', testPath], {
        cwd: process.cwd(),
        timeout,
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      bunProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });

      bunProcess.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      bunProcess.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Test failed with code ${code}: ${errorOutput}`));
        }
      });

      bunProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  private getEnvironmentInfo() {
    const os = require('os');
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpuCount: os.cpus().length,
      totalMemory: os.totalmem()
    };
  }

  private async generateReports(report: PerformanceReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Generate JSON report
    const jsonReportPath = join(this.reportDir, `performance-report-${timestamp}.json`);
    writeFileSync(jsonReportPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    const htmlReportPath = join(this.reportDir, `performance-report-${timestamp}.html`);
    writeFileSync(htmlReportPath, this.generateHtmlReport(report));

    // Generate summary markdown
    const markdownReportPath = join(this.reportDir, `performance-summary-${timestamp}.md`);
    writeFileSync(markdownReportPath, this.generateMarkdownSummary(report));

    console.log(`\n📄 Reports generated:`);
    console.log(`  JSON: ${jsonReportPath}`);
    console.log(`  HTML: ${htmlReportPath}`);
    console.log(`  Markdown: ${markdownReportPath}`);
  }

  private generateHtmlReport(report: PerformanceReport): string {
    return `<!DOCTYPE html>
<html>
<head>
    <title>NSM Performance Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { margin: 20px 0; }
        .success { color: green; }
        .failed { color: red; }
        .suite { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .metric { display: inline-block; margin-right: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .status-passed { background-color: #d4edda; }
        .status-failed { background-color: #f8d7da; }
        .status-skipped { background-color: #fff3cd; }
    </style>
</head>
<body>
    <div class="header">
        <h1>NSM Framework Performance Test Report</h1>
        <p>Generated: ${report.timestamp}</p>
        <p>Environment: ${report.environment.platform} ${report.environment.arch}, Node.js ${report.environment.nodeVersion}</p>
        <p>CPUs: ${report.environment.cpuCount}, Memory: ${(report.environment.totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB</p>
    </div>

    <div class="summary">
        <h2>Overall Summary</h2>
        <div class="metric">Total Tests: <strong>${report.overall.total}</strong></div>
        <div class="metric ${report.overall.passed > 0 ? 'success' : ''}">Passed: <strong>${report.overall.passed}</strong></div>
        <div class="metric ${report.overall.failed > 0 ? 'failed' : ''}">Failed: <strong>${report.overall.failed}</strong></div>
        <div class="metric">Skipped: <strong>${report.overall.skipped}</strong></div>
        <div class="metric">Duration: <strong>${(report.overall.duration / 1000).toFixed(2)}s</strong></div>
        <div class="metric">Status: <strong class="${report.overall.success ? 'success' : 'failed'}">${report.overall.success ? 'PASSED' : 'FAILED'}</strong></div>
    </div>

    ${report.testSuites.map(suite => `
    <div class="suite">
        <h3>${suite.name}</h3>
        <div class="metric">Tests: ${suite.summary.total}</div>
        <div class="metric">Passed: ${suite.summary.passed}</div>
        <div class="metric">Failed: ${suite.summary.failed}</div>
        <div class="metric">Duration: ${(suite.summary.duration / 1000).toFixed(2)}s</div>

        <table>
            <thead>
                <tr>
                    <th>Test</th>
                    <th>Status</th>
                    <th>Duration</th>
                    <th>Details</th>
                </tr>
            </thead>
            <tbody>
                ${suite.results.map(result => `
                <tr class="status-${result.status}">
                    <td>${result.name}</td>
                    <td>${result.status.toUpperCase()}</td>
                    <td>${(result.duration / 1000).toFixed(2)}s</td>
                    <td>${result.details || '-'}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    `).join('')}
</body>
</html>`;
  }

  private generateMarkdownSummary(report: PerformanceReport): string {
    const status = report.overall.success ? '✅ PASSED' : '❌ FAILED';

    return `# NSM Framework Performance Test Report

**Generated:** ${report.timestamp}
**Status:** ${status}
**Duration:** ${(report.overall.duration / 1000).toFixed(2)}s

## Environment

- **Platform:** ${report.environment.platform} ${report.environment.arch}
- **Node.js:** ${report.environment.nodeVersion}
- **CPUs:** ${report.environment.cpuCount}
- **Memory:** ${(report.environment.totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB

## Summary

- **Total Tests:** ${report.overall.total}
- **Passed:** ${report.overall.passed}
- **Failed:** ${report.overall.failed}
- **Skipped:** ${report.overall.skipped}

## Test Suites

${report.testSuites.map(suite => `
### ${suite.name}

- **Tests:** ${suite.summary.total}
- **Passed:** ${suite.summary.passed}
- **Failed:** ${suite.summary.failed}
- **Duration:** ${(suite.summary.duration / 1000).toFixed(2)}s

${suite.results.map(result => `
- **${result.name}:** ${result.status.toUpperCase()} (${(result.duration / 1000).toFixed(2)}s)${result.details ? `\n  - Details: ${result.details}` : ''}
`).join('')}
`).join('')}

## Recommendations

${report.overall.failed > 0 ? `
⚠️ **Performance issues detected:**
- Review failed tests for performance regressions
- Check memory usage and potential leaks
- Validate against performance baselines
` : `
✅ **All performance tests passed:**
- Performance is within acceptable limits
- No regressions detected
- System is ready for production
`}
`;
  }

  private printSummary(report: PerformanceReport): void {
    console.log('\n' + '='.repeat(50));
    console.log('📊 PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(50));

    console.log(`\n🎯 Overall Result: ${report.overall.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`⏱️  Total Duration: ${(report.overall.duration / 1000).toFixed(2)}s`);
    console.log(`📈 Tests: ${report.overall.total} total, ${report.overall.passed} passed, ${report.overall.failed} failed, ${report.overall.skipped} skipped`);

    console.log('\n📋 Test Suite Results:');
    report.testSuites.forEach(suite => {
      const status = suite.summary.failed === 0 ? '✅' : '❌';
      console.log(`  ${status} ${suite.name}: ${suite.summary.passed}/${suite.summary.total} passed (${(suite.summary.duration / 1000).toFixed(2)}s)`);
    });

    if (report.overall.failed > 0) {
      console.log('\n🚨 Failed Tests:');
      report.testSuites.forEach(suite => {
        suite.results.filter(r => r.status === 'failed').forEach(result => {
          console.log(`  ❌ ${suite.name} > ${result.name}`);
          if (result.details) {
            console.log(`     ${result.details}`);
          }
        });
      });
    }

    console.log('\n🎯 Next Steps:');
    if (report.overall.success) {
      console.log('  ✅ All performance tests passed');
      console.log('  📊 Review performance reports for optimization opportunities');
      console.log('  🚀 System is ready for production deployment');
    } else {
      console.log('  🔍 Investigate failed tests');
      console.log('  📈 Compare against performance baselines');
      console.log('  🛠️  Optimize performance bottlenecks');
      console.log('  🔄 Re-run tests after fixes');
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options: any = {};

  // Parse command line arguments
  args.forEach((arg, index) => {
    switch (arg) {
      case '--suite':
        options.suite = args[index + 1];
        break;
      case '--generate-baselines':
        options.generateBaselines = true;
        break;
      case '--skip-long-running':
        options.skipLongRunning = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
        console.log(`
NSM Framework Performance Test Runner

Usage: bun run-performance-tests.ts [options]

Options:
  --suite <name>           Run specific test suite (partial name match)
  --generate-baselines     Generate new performance baselines
  --skip-long-running      Skip long-running tests (load tests)
  --verbose               Enable verbose output
  --help                  Show this help message

Examples:
  bun run-performance-tests.ts
  bun run-performance-tests.ts --suite "state machine"
  bun run-performance-tests.ts --generate-baselines
  bun run-performance-tests.ts --skip-long-running --verbose
        `);
        process.exit(0);
    }
  });

  const runner = new PerformanceTestRunner();
  const report = await runner.run(options);

  process.exit(report.overall.success ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Performance test runner failed:', error);
    process.exit(1);
  });
}

export { PerformanceTestRunner };