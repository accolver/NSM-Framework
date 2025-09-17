# NSM Ecosystem Compatibility Standards

## Overview

The NSM Ecosystem Compatibility Standards define the requirements and guidelines for ensuring interoperability, consistency, and reliability across all NSM implementations. These standards enable developers to build applications and tools that work seamlessly within the NSM ecosystem while maintaining the flexibility to innovate and optimize for specific use cases.

## Core Compatibility Principles

### 1. Protocol Compliance
All NSM implementations must strictly adhere to the official NIP specifications to ensure universal compatibility.

### 2. Deterministic Behavior
Implementations must produce identical results for the same inputs, regardless of programming language, platform, or optimization techniques.

### 3. Version Compatibility
Backward compatibility must be maintained across protocol versions, with clear migration paths for breaking changes.

### 4. Cross-Platform Consistency
NSM applications should function identically across different operating systems, browsers, and runtime environments.

## Protocol Conformance Requirements

### 1. Event Format Compliance

#### NSM Definition Events (Kind 30079)
**Required Structure**:
```json
{
  "id": "<event-id>",
  "pubkey": "<author-pubkey>",
  "created_at": <unix-timestamp>,
  "kind": 30079,
  "tags": [
    ["d", "<identifier>"],
    ["name", "<human-readable-name>"],
    ["engine", "<execution-engine>"],
    ["description", "<optional-description>"],
    ["version", "<optional-version>"],
    ["engineCodeURI", "<optional-code-uri>"]
  ],
  "content": "<json-serialized-definition>",
  "sig": "<event-signature>"
}
```

**Content Schema**:
```json
{
  "initialState": { /* JSON object */ },
  "stateSchema": { /* JSON Schema v7 */ },
  "interactionSchema": { /* JSON Schema v7 */ }
}
```

**Validation Requirements**:
- Event ID must be deterministically calculated using standard Nostr algorithm
- Content must be valid JSON with no extra whitespace
- Schemas must be valid JSON Schema Draft 7
- Tags must include required fields: `d`, `name`, `engine`

#### NSM Interaction Events (Kind 7000-7999)
**Required Structure**:
```json
{
  "id": "<event-id>",
  "pubkey": "<author-pubkey>",
  "created_at": <unix-timestamp>,
  "kind": <computed-kind-7000-7999>,
  "tags": [
    ["a", "<application-address>"],
    ["p", "<participant-pubkey>"] // optional, multiple allowed
  ],
  "content": "<json-serialized-interaction>",
  "sig": "<event-signature>"
}
```

**Kind Calculation**:
```javascript
function calculateInteractionKind(address) {
  const hash = sha256(address);
  const hashInt = parseInt(hash.substring(0, 8), 16);
  return 7000 + (hashInt % 1000);
}
```

**Content Schema**:
```json
{
  "type": "<interaction-type>",
  "payload": { /* interaction-specific data */ },
  "metadata": { /* optional metadata */ }
}
```

#### NSM State Update Events (Kind 10079)
**Required Structure**:
```json
{
  "id": "<event-id>",
  "pubkey": "<author-pubkey>",
  "created_at": <unix-timestamp>,
  "kind": 10079,
  "tags": [
    ["a", "<application-address>"],
    ["p", "<participant-pubkey>"], // optional, multiple allowed
    ["arbiter", "<arbiter-pubkey>"] // optional
  ],
  "content": "<json-serialized-state-update>",
  "sig": "<event-signature>"
}
```

**Content Schema**:
```json
{
  "state": { /* current application state */ },
  "metadata": {
    "stateVersion": <version-number>,
    "lastInteractionId": "<interaction-event-id>",
    "conflictResolution": "<resolution-strategy>",
    "computationEngine": "<engine-identifier>"
  }
}
```

### 2. Address Format Compliance

#### Standard Address Format
```
<kind>:<pubkey>:<identifier>
```

**Components**:
- `kind`: Event kind (30079 for NSM applications)
- `pubkey`: 64-character hex public key of application owner
- `identifier`: URL-safe identifier from 'd' tag

**Validation Rules**:
- Total length must be ≤ 200 characters
- Identifier must match regex: `^[a-zA-Z0-9._-]+$`
- No reserved identifiers: `nsm`, `protocol`, `system`

**Examples**:
```
30079:e91312aaa8b9d96...7a9f8:simple-counter
30079:b8c5a6d7e3f4e8...9d2c:collaborative-todo
30079:3f7a8b9c1d2e3f...6a5b:chess-game
```

### 3. Cryptographic Compliance

#### Event Signing
**Algorithm**: Schnorr signatures over secp256k1 curve (same as Nostr)

**Signature Process**:
1. Serialize event without `id` and `sig` fields
2. Calculate SHA-256 hash of serialized event
3. Sign hash using private key with Schnorr algorithm
4. Encode signature as 128-character hex string

**Verification Process**:
1. Extract signature and recalculate event hash
2. Verify signature against hash and public key
3. Validate that event ID matches hash

#### Event ID Calculation
**Standard Implementation**:
```javascript
function calculateEventId(event) {
  const serialized = JSON.stringify([
    0,                    // Reserved field
    event.pubkey,         // Public key
    event.created_at,     // Timestamp
    event.kind,           // Event kind
    event.tags,           // Tags array
    event.content         // Event content
  ]);
  return sha256(utf8Encode(serialized));
}
```

**Deterministic Requirements**:
- Tags must be sorted consistently
- No extra whitespace in JSON serialization
- UTF-8 encoding must be used
- Same input must always produce same output

### 4. State Computation Compliance

#### Deterministic State Calculation
**Process**:
1. Retrieve all interactions for application in chronological order
2. Apply conflict resolution to determine canonical interaction sequence
3. Compute state by applying interactions to initial state sequentially
4. Validate final state against state schema

**Conflict Resolution Standards**:

**Timestamp-Based Resolution**:
```javascript
function timestampBasedResolution(events) {
  return events.sort((a, b) => {
    if (a.created_at !== b.created_at) {
      return b.created_at - a.created_at; // Latest first
    }
    return a.id.localeCompare(b.id); // Lexicographic by ID
  })[0];
}
```

**Owner-Based Resolution**:
```javascript
function ownerBasedResolution(events, ownerPubkey) {
  const ownerEvents = events.filter(e => e.pubkey === ownerPubkey);
  if (ownerEvents.length > 0) {
    return timestampBasedResolution(ownerEvents);
  }
  return timestampBasedResolution(events);
}
```

## Implementation Standards

### 1. SDK Interface Compliance

#### Core Client Interface
All NSM SDK implementations must provide equivalent APIs with consistent behavior:

```typescript
interface NSMClientStandard {
  // Application Management
  createApplication(definition: NSMDefinition): Promise<string>;
  getApplication(address: string): Promise<NSMApplication | null>;

  // State Management
  getCurrentState<T>(address: string): Promise<T>;
  subscribeToState<T>(address: string, callback: (state: T) => void): Unsubscribe;

  // Interaction Publishing
  publishInteraction(address: string, interaction: NSMInteraction): Promise<string>;

  // Event Querying
  getInteractions(address: string, filter?: InteractionFilter): Promise<NSMInteraction[]>;

  // Connection Management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}
```

#### Error Handling Standards
**Standard Error Types**:
```typescript
class NSMValidationError extends Error {
  constructor(public errors: ValidationError[]) {
    super('Validation failed');
  }
}

class NSMConnectionError extends Error {
  constructor(public relayUrl: string, cause: Error) {
    super(`Connection failed: ${relayUrl}`);
  }
}

class NSMConflictError extends Error {
  constructor(public conflictingEvents: NSMEvent[]) {
    super('Unresolvable conflict detected');
  }
}
```

**Error Handling Requirements**:
- All errors must include relevant context information
- Network errors must be retryable with exponential backoff
- Validation errors must specify which fields failed validation
- Conflict errors must provide details about conflicting events

### 2. Performance Standards

#### Response Time Requirements
**Target Performance**:
- Event creation: < 50ms
- Event validation: < 10ms
- State computation: < 100ms for 1000 interactions
- Relay connection: < 2000ms
- Event publishing: < 500ms

**Memory Usage**:
- Client overhead: < 10MB for basic functionality
- State cache: < 1MB per application
- Event cache: < 5MB total
- Memory growth: < 1MB per hour of operation

#### Benchmark Test Suite
```javascript
// Standard performance test
async function benchmarkStateComputation(interactions) {
  const start = performance.now();

  let state = initialState;
  for (const interaction of interactions) {
    state = applyInteraction(state, interaction);
  }

  const duration = performance.now() - start;

  // Must complete within time budget
  expect(duration).toBeLessThan(100); // 100ms for 1000 interactions

  return { duration, state };
}
```

### 3. Validation Standards

#### JSON Schema Validation
**Required Validator**: JSON Schema Draft 7 compliance

**Schema Validation Process**:
1. Parse and validate schema structure
2. Compile schema for efficient validation
3. Validate data against compiled schema
4. Return detailed error information for failures

**Standard Validation Implementation**:
```javascript
function validateAgainstSchema(data, schema) {
  try {
    const ajv = new Ajv({ allErrors: true });
    const validate = ajv.compile(schema);
    const valid = validate(data);

    return {
      valid,
      errors: valid ? [] : validate.errors.map(formatError)
    };
  } catch (error) {
    return {
      valid: false,
      errors: [{ message: 'Schema compilation failed', error }]
    };
  }
}
```

#### Event Validation Requirements
**Validation Checklist**:
- [ ] Event structure matches required format
- [ ] Event kind is within valid range
- [ ] Required tags are present and valid
- [ ] Content is valid JSON
- [ ] Signature verification passes
- [ ] Event ID calculation is correct
- [ ] Content validates against appropriate schema

### 4. Testing Standards

#### Compatibility Test Suite
**Required Test Coverage**:
- Event creation and validation (100%)
- State computation algorithms (100%)
- Conflict resolution mechanisms (100%)
- Network communication (95%)
- Error handling scenarios (90%)

**Cross-Implementation Testing**:
```javascript
describe('Cross-Implementation Compatibility', () => {
  test('should produce identical event IDs', () => {
    const testEvent = createTestEvent();

    const tsId = calculateEventId_TypeScript(testEvent);
    const pyId = calculateEventId_Python(testEvent);
    const goId = calculateEventId_Go(testEvent);

    expect(tsId).toEqual(pyId);
    expect(pyId).toEqual(goId);
  });

  test('should compute identical state', async () => {
    const interactions = createTestInteractions();

    const tsState = await computeState_TypeScript(interactions);
    const pyState = await computeState_Python(interactions);
    const goState = await computeState_Go(interactions);

    expect(tsState).toEqual(pyState);
    expect(pyState).toEqual(goState);
  });
});
```

## Quality Assurance Framework

### 1. Compliance Certification

#### Certification Levels
**Level 1: Basic Compliance**
- Core protocol implementation
- Standard event format support
- Basic validation functionality
- Minimal performance requirements

**Level 2: Production Ready**
- Advanced conflict resolution
- Performance optimization
- Comprehensive error handling
- Security best practices

**Level 3: Ecosystem Leadership**
- Framework integrations
- Developer tools
- Community contributions
- Innovation and extensions

#### Certification Process
1. **Self-Assessment**: Implementation team completes compliance checklist
2. **Automated Testing**: Run standardized test suite against implementation
3. **Peer Review**: Community review of implementation code and documentation
4. **Performance Validation**: Benchmark testing against standard requirements
5. **Security Audit**: Independent security review of implementation
6. **Certification Award**: Official ecosystem compatibility certification

### 2. Continuous Monitoring

#### Compatibility Dashboard
**Metrics Tracked**:
- Cross-implementation event compatibility rate
- State computation consistency across implementations
- Performance benchmark trends
- Error rate and handling effectiveness

**Monitoring Infrastructure**:
```javascript
class CompatibilityMonitor {
  async runDailyCompatibilityCheck() {
    const implementations = ['typescript', 'python', 'go'];
    const testCases = generateCompatibilityTestCases();

    for (const testCase of testCases) {
      const results = await Promise.all(
        implementations.map(impl => runTestCase(impl, testCase))
      );

      const compatible = results.every(r =>
        JSON.stringify(r) === JSON.stringify(results[0])
      );

      if (!compatible) {
        this.reportCompatibilityIssue(testCase, results);
      }
    }
  }
}
```

### 3. Issue Resolution Process

#### Compatibility Issue Workflow
1. **Detection**: Automated monitoring or community report
2. **Triage**: Classify severity and impact scope
3. **Investigation**: Root cause analysis across implementations
4. **Resolution**: Coordinate fixes across all affected implementations
5. **Validation**: Re-test compatibility across ecosystem
6. **Communication**: Update community on resolution

#### Severity Classification
**Critical**: Protocol compliance violation, security issue
**High**: State computation inconsistency, significant performance degradation
**Medium**: Minor API inconsistency, documentation gaps
**Low**: Style or convention differences, optimization opportunities

## Version Management and Evolution

### 1. Protocol Versioning

#### Semantic Versioning for Protocol
**Major Version**: Breaking changes to core protocol
**Minor Version**: Backward-compatible feature additions
**Patch Version**: Bug fixes and clarifications

#### Version Compatibility Matrix
```yaml
Protocol Version Support:
  v1.0: All implementations required
  v1.1: New implementations required, existing encouraged
  v1.2: Optional adoption period (6 months)
  v2.0: Breaking changes, migration period (12 months)
```

### 2. Implementation Versioning

#### SDK Version Alignment
**Recommended Versioning**:
- SDK version should indicate protocol compatibility
- Example: `@nsm/sdk@1.2.3` supports NSM Protocol v1.x
- Clear documentation of supported protocol versions

#### Migration Support
**Migration Tools**:
- Automated schema migration utilities
- Compatibility shims for older versions
- Step-by-step migration guides
- Testing tools for migration validation

### 3. Deprecation Process

#### Deprecation Timeline
**6 Months Notice**: Announce deprecation with migration path
**3 Months Warning**: Final warning with specific removal date
**Removal Date**: Feature removed with clear error messages
**Legacy Support**: Optional paid support for enterprise customers

## Documentation Standards

### 1. Implementation Documentation

#### Required Documentation
**API Reference**: Complete interface documentation with examples
**Integration Guide**: Step-by-step implementation instructions
**Compatibility Guide**: Cross-implementation considerations
**Performance Guide**: Optimization recommendations
**Migration Guide**: Version upgrade instructions

#### Documentation Quality Standards
- All public APIs must have code examples
- Integration guides must be tested and verified
- Performance claims must be backed by benchmarks
- Breaking changes must include migration instructions

### 2. Community Resources

#### Shared Knowledge Base
**Implementation Comparison**: Feature matrix across languages
**Best Practices**: Curated recommendations from community
**Common Issues**: Known problems and solutions
**Performance Tips**: Optimization techniques and patterns

#### Regular Updates
- Monthly compatibility reports
- Quarterly ecosystem health reviews
- Annual standards review and updates
- Continuous community feedback integration

---

These comprehensive compatibility standards ensure that the NSM ecosystem maintains high quality, consistency, and interoperability while allowing for innovation and optimization within the established framework. Regular monitoring and community involvement guarantee that these standards evolve with the needs of developers and the broader Nostr ecosystem.