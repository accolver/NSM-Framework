#!/usr/bin/env node
/**
 * Cross-Language Interoperability Test Suite
 *
 * This test suite validates that all NSM reference implementations
 * can work together seamlessly, ensuring true cross-language compatibility.
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Test configuration
const TEST_CONFIG = {
  relayUrl: 'wss://relay.damus.io',
  testTimeout: 30000,
  retryCount: 3,
  languages: ['typescript', 'python', 'go']
};

class InteroperabilityTester {
  constructor() {
    this.results = [];
    this.testData = {};
  }

  async runTests() {
    console.log('🧪 NSM Cross-Language Interoperability Test Suite');
    console.log('=' * 60);

    try {
      // Setup test environment
      await this.setupTestEnvironment();

      // Run core interoperability tests
      await this.testEventCompatibility();
      await this.testValidationCompatibility();
      await this.testConflictResolutionCompatibility();
      await this.testCryptographicCompatibility();

      // Generate test report
      this.generateReport();

    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  async setupTestEnvironment() {
    console.log('\n📋 Setting up test environment...');

    // Generate test keys and data
    this.testData = {
      privateKey: crypto.randomBytes(32).toString('hex'),
      identifier: `test-app-${Date.now()}`,
      testEvents: [],
      validationCases: []
    };

    // Prepare test fixtures
    this.prepareTestFixtures();

    console.log('✅ Test environment ready');
  }

  prepareTestFixtures() {
    // Common test definition
    this.testData.definition = {
      initialState: { count: 0, items: [] },
      stateSchema: {
        type: 'object',
        properties: {
          count: { type: 'number' },
          items: { type: 'array', items: { type: 'string' } }
        },
        required: ['count', 'items']
      },
      interactionSchema: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['INCREMENT', 'DECREMENT', 'ADD_ITEM'] },
          payload: { type: 'object' }
        },
        required: ['type']
      }
    };

    // Test interaction cases
    this.testData.interactions = [
      { type: 'INCREMENT', payload: {} },
      { type: 'ADD_ITEM', payload: { item: 'test-item-1' } },
      { type: 'DECREMENT', payload: {} },
      { type: 'ADD_ITEM', payload: { item: 'test-item-2' } }
    ];

    // Expected state transitions
    this.testData.expectedStates = [
      { count: 1, items: [] },
      { count: 1, items: ['test-item-1'] },
      { count: 0, items: ['test-item-1'] },
      { count: 0, items: ['test-item-1', 'test-item-2'] }
    ];
  }

  async testEventCompatibility() {
    console.log('\n🔄 Testing Event Format Compatibility...');

    const testCases = [
      {
        name: 'Definition Event Creation',
        test: () => this.testDefinitionEventCompatibility()
      },
      {
        name: 'Interaction Event Creation',
        test: () => this.testInteractionEventCompatibility()
      },
      {
        name: 'State Update Event Creation',
        test: () => this.testStateUpdateEventCompatibility()
      }
    ];

    for (const testCase of testCases) {
      try {
        console.log(`  • ${testCase.name}...`);
        await testCase.test();
        console.log(`    ✅ Passed`);
        this.recordResult(testCase.name, 'PASS');
      } catch (error) {
        console.log(`    ❌ Failed: ${error.message}`);
        this.recordResult(testCase.name, 'FAIL', error.message);
      }
    }
  }

  async testDefinitionEventCompatibility() {
    const events = {};

    // Create definition events using each implementation
    for (const lang of TEST_CONFIG.languages) {
      events[lang] = await this.createDefinitionEvent(lang);
    }

    // Validate that all implementations can read each other's events
    for (const creatorLang of TEST_CONFIG.languages) {
      for (const validatorLang of TEST_CONFIG.languages) {
        if (creatorLang !== validatorLang) {
          const isValid = await this.validateDefinitionEvent(
            events[creatorLang],
            validatorLang
          );

          if (!isValid) {
            throw new Error(
              `${validatorLang} cannot validate definition event created by ${creatorLang}`
            );
          }
        }
      }
    }
  }

  async testInteractionEventCompatibility() {
    const events = {};

    // Create interaction events using each implementation
    for (const lang of TEST_CONFIG.languages) {
      events[lang] = await this.createInteractionEvent(lang);
    }

    // Cross-validate all combinations
    for (const creatorLang of TEST_CONFIG.languages) {
      for (const validatorLang of TEST_CONFIG.languages) {
        if (creatorLang !== validatorLang) {
          const isValid = await this.validateInteractionEvent(
            events[creatorLang],
            validatorLang
          );

          if (!isValid) {
            throw new Error(
              `${validatorLang} cannot validate interaction event created by ${creatorLang}`
            );
          }
        }
      }
    }
  }

  async testStateUpdateEventCompatibility() {
    const events = {};

    // Create state update events using each implementation
    for (const lang of TEST_CONFIG.languages) {
      events[lang] = await this.createStateUpdateEvent(lang);
    }

    // Cross-validate all combinations
    for (const creatorLang of TEST_CONFIG.languages) {
      for (const validatorLang of TEST_CONFIG.languages) {
        if (creatorLang !== validatorLang) {
          const isValid = await this.validateStateUpdateEvent(
            events[creatorLang],
            validatorLang
          );

          if (!isValid) {
            throw new Error(
              `${validatorLang} cannot validate state update event created by ${creatorLang}`
            );
          }
        }
      }
    }
  }

  async testValidationCompatibility() {
    console.log('\n🔍 Testing Validation Compatibility...');

    const testCases = [
      {
        name: 'Valid Event Acceptance',
        test: () => this.testValidEventAcceptance()
      },
      {
        name: 'Invalid Event Rejection',
        test: () => this.testInvalidEventRejection()
      },
      {
        name: 'Schema Validation Consistency',
        test: () => this.testSchemaValidationConsistency()
      }
    ];

    for (const testCase of testCases) {
      try {
        console.log(`  • ${testCase.name}...`);
        await testCase.test();
        console.log(`    ✅ Passed`);
        this.recordResult(testCase.name, 'PASS');
      } catch (error) {
        console.log(`    ❌ Failed: ${error.message}`);
        this.recordResult(testCase.name, 'FAIL', error.message);
      }
    }
  }

  async testValidEventAcceptance() {
    // Test that all implementations accept the same valid events
    const validEvent = await this.createDefinitionEvent('typescript');

    for (const lang of TEST_CONFIG.languages) {
      const isValid = await this.validateDefinitionEvent(validEvent, lang);
      if (!isValid) {
        throw new Error(`${lang} rejected a valid event`);
      }
    }
  }

  async testInvalidEventRejection() {
    // Test that all implementations reject the same invalid events
    const invalidEvent = await this.createInvalidEvent();

    for (const lang of TEST_CONFIG.languages) {
      const isValid = await this.validateDefinitionEvent(invalidEvent, lang);
      if (isValid) {
        throw new Error(`${lang} accepted an invalid event`);
      }
    }
  }

  async testSchemaValidationConsistency() {
    // Test edge cases for schema validation
    const edgeCases = [
      { count: 0, items: [] }, // Valid minimal state
      { count: -1, items: [] }, // Potentially valid negative
      { count: 0, items: ['a', 'b'] }, // Valid with items
      { count: 'invalid', items: [] }, // Invalid type
      { items: [] }, // Missing required field
      { count: 0, items: 'invalid' } // Invalid array type
    ];

    for (const state of edgeCases) {
      const results = {};

      for (const lang of TEST_CONFIG.languages) {
        results[lang] = await this.validateState(state, lang);
      }

      // Check that all implementations agree
      const firstResult = results[TEST_CONFIG.languages[0]];
      for (const lang of TEST_CONFIG.languages.slice(1)) {
        if (results[lang] !== firstResult) {
          throw new Error(
            `Validation inconsistency for state ${JSON.stringify(state)}: ` +
            `${TEST_CONFIG.languages[0]}=${firstResult}, ${lang}=${results[lang]}`
          );
        }
      }
    }
  }

  async testConflictResolutionCompatibility() {
    console.log('\n⚔️ Testing Conflict Resolution Compatibility...');

    const testCases = [
      {
        name: 'Timestamp-Based Resolution',
        test: () => this.testTimestampResolution()
      },
      {
        name: 'Owner-Based Resolution',
        test: () => this.testOwnerResolution()
      },
      {
        name: 'Deterministic Ordering',
        test: () => this.testDeterministicOrdering()
      }
    ];

    for (const testCase of testCases) {
      try {
        console.log(`  • ${testCase.name}...`);
        await testCase.test();
        console.log(`    ✅ Passed`);
        this.recordResult(testCase.name, 'PASS');
      } catch (error) {
        console.log(`    ❌ Failed: ${error.message}`);
        this.recordResult(testCase.name, 'FAIL', error.message);
      }
    }
  }

  async testTimestampResolution() {
    // Create conflicting events with different timestamps
    const conflictingEvents = await this.createConflictingEvents();

    const results = {};
    for (const lang of TEST_CONFIG.languages) {
      results[lang] = await this.resolveConflicts(conflictingEvents, 'timestamp', lang);
    }

    // Check that all implementations pick the same winner
    const firstWinner = results[TEST_CONFIG.languages[0]];
    for (const lang of TEST_CONFIG.languages.slice(1)) {
      if (results[lang].id !== firstWinner.id) {
        throw new Error(
          `Conflict resolution inconsistency: ` +
          `${TEST_CONFIG.languages[0]} picked ${firstWinner.id}, ` +
          `${lang} picked ${results[lang].id}`
        );
      }
    }
  }

  async testOwnerResolution() {
    // Create conflicting events from owner and non-owner
    const conflictingEvents = await this.createOwnerConflictEvents();

    const results = {};
    for (const lang of TEST_CONFIG.languages) {
      results[lang] = await this.resolveConflicts(conflictingEvents, 'owner', lang);
    }

    // Check consistency
    const firstWinner = results[TEST_CONFIG.languages[0]];
    for (const lang of TEST_CONFIG.languages.slice(1)) {
      if (results[lang].id !== firstWinner.id) {
        throw new Error(`Owner-based resolution inconsistency`);
      }
    }
  }

  async testDeterministicOrdering() {
    // Test that ordering is deterministic across implementations
    const events = await this.createRandomEvents(10);

    const orderings = {};
    for (const lang of TEST_CONFIG.languages) {
      orderings[lang] = await this.orderEvents(events, lang);
    }

    // Check that all orderings are identical
    const firstOrdering = orderings[TEST_CONFIG.languages[0]];
    for (const lang of TEST_CONFIG.languages.slice(1)) {
      if (!this.arraysEqual(orderings[lang], firstOrdering)) {
        throw new Error(`Event ordering inconsistency between implementations`);
      }
    }
  }

  async testCryptographicCompatibility() {
    console.log('\n🔐 Testing Cryptographic Compatibility...');

    const testCases = [
      {
        name: 'Signature Verification',
        test: () => this.testSignatureVerification()
      },
      {
        name: 'Event ID Calculation',
        test: () => this.testEventIdCalculation()
      },
      {
        name: 'Key Format Compatibility',
        test: () => this.testKeyFormatCompatibility()
      }
    ];

    for (const testCase of testCases) {
      try {
        console.log(`  • ${testCase.name}...`);
        await testCase.test();
        console.log(`    ✅ Passed`);
        this.recordResult(testCase.name, 'PASS');
      } catch (error) {
        console.log(`    ❌ Failed: ${error.message}`);
        this.recordResult(testCase.name, 'FAIL', error.message);
      }
    }
  }

  async testSignatureVerification() {
    // Create events in one language and verify signatures in others
    for (const creatorLang of TEST_CONFIG.languages) {
      const event = await this.createSignedEvent(creatorLang);

      for (const verifierLang of TEST_CONFIG.languages) {
        if (creatorLang !== verifierLang) {
          const isValid = await this.verifySignature(event, verifierLang);
          if (!isValid) {
            throw new Error(
              `${verifierLang} cannot verify signature created by ${creatorLang}`
            );
          }
        }
      }
    }
  }

  async testEventIdCalculation() {
    // Test that event ID calculation is consistent
    const eventData = {
      pubkey: this.testData.privateKey,
      created_at: 1234567890,
      kind: 30079,
      tags: [['d', 'test']],
      content: JSON.stringify(this.testData.definition)
    };

    const eventIds = {};
    for (const lang of TEST_CONFIG.languages) {
      eventIds[lang] = await this.calculateEventId(eventData, lang);
    }

    // Check that all IDs are identical
    const firstId = eventIds[TEST_CONFIG.languages[0]];
    for (const lang of TEST_CONFIG.languages.slice(1)) {
      if (eventIds[lang] !== firstId) {
        throw new Error(
          `Event ID calculation inconsistency: ` +
          `${TEST_CONFIG.languages[0]}=${firstId}, ${lang}=${eventIds[lang]}`
        );
      }
    }
  }

  async testKeyFormatCompatibility() {
    // Test that keys can be used across implementations
    const privateKey = this.testData.privateKey;

    const publicKeys = {};
    for (const lang of TEST_CONFIG.languages) {
      publicKeys[lang] = await this.getPublicKey(privateKey, lang);
    }

    // Check that all public keys are identical
    const firstPubkey = publicKeys[TEST_CONFIG.languages[0]];
    for (const lang of TEST_CONFIG.languages.slice(1)) {
      if (publicKeys[lang] !== firstPubkey) {
        throw new Error(`Public key derivation inconsistency`);
      }
    }
  }

  // Implementation-specific helper methods
  async createDefinitionEvent(language) {
    switch (language) {
      case 'typescript':
        return await this.runTypeScriptCommand('create-definition', this.testData);
      case 'python':
        return await this.runPythonCommand('create-definition', this.testData);
      case 'go':
        return await this.runGoCommand('create-definition', this.testData);
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
  }

  async runTypeScriptCommand(command, data) {
    // Implementation would call the TypeScript NSM implementation
    // This is a placeholder that would integrate with the actual TypeScript code
    return {
      id: 'mock-typescript-event-id',
      kind: 30079,
      pubkey: 'mock-pubkey',
      created_at: Date.now(),
      content: JSON.stringify(data.definition),
      tags: [['d', data.identifier]],
      sig: 'mock-signature'
    };
  }

  async runPythonCommand(command, data) {
    // Implementation would spawn Python process with nsm_protocol.py
    return new Promise((resolve, reject) => {
      const python = spawn('python3', ['../python/nsm_protocol.py', command], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: __dirname
      });

      python.stdin.write(JSON.stringify(data));
      python.stdin.end();

      let output = '';
      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0) {
          try {
            resolve(JSON.parse(output));
          } catch (e) {
            reject(new Error(`Invalid JSON from Python: ${output}`));
          }
        } else {
          reject(new Error(`Python process failed with code ${code}`));
        }
      });
    });
  }

  async runGoCommand(command, data) {
    // Implementation would spawn Go process
    return new Promise((resolve, reject) => {
      const go = spawn('go', ['run', 'nsm.go', command], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.join(__dirname, '../go')
      });

      go.stdin.write(JSON.stringify(data));
      go.stdin.end();

      let output = '';
      go.stdout.on('data', (data) => {
        output += data.toString();
      });

      go.on('close', (code) => {
        if (code === 0) {
          try {
            resolve(JSON.parse(output));
          } catch (e) {
            reject(new Error(`Invalid JSON from Go: ${output}`));
          }
        } else {
          reject(new Error(`Go process failed with code ${code}`));
        }
      });
    });
  }

  recordResult(testName, status, error = null) {
    this.results.push({
      test: testName,
      status,
      error,
      timestamp: new Date().toISOString()
    });
  }

  generateReport() {
    console.log('\n📊 Test Results Summary');
    console.log('=' * 60);

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const total = this.results.length;

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(result => {
          console.log(`  • ${result.test}: ${result.error}`);
        });
    }

    // Write detailed report to file
    const report = {
      summary: { total, passed, failed, successRate: (passed / total) * 100 },
      results: this.results,
      testData: this.testData,
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(
      path.join(__dirname, 'interoperability-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\n📄 Detailed report saved to interoperability-report.json');

    if (failed > 0) {
      process.exit(1);
    }
  }

  // Utility methods
  arraysEqual(a, b) {
    return a.length === b.length && a.every((val, i) => val === b[i]);
  }
}

// Run the test suite
if (require.main === module) {
  const tester = new InteroperabilityTester();
  tester.runTests().catch(console.error);
}

module.exports = { InteroperabilityTester };