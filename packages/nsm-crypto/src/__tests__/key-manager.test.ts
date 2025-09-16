/**
 * Tests for secure key management operations
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { KeyManager } from '../keys/manager.js';
import { CryptoAuditLogger } from '../audit/logger.js';
import { bytesToHex } from '@noble/hashes/utils';

describe('KeyManager', () => {
  let keyManager: KeyManager;
  let auditLogger: CryptoAuditLogger;

  beforeEach(() => {
    auditLogger = new CryptoAuditLogger();
    keyManager = new KeyManager(auditLogger);
  });

  describe('generateKeyPair', () => {
    it('should generate valid key pair', async () => {
      const { privateKey, publicKey } = await keyManager.generateKeyPair();

      expect(privateKey).toBeInstanceOf(Uint8Array);
      expect(privateKey).toHaveLength(32);
      expect(publicKey).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(/^[a-f0-9]{64}$/i.test(publicKey)).toBe(true);
    });

    it('should generate different key pairs each time', async () => {
      const pair1 = await keyManager.generateKeyPair();
      const pair2 = await keyManager.generateKeyPair();

      expect(bytesToHex(pair1.privateKey)).not.toBe(bytesToHex(pair2.privateKey));
      expect(pair1.publicKey).not.toBe(pair2.publicKey);
    });

    it('should generate keys within secp256k1 valid range', async () => {
      const { privateKey } = await keyManager.generateKeyPair();
      expect(keyManager.validatePrivateKey(privateKey)).toBe(true);
    });

    it('should log key generation', async () => {
      await keyManager.generateKeyPair();

      const logs = auditLogger.getLogs(Date.now() - 1000, Date.now());
      const keyGenLogs = logs.filter(log => log.operation === 'key_generate');
      expect(keyGenLogs).toHaveLength(1);
      expect(keyGenLogs[0]?.success).toBe(true);
    });
  });

  describe('generateRandomBytes', () => {
    it('should generate requested number of bytes', () => {
      const bytes16 = keyManager.generateRandomBytes(16);
      const bytes32 = keyManager.generateRandomBytes(32);

      expect(bytes16).toHaveLength(16);
      expect(bytes32).toHaveLength(32);
    });

    it('should generate different random bytes each time', () => {
      const bytes1 = keyManager.generateRandomBytes(32);
      const bytes2 = keyManager.generateRandomBytes(32);

      expect(bytes1).not.toEqual(bytes2);
    });
  });

  describe('encryptPrivateKey', () => {
    it('should encrypt private key successfully', async () => {
      const { privateKey } = await keyManager.generateKeyPair();
      const password = 'strong_password_123';

      const encrypted = await keyManager.encryptPrivateKey(privateKey, password);

      expect(encrypted.encryptedData).toBeInstanceOf(Uint8Array);
      expect(encrypted.salt).toBeInstanceOf(Uint8Array);
      expect(encrypted.iv).toBeInstanceOf(Uint8Array);
      expect(encrypted.algorithm).toBe('AES-256-GCM');
      expect(encrypted.iterations).toBe(100000);

      expect(encrypted.salt).toHaveLength(32);
      expect(encrypted.iv).toHaveLength(12); // AES-GCM IV length
      expect(encrypted.encryptedData.length).toBeGreaterThan(32); // Should be larger due to auth tag
    });

    it('should produce different encryptions for same key with different passwords', async () => {
      const { privateKey } = await keyManager.generateKeyPair();

      const encrypted1 = await keyManager.encryptPrivateKey(privateKey, 'password1');
      const encrypted2 = await keyManager.encryptPrivateKey(privateKey, 'password2');

      expect(encrypted1.encryptedData).not.toEqual(encrypted2.encryptedData);
      expect(encrypted1.salt).not.toEqual(encrypted2.salt);
    });

    it('should log encryption operation', async () => {
      const { privateKey } = await keyManager.generateKeyPair();
      await keyManager.encryptPrivateKey(privateKey, 'password');

      const logs = auditLogger.getLogs(Date.now() - 1000, Date.now());
      const encryptLogs = logs.filter(log => log.operation === 'key_encrypt');
      expect(encryptLogs.length).toBeGreaterThan(0);
      expect(encryptLogs[0]?.success).toBe(true);
    });
  });

  describe('decryptPrivateKey', () => {
    it('should decrypt private key successfully', async () => {
      const { privateKey } = await keyManager.generateKeyPair();
      const password = 'strong_password_123';

      const encrypted = await keyManager.encryptPrivateKey(privateKey, password);
      const decrypted = await keyManager.decryptPrivateKey(encrypted, password);

      expect(decrypted).toEqual(privateKey);
    });

    it('should fail with wrong password', async () => {
      const { privateKey } = await keyManager.generateKeyPair();
      const password = 'correct_password';
      const wrongPassword = 'wrong_password';

      const encrypted = await keyManager.encryptPrivateKey(privateKey, password);

      await expect(keyManager.decryptPrivateKey(encrypted, wrongPassword))
        .rejects.toThrow();
    });

    it('should fail with unsupported algorithm', async () => {
      const { privateKey } = await keyManager.generateKeyPair();
      const encrypted = await keyManager.encryptPrivateKey(privateKey, 'password');

      // Modify algorithm to unsupported one
      encrypted.algorithm = 'UNSUPPORTED';

      await expect(keyManager.decryptPrivateKey(encrypted, 'password'))
        .rejects.toThrow('Unsupported encryption algorithm');
    });

    it('should log decryption operation', async () => {
      const { privateKey } = await keyManager.generateKeyPair();
      const encrypted = await keyManager.encryptPrivateKey(privateKey, 'password');
      await keyManager.decryptPrivateKey(encrypted, 'password');

      const logs = auditLogger.getLogs(Date.now() - 1000, Date.now());
      const decryptLogs = logs.filter(log => log.operation === 'key_decrypt');
      expect(decryptLogs.length).toBeGreaterThan(0);
      expect(decryptLogs[0]?.success).toBe(true);
    });
  });

  describe('deriveKey', () => {
    it('should derive consistent keys from same inputs', async () => {
      const password = 'test_password';
      const salt = keyManager.generateRandomBytes(32);
      const params = { password, salt, iterations: 10000, keyLength: 32 };

      const key1 = await keyManager.deriveKey(params);
      const key2 = await keyManager.deriveKey(params);

      expect(key1).toEqual(key2);
    });

    it('should derive different keys from different salts', async () => {
      const password = 'test_password';
      const salt1 = keyManager.generateRandomBytes(32);
      const salt2 = keyManager.generateRandomBytes(32);

      const key1 = await keyManager.deriveKey({ password, salt: salt1 });
      const key2 = await keyManager.deriveKey({ password, salt: salt2 });

      expect(key1).not.toEqual(key2);
    });

    it('should derive different keys from different passwords', async () => {
      const salt = keyManager.generateRandomBytes(32);

      const key1 = await keyManager.deriveKey({ password: 'password1', salt });
      const key2 = await keyManager.deriveKey({ password: 'password2', salt });

      expect(key1).not.toEqual(key2);
    });

    it('should support different key lengths', async () => {
      const password = 'test_password';
      const salt = keyManager.generateRandomBytes(32);

      const key16 = await keyManager.deriveKey({ password, salt, keyLength: 16 });
      const key32 = await keyManager.deriveKey({ password, salt, keyLength: 32 });

      expect(key16).toHaveLength(16);
      expect(key32).toHaveLength(32);
    });

    it('should support different hash algorithms', async () => {
      const password = 'test_password';
      const salt = keyManager.generateRandomBytes(32);

      const keySHA256 = await keyManager.deriveKey({
        password, salt, hashAlgorithm: 'SHA-256'
      });
      const keySHA512 = await keyManager.deriveKey({
        password, salt, hashAlgorithm: 'SHA-512'
      });

      expect(keySHA256).not.toEqual(keySHA512);
    });
  });

  describe('validatePrivateKey', () => {
    it('should validate correct private keys', async () => {
      const { privateKey } = await keyManager.generateKeyPair();
      expect(keyManager.validatePrivateKey(privateKey)).toBe(true);
    });

    it('should reject invalid private key lengths', () => {
      const shortKey = new Uint8Array(16);
      const longKey = new Uint8Array(64);

      expect(keyManager.validatePrivateKey(shortKey)).toBe(false);
      expect(keyManager.validatePrivateKey(longKey)).toBe(false);
    });

    it('should reject zero private key', () => {
      const zeroKey = new Uint8Array(32); // All zeros
      expect(keyManager.validatePrivateKey(zeroKey)).toBe(false);
    });

    it('should reject private key >= secp256k1 order', () => {
      // Create key with all bits set (definitely >= order)
      const invalidKey = new Uint8Array(32).fill(0xFF);
      expect(keyManager.validatePrivateKey(invalidKey)).toBe(false);
    });
  });

  describe('clearSensitiveData', () => {
    it('should overwrite sensitive data', () => {
      const sensitiveData = new Uint8Array([1, 2, 3, 4, 5]);
      const original = new Uint8Array(sensitiveData);

      keyManager.clearSensitiveData(sensitiveData);

      expect(sensitiveData).not.toEqual(original);
      expect(sensitiveData.every(byte => byte === 0)).toBe(true); // Should be all zeros after clearing
    });
  });

  describe('rotateEncryptionKey', () => {
    it('should rotate encryption key successfully', async () => {
      const { privateKey } = await keyManager.generateKeyPair();
      const oldPassword = 'old_password';
      const newPassword = 'new_password';

      const encrypted1 = await keyManager.encryptPrivateKey(privateKey, oldPassword);
      const rotated = await keyManager.rotateEncryptionKey(encrypted1, oldPassword, newPassword);

      // Should be able to decrypt with new password
      const decrypted = await keyManager.decryptPrivateKey(rotated, newPassword);
      expect(decrypted).toEqual(privateKey);

      // Should not be able to decrypt with old password
      await expect(keyManager.decryptPrivateKey(rotated, oldPassword))
        .rejects.toThrow();
    });

    it('should fail with wrong old password', async () => {
      const { privateKey } = await keyManager.generateKeyPair();
      const encrypted = await keyManager.encryptPrivateKey(privateKey, 'correct_password');

      await expect(keyManager.rotateEncryptionKey(encrypted, 'wrong_password', 'new_password'))
        .rejects.toThrow();
    });
  });

  describe('createKeyBackup', () => {
    it('should create backup with integrity protection', async () => {
      const { privateKey } = await keyManager.generateKeyPair();
      const password = 'backup_password';
      const metadata = { purpose: 'test backup', created: Date.now() };

      const backup = await keyManager.createKeyBackup(privateKey, password, metadata);

      expect(backup.encrypted).toBeDefined();
      expect(backup.checksum).toHaveLength(64); // SHA-256 hex
      expect(backup.metadata).toEqual(metadata);
      expect(backup.timestamp).toBeGreaterThan(Date.now() - 1000);
    });
  });

  describe('restoreFromBackup', () => {
    it('should restore key from backup successfully', async () => {
      const { privateKey } = await keyManager.generateKeyPair();
      const password = 'backup_password';
      const metadata = { purpose: 'test backup' };

      const backup = await keyManager.createKeyBackup(privateKey, password, metadata);
      const restored = await keyManager.restoreFromBackup(backup, password);

      expect(restored.privateKey).toEqual(privateKey);
      expect(restored.metadata).toEqual(metadata);
    });

    it('should fail with corrupted backup checksum', async () => {
      const { privateKey } = await keyManager.generateKeyPair();
      const backup = await keyManager.createKeyBackup(privateKey, 'password');

      // Corrupt the checksum
      backup.checksum = 'corrupted_checksum';

      await expect(keyManager.restoreFromBackup(backup, 'password'))
        .rejects.toThrow('integrity verification failed');
    });

    it('should fail with wrong password', async () => {
      const { privateKey } = await keyManager.generateKeyPair();
      const backup = await keyManager.createKeyBackup(privateKey, 'correct_password');

      await expect(keyManager.restoreFromBackup(backup, 'wrong_password'))
        .rejects.toThrow();
    });
  });

  describe('performance and security', () => {
    it('should encrypt/decrypt quickly', async () => {
      const { privateKey } = await keyManager.generateKeyPair();
      const password = 'test_password';

      const encryptStart = performance.now();
      const encrypted = await keyManager.encryptPrivateKey(privateKey, password);
      const encryptTime = performance.now() - encryptStart;

      const decryptStart = performance.now();
      const decrypted = await keyManager.decryptPrivateKey(encrypted, password);
      const decryptTime = performance.now() - decryptStart;

      expect(encryptTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(decryptTime).toBeLessThan(5000);
      expect(decrypted).toEqual(privateKey);
    });

    it('should use high iteration count for PBKDF2', async () => {
      const { privateKey } = await keyManager.generateKeyPair();
      const encrypted = await keyManager.encryptPrivateKey(privateKey, 'password');

      expect(encrypted.iterations).toBeGreaterThanOrEqual(100000);
    });

    it('should clear sensitive data after operations', async () => {
      const { privateKey } = await keyManager.generateKeyPair();
      const originalBytes = new Uint8Array(privateKey);

      // Encrypt and decrypt
      const encrypted = await keyManager.encryptPrivateKey(privateKey, 'password');
      const decrypted = await keyManager.decryptPrivateKey(encrypted, 'password');

      // Clear the decrypted key
      keyManager.clearSensitiveData(decrypted);

      expect(decrypted.every(byte => byte === 0)).toBe(true);
      expect(originalBytes).toEqual(privateKey); // Original should be unchanged
    });
  });
});