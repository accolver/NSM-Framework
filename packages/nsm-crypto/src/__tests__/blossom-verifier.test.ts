/**
 * Tests for Blossom content hash verification
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { BlossomVerifier } from '../blossom/verifier.js';
import { CryptoAuditLogger } from '../audit/logger.js';

describe('BlossomVerifier', () => {
  let verifier: BlossomVerifier;
  let auditLogger: CryptoAuditLogger;

  beforeEach(() => {
    auditLogger = new CryptoAuditLogger();
    verifier = new BlossomVerifier(auditLogger);
  });

  describe('calculateContentHash', () => {
    it('should calculate SHA-256 hash for string content', async () => {
      const content = 'Hello, world!';
      const hash = await verifier.calculateContentHash(content);

      expect(hash).toBe('315f5bdb76d078c43b8ac0064e4a0164612b1fce77c869345bfc94c75894edd3');
      expect(hash).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it('should calculate SHA-256 hash for Uint8Array content', async () => {
      const content = new TextEncoder().encode('Hello, world!');
      const hash = await verifier.calculateContentHash(content);

      expect(hash).toBe('315f5bdb76d078c43b8ac0064e4a0164612b1fce77c869345bfc94c75894edd3');
    });

    it('should produce different hashes for different content', async () => {
      const hash1 = await verifier.calculateContentHash('content1');
      const hash2 = await verifier.calculateContentHash('content2');

      expect(hash1).not.toBe(hash2);
    });

    it('should produce consistent hashes for same content', async () => {
      const content = 'test content';
      const hash1 = await verifier.calculateContentHash(content);
      const hash2 = await verifier.calculateContentHash(content);

      expect(hash1).toBe(hash2);
    });
  });

  describe('validateHashFormat', () => {
    it('should validate correct SHA-256 hash format', () => {
      const validHash = 'a'.repeat(64);
      expect(verifier.validateHashFormat(validHash, 'SHA-256')).toBe(true);
    });

    it('should validate correct SHA-512 hash format', () => {
      const validHash = 'a'.repeat(128);
      expect(verifier.validateHashFormat(validHash, 'SHA-512')).toBe(true);
    });

    it('should reject invalid hash formats', () => {
      expect(verifier.validateHashFormat('', 'SHA-256')).toBe(false);
      expect(verifier.validateHashFormat('invalid', 'SHA-256')).toBe(false);
      expect(verifier.validateHashFormat('a'.repeat(63), 'SHA-256')).toBe(false); // Too short
      expect(verifier.validateHashFormat('a'.repeat(65), 'SHA-256')).toBe(false); // Too long
      expect(verifier.validateHashFormat('g'.repeat(64), 'SHA-256')).toBe(false); // Invalid hex
    });

    it('should reject unsupported algorithms', () => {
      const validHash = 'a'.repeat(64);
      expect(verifier.validateHashFormat(validHash, 'MD5')).toBe(false);
    });
  });

  describe('secureCompare', () => {
    it('should return true for identical hashes', () => {
      const hash1 = 'a'.repeat(64);
      const hash2 = 'a'.repeat(64);
      expect(verifier.secureCompare(hash1, hash2)).toBe(true);
    });

    it('should return false for different hashes', () => {
      const hash1 = 'a'.repeat(64);
      const hash2 = 'b'.repeat(64);
      expect(verifier.secureCompare(hash1, hash2)).toBe(false);
    });

    it('should return false for different length hashes', () => {
      const hash1 = 'a'.repeat(64);
      const hash2 = 'a'.repeat(63);
      expect(verifier.secureCompare(hash1, hash2)).toBe(false);
    });

    it('should be constant time (basic test)', () => {
      const hash1 = 'a'.repeat(64);
      const hash2 = 'b'.repeat(64);
      const hash3 = 'a'.repeat(32) + 'b'.repeat(32);

      // These should take roughly the same time (constant time)
      const start1 = performance.now();
      verifier.secureCompare(hash1, hash2);
      const time1 = performance.now() - start1;

      const start2 = performance.now();
      verifier.secureCompare(hash1, hash3);
      const time2 = performance.now() - start2;

      // The times should be similar (within reasonable bounds)
      // This is a basic test - real constant-time testing would be more sophisticated
      expect(Math.abs(time1 - time2)).toBeLessThan(10); // 10ms tolerance
    });
  });

  describe('verifyContentHash', () => {
    it('should verify correct content hash', async () => {
      const content = 'Hello, world!';
      const expectedHash = '315f5bdb76d078c43b8ac0064e4a0164612b1fce77c869345bfc94c75894edd3';

      const result = await verifier.verifyContentHash(content, expectedHash);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject incorrect content hash', async () => {
      const content = 'Hello, world!';
      const wrongHash = 'b'.repeat(64);

      const result = await verifier.verifyContentHash(content, wrongHash);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Hash verification failed');
    });

    it('should reject invalid hash format', async () => {
      const content = 'Hello, world!';
      const invalidHash = 'invalid_hash_format';

      const result = await verifier.verifyContentHash(content, invalidHash);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid SHA-256 hash format');
    });

    it('should work with different algorithms', async () => {
      const content = 'test';

      // Calculate SHA-512 hash for comparison
      const { sha512 } = await import('@noble/hashes/sha512');
      const { bytesToHex } = await import('@noble/hashes/utils');
      const data = new TextEncoder().encode(content);
      const sha512Hash = bytesToHex(sha512(data));

      const result = await verifier.verifyContentHash(content, sha512Hash, {
        algorithm: 'SHA-512'
      });

      expect(result.valid).toBe(true);
    });

    it('should use secure comparison by default', async () => {
      const content = 'test content';
      const hash = await verifier.calculateContentHash(content);

      const result = await verifier.verifyContentHash(content, hash, {
        secureComparison: true
      });

      expect(result.valid).toBe(true);
    });

    it('should skip format validation when disabled', async () => {
      const content = 'test';
      const hash = await verifier.calculateContentHash(content);

      const result = await verifier.verifyContentHash(content, hash, {
        validateFormat: false
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('verifyBatchHashes', () => {
    it('should verify multiple content-hash pairs', async () => {
      const contentPairs = [
        { content: 'content1', expectedHash: await verifier.calculateContentHash('content1') },
        { content: 'content2', expectedHash: await verifier.calculateContentHash('content2') },
        { content: 'content3', expectedHash: await verifier.calculateContentHash('content3') }
      ];

      const results = await verifier.verifyBatchHashes(contentPairs);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.valid)).toBe(true);
    });

    it('should identify incorrect hashes in batch', async () => {
      const contentPairs = [
        { content: 'content1', expectedHash: await verifier.calculateContentHash('content1') },
        { content: 'content2', expectedHash: 'wrong_hash'.padEnd(64, '0') },
        { content: 'content3', expectedHash: await verifier.calculateContentHash('content3') }
      ];

      const results = await verifier.verifyBatchHashes(contentPairs);

      expect(results).toHaveLength(3);
      expect(results[0]?.valid).toBe(true);
      expect(results[1]?.valid).toBe(false);
      expect(results[2]?.valid).toBe(true);
    });
  });

  describe('generateIntegrityProof', () => {
    it('should generate integrity proof with correct structure', async () => {
      const content = 'test content';
      const proof = await verifier.generateIntegrityProof(content);

      expect(proof.hash).toBe(await verifier.calculateContentHash(content));
      expect(proof.algorithm).toBe('SHA-256');
      expect(proof.timestamp).toBeGreaterThan(Date.now() - 1000);
      expect(proof.timestamp).toBeLessThanOrEqual(Date.now());
      expect(proof.size).toBe(new TextEncoder().encode(content).length);
    });

    it('should work with Uint8Array content', async () => {
      const content = new Uint8Array([1, 2, 3, 4, 5]);
      const proof = await verifier.generateIntegrityProof(content);

      expect(proof.size).toBe(5);
      expect(proof.hash).toHaveLength(64); // SHA-256 hex length
    });
  });

  describe('verifyIntegrityProof', () => {
    it('should verify correct integrity proof', async () => {
      const content = 'test content';
      const proof = await verifier.generateIntegrityProof(content);

      const result = await verifier.verifyIntegrityProof(content, proof);
      expect(result.valid).toBe(true);
    });

    it('should reject proof with wrong content', async () => {
      const content = 'test content';
      const wrongContent = 'wrong content';
      const proof = await verifier.generateIntegrityProof(content);

      const result = await verifier.verifyIntegrityProof(wrongContent, proof);
      expect(result.valid).toBe(false);
    });

    it('should reject old proof when maxAge is specified', async () => {
      const content = 'test content';
      const proof = {
        hash: await verifier.calculateContentHash(content),
        algorithm: 'SHA-256',
        timestamp: Date.now() - 10000, // 10 seconds ago
        size: new TextEncoder().encode(content).length
      };

      const result = await verifier.verifyIntegrityProof(content, proof, 5); // 5 second max age
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too old');
    });

    it('should reject proof with wrong size', async () => {
      const content = 'test content';
      const proof = await verifier.generateIntegrityProof(content);
      proof.size = 999; // Wrong size

      const result = await verifier.verifyIntegrityProof(content, proof);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('size does not match');
    });

    it('should reject proof with unsupported algorithm', async () => {
      const content = 'test content';
      const proof = await verifier.generateIntegrityProof(content);
      proof.algorithm = 'MD5'; // Unsupported

      const result = await verifier.verifyIntegrityProof(content, proof);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported algorithm');
    });
  });

  describe('audit logging', () => {
    it('should log successful hash verification', async () => {
      const content = 'test content';
      const hash = await verifier.calculateContentHash(content);

      await verifier.verifyContentHash(content, hash);

      const logs = auditLogger.getLogs(Date.now() - 1000, Date.now());
      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some(log => log.operation === 'hash_verify' && log.success)).toBe(true);
    });

    it('should log failed hash verification', async () => {
      const content = 'test content';
      const wrongHash = 'wrong'.padEnd(64, '0');

      await verifier.verifyContentHash(content, wrongHash);

      const failedLogs = auditLogger.getFailedOperations();
      expect(failedLogs.length).toBeGreaterThan(0);
      expect(failedLogs.some(log => log.operation === 'hash_verify' && !log.success)).toBe(true);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty content', async () => {
      const content = '';
      const hash = await verifier.calculateContentHash(content);
      const result = await verifier.verifyContentHash(content, hash);

      expect(result.valid).toBe(true);
    });

    it('should handle large content efficiently', async () => {
      const largeContent = 'x'.repeat(1000000); // 1MB of 'x'

      const start = performance.now();
      const hash = await verifier.calculateContentHash(largeContent);
      const calcTime = performance.now() - start;

      const verifyStart = performance.now();
      const result = await verifier.verifyContentHash(largeContent, hash);
      const verifyTime = performance.now() - verifyStart;

      expect(result.valid).toBe(true);
      expect(calcTime).toBeLessThan(1000); // Should be fast even for large content
      expect(verifyTime).toBeLessThan(1000);
    });
  });
});