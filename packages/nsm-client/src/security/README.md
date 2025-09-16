# NSM Framework Security Implementation

## Overview

The NSM (Nostr State Machine) framework includes comprehensive security measures to protect against code injection, privilege escalation, resource exhaustion, and other security vulnerabilities when executing untrusted state machine code.

## Security Architecture

### 1. SecuritySandbox

The core security component that provides isolated execution environments for untrusted code.

**Key Features:**
- Web Worker-based isolation for maximum security
- Configurable security policies with strict defaults
- Rate limiting per user/session
- Violation tracking and automatic blocking
- Content Security Policy (CSP) integration
- Resource usage monitoring and limits

**Location:** `src/security/sandbox.ts`

### 2. NSMStateMachineSecure

Enhanced state machine class with integrated security sandbox for action execution.

**Key Features:**
- Secure action wrappers using SecuritySandbox
- Enhanced validation for machine definitions
- Complexity analysis and limits
- Content pattern detection
- Integration with security metrics

**Location:** `src/state-machine-secure.ts`

### 3. CSPManager

Content Security Policy management for additional protection.

**Location:** `src/security/sandbox.ts` (integrated)

## Security Policies

### Default Security Policy

```typescript
{
  maxExecutionTime: 5000,      // 5 seconds
  maxMemoryMB: 50,             // 50MB memory limit
  allowNetworkAccess: false,   // No network access
  allowedDomains: [],          // No external domains
  allowedGlobals: [],          // No global access by default
  enableWebWorker: true,       // Use Web Workers when available
  enableCSP: true,             // Enable Content Security Policy
  rateLimit: {
    windowMs: 60000,           // 1 minute window
    maxExecutions: 100         // 100 executions per window
  }
}
```

### Customizable Options

```typescript
interface SecurityPolicy {
  maxExecutionTime: number;
  maxMemoryMB: number;
  allowNetworkAccess: boolean;
  allowedDomains: string[];
  allowedGlobals: string[];
  enableWebWorker: boolean;
  enableCSP: boolean;
  rateLimit: {
    windowMs: number;
    maxExecutions: number;
  };
}
```

## Threat Protection

### 1. Code Injection Prevention

**Protected Against:**
- `eval()` function calls
- `Function()` constructor usage
- Template literal injection (`${...}`)
- Prototype pollution (`__proto__`, `constructor`)
- Import/require statement injection

**Implementation:**
- Pattern-based detection in function source code
- AST-level validation during machine loading
- Runtime execution context isolation

### 2. Privilege Escalation Protection

**Protected Against:**
- Global object access (`window`, `global`, `process`)
- Node.js API access (`fs`, `child_process`)
- Browser API access without permission
- Dangerous function methods (`.call`, `.apply`, `.bind`)

**Implementation:**
- Restricted execution context with allowlisted globals only
- Proxy-based global access control
- Web Worker isolation for maximum protection

### 3. Resource Exhaustion Protection

**Protected Against:**
- Infinite loops and excessive CPU usage
- Memory consumption attacks
- Excessive function complexity
- Large object/array creation

**Implementation:**
- Execution timeouts with configurable limits
- Memory usage monitoring and limits
- Function complexity analysis
- Pattern detection for resource-heavy operations

### 4. DoS Protection

**Protected Against:**
- High-frequency execution attempts
- Large payload attacks
- Excessive violation attempts
- Complex nested object attacks

**Implementation:**
- Per-user rate limiting with configurable windows
- Violation tracking and automatic blocking
- Content size limits and validation
- Nesting depth limits for object structures

## Usage Examples

### Basic Secure Execution

```typescript
import { SecuritySandbox } from './security/sandbox';

const sandbox = SecuritySandbox.getInstance();

// Execute untrusted function securely
const result = await sandbox.executeSecure(
  (x, y) => x + y,
  [5, 3],
  {
    userId: 'user123',
    timestamp: Date.now()
  },
  {
    allowedGlobals: ['Math'],
    maxExecutionTime: 1000
  }
);

console.log(result.result); // 8
console.log(result.metrics); // Execution metrics
```

### NSM State Machine with Security

```typescript
import { NSMStateMachineSecure } from './state-machine-secure';

const machine = new NSMStateMachineSecure();

// Load machine with enhanced security validation
const stateMachine = machine.loadMachineSecure(definition, 'user123');

// Create secure sandbox for actions
const sandbox = machine.createSandbox({
  logAction: () => console.log('Action executed'),
  calculateValue: (x) => x * 2
}, {
  timeout: 2000,
  allowedGlobals: ['Math', 'Date'],
  enableWebWorker: true
});
```

### Custom Security Policy

```typescript
import { SecuritySandbox, type SecurityPolicy } from './security/sandbox';

const customPolicy: Partial<SecurityPolicy> = {
  maxExecutionTime: 10000,
  maxMemoryMB: 100,
  allowNetworkAccess: true,
  allowedDomains: ['https://api.nostr.com'],
  allowedGlobals: ['Math', 'Date', 'JSON', 'console'],
  rateLimit: {
    windowMs: 120000,
    maxExecutions: 50
  }
};

const sandbox = SecuritySandbox.getInstance();
const result = await sandbox.executeSecure(fn, args, context, customPolicy);
```

## Security Monitoring

### Metrics Collection

```typescript
const sandbox = SecuritySandbox.getInstance();
const metrics = sandbox.getSecurityMetrics();

console.log({
  activeRateLimits: metrics.activeRateLimits,
  totalViolations: metrics.totalViolations,
  violationsByUser: metrics.violationsByUser
});
```

### Violation Tracking

The security system automatically tracks:
- Code injection attempts
- Privilege escalation attempts
- Resource exhaustion attempts
- Rate limit violations

Users with more than 10 violations are automatically blocked from further execution.

## Content Security Policy

### Default CSP

```
default-src 'none';
script-src 'unsafe-eval' 'unsafe-inline';
connect-src 'none';
worker-src blob:;
object-src 'none';
base-uri 'none';
```

### Custom CSP with Network Access

```typescript
import { CSPManager } from './security/sandbox';

const csp = CSPManager.generateCSP(true, [
  'https://relay.damus.io',
  'https://nos.lol'
]);

CSPManager.applyCSP(csp);
```

## Testing

### Security Test Coverage

The security implementation includes comprehensive tests covering:

- **Code Injection**: 8 test cases covering various injection vectors
- **Resource Exhaustion**: 4 test cases for CPU/memory limits
- **API Access Control**: 6 test cases for global access restrictions
- **Rate Limiting**: 4 test cases for DoS protection
- **Violation Tracking**: 3 test cases for monitoring and blocking
- **Cryptographic Verification**: 4 test cases for content validation

**Test Files:**
- `src/security/sandbox.test.ts` - Comprehensive security tests
- `src/security/sandbox-focused.test.ts` - Core security feature tests
- `src/state-machine.test.ts` - Integration tests with NSM framework

### Running Security Tests

```bash
# Run all security tests
bun test src/security/

# Run focused security tests
bun test src/security/sandbox-focused.test.ts

# Run integration tests
bun test src/state-machine.test.ts
```

## Production Deployment

### Recommended Configuration

```typescript
// Production security policy
const productionPolicy: SecurityPolicy = {
  maxExecutionTime: 3000,        // 3 seconds max
  maxMemoryMB: 25,               // 25MB max memory
  allowNetworkAccess: true,      // Allow Nostr/Blossom access
  allowedDomains: [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'https://primal.net',        // Blossom servers
    'https://nostrage.com'
  ],
  allowedGlobals: ['Math', 'Date', 'JSON'],
  enableWebWorker: true,
  enableCSP: true,
  rateLimit: {
    windowMs: 60000,             // 1 minute
    maxExecutions: 50            // Conservative limit
  }
};
```

### Monitoring and Alerting

1. **Set up metrics collection** for security violations
2. **Monitor rate limiting** patterns for abuse detection
3. **Track memory and CPU usage** for resource exhaustion attempts
4. **Log all security violations** for forensic analysis
5. **Set up alerts** for high violation rates

### Regular Maintenance

1. **Clean up expired rate limit records** periodically
2. **Review violation patterns** for new attack vectors
3. **Update security policies** based on usage patterns
4. **Monitor performance impact** of security measures

## Integration with NSM Framework

### Nostr Event Security

The security system validates:
- Nostr event structure and signatures
- Content hash integrity for Blossom assets
- Rate limiting for event publishing
- Input sanitization for user content

### State Machine Security

The security system protects:
- State machine definition loading
- Action implementation execution
- Context data validation
- Transition logic integrity

### Blossom Integration Security

The security system ensures:
- Content hash verification
- Authorized asset access
- Secure file operations
- Protected download operations

## Performance Considerations

### Overhead Analysis

- **Web Worker Creation**: ~5-10ms overhead per execution
- **Security Validation**: ~1-2ms per function validation
- **Memory Monitoring**: Minimal overhead (~0.1ms)
- **Rate Limiting**: ~0.5ms per execution check

### Optimization Tips

1. **Enable Web Workers** for CPU-intensive operations
2. **Use allowlist caching** for frequently accessed globals
3. **Batch security validations** when possible
4. **Monitor and tune rate limits** based on usage patterns

## Security Audit Checklist

- [ ] All user inputs validated and sanitized
- [ ] No direct `eval()` or `Function()` usage
- [ ] Rate limiting properly configured
- [ ] Memory limits appropriate for use case
- [ ] Network access properly restricted
- [ ] Content Security Policy configured
- [ ] Violation tracking and alerting set up
- [ ] Regular security metrics review
- [ ] Penetration testing completed
- [ ] Code review for security vulnerabilities

## Future Enhancements

### Planned Features

1. **WebAssembly Sandbox**: Even stronger isolation
2. **Machine Learning Detection**: AI-powered threat detection
3. **Dynamic Policy Adjustment**: Adaptive security based on threat levels
4. **Blockchain Logging**: Immutable security audit logs
5. **Multi-Tenant Isolation**: Per-tenant security policies

### Research Areas

1. **Formal Verification**: Mathematical proof of security properties
2. **Zero-Knowledge Proofs**: Privacy-preserving security validation
3. **Hardware Security**: TEE integration for maximum protection
4. **Quantum-Resistant Security**: Future-proof cryptographic measures