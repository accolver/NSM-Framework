/**
 * Enhanced Blossom Client with integrated cryptographic verification
 * Provides secure content uploads, downloads, and integrity verification using NSM crypto
 */

import type { INostrEvent } from '@nsm/core';
import type {
  HashVerificationOptions,
  SignatureVerificationOptions,
  VerificationResult,
} from '@nsm/crypto';
import { createCryptoSuite, CryptoAuditLogger } from '@nsm/crypto';
import {
  BlossomClient,
  BlossomConfig,
  BlossomUploadOptions,
  BlossomUploadResponse,
} from './BlossomClient.js';

export interface CryptoBlossomConfig extends BlossomConfig {
  /** Enable persistent audit logging */
  persistentAuditLogs?: boolean;
  /** Audit logger configuration */
  auditOptions?: {
    maxEntries?: number;
    retentionDays?: number;
    storageKey?: string;
  };
  /** Hash verification options */
  hashOptions?: HashVerificationOptions;
  /** Signature verification options */
  signatureOptions?: SignatureVerificationOptions;
  /** Enable automatic content integrity checks */
  autoVerifyContent?: boolean;
  /** Enable automatic Nostr event signature verification */
  autoVerifySignatures?: boolean;
}

export interface CryptoUploadResponse extends BlossomUploadResponse {
  /** Content integrity proof */
  integrityProof?: {
    hash: string;
    algorithm: string;
    timestamp: number;
    size: number;
  };
  /** Cryptographic verification result */
  cryptoVerification?: VerificationResult;
  /** Audit trail ID */
  auditTrailId?: string;
}

export interface CryptoDownloadResult {
  content: string;
  hash: string;
  verification: VerificationResult;
  integrityProof?: {
    hash: string;
    algorithm: string;
    timestamp: number;
    size: number;
  };
}

export interface BatchVerificationResult {
  items: Array<{
    hash: string;
    content: string | Uint8Array;
    verified: boolean;
    error?: string;
  }>;
  totalItems: number;
  successfulVerifications: number;
  failedVerifications: number;
}

/**
 * Enhanced Blossom client with integrated cryptographic verification
 */
export class CryptoBlossomClient extends BlossomClient {
  private cryptoSuite: ReturnType<typeof createCryptoSuite>;
  private verificationOptions: {
    hash: HashVerificationOptions;
    signature: SignatureVerificationOptions;
    autoVerifyContent: boolean;
    autoVerifySignatures: boolean;
  };
  private verificationCache: Map<string, VerificationResult> = new Map();
  private integrityProofCache: Map<string, any> = new Map();

  constructor(config: CryptoBlossomConfig) {
    super(config);

    // Initialize crypto suite
    this.cryptoSuite = createCryptoSuite({
      persistentAuditLogs: config.persistentAuditLogs,
      auditOptions: config.auditOptions,
    });

    // Set verification options
    this.verificationOptions = {
      hash: {
        algorithm: 'SHA-256',
        secureComparison: true,
        validateFormat: true,
        ...config.hashOptions,
      },
      signature: {
        verifyEventId: true,
        verifyPublicKey: true,
        verifyTimestamp: true,
        maxAge: 86400, // 24 hours
        checkMalleability: true,
        ...config.signatureOptions,
      },
      autoVerifyContent: config.autoVerifyContent ?? true,
      autoVerifySignatures: config.autoVerifySignatures ?? true,
    };
  }

  /**
   * Get the crypto suite for direct access to crypto operations
   */
  getCryptoSuite() {
    return this.cryptoSuite;
  }

  /**
   * Get audit logger for security monitoring
   */
  getAuditLogger(): CryptoAuditLogger {
    return this.cryptoSuite.auditLogger as CryptoAuditLogger;
  }

  /**
   * Upload with enhanced cryptographic verification
   */
  async uploadWithCrypto(
    content: string | Uint8Array,
    options?: BlossomUploadOptions & {
      generateIntegrityProof?: boolean;
      verifyUpload?: boolean;
    }
  ): Promise<CryptoUploadResponse> {
    const startTime = Date.now();

    try {
      // Generate integrity proof before upload
      let integrityProof;
      if (options?.generateIntegrityProof !== false) {
        integrityProof = await this.cryptoSuite.blossomVerifier.generateIntegrityProof(content);
      }

      // Perform the upload
      const uploadResult = await this.upload(content, options);

      // Verify the upload if requested
      let cryptoVerification: VerificationResult | undefined;
      if (options?.verifyUpload !== false && this.verificationOptions.autoVerifyContent) {
        cryptoVerification = await this.cryptoSuite.blossomVerifier.verifyContentHash(
          content,
          uploadResult.hash,
          this.verificationOptions.hash
        );

        if (!cryptoVerification.valid) {
          throw new Error(`Upload verification failed: ${cryptoVerification.error}`);
        }
      }

      const auditTrailId = this.generateAuditTrailId();

      // Log successful operation
      this.cryptoSuite.auditLogger.log({
        timestamp: startTime,
        operation: 'hash_verify',
        success: true,
        metadata: {
          operation: 'upload',
          hash: uploadResult.hash,
          size: uploadResult.size,
          auditTrailId,
          serversUsed: this.getServers().length,
        },
      });

      return {
        ...uploadResult,
        integrityProof,
        cryptoVerification,
        auditTrailId,
      };
    } catch (error) {
      // Log failed operation
      this.cryptoSuite.auditLogger.log({
        timestamp: startTime,
        operation: 'hash_verify',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error',
      });
      throw error;
    }
  }

  /**
   * Download with cryptographic verification
   */
  async downloadWithCrypto(
    hash: string,
    options?: {
      verifyIntegrity?: boolean;
      maxAge?: number;
    }
  ): Promise<CryptoDownloadResult> {
    const startTime = Date.now();

    try {
      // Download content
      const content = await this.download(hash);

      // Verify content integrity
      let verification: VerificationResult;
      if (options?.verifyIntegrity !== false && this.verificationOptions.autoVerifyContent) {
        // Check cache first
        const cacheKey = `${hash}-${content.length}`;
        if (this.verificationCache.has(cacheKey)) {
          verification = this.verificationCache.get(cacheKey)!;
        } else {
          verification = await this.cryptoSuite.blossomVerifier.verifyContentHash(
            content,
            hash,
            this.verificationOptions.hash
          );

          // Cache the result
          if (this.verificationCache.size > 500) {
            const firstKey = this.verificationCache.keys().next().value;
            if (firstKey) {
              this.verificationCache.delete(firstKey);
            }
          }
          this.verificationCache.set(cacheKey, verification);
        }
      } else {
        verification = { valid: true };
      }

      // Generate integrity proof
      let integrityProof;
      if (verification.valid) {
        integrityProof = await this.cryptoSuite.blossomVerifier.generateIntegrityProof(content);
      }

      // Log successful operation
      this.cryptoSuite.auditLogger.log({
        timestamp: startTime,
        operation: 'hash_verify',
        success: verification.valid,
        error: verification.valid ? undefined : verification.error,
        metadata: {
          operation: 'download',
          hash,
          contentSize: content.length,
          verified: verification.valid,
        },
      });

      return {
        content,
        hash,
        verification,
        integrityProof,
      };
    } catch (error) {
      // Log failed operation
      this.cryptoSuite.auditLogger.log({
        timestamp: startTime,
        operation: 'hash_verify',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown download error',
        metadata: { operation: 'download', hash },
      });
      throw error;
    }
  }

  /**
   * Verify multiple content items in batch
   */
  async batchVerifyContent(
    items: Array<{ content: string | Uint8Array; expectedHash: string }>,
    options?: HashVerificationOptions
  ): Promise<BatchVerificationResult> {
    const verificationOptions = { ...this.verificationOptions.hash, ...options };
    const results: VerificationResult[] = await this.cryptoSuite.blossomVerifier.verifyBatchHashes(
      items,
      verificationOptions
    );

    const batchResult: BatchVerificationResult = {
      items: items.map((item, index) => ({
        hash: item.expectedHash,
        content: item.content,
        verified: results[index]?.valid || false,
        error: results[index]?.error,
      })),
      totalItems: items.length,
      successfulVerifications: results.filter(r => r.valid).length,
      failedVerifications: results.filter(r => !r.valid).length,
    };

    // Log batch operation
    this.cryptoSuite.auditLogger.log({
      timestamp: Date.now(),
      operation: 'hash_verify',
      success: batchResult.failedVerifications === 0,
      metadata: {
        operation: 'batch_verify',
        totalItems: batchResult.totalItems,
        successCount: batchResult.successfulVerifications,
        failureCount: batchResult.failedVerifications,
      },
    });

    return batchResult;
  }

  /**
   * Verify Nostr authentication event signature
   */
  async verifyAuthEvent(
    authEvent: INostrEvent,
    options?: SignatureVerificationOptions
  ): Promise<VerificationResult> {
    const verificationOptions = { ...this.verificationOptions.signature, ...options };
    return await this.cryptoSuite.nostrVerifier.verifyEvent(authEvent, verificationOptions);
  }

  /**
   * Create secure content backup with multiple integrity proofs
   */
  async createSecureBackup(content: string | Uint8Array): Promise<{
    primaryHash: string;
    backupHashes: string[];
    integrityProofs: Array<{
      hash: string;
      algorithm: string;
      timestamp: number;
      size: number;
    }>;
    uploadResults: CryptoUploadResponse[];
  }> {
    // Calculate primary hash
    const primaryHash = await this.cryptoSuite.blossomVerifier.calculateContentHash(content);

    // Create multiple integrity proofs
    const integrityProofs = [];
    integrityProofs.push(await this.cryptoSuite.blossomVerifier.generateIntegrityProof(content));

    // Upload to all configured servers for redundancy
    const uploadPromises = this.getServers().map(async (server, index) => {
      try {
        // Create a temporary client for each server to ensure independent uploads
        const singleServerConfig = { ...this.getConfig(), servers: [server] };
        const tempClient = new CryptoBlossomClient(singleServerConfig);
        return await tempClient.uploadWithCrypto(content, { generateIntegrityProof: true });
      } catch (error) {
        // Log individual server failures but don't fail the entire backup
        this.cryptoSuite.auditLogger.log({
          timestamp: Date.now(),
          operation: 'hash_verify',
          success: false,
          error: `Backup upload to server ${server} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          metadata: { operation: 'secure_backup', server, index },
        });
        return null;
      }
    });

    const uploadResults = (await Promise.all(uploadPromises)).filter(
      (result): result is CryptoUploadResponse => result !== null
    );

    if (uploadResults.length === 0) {
      throw new Error('All backup uploads failed');
    }

    const backupHashes = uploadResults.map(result => result.hash);

    // Log successful backup operation
    this.cryptoSuite.auditLogger.log({
      timestamp: Date.now(),
      operation: 'hash_verify',
      success: true,
      metadata: {
        operation: 'secure_backup',
        primaryHash,
        backupCount: uploadResults.length,
        totalServers: this.getServers().length,
        redundancyLevel: uploadResults.length / this.getServers().length,
      },
    });

    return {
      primaryHash,
      backupHashes,
      integrityProofs,
      uploadResults,
    };
  }

  /**
   * Restore content from secure backup with verification
   */
  async restoreFromSecureBackup(
    backupHashes: string[],
    expectedIntegrityProof?: {
      hash: string;
      algorithm: string;
      timestamp: number;
      size: number;
    }
  ): Promise<CryptoDownloadResult> {
    const errors: Error[] = [];

    // Try each backup hash until one succeeds
    for (const hash of backupHashes) {
      try {
        const result = await this.downloadWithCrypto(hash, { verifyIntegrity: true });

        // Verify against expected integrity proof if provided
        if (expectedIntegrityProof) {
          const proofVerification = await this.cryptoSuite.blossomVerifier.verifyIntegrityProof(
            result.content,
            expectedIntegrityProof,
            86400 // 24 hour max age
          );

          if (!proofVerification.valid) {
            throw new Error(`Integrity proof verification failed: ${proofVerification.error}`);
          }
        }

        // Log successful restore
        this.cryptoSuite.auditLogger.log({
          timestamp: Date.now(),
          operation: 'hash_verify',
          success: true,
          metadata: {
            operation: 'secure_restore',
            hash,
            backupHashesAttempted: backupHashes.indexOf(hash) + 1,
            totalBackupHashes: backupHashes.length,
          },
        });

        return result;
      } catch (error) {
        errors.push(error as Error);
        continue;
      }
    }

    // Log failed restore attempt
    this.cryptoSuite.auditLogger.log({
      timestamp: Date.now(),
      operation: 'hash_verify',
      success: false,
      error: 'All backup restore attempts failed',
      metadata: {
        operation: 'secure_restore',
        backupHashesAttempted: backupHashes.length,
        errors: errors.map(e => e.message),
      },
    });

    throw new Error(
      `Restore from backup failed: ${errors[errors.length - 1]?.message || 'All backup hashes failed'}`
    );
  }

  /**
   * Get comprehensive security statistics
   */
  getSecurityStatistics(since?: number) {
    return {
      auditStats: this.cryptoSuite.auditLogger.getStatistics(since),
      verificationCacheSize: this.verificationCache.size,
      integrityProofCacheSize: this.integrityProofCache.size,
      serverStats: this.getServerStats(),
      failedOperations: this.cryptoSuite.auditLogger.getFailedOperations(since),
    };
  }

  /**
   * Export security audit logs
   */
  exportSecurityAuditLogs(startTime?: number, endTime?: number) {
    return this.cryptoSuite.auditLogger.exportLogs(startTime, endTime);
  }

  /**
   * Clear verification caches
   */
  clearVerificationCaches() {
    this.verificationCache.clear();
    this.integrityProofCache.clear();
  }

  /**
   * Update verification options at runtime
   */
  updateVerificationOptions(options: {
    hash?: Partial<HashVerificationOptions>;
    signature?: Partial<SignatureVerificationOptions>;
    autoVerifyContent?: boolean;
    autoVerifySignatures?: boolean;
  }) {
    if (options.hash) {
      this.verificationOptions.hash = { ...this.verificationOptions.hash, ...options.hash };
    }
    if (options.signature) {
      this.verificationOptions.signature = {
        ...this.verificationOptions.signature,
        ...options.signature,
      };
    }
    if (options.autoVerifyContent !== undefined) {
      this.verificationOptions.autoVerifyContent = options.autoVerifyContent;
    }
    if (options.autoVerifySignatures !== undefined) {
      this.verificationOptions.autoVerifySignatures = options.autoVerifySignatures;
    }
  }

  /**
   * Generate unique audit trail ID for tracking operations
   */
  private generateAuditTrailId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Enhanced cleanup that clears crypto caches
   */
  destroy() {
    this.clearVerificationCaches();
    this.cryptoSuite.auditLogger.clearOldLogs();
  }
}
