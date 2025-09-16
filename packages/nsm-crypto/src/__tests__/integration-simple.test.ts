/**
 * Simplified integration tests for the crypto verification suite
 * Focus on demonstrating core functionality without complex low-level crypto operations
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import {
  createCryptoSuite,
  verifyNostrEvent,
  verifyBlossomContent,
  ValidationUtils,
  SECURITY_CONFIG
} from '../index.js';
import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools';
import { bytesToHex } from '@noble/hashes/utils';
import type { INostrEvent } from '@nsm/core';

describe('NSM Crypto Integration - Simplified', () => {
  let cryptoSuite: ReturnType<typeof createCryptoSuite>;

  beforeEach(() => {
    cryptoSuite = createCryptoSuite({
      persistentAuditLogs: false,
      auditOptions: { maxEntries: 1000, retentionDays: 7 }
    });
  });

  describe('createCryptoSuite', () => {
    it('should create complete crypto suite with all components', () => {
      expect(cryptoSuite.nostrVerifier).toBeDefined();
      expect(cryptoSuite.blossomVerifier).toBeDefined();
      expect(cryptoSuite.keyManager).toBeDefined();
      expect(cryptoSuite.auditLogger).toBeDefined();
    });

    it('should use shared audit logger across components', async () => {
      // Perform operations with different components
      await cryptoSuite.keyManager.generateKeyPair();
      await cryptoSuite.blossomVerifier.calculateContentHash('test');

      const stats = cryptoSuite.auditLogger.getStatistics();
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.byOperation['key_generate']).toBeDefined();
    });
  });

  describe('key management', () => {
    it('should generate and manage keys securely', async () => {
      const { privateKey, publicKey } = await cryptoSuite.keyManager.generateKeyPair();

      expect(privateKey).toBeInstanceOf(Uint8Array);
      expect(privateKey).toHaveLength(32);
      expect(publicKey).toHaveLength(64);
      expect(ValidationUtils.isValidNostrPublicKey(publicKey)).toBe(true);
    });

    it('should encrypt and decrypt keys', async () => {
      const { privateKey } = await cryptoSuite.keyManager.generateKeyPair();
      const password = 'test-password-123';

      const encrypted = await cryptoSuite.keyManager.encryptPrivateKey(privateKey, password);
      expect(encrypted.encryptedData).toBeInstanceOf(Uint8Array);
      expect(encrypted.salt).toBeInstanceOf(Uint8Array);
      expect(encrypted.iv).toBeInstanceOf(Uint8Array);

      const decrypted = await cryptoSuite.keyManager.decryptPrivateKey(encrypted, password);
      expect(decrypted).toEqual(privateKey);
    });
  });

  describe('Nostr event verification', () => {
    it('should verify properly signed Nostr events', async () => {
      // Create a proper event using nostr-tools
      const secretKey = generateSecretKey();
      const publicKey = getPublicKey(secretKey);

      const unsignedEvent = {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: 'Test message for verification',
        pubkey: publicKey
      };

      const signedEvent = finalizeEvent(unsignedEvent, secretKey) as INostrEvent;

      // Verify the event
      const result = await cryptoSuite.nostrVerifier.verifyEvent(signedEvent);
      expect(result.valid).toBe(true);
      expect(result.details?.signatureValid).toBe(true);
      expect(result.details?.eventIdValid).toBe(true);
    });

    it('should reject events with invalid signatures', async () => {
      const invalidEvent: INostrEvent = {
        id: 'a'.repeat(64),
        pubkey: 'b'.repeat(64),
        created_at: Math.floor(Date.now() / 1000),
        kind: 1,
        tags: [],
        content: 'Invalid event',
        sig: 'c'.repeat(128) // Invalid signature
      };

      const result = await cryptoSuite.nostrVerifier.verifyEvent(invalidEvent);
      expect(result.valid).toBe(false);
    });
  });

  describe('Blossom content verification', () => {
    it('should verify content hashes correctly', async () => {
      const content = 'Test content for hash verification';

      // Calculate hash
      const hash = await cryptoSuite.blossomVerifier.calculateContentHash(content);
      expect(hash).toHaveLength(64); // SHA-256 produces 64 hex characters

      // Verify hash
      const result = await cryptoSuite.blossomVerifier.verifyContentHash(content, hash);
      expect(result.valid).toBe(true);
    });

    it('should reject content with incorrect hash', async () => {
      const content = 'Test content';
      const wrongHash = 'a'.repeat(64);

      const result = await cryptoSuite.blossomVerifier.verifyContentHash(content, wrongHash);
      expect(result.valid).toBe(false);
    });

    it('should generate and verify integrity proofs', async () => {
      const content = 'Content with integrity proof';

      const proof = await cryptoSuite.blossomVerifier.generateIntegrityProof(content);
      expect(proof.hash).toHaveLength(64);
      expect(proof.algorithm).toBe('SHA-256');
      expect(proof.timestamp).toBeGreaterThan(0);

      const result = await cryptoSuite.blossomVerifier.verifyIntegrityProof(content, proof);
      expect(result.valid).toBe(true);
    });
  });

  describe('utility functions', () => {
    it('should validate hex strings correctly', () => {
      expect(ValidationUtils.isValidHex('abc123', 6)).toBe(true);
      expect(ValidationUtils.isValidHex('xyz123', 6)).toBe(false);
      expect(ValidationUtils.isValidHex('abc123', 4)).toBe(false);
    });

    it('should validate public keys correctly', () => {
      const validPubkey = 'a'.repeat(64);
      const invalidPubkey = 'invalid';

      expect(ValidationUtils.isValidNostrPublicKey(validPubkey)).toBe(true);
      expect(ValidationUtils.isValidNostrPublicKey(invalidPubkey)).toBe(false);
    });

    it('should validate SHA-256 hashes correctly', () => {
      const validHash = 'a'.repeat(64);
      const invalidHash = 'a'.repeat(32);

      expect(ValidationUtils.isValidSHA256Hash(validHash)).toBe(true);
      expect(ValidationUtils.isValidSHA256Hash(invalidHash)).toBe(false);
    });
  });

  describe('security configuration', () => {
    it('should provide security constants', () => {
      expect(SECURITY_CONFIG.DEFAULT_PBKDF2_ITERATIONS).toBe(100000);
      expect(SECURITY_CONFIG.MIN_PRIVATE_KEY_ENTROPY).toBe(32);
      expect(SECURITY_CONFIG.DEFAULT_MAX_EVENT_AGE).toBe(86400);
    });
  });

  describe('audit logging', () => {
    it('should track crypto operations', async () => {
      const startTime = Date.now();

      // Perform some operations
      await cryptoSuite.keyManager.generateKeyPair();
      await cryptoSuite.blossomVerifier.calculateContentHash('test');

      const logs = cryptoSuite.auditLogger.getLogs(startTime, Date.now());
      expect(logs.length).toBeGreaterThan(0);

      const keyGenLogs = logs.filter(log => log.operation === 'key_generate');
      expect(keyGenLogs.length).toBe(1);
      expect(keyGenLogs[0]?.success).toBe(true);
    });
  });
});