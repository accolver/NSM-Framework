/**
 * Enhanced NSM Client with integrated cryptographic verification
 * Provides secure Nostr event verification and Blossom content integrity checking
 */
import { NSMClient, NSMClientOptions } from './nsm-client.js';
import { NostrVerifier, BlossomVerifier, KeyManager, CryptoAuditLogger } from '@nsm/crypto';
import type { VerificationResult, SignatureVerificationOptions, HashVerificationOptions } from '@nsm/crypto/src/types';
import type { INostrEvent } from '@nsm/core';
export interface CryptoNSMClientOptions extends NSMClientOptions {
    /** Enable persistent audit logging */
    persistentAuditLogs?: boolean;
    /** Audit logger configuration */
    auditOptions?: {
        maxEntries?: number;
        retentionDays?: number;
        storageKey?: string;
    };
    /** Signature verification options */
    signatureOptions?: SignatureVerificationOptions;
    /** Hash verification options */
    hashOptions?: HashVerificationOptions;
    /** Enable automatic event verification */
    autoVerifyEvents?: boolean;
    /** Enable automatic content integrity checks */
    autoVerifyContent?: boolean;
}
export interface VerifiedEvent {
    event: INostrEvent;
    verification: VerificationResult;
    timestamp: number;
}
export interface ContentIntegrityResult {
    content: string | Uint8Array;
    hash: string;
    verified: boolean;
    timestamp: number;
    error?: string;
}
/**
 * Enhanced NSM Client with integrated cryptographic verification
 */
export declare class CryptoNSMClient extends NSMClient {
    private cryptoSuite;
    private verificationOptions;
    private verificationCache;
    private contentCache;
    constructor(options?: CryptoNSMClientOptions);
    /**
     * Get the crypto suite for direct access to crypto operations
     */
    getCryptoSuite(): {
        nostrVerifier: NostrVerifier;
        blossomVerifier: BlossomVerifier;
        keyManager: KeyManager;
        auditLogger: CryptoAuditLogger;
    };
    /**
     * Get audit logger for security monitoring
     */
    getAuditLogger(): CryptoAuditLogger;
    /**
     * Verify a Nostr event cryptographically
     */
    verifyEvent(event: INostrEvent, options?: SignatureVerificationOptions): Promise<VerificationResult>;
    /**
     * Verify content hash integrity
     */
    verifyContentHash(content: string | Uint8Array, expectedHash: string, options?: HashVerificationOptions): Promise<VerificationResult>;
    /**
     * Calculate content hash
     */
    calculateContentHash(content: string | Uint8Array): Promise<string>;
    /**
     * Generate content integrity proof
     */
    generateContentIntegrityProof(content: string | Uint8Array): Promise<{
        hash: string;
        algorithm: string;
        timestamp: number;
        size: number;
    }>;
    /**
     * Verify content integrity proof
     */
    verifyContentIntegrityProof(content: string | Uint8Array, proof: {
        hash: string;
        algorithm: string;
        timestamp: number;
        size: number;
    }, maxAge?: number): Promise<VerificationResult>;
    /**
     * Enhanced application discovery with event verification
     */
    discoverVerifiedApplications(options?: Parameters<NSMClient['discoverApplications']>[0]): Promise<any[]>;
    /**
     * Subscribe to application with event verification
     */
    subscribeToVerifiedApplication(applicationId: string, handlers: Parameters<NSMClient['subscribeToApplication']>[1] & {
        onVerifiedInteraction?: (interaction: any, verification: VerificationResult) => void;
        onVerifiedStateUpdate?: (stateUpdate: any, verification: VerificationResult) => void;
        onVerificationFailure?: (event: INostrEvent, verification: VerificationResult) => void;
    }): import("@nostr-dev-kit/ndk").NDKSubscription;
    /**
     * Generate a new key pair for signing
     */
    generateKeyPair(): Promise<{
        privateKey: Uint8Array;
        publicKey: string;
    }>;
    /**
     * Encrypt a private key for secure storage
     */
    encryptPrivateKey(privateKey: Uint8Array, password: string): Promise<import("@nsm/crypto").EncryptedPrivateKey>;
    /**
     * Decrypt a private key from secure storage
     */
    decryptPrivateKey(encryptedPrivateKey: Parameters<KeyManager['decryptPrivateKey']>[0], password: string): Promise<Uint8Array<ArrayBufferLike>>;
    /**
     * Clear sensitive data from memory
     */
    clearSensitiveData(data: Uint8Array): void;
    /**
     * Get security audit statistics
     */
    getSecurityAuditStatistics(since?: number): {
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
     * Get failed security operations for monitoring
     */
    getFailedSecurityOperations(since?: number): import("@nsm/crypto").CryptoAuditEntry[];
    /**
     * Export security audit logs
     */
    exportSecurityAuditLogs(startTime?: number, endTime?: number): string;
    /**
     * Validate event signature before processing
     */
    private validateEventIfEnabled;
    /**
     * Get verification cache statistics
     */
    getVerificationCacheStats(): {
        eventVerificationCacheSize: number;
        contentCacheSize: number;
        totalCachedVerifications: number;
    };
    /**
     * Clear verification caches
     */
    clearVerificationCaches(): void;
    /**
     * Update verification options at runtime
     */
    updateVerificationOptions(options: {
        signature?: Partial<SignatureVerificationOptions>;
        hash?: Partial<HashVerificationOptions>;
        autoVerifyEvents?: boolean;
        autoVerifyContent?: boolean;
    }): void;
    /**
     * Enhanced cleanup that clears crypto caches and sensitive data
     */
    disconnect(): void;
}
//# sourceMappingURL=crypto-client.d.ts.map