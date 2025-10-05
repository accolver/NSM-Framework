/**
 * Cryptographic operations audit logger
 * Provides security audit logging for all crypto operations with configurable retention
 */
/**
 * In-memory audit logger with configurable retention
 */
export class CryptoAuditLogger {
    logs = [];
    maxEntries;
    retentionDays;
    constructor(options = {}) {
        this.maxEntries = options.maxEntries || 10000;
        this.retentionDays = options.retentionDays || 30;
    }
    /**
     * Log a cryptographic operation
     */
    log(entry) {
        this.logs.push(entry);
        // Maintain size limits
        if (this.logs.length > this.maxEntries) {
            this.logs.shift();
        }
        // Periodically clean old logs
        if (this.logs.length % 1000 === 0) {
            this.cleanOldLogs();
        }
    }
    /**
     * Get audit logs for a time range
     */
    getLogs(startTime, endTime) {
        return this.logs.filter(log => log.timestamp >= startTime && log.timestamp <= endTime);
    }
    /**
     * Clear old audit logs
     */
    clearOldLogs(olderThan) {
        const cutoffTime = olderThan || (Date.now() - (this.retentionDays * 24 * 60 * 60 * 1000));
        this.logs = this.logs.filter(log => log.timestamp >= cutoffTime);
    }
    /**
     * Get logs by operation type
     */
    getLogsByOperation(operation) {
        return this.logs.filter(log => log.operation === operation);
    }
    /**
     * Get failed operations
     */
    getFailedOperations(since) {
        const cutoffTime = since || (Date.now() - (24 * 60 * 60 * 1000)); // Last 24 hours
        return this.logs.filter(log => !log.success && log.timestamp >= cutoffTime);
    }
    /**
     * Get statistics for operations
     */
    getStatistics(since) {
        const cutoffTime = since || (Date.now() - (24 * 60 * 60 * 1000)); // Last 24 hours
        const relevantLogs = this.logs.filter(log => log.timestamp >= cutoffTime);
        const stats = {
            total: relevantLogs.length,
            successful: relevantLogs.filter(log => log.success).length,
            failed: relevantLogs.filter(log => !log.success).length,
            byOperation: {}
        };
        for (const log of relevantLogs) {
            if (!stats.byOperation[log.operation]) {
                stats.byOperation[log.operation] = { total: 0, successful: 0, failed: 0 };
            }
            stats.byOperation[log.operation].total++;
            if (log.success) {
                stats.byOperation[log.operation].successful++;
            }
            else {
                stats.byOperation[log.operation].failed++;
            }
        }
        return stats;
    }
    /**
     * Export logs as JSON
     */
    exportLogs(startTime, endTime) {
        let logsToExport = this.logs;
        if (startTime || endTime) {
            logsToExport = this.getLogs(startTime || 0, endTime || Date.now());
        }
        return JSON.stringify(logsToExport, null, 2);
    }
    /**
     * Import logs from JSON
     */
    importLogs(jsonData) {
        try {
            const importedLogs = JSON.parse(jsonData);
            if (!Array.isArray(importedLogs)) {
                throw new Error('Invalid log format');
            }
            // Validate log entries
            for (const log of importedLogs) {
                if (!this.validateLogEntry(log)) {
                    throw new Error('Invalid log entry format');
                }
            }
            this.logs.push(...importedLogs);
            // Sort by timestamp
            this.logs.sort((a, b) => a.timestamp - b.timestamp);
            // Apply size limits
            if (this.logs.length > this.maxEntries) {
                this.logs = this.logs.slice(-this.maxEntries);
            }
        }
        catch (error) {
            throw new Error(`Failed to import logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Clear all logs (use with caution)
     */
    clearAllLogs() {
        this.logs = [];
    }
    /**
     * Get log count
     */
    getLogCount() {
        return this.logs.length;
    }
    /**
     * Private method to clean old logs
     */
    cleanOldLogs() {
        this.clearOldLogs();
    }
    /**
     * Validate log entry format
     */
    validateLogEntry(entry) {
        if (typeof entry !== 'object' || entry === null) {
            return false;
        }
        const log = entry;
        return (typeof log.timestamp === 'number' &&
            typeof log.operation === 'string' &&
            typeof log.success === 'boolean' &&
            (log.error === undefined || typeof log.error === 'string') &&
            (log.metadata === undefined || typeof log.metadata === 'object'));
    }
}
/**
 * Persistent audit logger that saves to storage
 */
export class PersistentCryptoAuditLogger extends CryptoAuditLogger {
    storageKey;
    constructor(storageKey = 'nsm-crypto-audit-logs', options = {}) {
        super(options);
        this.storageKey = storageKey;
        this.loadFromStorage();
    }
    /**
     * Override log method to persist to storage
     */
    log(entry) {
        super.log(entry);
        this.saveToStorage();
    }
    /**
     * Override clearOldLogs to persist changes
     */
    clearOldLogs(olderThan) {
        super.clearOldLogs(olderThan);
        this.saveToStorage();
    }
    /**
     * Load logs from storage
     */
    loadFromStorage() {
        try {
            if (typeof localStorage !== 'undefined') {
                const stored = localStorage.getItem(this.storageKey);
                if (stored) {
                    this.importLogs(stored);
                }
            }
        }
        catch (error) {
            console.warn('Failed to load audit logs from storage:', error);
        }
    }
    /**
     * Save logs to storage
     */
    saveToStorage() {
        try {
            if (typeof localStorage !== 'undefined') {
                const data = this.exportLogs();
                localStorage.setItem(this.storageKey, data);
            }
        }
        catch (error) {
            console.warn('Failed to save audit logs to storage:', error);
        }
    }
}
/**
 * Create audit logger instance based on environment
 */
export function createAuditLogger(persistent = false, options) {
    if (persistent) {
        return new PersistentCryptoAuditLogger(options?.storageKey, options);
    }
    else {
        return new CryptoAuditLogger(options);
    }
}
//# sourceMappingURL=logger.js.map