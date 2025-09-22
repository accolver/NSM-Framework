"use strict";
/**
 * Blossom content hash verification implementation
 * Implements secure hash validation for Blossom protocol with protection against timing attacks
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlossomVerifier = void 0;
const sha256_1 = require("@noble/hashes/sha256");
const sha512_1 = require("@noble/hashes/sha512");
const utils_1 = require("@noble/hashes/utils");
const logger_js_1 = require("../audit/logger.js");
/**
 * Blossom content verifier implementation
 */
class BlossomVerifier {
    auditLogger;
    constructor(auditLogger) {
        this.auditLogger = auditLogger || new logger_js_1.CryptoAuditLogger();
    }
    /**
     * Calculate SHA-256 hash of content
     */
    async calculateContentHash(content) {
        try {
            let data;
            if (typeof content === 'string') {
                data = new TextEncoder().encode(content);
            }
            else {
                data = content;
            }
            const hash = (0, sha256_1.sha256)(data);
            return (0, utils_1.bytesToHex)(hash);
        }
        catch (error) {
            const auditEntry = {
                timestamp: Date.now(),
                operation: 'hash_verify',
                success: false,
                error: `Hash calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                metadata: { algorithm: 'SHA-256' }
            };
            this.auditLogger.log(auditEntry);
            throw error;
        }
    }
    /**
     * Verify content against expected hash with secure comparison and format validation
     */
    async verifyContentHash(content, expectedHash, options = {}) {
        const startTime = Date.now();
        let auditEntry;
        try {
            const opts = {
                algorithm: 'SHA-256',
                secureComparison: true,
                validateFormat: true,
                ...options
            };
            // Validate hash format first
            if (opts.validateFormat && !this.validateHashFormat(expectedHash, opts.algorithm)) {
                auditEntry = {
                    timestamp: startTime,
                    operation: 'hash_verify',
                    success: false,
                    error: `Invalid ${opts.algorithm} hash format`,
                    metadata: { algorithm: opts.algorithm }
                };
                this.auditLogger.log(auditEntry);
                return {
                    valid: false,
                    error: `Invalid ${opts.algorithm} hash format`
                };
            }
            // Calculate content hash
            let computedHash;
            try {
                computedHash = await this.calculateHash(content, opts.algorithm);
            }
            catch (error) {
                auditEntry = {
                    timestamp: startTime,
                    operation: 'hash_verify',
                    success: false,
                    error: `Hash calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    metadata: { algorithm: opts.algorithm }
                };
                this.auditLogger.log(auditEntry);
                return {
                    valid: false,
                    error: `Hash calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
                };
            }
            // Compare hashes
            let hashesMatch;
            if (opts.secureComparison) {
                hashesMatch = this.secureCompare(computedHash, expectedHash);
            }
            else {
                hashesMatch = computedHash === expectedHash;
            }
            auditEntry = {
                timestamp: startTime,
                operation: 'hash_verify',
                success: hashesMatch,
                error: hashesMatch ? undefined : 'Hash verification failed - content does not match expected hash',
                metadata: {
                    algorithm: opts.algorithm,
                    expectedHash: expectedHash.substring(0, 16) + '...', // Log partial hash for privacy
                    computedHash: computedHash.substring(0, 16) + '...'
                }
            };
            this.auditLogger.log(auditEntry);
            return {
                valid: hashesMatch,
                error: hashesMatch ? undefined : 'Hash verification failed - content does not match expected hash'
            };
        }
        catch (error) {
            auditEntry = {
                timestamp: startTime,
                operation: 'hash_verify',
                success: false,
                error: `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                metadata: { algorithm: options.algorithm || 'SHA-256' }
            };
            this.auditLogger.log(auditEntry);
            return {
                valid: false,
                error: `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    /**
     * Validate hash format based on algorithm
     */
    validateHashFormat(hash, algorithm = 'SHA-256') {
        if (!hash || typeof hash !== 'string') {
            return false;
        }
        switch (algorithm.toUpperCase()) {
            case 'SHA-256':
                // SHA-256 produces 256 bits = 32 bytes = 64 hex characters
                return /^[a-f0-9]{64}$/i.test(hash);
            case 'SHA-512':
                // SHA-512 produces 512 bits = 64 bytes = 128 hex characters
                return /^[a-f0-9]{128}$/i.test(hash);
            default:
                return false;
        }
    }
    /**
     * Secure constant-time hash comparison to prevent timing attacks
     */
    secureCompare(hash1, hash2) {
        if (hash1.length !== hash2.length) {
            return false;
        }
        let result = 0;
        for (let i = 0; i < hash1.length; i++) {
            result |= hash1.charCodeAt(i) ^ hash2.charCodeAt(i);
        }
        return result === 0;
    }
    /**
     * Calculate hash using specified algorithm
     */
    async calculateHash(content, algorithm) {
        let data;
        if (typeof content === 'string') {
            data = new TextEncoder().encode(content);
        }
        else {
            data = content;
        }
        let hash;
        switch (algorithm) {
            case 'SHA-256':
                hash = (0, sha256_1.sha256)(data);
                break;
            case 'SHA-512':
                hash = (0, sha512_1.sha512)(data);
                break;
            default:
                throw new Error(`Unsupported hash algorithm: ${algorithm}`);
        }
        return (0, utils_1.bytesToHex)(hash);
    }
    /**
     * Verify multiple content pieces against their hashes in batch
     */
    async verifyBatchHashes(contentPairs, options) {
        const results = [];
        for (const pair of contentPairs) {
            const result = await this.verifyContentHash(pair.content, pair.expectedHash, options);
            results.push(result);
        }
        return results;
    }
    /**
     * Generate content integrity proof for Blossom protocol
     */
    async generateIntegrityProof(content) {
        const hash = await this.calculateContentHash(content);
        const size = typeof content === 'string'
            ? new TextEncoder().encode(content).length
            : content.length;
        return {
            hash,
            algorithm: 'SHA-256',
            timestamp: Date.now(),
            size
        };
    }
    /**
     * Verify integrity proof
     */
    async verifyIntegrityProof(content, proof, maxAge) {
        // Check timestamp if maxAge is specified
        if (maxAge && (Date.now() - proof.timestamp > maxAge * 1000)) {
            return {
                valid: false,
                error: 'Integrity proof is too old'
            };
        }
        // Check size
        const actualSize = typeof content === 'string'
            ? new TextEncoder().encode(content).length
            : content.length;
        if (actualSize !== proof.size) {
            return {
                valid: false,
                error: 'Content size does not match proof'
            };
        }
        // Check algorithm
        if (proof.algorithm !== 'SHA-256') {
            return {
                valid: false,
                error: `Unsupported algorithm in proof: ${proof.algorithm}`
            };
        }
        // Verify hash
        return await this.verifyContentHash(content, proof.hash, {
            algorithm: proof.algorithm,
            secureComparison: true,
            validateFormat: true
        });
    }
}
exports.BlossomVerifier = BlossomVerifier;
