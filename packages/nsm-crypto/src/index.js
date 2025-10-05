/**
 * @nsm/crypto - Cryptographic verification utilities for NSM Framework
 *
 * This package provides secure cryptographic verification for Nostr events,
 * Blossom content hashes, and key management operations.
 */
// Export Nostr verification
export { NostrVerifier } from './nostr/verifier.js';
// Export Blossom verification
export { BlossomVerifier } from './blossom/verifier.js';
// Export key management
export { KeyManager } from './keys/manager.js';
// Export audit logging
export { CryptoAuditLogger, PersistentCryptoAuditLogger, createAuditLogger } from './audit/logger.js';
// Import classes for internal use
import { NostrVerifier } from './nostr/verifier.js';
import { BlossomVerifier } from './blossom/verifier.js';
import { KeyManager } from './keys/manager.js';
import { CryptoAuditLogger } from './audit/logger.js';
// Package version and metadata
export const NSM_CRYPTO_VERSION = "0.1.0";
/**
 * Create a complete crypto verification suite
 */
export function createCryptoSuite(options) {
    const auditLogger = new CryptoAuditLogger(options?.auditOptions);
    return {
        nostrVerifier: new NostrVerifier(auditLogger),
        blossomVerifier: new BlossomVerifier(auditLogger),
        keyManager: new KeyManager(auditLogger),
        auditLogger
    };
}
/**
 * Utility function to verify a Nostr event with default options
 */
export async function verifyNostrEvent(event, options) {
    const verifier = new NostrVerifier();
    return await verifier.verifyEvent(event, options);
}
/**
 * Utility function to verify Blossom content hash
 */
export async function verifyBlossomContent(content, expectedHash, options) {
    const verifier = new BlossomVerifier();
    return await verifier.verifyContentHash(content, expectedHash, options);
}
/**
 * Security configuration constants
 */
export const SECURITY_CONFIG = {
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
export const ValidationUtils = {
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
//# sourceMappingURL=index.js.map