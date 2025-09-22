/**
 * Cryptographic operations audit logger
 * Provides security audit logging for all crypto operations with configurable retention
 */
import type { CryptoAuditEntry, ICryptoAuditLogger } from '../types.js';
/**
 * In-memory audit logger with configurable retention
 */
export declare class CryptoAuditLogger implements ICryptoAuditLogger {
    private logs;
    private maxEntries;
    private retentionDays;
    constructor(options?: {
        maxEntries?: number;
        retentionDays?: number;
    });
    /**
     * Log a cryptographic operation
     */
    log(entry: CryptoAuditEntry): void;
    /**
     * Get audit logs for a time range
     */
    getLogs(startTime: number, endTime: number): CryptoAuditEntry[];
    /**
     * Clear old audit logs
     */
    clearOldLogs(olderThan?: number): void;
    /**
     * Get logs by operation type
     */
    getLogsByOperation(operation: CryptoAuditEntry['operation']): CryptoAuditEntry[];
    /**
     * Get failed operations
     */
    getFailedOperations(since?: number): CryptoAuditEntry[];
    /**
     * Get statistics for operations
     */
    getStatistics(since?: number): {
        total: number;
        successful: number;
        failed: number;
        byOperation: Record<string, {
            total: number;
            successful: number;
            failed: number;
        }>;
    };
    /**
     * Export logs as JSON
     */
    exportLogs(startTime?: number, endTime?: number): string;
    /**
     * Import logs from JSON
     */
    importLogs(jsonData: string): void;
    /**
     * Clear all logs (use with caution)
     */
    clearAllLogs(): void;
    /**
     * Get log count
     */
    getLogCount(): number;
    /**
     * Private method to clean old logs
     */
    private cleanOldLogs;
    /**
     * Validate log entry format
     */
    private validateLogEntry;
}
/**
 * Persistent audit logger that saves to storage
 */
export declare class PersistentCryptoAuditLogger extends CryptoAuditLogger {
    private storageKey;
    constructor(storageKey?: string, options?: {
        maxEntries?: number;
        retentionDays?: number;
    });
    /**
     * Override log method to persist to storage
     */
    log(entry: CryptoAuditEntry): void;
    /**
     * Override clearOldLogs to persist changes
     */
    clearOldLogs(olderThan?: number): void;
    /**
     * Load logs from storage
     */
    private loadFromStorage;
    /**
     * Save logs to storage
     */
    private saveToStorage;
}
/**
 * Create audit logger instance based on environment
 */
export declare function createAuditLogger(persistent?: boolean, options?: {
    maxEntries?: number;
    retentionDays?: number;
    storageKey?: string;
}): ICryptoAuditLogger;
//# sourceMappingURL=logger.d.ts.map