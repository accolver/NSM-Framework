/**
 * Secure key management implementation
 * Handles private key storage, encryption, and key derivation with security best practices
 */
import type { IKeyManager, KeyDerivationParams, EncryptedPrivateKey } from '../types.js';
import { CryptoAuditLogger } from '../audit/logger.js';
/**
 * Key manager implementation with secure practices
 */
export declare class KeyManager implements IKeyManager {
    private auditLogger;
    constructor(auditLogger?: CryptoAuditLogger);
    /**
     * Generate a new secp256k1 key pair
     */
    generateKeyPair(): Promise<{
        privateKey: Uint8Array;
        publicKey: string;
    }>;
    /**
     * Encrypt a private key using password-based encryption
     */
    encryptPrivateKey(privateKey: Uint8Array, password: string): Promise<EncryptedPrivateKey>;
    /**
     * Decrypt a private key using password
     */
    decryptPrivateKey(encrypted: EncryptedPrivateKey, password: string): Promise<Uint8Array>;
    /**
     * Derive key from password using PBKDF2
     */
    deriveKey(params: KeyDerivationParams): Promise<Uint8Array>;
    /**
     * Generate cryptographically secure random bytes
     */
    generateRandomBytes(length: number): Uint8Array;
    /**
     * Clear sensitive data from memory by overwriting with random data
     */
    clearSensitiveData(data: Uint8Array): void;
    /**
     * Rotate encryption key for an encrypted private key
     */
    rotateEncryptionKey(encrypted: EncryptedPrivateKey, oldPassword: string, newPassword: string): Promise<EncryptedPrivateKey>;
    /**
     * Validate private key format and range
     */
    validatePrivateKey(privateKey: Uint8Array): boolean;
    /**
     * Create key backup data with integrity protection
     */
    createKeyBackup(privateKey: Uint8Array, password: string, metadata?: Record<string, unknown>): Promise<{
        encrypted: EncryptedPrivateKey;
        checksum: string;
        metadata?: Record<string, unknown>;
        timestamp: number;
    }>;
    /**
     * Verify and restore key from backup
     */
    restoreFromBackup(backup: {
        encrypted: EncryptedPrivateKey;
        checksum: string;
        metadata?: Record<string, unknown>;
        timestamp: number;
    }, password: string): Promise<{
        privateKey: Uint8Array;
        metadata?: Record<string, unknown>;
    }>;
}
