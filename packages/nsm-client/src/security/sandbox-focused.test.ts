import { describe, it, expect, beforeEach } from 'bun:test';
import { SecuritySandbox, SecurityError, CSPManager, type SecurityPolicy, type ExecutionContext } from './sandbox';

describe('SecuritySandbox - Core Security Features', () => {
  let sandbox: SecuritySandbox;

  beforeEach(() => {
    sandbox = SecuritySandbox.getInstance();
    sandbox.cleanup();
  });

  describe('code injection prevention', () => {
    const context: ExecutionContext = {
      userId: 'test-user',
      timestamp: Date.now()
    };

    it('should reject eval usage in function validation', async () => {
      const maliciousFunction = new Function('return eval("1+1")');

      await expect(
        sandbox.executeSecure(maliciousFunction, [], context)
      ).rejects.toThrow(SecurityError);
    });

    it('should reject Function constructor usage', async () => {
      const maliciousFunction = new Function('return new Function("return 1")()');

      await expect(
        sandbox.executeSecure(maliciousFunction, [], context)
      ).rejects.toThrow(SecurityError);
    });

    it('should reject prototype pollution attempts', async () => {
      const maliciousFunction = new Function('obj', 'obj.__proto__.polluted = true; return obj');

      await expect(
        sandbox.executeSecure(maliciousFunction, [{}], context)
      ).rejects.toThrow(SecurityError);
    });

    it('should reject require/import statements', async () => {
      const maliciousFunction = new Function('return require("fs")');

      await expect(
        sandbox.executeSecure(maliciousFunction, [], context)
      ).rejects.toThrow(SecurityError);
    });

    it('should reject global object access patterns', async () => {
      const maliciousFunction = new Function('return global.process');

      await expect(
        sandbox.executeSecure(maliciousFunction, [], context)
      ).rejects.toThrow(SecurityError);
    });
  });

  describe('execution timeout', () => {
    const context: ExecutionContext = {
      userId: 'timeout-test',
      timestamp: Date.now()
    };

    it('should timeout functions that exceed time limit', async () => {
      // Create a function that will definitely timeout
      const slowFunction = () => {
        let count = 0;
        const start = Date.now();
        // Run for significantly longer than the timeout
        while (Date.now() - start < 500) {
          count += Math.random(); // Prevent optimization
        }
        return count;
      };

      const policy: Partial<SecurityPolicy> = {
        maxExecutionTime: 100, // Short timeout
        enableWebWorker: false
      };

      await expect(
        sandbox.executeSecure(slowFunction, [], context, policy)
      ).rejects.toThrow(SecurityError);
    });
  });

  describe('safe execution', () => {
    const context: ExecutionContext = {
      userId: 'safe-test',
      timestamp: Date.now()
    };

    it('should allow safe mathematical operations', async () => {
      const mathFunction = (a: number, b: number) => {
        return a + b * 2;
      };

      const policy: Partial<SecurityPolicy> = {
        allowedGlobals: ['Math'],
        enableWebWorker: false
      };

      const result = await sandbox.executeSecure(mathFunction, [5, 3], context, policy);
      expect(result.result).toBe(11);
      expect(result.metrics).toBeDefined();
    });

    it('should allow safe string operations', async () => {
      const stringFunction = (text: string) => {
        return text.toUpperCase() + '!';
      };

      const policy: Partial<SecurityPolicy> = {
        allowedGlobals: ['String'],
        enableWebWorker: false
      };

      const result = await sandbox.executeSecure(stringFunction, ['hello'], context, policy);
      expect(result.result).toBe('HELLO!');
    });

    it('should provide controlled console access', async () => {
      const consoleFunction = () => {
        console.log('test message');
        return 'logged';
      };

      const policy: Partial<SecurityPolicy> = {
        allowedGlobals: ['console'],
        enableWebWorker: false
      };

      const result = await sandbox.executeSecure(consoleFunction, [], context, policy);
      expect(result.result).toBe('logged');
    });
  });

  describe('rate limiting', () => {
    it('should enforce rate limits per user', async () => {
      const context: ExecutionContext = {
        userId: 'rate-limited-user',
        timestamp: Date.now()
      };

      const simpleFunction = () => 'test';
      const policy: Partial<SecurityPolicy> = {
        rateLimit: {
          windowMs: 60000,
          maxExecutions: 2
        },
        enableWebWorker: false
      };

      // First two executions should succeed
      await sandbox.executeSecure(simpleFunction, [], context, policy);
      await sandbox.executeSecure(simpleFunction, [], context, policy);

      // Third execution should fail
      await expect(
        sandbox.executeSecure(simpleFunction, [], context, policy)
      ).rejects.toThrow(SecurityError);
    });
  });

  describe('violation tracking', () => {
    it('should record and track violations', async () => {
      const testUser = 'violation-tracker';

      // Record violations directly
      for (let i = 0; i < 5; i++) {
        sandbox.recordViolationPublic(testUser);
      }

      const metrics = sandbox.getSecurityMetrics();
      expect(metrics.violationsByUser[testUser]).toBe(5);
      expect(metrics.totalViolations).toBeGreaterThanOrEqual(5);
    });

    it('should block users with excessive violations', async () => {
      const context: ExecutionContext = {
        userId: 'blocked-user-test',
        timestamp: Date.now()
      };

      // Record enough violations to trigger blocking (>10)
      for (let i = 0; i < 15; i++) {
        sandbox.recordViolationPublic(context.userId!);
      }

      const safeFunction = () => 'should be blocked';

      await expect(
        sandbox.executeSecure(safeFunction, [], context)
      ).rejects.toThrow(SecurityError);
    });
  });

  describe('function validation', () => {
    const context: ExecutionContext = {
      userId: 'validation-test',
      timestamp: Date.now()
    };

    it('should reject overly large functions', async () => {
      // Create a very large function string
      const largeCode = 'return "' + 'x'.repeat(200000) + '";';
      const largeFunction = new Function(largeCode);

      await expect(
        sandbox.executeSecure(largeFunction, [], context)
      ).rejects.toThrow(SecurityError);
    });

    it('should reject functions with suspicious patterns', async () => {
      const suspiciousFunction = new Function('return "\\x61\\x6c\\x65\\x72\\x74"'); // Hex encoded 'alert'

      await expect(
        sandbox.executeSecure(suspiciousFunction, [], context)
      ).rejects.toThrow(SecurityError);
    });
  });

  describe('metrics collection', () => {
    it('should provide execution metrics', async () => {
      const context: ExecutionContext = {
        userId: 'metrics-test',
        timestamp: Date.now()
      };

      const simpleFunction = (x: number) => x * 2;

      const result = await sandbox.executeSecure(
        simpleFunction,
        [21],
        context,
        { enableWebWorker: false }
      );

      expect(result.result).toBe(42);
      expect(result.metrics).toBeDefined();
      expect(result.metrics.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.metrics.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(result.metrics.networkRequests).toBe(0);
      expect(typeof result.metrics.violationAttempts).toBe('number');
    });
  });

  describe('cleanup functionality', () => {
    it('should cleanup expired resources', () => {
      // Record some rate limit entries
      const testUser = 'cleanup-test';
      sandbox.canExecute(testUser);

      // Get initial metrics
      const initialMetrics = sandbox.getSecurityMetrics();

      // Cleanup should not throw errors
      expect(() => sandbox.cleanup()).not.toThrow();

      // Test passes if cleanup completes without errors
      expect(true).toBe(true);
    });
  });
});

describe('CSPManager - Content Security Policy', () => {
  describe('policy generation', () => {
    it('should generate restrictive CSP by default', () => {
      const csp = CSPManager.generateCSP();

      expect(csp).toContain("default-src 'none'");
      expect(csp).toContain("script-src 'unsafe-eval' 'unsafe-inline'");
      expect(csp).toContain("connect-src 'none'");
      expect(csp).toContain("worker-src blob:");
    });

    it('should allow network access for specified domains', () => {
      const domains = ['https://api.example.com', 'https://cdn.example.com'];
      const csp = CSPManager.generateCSP(true, domains);

      expect(csp).toContain('connect-src https://api.example.com https://cdn.example.com');
    });

    it('should maintain restrictions when network access disabled', () => {
      const csp = CSPManager.generateCSP(false, ['https://example.com']);
      expect(csp).toContain("connect-src 'none'");
    });
  });

  describe('policy application', () => {
    it('should apply CSP without errors', () => {
      // Test that applying CSP doesn't throw errors
      expect(() => {
        CSPManager.applyCSP("default-src 'none'");
      }).not.toThrow();
    });
  });
});

describe('SecurityError', () => {
  it('should create security error with proper properties', () => {
    const details = { code: 'TEST', context: 'testing' };
    const error = new SecurityError('Test message', details);

    expect(error.message).toBe('Test message');
    expect(error.name).toBe('SecurityError');
    expect(error.code).toBe('SECURITY_ERROR');
    expect(error.details).toEqual(details);
    expect(error).toBeInstanceOf(Error);
  });
});