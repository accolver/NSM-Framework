"use strict";
/**
 * @nsm/crypto - Cryptographic verification utilities for NSM Framework
 *
 * This package provides secure cryptographic verification for Nostr events,
 * Blossom content hashes, and key management operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationUtils = exports.SECURITY_CONFIG = exports.NSM_CRYPTO_VERSION = exports.createAuditLogger = exports.PersistentCryptoAuditLogger = exports.CryptoAuditLogger = exports.KeyManager = exports.BlossomVerifier = exports.NostrVerifier = void 0;
exports.createCryptoSuite = createCryptoSuite;
exports.verifyNostrEvent = verifyNostrEvent;
exports.verifyBlossomContent = verifyBlossomContent;
// Export Nostr verification
var verifier_js_1 = require("./nostr/verifier.js");
Object.defineProperty(exports, "NostrVerifier", { enumerable: true, get: function () { return verifier_js_1.NostrVerifier; } });
// Export Blossom verification
var verifier_js_2 = require("./blossom/verifier.js");
Object.defineProperty(exports, "BlossomVerifier", { enumerable: true, get: function () { return verifier_js_2.BlossomVerifier; } });
// Export key management
var manager_js_1 = require("./keys/manager.js");
Object.defineProperty(exports, "KeyManager", { enumerable: true, get: function () { return manager_js_1.KeyManager; } });
// Export audit logging
var logger_js_1 = require("./audit/logger.js");
Object.defineProperty(exports, "CryptoAuditLogger", { enumerable: true, get: function () { return logger_js_1.CryptoAuditLogger; } });
Object.defineProperty(exports, "PersistentCryptoAuditLogger", { enumerable: true, get: function () { return logger_js_1.PersistentCryptoAuditLogger; } });
Object.defineProperty(exports, "createAuditLogger", { enumerable: true, get: function () { return logger_js_1.createAuditLogger; } });
// Import classes for internal use
const verifier_js_3 = require("./nostr/verifier.js");
const verifier_js_4 = require("./blossom/verifier.js");
const manager_js_2 = require("./keys/manager.js");
const logger_js_2 = require("./audit/logger.js");
// Package version and metadata
exports.NSM_CRYPTO_VERSION = "0.1.0";
/**
 * Create a complete crypto verification suite
 */
function createCryptoSuite(options) {
    const auditLogger = new logger_js_2.CryptoAuditLogger(options?.auditOptions);
    return {
        nostrVerifier: new verifier_js_3.NostrVerifier(auditLogger),
        blossomVerifier: new verifier_js_4.BlossomVerifier(auditLogger),
        keyManager: new manager_js_2.KeyManager(auditLogger),
        auditLogger
    };
}
/**
 * Utility function to verify a Nostr event with default options
 */
async function verifyNostrEvent(event, options) {
    const verifier = new verifier_js_3.NostrVerifier();
    return await verifier.verifyEvent(event, options);
}
/**
 * Utility function to verify Blossom content hash
 */
async function verifyBlossomContent(content, expectedHash, options) {
    const verifier = new verifier_js_4.BlossomVerifier();
    return await verifier.verifyContentHash(content, expectedHash, options);
}
/**
 * Security configuration constants
 */
exports.SECURITY_CONFIG = {
    /** Default PBKDF2 iterations for key derivation */
    DEFAULT_PBKDF2_ITERATIONS: 100000,
    /** Minimum private key entropy (bytes) */
    MIN_PRIVATE_KEY_ENTROPY: 32,
    /** Maximum event age for timestamp validation (seconds) */
    DEFAULT_MAX_EVENT_AGE: 86400, // 24 hours
    /** Default audit log retention period (days) */
    DEFAULT_AUDIT_RETENTION_DAYS: 30,
    /** Maximum audit log entries */
    DEFAULT_MAX_AUDIT_ENTRIES: 10000,
    /** Supported hash algorithms */
    SUPPORTED_HASH_ALGORITHMS: ['SHA-256', 'SHA-512'],
    /** Supported encryption algorithms */
    SUPPORTED_ENCRYPTION_ALGORITHMS: ['AES-256-GCM']
};
/**
 * Validation utilities
 */
exports.ValidationUtils = {
    /**
     * Validate hex string format
     */
    isValidHex(hex, expectedLength) {
        const hexPattern = /^[a-f0-9]+$/i;
        if (!hexPattern.test(hex)) {
            return false;
        }
        if (expectedLength && hex.length !== expectedLength) {
            return false;
        }
        return true;
    },
    /**
     * Validate Nostr public key format
     */
    isValidNostrPublicKey(pubkey) {
        return this.isValidHex(pubkey, 64);
    },
    /**
     * Validate Nostr signature format
     */
    isValidNostrSignature(signature) {
        return this.isValidHex(signature, 128);
    },
    /**
     * Validate SHA-256 hash format
     */
    isValidSHA256Hash(hash) {
        return this.isValidHex(hash, 64);
    },
    /**
     * Validate SHA-512 hash format
     */
    isValidSHA512Hash(hash) {
        return this.isValidHex(hash, 128);
    }
};
