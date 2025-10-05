/**
 * Blossom content hash verification implementation
 * Implements secure hash validation for Blossom protocol with protection against timing attacks
 */
import type { IBlossomVerifier, VerificationResult, HashVerificationOptions } from '../types.js';
import { CryptoAuditLogger } from '../audit/logger.js';
/**
 * Blossom content verifier implementation
 */
export declare class BlossomVerifier implements IBlossomVerifier {
    private auditLogger;
    constructor(auditLogger?: CryptoAuditLogger);
    /**
     * Calculate SHA-256 hash of content
     */
    calculateContentHash(content: string | Uint8Array): Promise<string>;
    /**
     * Verify content against expected hash with secure comparison and format validation
     */
    verifyContentHash(content: string | Uint8Array, expectedHash: string, options?: HashVerificationOptions): Promise<VerificationResult>;
    /**
     * Validate hash format based on algorithm
     */
    validateHashFormat(hash: string, algorithm?: string): boolean;
    /**
     * Secure constant-time hash comparison to prevent timing attacks
     */
    secureCompare(hash1: string, hash2: string): boolean;
    /**
     * Calculate hash using specified algorithm
     */
    private calculateHash;
    /**
     * Verify multiple content pieces against their hashes in batch
     */
    verifyBatchHashes(contentPairs: Array<{
        content: string | Uint8Array;
        expectedHash: string;
    }>, options?: HashVerificationOptions): Promise<VerificationResult[]>;
    /**
     * Generate content integrity proof for Blossom protocol
     */
    generateIntegrityProof(content: string | Uint8Array): Promise<{
        hash: string;
        algorithm: string;
        timestamp: number;
        size: number;
    }>;
    /**
     * Verify integrity proof
     */
    verifyIntegrityProof(content: string | Uint8Array, proof: {
        hash: string;
        algorithm: string;
        timestamp: number;
        size: number;
    }, maxAge?: number): Promise<VerificationResult>;
}
