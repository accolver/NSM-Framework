/**
 * NSM Crypto Integration Demo
 * Demonstrates the complete cryptographic verification system
 */

import { BlossomVerifier, CryptoAuditLogger } from './packages/nsm-crypto/src/index.js';

async function demonstrateCryptoIntegration() {
  console.log('🔐 NSM Crypto Framework Integration Demo');
  console.log('==========================================\n');

  // Initialize components
  const auditLogger = new CryptoAuditLogger({ maxEntries: 100, retentionDays: 7 });
  const blossomVerifier = new BlossomVerifier(auditLogger);

  console.log('1. Content Integrity Verification');
  console.log('----------------------------------');

  // Test content integrity
  const applicationContent = JSON.stringify({
    identifier: 'nsm-demo-app',
    name: 'NSM Demo Application',
    engine: 'xstate',
    version: '1.0.0',
    initialState: { status: 'initialized', ready: true },
    stateSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['initialized', 'running', 'stopped'] },
        ready: { type: 'boolean' }
      }
    }
  });

  // Calculate content hash
  const contentHash = await blossomVerifier.calculateContentHash(applicationContent);
  console.log(`✅ Content hash calculated: ${contentHash.substring(0, 16)}...`);

  // Verify content integrity
  const verification = await blossomVerifier.verifyContentHash(
    applicationContent,
    contentHash,
    {
      algorithm: 'SHA-256',
      secureComparison: true,
      validateFormat: true
    }
  );

  if (verification.valid) {
    console.log('✅ Content integrity verified successfully');
  } else {
    console.log(`❌ Content integrity failed: ${verification.error}`);
  }

  // Generate integrity proof
  const integrityProof = await blossomVerifier.generateIntegrityProof(applicationContent);
  console.log(`✅ Integrity proof generated with timestamp: ${integrityProof.timestamp}`);

  // Verify integrity proof
  const proofVerification = await blossomVerifier.verifyIntegrityProof(
    applicationContent,
    integrityProof,
    3600 // 1 hour max age
  );

  if (proofVerification.valid) {
    console.log('✅ Integrity proof verification passed');
  } else {
    console.log(`❌ Integrity proof verification failed: ${proofVerification.error}`);
  }

  console.log('\n2. Security Attack Detection');
  console.log('-----------------------------');

  // Test tampering detection
  const tamperedContent = applicationContent.replace('initialized', 'compromised');
  const tamperCheck = await blossomVerifier.verifyContentHash(tamperedContent, contentHash);

  if (!tamperCheck.valid) {
    console.log('✅ Content tampering detected and blocked');
    console.log(`   Error: ${tamperCheck.error}`);
  } else {
    console.log('❌ Failed to detect content tampering');
  }

  // Test invalid hash format
  const invalidHashCheck = await blossomVerifier.verifyContentHash(
    applicationContent,
    'invalid-hash-format'
  );

  if (!invalidHashCheck.valid) {
    console.log('✅ Invalid hash format detected and rejected');
    console.log(`   Error: ${invalidHashCheck.error}`);
  } else {
    console.log('❌ Failed to detect invalid hash format');
  }

  console.log('\n3. Batch Content Verification');
  console.log('------------------------------');

  // Prepare multiple content items for batch verification
  const contentItems = [];
  for (let i = 0; i < 5; i++) {
    const content = `NSM Content Item ${i} - ${Date.now() + i}`;
    const hash = await blossomVerifier.calculateContentHash(content);
    contentItems.push({ content, expectedHash: hash });
  }

  // Add one invalid item
  contentItems.push({
    content: 'Invalid content item',
    expectedHash: 'invalid_hash_that_will_fail'.padEnd(64, '0')
  });

  const batchResults = await blossomVerifier.verifyBatchHashes(contentItems);
  console.log(`✅ Batch verification completed: ${batchResults.successfulVerifications}/${batchResults.totalItems} items verified`);
  console.log(`   Failed verifications: ${batchResults.failedVerifications}`);

  console.log('\n4. Security Audit Report');
  console.log('-------------------------');

  // Get audit statistics
  const auditStats = auditLogger.getStatistics();
  console.log('Audit Statistics:');
  console.log(`  Total operations: ${auditStats.total}`);
  console.log(`  Successful: ${auditStats.successful}`);
  console.log(`  Failed: ${auditStats.failed}`);

  console.log('\nOperations by type:');
  for (const [operation, stats] of Object.entries(auditStats.byOperation)) {
    console.log(`  ${operation}: ${stats.total} total (${stats.successful} success, ${stats.failed} failed)`);
  }

  // Get failed operations for security monitoring
  const failures = auditLogger.getFailedOperations();
  if (failures.length > 0) {
    console.log(`\n⚠️  Security Alert: ${failures.length} failed operations detected`);
    failures.forEach((failure, i) => {
      console.log(`  ${i + 1}. ${failure.operation}: ${failure.error}`);
    });
  } else {
    console.log('\n✅ No security failures detected');
  }

  console.log('\n5. Performance Metrics');
  console.log('----------------------');

  // Performance test
  const perfTestCount = 20;
  const startTime = performance.now();

  for (let i = 0; i < perfTestCount; i++) {
    const testContent = `Performance test content ${i} - ${Math.random()}`;
    const testHash = await blossomVerifier.calculateContentHash(testContent);
    await blossomVerifier.verifyContentHash(testContent, testHash);
  }

  const endTime = performance.now();
  const avgTime = (endTime - startTime) / perfTestCount;

  console.log(`✅ Performance test completed:`);
  console.log(`   ${perfTestCount} operations in ${(endTime - startTime).toFixed(2)}ms`);
  console.log(`   Average: ${avgTime.toFixed(2)}ms per operation`);

  console.log('\n🎉 NSM Crypto Integration Demo Complete!');
  console.log('==========================================');

  return {
    contentIntegrityVerified: verification.valid,
    integrityProofVerified: proofVerification.valid,
    tamperingDetected: !tamperCheck.valid,
    invalidFormatDetected: !invalidHashCheck.valid,
    batchVerificationResults: batchResults,
    auditStatistics: auditStats,
    performanceMetrics: {
      operationsPerSecond: 1000 / avgTime,
      averageTimeMs: avgTime
    }
  };
}

// Run the demo
if (import.meta.main) {
  demonstrateCryptoIntegration()
    .then((results) => {
      console.log('\n📊 Demo Results Summary:');
      console.log(JSON.stringify(results, null, 2));
    })
    .catch((error) => {
      console.error('❌ Demo failed:', error);
      process.exit(1);
    });
}

export { demonstrateCryptoIntegration };