/**
 * Secure key management implementation
 * Handles private key storage, encryption, and key derivation with security best practices
 */
import { getPublicKey } from '@noble/secp256k1';
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';
import { sha512 } from '@noble/hashes/sha512';
import { randomBytes, bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { CryptoAuditLogger } from '../audit/logger.js';
/**
 * AES-GCM encryption/decryption utilities
 */
class AESGCMCrypto {
    /**
     * Encrypt data using AES-256-GCM
     */
    static async encrypt(data, key) {
        const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
        const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'AES-GCM' }, false, ['encrypt']);
        const encrypted = await crypto.subtle.encrypt({
            name: 'AES-GCM',
            iv: iv
        }, cryptoKey, data);
        return {
            encrypted: new Uint8Array(encrypted),
            iv
        };
    }
    /**
     * Decrypt data using AES-256-GCM
     */
    static async decrypt(encryptedData, key, iv) {
        const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'AES-GCM' }, false, ['decrypt']);
        const decrypted = await crypto.subtle.decrypt({
            name: 'AES-GCM',
            iv: iv
        }, cryptoKey, encryptedData);
        return new Uint8Array(decrypted);
    }
}
/**
 * Key manager implementation with secure practices
 */
export class KeyManager {
    auditLogger;
    constructor(auditLogger) {
        this.auditLogger = auditLogger || new CryptoAuditLogger();
    }
    /**
     * Generate a new secp256k1 key pair
     */
    async generateKeyPair() {
        try {
            const privateKey = this.generateRandomBytes(32);
            // Ensure the private key is within the valid secp256k1 range
            const secp256k1Order = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
            let privateKeyBigInt = BigInt('0x' + bytesToHex(privateKey));
            // If generated key is >= order, regenerate (very unlikely but important for security)
            while (privateKeyBigInt >= secp256k1Order || privateKeyBigInt === 0n) {
                const newPrivateKey = this.generateRandomBytes(32);
                privateKeyBigInt = BigInt('0x' + bytesToHex(newPrivateKey));
                newPrivateKey.set(hexToBytes(privateKeyBigInt.toString(16).padStart(64, '0')));
                privateKey.set(newPrivateKey);
            }
            // Calculate public key
            const publicKeyBytes = getPublicKey(privateKey, false); // Uncompressed
            const publicKey = bytesToHex(publicKeyBytes.slice(1, 33)); // Take x-coordinate only for Schnorr
            const auditEntry = {
                timestamp: Date.now(),
                operation: 'key_generate',
                success: true,
                metadata: { publicKey }
            };
            this.auditLogger.log(auditEntry);
            return { privateKey, publicKey };
        }
        catch (error) {
            const auditEntry = {
                timestamp: Date.now(),
                operation: 'key_generate',
                success: false,
                error: error instanceof Error ? error.message : 'Unknown key generation error'
            };
            this.auditLogger.log(auditEntry);
            throw error;
        }
    }
    /**
     * Encrypt a private key using password-based encryption
     */
    async encryptPrivateKey(privateKey, password) {
        try {
            // Generate salt for key derivation
            const salt = this.generateRandomBytes(32);
            const iterations = 100000; // PBKDF2 iterations
            // Derive encryption key from password
            const derivedKey = await this.deriveKey({
                password,
                salt,
                iterations,
                keyLength: 32, // 256-bit key for AES-256
                hashAlgorithm: 'SHA-256'
            });
            // Encrypt the private key
            const { encrypted, iv } = await AESGCMCrypto.encrypt(privateKey, derivedKey);
            // Clear the derived key from memory
            this.clearSensitiveData(derivedKey);
            const result = {
                encryptedData: encrypted,
                salt,
                iv,
                algorithm: 'AES-256-GCM',
                iterations
            };
            const auditEntry = {
                timestamp: Date.now(),
                operation: 'key_encrypt',
                success: true,
                metadata: { algorithm: 'AES-256-GCM', iterations }
            };
            this.auditLogger.log(auditEntry);
            return result;
        }
        catch (error) {
            const auditEntry = {
                timestamp: Date.now(),
                operation: 'key_encrypt',
                success: false,
                error: error instanceof Error ? error.message : 'Unknown encryption error'
            };
            this.auditLogger.log(auditEntry);
            throw error;
        }
    }
    /**
     * Decrypt a private key using password
     */
    async decryptPrivateKey(encrypted, password) {
        try {
            // Verify algorithm
            if (encrypted.algorithm !== 'AES-256-GCM') {
                throw new Error(`Unsupported encryption algorithm: ${encrypted.algorithm}`);
            }
            // Derive decryption key from password
            const derivedKey = await this.deriveKey({
                password,
                salt: encrypted.salt,
                iterations: encrypted.iterations,
                keyLength: 32,
                hashAlgorithm: 'SHA-256'
            });
            // Decrypt the private key
            const decryptedKey = await AESGCMCrypto.decrypt(encrypted.encryptedData, derivedKey, encrypted.iv);
            // Clear the derived key from memory
            this.clearSensitiveData(derivedKey);
            const auditEntry = {
                timestamp: Date.now(),
                operation: 'key_decrypt',
                success: true,
                metadata: { algorithm: encrypted.algorithm, iterations: encrypted.iterations }
            };
            this.auditLogger.log(auditEntry);
            return decryptedKey;
        }
        catch (error) {
            const auditEntry = {
                timestamp: Date.now(),
                operation: 'key_decrypt',
                success: false,
                error: error instanceof Error ? error.message : 'Unknown decryption error'
            };
            this.auditLogger.log(auditEntry);
            throw error;
        }
    }
    /**
     * Derive key from password using PBKDF2
     */
    async deriveKey(params) {
        const { password, salt, iterations = 100000, keyLength = 32, hashAlgorithm = 'SHA-256' } = params;
        const passwordBytes = new TextEncoder().encode(password);
        try {
            let derivedKey;
            switch (hashAlgorithm) {
                case 'SHA-256':
                    derivedKey = pbkdf2(sha256, passwordBytes, salt, { c: iterations, dkLen: keyLength });
                    break;
                case 'SHA-512':
                    derivedKey = pbkdf2(sha512, passwordBytes, salt, { c: iterations, dkLen: keyLength });
                    break;
                default:
                    throw new Error(`Unsupported hash algorithm: ${hashAlgorithm}`);
            }
            // Clear password from memory
            passwordBytes.fill(0);
            return derivedKey;
        }
        catch (error) {
            // Clear password from memory even on error
            passwordBytes.fill(0);
            throw error;
        }
    }
    /**
     * Generate cryptographically secure random bytes
     */
    generateRandomBytes(length) {
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            // Browser environment
            return crypto.getRandomValues(new Uint8Array(length));
        }
        else {
            // Use noble-hashes randomBytes which works in Node.js
            return randomBytes(length);
        }
    }
    /**
     * Clear sensitive data from memory by overwriting with random data
     */
    clearSensitiveData(data) {
        try {
            // Overwrite with random data multiple times
            const randomData = this.generateRandomBytes(data.length);
            data.set(randomData);
            // Overwrite with zeros
            data.fill(0);
            // Overwrite with 0xFF
            data.fill(0xFF);
            // Final overwrite with zeros
            data.fill(0);
        }
        catch (error) {
            // If clearing fails, at least try to zero out
            data.fill(0);
        }
    }
    /**
     * Rotate encryption key for an encrypted private key
     */
    async rotateEncryptionKey(encrypted, oldPassword, newPassword) {
        try {
            // Decrypt with old password
            const privateKey = await this.decryptPrivateKey(encrypted, oldPassword);
            // Encrypt with new password
            const newEncrypted = await this.encryptPrivateKey(privateKey, newPassword);
            // Clear the decrypted private key
            this.clearSensitiveData(privateKey);
            return newEncrypted;
        }
        catch (error) {
            throw new Error(`Key rotation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Validate private key format and range
     */
    validatePrivateKey(privateKey) {
        if (privateKey.length !== 32) {
            return false;
        }
        // Check that private key is within secp256k1 order
        const secp256k1Order = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
        const privateKeyBigInt = BigInt('0x' + bytesToHex(privateKey));
        return privateKeyBigInt > 0n && privateKeyBigInt < secp256k1Order;
    }
    /**
     * Create key backup data with integrity protection
     */
    async createKeyBackup(privateKey, password, metadata) {
        const encrypted = await this.encryptPrivateKey(privateKey, password);
        // Create integrity checksum
        const checksumData = new Uint8Array([
            ...encrypted.encryptedData,
            ...encrypted.salt,
            ...encrypted.iv
        ]);
        const checksum = bytesToHex(sha256(checksumData));
        return {
            encrypted,
            checksum,
            metadata,
            timestamp: Date.now()
        };
    }
    /**
     * Verify and restore key from backup
     */
    async restoreFromBackup(backup, password) {
        // Verify integrity checksum
        const checksumData = new Uint8Array([
            ...backup.encrypted.encryptedData,
            ...backup.encrypted.salt,
            ...backup.encrypted.iv
        ]);
        const computedChecksum = bytesToHex(sha256(checksumData));
        if (computedChecksum !== backup.checksum) {
            throw new Error('Backup integrity verification failed');
        }
        // Decrypt private key
        const privateKey = await this.decryptPrivateKey(backup.encrypted, password);
        // Validate the restored private key
        if (!this.validatePrivateKey(privateKey)) {
            this.clearSensitiveData(privateKey);
            throw new Error('Restored private key is invalid');
        }
        return {
            privateKey,
            metadata: backup.metadata
        };
    }
}
//# sourceMappingURL=manager.js.map