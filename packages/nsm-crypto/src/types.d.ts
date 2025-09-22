/**
 * Type definitions for NSM cryptographic operations
 */
import type { INostrEvent } from "@nsm/core";
/**
 * Result of cryptographic verification operations
 */
export interface VerificationResult {
    valid: boolean;
    error?: string;
    details?: {
        signatureValid?: boolean;
        eventIdValid?: boolean;
        publicKeyValid?: boolean;
        timestampValid?: boolean;
    };
}
/**
 * Options for signature verification
 */
export interface SignatureVerificationOptions {
    /** Whether to verify event ID hash */
    verifyEventId?: boolean;
    /** Whether to verify public key format */
    verifyPublicKey?: boolean;
    /** Whether to validate timestamp */
    verifyTimestamp?: boolean;
    /** Maximum age for timestamp validation (seconds) */
    maxAge?: number;
    /** Whether to check for signature malleability */
    checkMalleability?: boolean;
}
/**
 * Options for hash verification
 */
export interface HashVerificationOptions {
    /** Expected hash algorithm */
    algorithm?: 'SHA-256' | 'SHA-512';
    /** Whether to use secure comparison */
    secureComparison?: boolean;
    /** Whether to validate hash format */
    validateFormat?: boolean;
}
/**
 * Key derivation parameters
 */
export interface KeyDerivationParams {
    /** Password for key derivation */
    password: string;
    /** Salt for key derivation */
    salt: Uint8Array;
    /** Number of iterations */
    iterations?: number;
    /** Key length in bytes */
    keyLength?: number;
    /** Hash algorithm to use */
    hashAlgorithm?: 'SHA-256' | 'SHA-512';
}
/**
 * Encrypted private key data
 */
export interface EncryptedPrivateKey {
    /** Encrypted key data */
    encryptedData: Uint8Array;
    /** Salt used for key derivation */
    salt: Uint8Array;
    /** Initialization vector */
    iv: Uint8Array;
    /** Algorithm used */
    algorithm: string;
    /** Iterations used for key derivation */
    iterations: number;
}
/**
 * Key management operations interface
 */
export interface IKeyManager {
    /** Generate a new key pair */
    generateKeyPair(): Promise<{
        privateKey: Uint8Array;
        publicKey: string;
    }>;
    /** Encrypt a private key */
    encryptPrivateKey(privateKey: Uint8Array, password: string): Promise<EncryptedPrivateKey>;
    /** Decrypt a private key */
    decryptPrivateKey(encrypted: EncryptedPrivateKey, password: string): Promise<Uint8Array>;
    /** Derive key from password */
    deriveKey(params: KeyDerivationParams): Promise<Uint8Array>;
    /** Generate secure random bytes */
    generateRandomBytes(length: number): Uint8Array;
    /** Clear sensitive data from memory */
    clearSensitiveData(data: Uint8Array): void;
}
/**
 * Nostr event signature verification interface
 */
export interface INostrVerifier {
    /** Verify a complete Nostr event */
    verifyEvent(event: INostrEvent, options?: SignatureVerificationOptions): Promise<VerificationResult>;
    /** Verify just the signature of an event */
    verifySignature(eventId: string, signature: string, publicKey: string): Promise<boolean>;
    /** Verify event ID matches content */
    verifyEventId(event: INostrEvent): boolean;
    /** Validate public key format */
    validatePublicKey(publicKey: string): boolean;
    /** Validate signature format */
    validateSignature(signature: string): boolean;
    /** Check for signature malleability */
    checkSignatureMalleability(signature: string): boolean;
}
/**
 * Blossom content verification interface
 */
export interface IBlossomVerifier {
    /** Calculate SHA-256 hash of content */
    calculateContentHash(content: string | Uint8Array): Promise<string>;
    /** Verify content against expected hash */
    verifyContentHash(content: string | Uint8Array, expectedHash: string, options?: HashVerificationOptions): Promise<VerificationResult>;
    /** Validate hash format */
    validateHashFormat(hash: string, algorithm?: string): boolean;
    /** Secure hash comparison */
    secureCompare(hash1: string, hash2: string): boolean;
}
/**
 * Audit log entry for cryptographic operations
 */
export interface CryptoAuditEntry {
    /** Timestamp of operation */
    timestamp: number;
    /** Type of operation */
    operation: 'signature_verify' | 'hash_verify' | 'key_generate' | 'key_encrypt' | 'key_decrypt' | 'error';
    /** Success status */
    success: boolean;
    /** Error message if applicable */
    error?: string;
    /** Additional metadata */
    metadata?: {
        eventId?: string;
        publicKey?: string;
        algorithm?: string;
        [key: string]: unknown;
    };
}
/**
 * Cryptographic audit logger interface
 */
export interface ICryptoAuditLogger {
    /** Log a cryptographic operation */
    log(entry: CryptoAuditEntry): void;
    /** Get audit logs for a time range */
    getLogs(startTime: number, endTime: number): CryptoAuditEntry[];
    /** Clear old audit logs */
    clearOldLogs(olderThan: number): void;
}
//# sourceMappingURL=types.d.ts.map