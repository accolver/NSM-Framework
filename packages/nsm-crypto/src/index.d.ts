/**
 * @nsm/crypto - Cryptographic verification utilities for NSM Framework
 *
 * This package provides secure cryptographic verification for Nostr events,
 * Blossom content hashes, and key management operations.
 */
export type { VerificationResult, SignatureVerificationOptions, HashVerificationOptions, KeyDerivationParams, EncryptedPrivateKey, CryptoAuditEntry, IKeyManager, INostrVerifier, IBlossomVerifier, ICryptoAuditLogger } from './types.js';
export { NostrVerifier } from './nostr/verifier.js';
export { BlossomVerifier } from './blossom/verifier.js';
export { KeyManager } from './keys/manager.js';
export { CryptoAuditLogger, PersistentCryptoAuditLogger, createAuditLogger } from './audit/logger.js';
import { NostrVerifier } from './nostr/verifier.js';
import { BlossomVerifier } from './blossom/verifier.js';
import { KeyManager } from './keys/manager.js';
import { CryptoAuditLogger } from './audit/logger.js';
export declare const NSM_CRYPTO_VERSION = "0.1.0";
/**
 * Create a complete crypto verification suite
 */
export declare function createCryptoSuite(options?: {
    persistentAuditLogs?: boolean;
    auditOptions?: {
        maxEntries?: number;
        retentionDays?: number;
        storageKey?: string;
    };
}): {
    nostrVerifier: NostrVerifier;
    blossomVerifier: BlossomVerifier;
    keyManager: KeyManager;
    auditLogger: CryptoAuditLogger;
};
/**
 * Utility function to verify a Nostr event with default options
 */
export declare function verifyNostrEvent(event: unknown, options?: import('./types.js').SignatureVerificationOptions): Promise<import("src/index.js").VerificationResult>;
/**
 * Utility function to verify Blossom content hash
 */
export declare function verifyBlossomContent(content: string | Uint8Array, expectedHash: string, options?: import('./types.js').HashVerificationOptions): Promise<import("src/index.js").VerificationResult>;
/**
 * Security configuration constants
 */
export declare const SECURITY_CONFIG: {
    /** Default PBKDF2 iterations for key derivation */
    readonly DEFAULT_PBKDF2_ITERATIONS: 100000;
    /** Minimum private key entropy (bytes) */
    readonly MIN_PRIVATE_KEY_ENTROPY: 32;
    /** Maximum event age for timestamp validation (seconds) */
    readonly DEFAULT_MAX_EVENT_AGE: 86400;
    /** Default audit log retention period (days) */
    readonly DEFAULT_AUDIT_RETENTION_DAYS: 30;
    /** Maximum audit log entries */
    readonly DEFAULT_MAX_AUDIT_ENTRIES: 10000;
    /** Supported hash algorithms */
    readonly SUPPORTED_HASH_ALGORITHMS: readonly ["SHA-256", "SHA-512"];
    /** Supported encryption algorithms */
    readonly SUPPORTED_ENCRYPTION_ALGORITHMS: readonly ["AES-256-GCM"];
};
/**
 * Validation utilities
 */
export declare const ValidationUtils: {
    /**
     * Validate hex string format
     */
    readonly isValidHex: (hex: string, expectedLength?: number) => boolean;
    /**
     * Validate Nostr public key format
     */
    readonly isValidNostrPublicKey: (pubkey: string) => boolean;
    /**
     * Validate Nostr signature format
     */
    readonly isValidNostrSignature: (signature: string) => boolean;
    /**
     * Validate SHA-256 hash format
     */
    readonly isValidSHA256Hash: (hash: string) => boolean;
    /**
     * Validate SHA-512 hash format
     */
    readonly isValidSHA512Hash: (hash: string) => boolean;
};
