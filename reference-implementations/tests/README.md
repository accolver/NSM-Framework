# Cross-Language Interoperability Tests

This directory contains comprehensive test suites to validate that all NSM reference implementations can work together seamlessly across different programming languages.

## Test Categories

### 1. Event Format Compatibility
- **Definition Event Creation**: Ensures all implementations create compatible NSM Definition Events
- **Interaction Event Creation**: Validates cross-language interaction event compatibility
- **State Update Event Creation**: Tests state update event interoperability

### 2. Validation Compatibility
- **Valid Event Acceptance**: All implementations accept the same valid events
- **Invalid Event Rejection**: All implementations reject the same invalid events
- **Schema Validation Consistency**: Edge cases produce consistent validation results

### 3. Conflict Resolution Compatibility
- **Timestamp-Based Resolution**: Consistent winner selection using timestamps
- **Owner-Based Resolution**: Owner precedence with consistent fallback
- **Deterministic Ordering**: Event ordering is identical across implementations

### 4. Cryptographic Compatibility
- **Signature Verification**: Cross-language signature validation
- **Event ID Calculation**: Consistent event ID computation
- **Key Format Compatibility**: Keys work across all implementations

## Running Tests

### Prerequisites

1. **Node.js** (for test runner)
   ```bash
   npm install
   ```

2. **Python** (for Python implementation)
   ```bash
   cd ../python
   pip install -r requirements.txt
   ```

3. **Go** (for Go implementation)
   ```bash
   cd ../go
   go mod tidy
   ```

### Execute Test Suite

```bash
# Run all interoperability tests
node interoperability-test.js

# Run specific test categories
node interoperability-test.js --category event-compatibility
node interoperability-test.js --category validation
node interoperability-test.js --category conflict-resolution
node interoperability-test.js --category cryptographic
```

### Continuous Integration

```bash
# Run tests with detailed reporting
npm run test:interop

# Generate coverage reports
npm run test:coverage

# Run performance benchmarks
npm run test:performance
```

## Test Data

The test suite uses standardized test data to ensure consistency:

### Common Test Definition
```json
{
  "initialState": { "count": 0, "items": [] },
  "stateSchema": {
    "type": "object",
    "properties": {
      "count": { "type": "number" },
      "items": { "type": "array", "items": { "type": "string" } }
    },
    "required": ["count", "items"]
  },
  "interactionSchema": {
    "type": "object",
    "properties": {
      "type": { "type": "string", "enum": ["INCREMENT", "DECREMENT", "ADD_ITEM"] },
      "payload": { "type": "object" }
    },
    "required": ["type"]
  }
}
```

### Test Interactions
```json
[
  { "type": "INCREMENT", "payload": {} },
  { "type": "ADD_ITEM", "payload": { "item": "test-item-1" } },
  { "type": "DECREMENT", "payload": {} },
  { "type": "ADD_ITEM", "payload": { "item": "test-item-2" } }
]
```

### Expected State Transitions
```json
[
  { "count": 1, "items": [] },
  { "count": 1, "items": ["test-item-1"] },
  { "count": 0, "items": ["test-item-1"] },
  { "count": 0, "items": ["test-item-1", "test-item-2"] }
]
```

## Test Results

### Success Criteria
- ✅ **100% Event Compatibility**: All events created in one language validate in others
- ✅ **Consistent Validation**: Same validation results across all implementations
- ✅ **Deterministic Conflict Resolution**: Identical winners for conflict scenarios
- ✅ **Cryptographic Interoperability**: Signatures and keys work cross-language

### Reporting
Test results are saved to `interoperability-report.json` with:
- Summary statistics (passed/failed/success rate)
- Detailed test results with timestamps
- Error messages and stack traces for failures
- Test data used for reproducibility

### Example Report
```json
{
  "summary": {
    "total": 12,
    "passed": 12,
    "failed": 0,
    "successRate": 100
  },
  "results": [
    {
      "test": "Definition Event Creation",
      "status": "PASS",
      "error": null,
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Debugging Failures

### Common Issues

1. **JSON Schema Differences**
   - Check schema validation implementations
   - Verify edge case handling
   - Ensure consistent property types

2. **Cryptographic Mismatches**
   - Validate key derivation methods
   - Check signature algorithms
   - Verify event serialization format

3. **Timestamp Precision**
   - Ensure consistent timestamp handling
   - Check timezone and precision issues
   - Validate sorting algorithms

4. **Event Kind Calculation**
   - Verify deterministic kind assignment
   - Check hash function implementations
   - Validate address format parsing

### Debugging Commands

```bash
# Verbose test output
DEBUG=nsm:* node interoperability-test.js

# Test specific language combinations
node interoperability-test.js --creator=python --validator=go

# Isolate specific test cases
node interoperability-test.js --test="Signature Verification"
```

## Adding New Languages

To add a new language implementation to the test suite:

1. **Implement Test Interface**
   ```javascript
   async createDefinitionEvent(language) {
     case 'new-language':
       return await this.runNewLanguageCommand('create-definition', this.testData);
   }
   ```

2. **Add Command Runner**
   ```javascript
   async runNewLanguageCommand(command, data) {
     // Spawn process and handle communication
   }
   ```

3. **Update Configuration**
   ```javascript
   const TEST_CONFIG = {
     languages: ['typescript', 'python', 'go', 'new-language']
   };
   ```

4. **Implement Required Commands**
   - `create-definition`
   - `create-interaction`
   - `create-state-update`
   - `validate-event`
   - `resolve-conflicts`
   - `verify-signature`

## Performance Benchmarks

The test suite includes performance benchmarks to ensure implementations meet NSM protocol requirements:

### Target Performance
- **Event Creation**: < 10ms per event
- **Event Validation**: < 5ms per event
- **Conflict Resolution**: < 100ms for 100 events
- **Signature Verification**: < 20ms per signature

### Benchmark Commands
```bash
# Run performance tests
npm run benchmark

# Compare language performance
npm run benchmark:compare

# Memory usage analysis
npm run benchmark:memory
```

## Continuous Integration

### GitHub Actions Integration
```yaml
name: NSM Interoperability Tests
on: [push, pull_request]

jobs:
  interop-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - uses: actions/setup-python@v4
      - uses: actions/setup-go@v4
      - run: cd reference-implementations/tests && npm test
```

### Test Matrix
The CI runs tests across:
- Multiple Node.js versions (16, 18, 20)
- Multiple Python versions (3.8, 3.9, 3.10, 3.11)
- Multiple Go versions (1.19, 1.20, 1.21)
- Different operating systems (Ubuntu, macOS, Windows)

## Contributing

When contributing to the test suite:

1. **Add Tests for New Features**: Every new NSM feature needs interoperability tests
2. **Maintain Test Data**: Keep test fixtures consistent across languages
3. **Document Edge Cases**: Add tests for boundary conditions and error cases
4. **Performance Considerations**: Ensure tests complete within reasonable time limits
5. **Cross-Platform Compatibility**: Tests should work on all supported platforms

## Future Enhancements

- **Real-time Testing**: Test live relay communication between implementations
- **Stress Testing**: Large-scale event processing and conflict resolution
- **Network Partitioning**: Test behavior under network failures
- **Version Compatibility**: Test backward/forward compatibility across versions