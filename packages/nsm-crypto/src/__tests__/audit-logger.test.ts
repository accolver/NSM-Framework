/**
 * Tests for cryptographic operations audit logger
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { CryptoAuditLogger, PersistentCryptoAuditLogger, createAuditLogger } from '../audit/logger.js';
import type { CryptoAuditEntry } from '../types.js';

describe('CryptoAuditLogger', () => {
  let logger: CryptoAuditLogger;

  beforeEach(() => {
    logger = new CryptoAuditLogger();
  });

  describe('basic logging', () => {
    it('should log audit entries', () => {
      const entry: CryptoAuditEntry = {
        timestamp: Date.now(),
        operation: 'signature_verify',
        success: true,
        metadata: { eventId: 'test123' }
      };

      logger.log(entry);

      const logs = logger.getLogs(Date.now() - 1000, Date.now() + 1000);
      expect(logs).toHaveLength(1);
      expect(logs[0]).toEqual(entry);
    });

    it('should log multiple entries', () => {
      const entries: CryptoAuditEntry[] = [
        {
          timestamp: Date.now(),
          operation: 'signature_verify',
          success: true
        },
        {
          timestamp: Date.now(),
          operation: 'hash_verify',
          success: false,
          error: 'Invalid hash'
        },
        {
          timestamp: Date.now(),
          operation: 'key_generate',
          success: true,
          metadata: { algorithm: 'secp256k1' }
        }
      ];

      entries.forEach(entry => logger.log(entry));

      const logs = logger.getLogs(Date.now() - 1000, Date.now() + 1000);
      expect(logs).toHaveLength(3);
    });
  });

  describe('log filtering', () => {
    beforeEach(() => {
      const now = Date.now();
      const entries: CryptoAuditEntry[] = [
        { timestamp: now - 3000, operation: 'signature_verify', success: true },
        { timestamp: now - 2000, operation: 'hash_verify', success: false, error: 'test error' },
        { timestamp: now - 1000, operation: 'key_generate', success: true },
        { timestamp: now, operation: 'signature_verify', success: false, error: 'failed' }
      ];

      entries.forEach(entry => logger.log(entry));
    });

    it('should filter logs by time range', () => {
      const now = Date.now();
      const logs = logger.getLogs(now - 2500, now - 500);

      expect(logs).toHaveLength(2);
      expect(logs[0]?.operation).toBe('hash_verify');
      expect(logs[1]?.operation).toBe('key_generate');
    });

    it('should get logs by operation type', () => {
      const signatureLogs = logger.getLogsByOperation('signature_verify');
      expect(signatureLogs).toHaveLength(2);
      expect(signatureLogs.every(log => log.operation === 'signature_verify')).toBe(true);
    });

    it('should get failed operations', () => {
      const failedLogs = logger.getFailedOperations();
      expect(failedLogs).toHaveLength(2);
      expect(failedLogs.every(log => !log.success)).toBe(true);
    });

    it('should get failed operations within time range', () => {
      const now = Date.now();
      const failedLogs = logger.getFailedOperations(now - 1500); // Only recent failures

      expect(failedLogs).toHaveLength(1);
      expect(failedLogs[0]?.operation).toBe('signature_verify');
      expect(failedLogs[0]?.success).toBe(false);
    });
  });

  describe('statistics', () => {
    beforeEach(() => {
      const entries: CryptoAuditEntry[] = [
        { timestamp: Date.now(), operation: 'signature_verify', success: true },
        { timestamp: Date.now(), operation: 'signature_verify', success: false, error: 'error1' },
        { timestamp: Date.now(), operation: 'hash_verify', success: true },
        { timestamp: Date.now(), operation: 'hash_verify', success: true },
        { timestamp: Date.now(), operation: 'key_generate', success: true }
      ];

      entries.forEach(entry => logger.log(entry));
    });

    it('should generate statistics', () => {
      const stats = logger.getStatistics();

      expect(stats.total).toBe(5);
      expect(stats.successful).toBe(4);
      expect(stats.failed).toBe(1);

      expect(stats.byOperation['signature_verify']).toEqual({
        total: 2,
        successful: 1,
        failed: 1
      });
      expect(stats.byOperation['hash_verify']).toEqual({
        total: 2,
        successful: 2,
        failed: 0
      });
      expect(stats.byOperation['key_generate']).toEqual({
        total: 1,
        successful: 1,
        failed: 0
      });
    });

    it('should generate statistics for time range', () => {
      const now = Date.now();

      // Add some old entries that should be excluded
      logger.log({
        timestamp: now - 48 * 60 * 60 * 1000, // 48 hours ago
        operation: 'signature_verify',
        success: true
      });

      const stats = logger.getStatistics(now - 60 * 60 * 1000); // Last hour only
      expect(stats.total).toBe(5); // Should not include the old entry
    });
  });

  describe('data management', () => {
    it('should maintain size limits', () => {
      const smallLogger = new CryptoAuditLogger({ maxEntries: 3 });

      // Add more entries than the limit
      for (let i = 0; i < 5; i++) {
        smallLogger.log({
          timestamp: Date.now() + i,
          operation: 'signature_verify',
          success: true,
          metadata: { index: i }
        });
      }

      expect(smallLogger.getLogCount()).toBe(3);

      // Should keep the most recent entries
      const logs = smallLogger.getLogs(0, Date.now() + 10000);
      expect(logs[0]?.metadata?.index).toBe(2); // Entry 0 and 1 should be removed
      expect(logs[2]?.metadata?.index).toBe(4);
    });

    it('should clear old logs', () => {
      const now = Date.now();
      const entries: CryptoAuditEntry[] = [
        { timestamp: now - 100000, operation: 'signature_verify', success: true },
        { timestamp: now - 50000, operation: 'hash_verify', success: true },
        { timestamp: now, operation: 'key_generate', success: true }
      ];

      entries.forEach(entry => logger.log(entry));

      logger.clearOldLogs(now - 75000); // Remove entries older than 75 seconds ago

      const logs = logger.getLogs(0, Date.now() + 1000);
      expect(logs).toHaveLength(2);
      expect(logs[0]?.operation).toBe('hash_verify');
      expect(logs[1]?.operation).toBe('key_generate');
    });

    it('should clear all logs', () => {
      logger.log({ timestamp: Date.now(), operation: 'signature_verify', success: true });
      logger.log({ timestamp: Date.now(), operation: 'hash_verify', success: true });

      expect(logger.getLogCount()).toBe(2);

      logger.clearAllLogs();
      expect(logger.getLogCount()).toBe(0);
    });
  });

  describe('import/export', () => {
    it('should export logs as JSON', () => {
      const entries: CryptoAuditEntry[] = [
        { timestamp: Date.now(), operation: 'signature_verify', success: true },
        { timestamp: Date.now(), operation: 'hash_verify', success: false, error: 'test' }
      ];

      entries.forEach(entry => logger.log(entry));

      const exported = logger.exportLogs();
      const parsed = JSON.parse(exported);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].operation).toBe('signature_verify');
    });

    it('should import logs from JSON', () => {
      const entries: CryptoAuditEntry[] = [
        { timestamp: Date.now(), operation: 'signature_verify', success: true },
        { timestamp: Date.now(), operation: 'hash_verify', success: false, error: 'test' }
      ];

      const jsonData = JSON.stringify(entries);
      logger.importLogs(jsonData);

      expect(logger.getLogCount()).toBe(2);
      const logs = logger.getLogs(0, Date.now() + 1000);
      expect(logs).toHaveLength(2);
    });

    it('should reject invalid JSON imports', () => {
      expect(() => logger.importLogs('invalid json')).toThrow();
      expect(() => logger.importLogs('{"not": "array"}')).toThrow();
      expect(() => logger.importLogs('[{"invalid": "entry"}]')).toThrow();
    });

    it('should export logs for time range', () => {
      const now = Date.now();
      const entries: CryptoAuditEntry[] = [
        { timestamp: now - 2000, operation: 'signature_verify', success: true },
        { timestamp: now - 1000, operation: 'hash_verify', success: true },
        { timestamp: now, operation: 'key_generate', success: true }
      ];

      entries.forEach(entry => logger.log(entry));

      const exported = logger.exportLogs(now - 1500, now - 500);
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].operation).toBe('hash_verify');
    });
  });
});

describe('PersistentCryptoAuditLogger', () => {
  let persistentLogger: PersistentCryptoAuditLogger;
  const testStorageKey = 'test-nsm-crypto-audit-logs';

  beforeEach(() => {
    // Clear any existing data
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(testStorageKey);
    }
    persistentLogger = new PersistentCryptoAuditLogger(testStorageKey);
  });

  afterEach(() => {
    // Clean up
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(testStorageKey);
    }
  });

  it('should persist logs to storage', () => {
    // Skip if localStorage is not available (like in test environment)
    if (typeof localStorage === 'undefined') {
      return;
    }

    const entry: CryptoAuditEntry = {
      timestamp: Date.now(),
      operation: 'signature_verify',
      success: true,
      metadata: { test: 'persistent' }
    };

    persistentLogger.log(entry);

    // Check that data was saved to localStorage
    const stored = localStorage.getItem(testStorageKey);
    expect(stored).toBeTruthy();

    const parsed = JSON.parse(stored!);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].metadata.test).toBe('persistent');
  });

  it('should load logs from storage on initialization', () => {
    // Skip if localStorage is not available
    if (typeof localStorage === 'undefined') {
      return;
    }

    const entries: CryptoAuditEntry[] = [
      { timestamp: Date.now(), operation: 'signature_verify', success: true },
      { timestamp: Date.now(), operation: 'hash_verify', success: false, error: 'test' }
    ];

    // Manually save to localStorage
    localStorage.setItem(testStorageKey, JSON.stringify(entries));

    // Create new logger - should load existing data
    const newLogger = new PersistentCryptoAuditLogger(testStorageKey);

    expect(newLogger.getLogCount()).toBe(2);
    const logs = newLogger.getLogs(0, Date.now() + 1000);
    expect(logs).toHaveLength(2);
  });
});

describe('createAuditLogger', () => {
  it('should create in-memory logger by default', () => {
    const logger = createAuditLogger();
    expect(logger).toBeInstanceOf(CryptoAuditLogger);
    expect(logger).not.toBeInstanceOf(PersistentCryptoAuditLogger);
  });

  it('should create persistent logger when requested', () => {
    const logger = createAuditLogger(true);
    expect(logger).toBeInstanceOf(PersistentCryptoAuditLogger);
  });

  it('should accept configuration options', () => {
    const logger = createAuditLogger(false, { maxEntries: 100, retentionDays: 7 });

    // Add many entries to test max entries
    for (let i = 0; i < 150; i++) {
      logger.log({
        timestamp: Date.now(),
        operation: 'signature_verify',
        success: true,
        metadata: { index: i }
      });
    }

    expect(logger.getLogCount()).toBe(100); // Should be limited to maxEntries
  });
});