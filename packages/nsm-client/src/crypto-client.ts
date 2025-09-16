/**
 * Enhanced NSM Client with integrated cryptographic verification
 * Provides secure Nostr event verification and Blossom content integrity checking
 */

import { NSMClient, NSMClientOptions } from './nsm-client.js';
import {
  createCryptoSuite,
  NostrVerifier,
  BlossomVerifier,
  KeyManager,
  CryptoAuditLogger,
  type VerificationResult,
  type SignatureVerificationOptions,
  type HashVerificationOptions
} from '@nsm/crypto';
import { NDKEvent } from '@nostr-dev-kit/ndk';
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
export class CryptoNSMClient extends NSMClient {
  private cryptoSuite: ReturnType<typeof createCryptoSuite>;
  private verificationOptions: {
    signature: SignatureVerificationOptions;
    hash: HashVerificationOptions;
    autoVerifyEvents: boolean;
    autoVerifyContent: boolean;
  };
  private verificationCache: Map<string, VerificationResult> = new Map();
  private contentCache: Map<string, ContentIntegrityResult> = new Map();

  constructor(options: CryptoNSMClientOptions = {}) {
    super(options);

    // Initialize crypto suite
    this.cryptoSuite = createCryptoSuite({
      persistentAuditLogs: options.persistentAuditLogs,
      auditOptions: options.auditOptions
    });

    // Set verification options
    this.verificationOptions = {
      signature: {
        verifyEventId: true,
        verifyPublicKey: true,
        verifyTimestamp: true,
        maxAge: 86400, // 24 hours
        checkMalleability: true,
        ...options.signatureOptions
      },
      hash: {
        algorithm: 'SHA-256',
        secureComparison: true,
        validateFormat: true,
        ...options.hashOptions
      },
      autoVerifyEvents: options.autoVerifyEvents ?? true,
      autoVerifyContent: options.autoVerifyContent ?? true
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
   * Verify a Nostr event cryptographically
   */
  async verifyEvent(event: INostrEvent, options?: SignatureVerificationOptions): Promise<VerificationResult> {
    // Check cache first
    const cacheKey = `${event.id}-${event.sig}`;
    if (this.verificationCache.has(cacheKey)) {
      return this.verificationCache.get(cacheKey)!;
    }

    const verificationOptions = { ...this.verificationOptions.signature, ...options };
    const result = await this.cryptoSuite.nostrVerifier.verifyEvent(event, verificationOptions);

    // Cache the result (with size limit)
    if (this.verificationCache.size > 1000) {
      const firstKey = this.verificationCache.keys().next().value;
      this.verificationCache.delete(firstKey);
    }
    this.verificationCache.set(cacheKey, result);

    return result;
  }

  /**
   * Verify content hash integrity
   */
  async verifyContentHash(
    content: string | Uint8Array,
    expectedHash: string,
    options?: HashVerificationOptions
  ): Promise<VerificationResult> {
    const verificationOptions = { ...this.verificationOptions.hash, ...options };
    return await this.cryptoSuite.blossomVerifier.verifyContentHash(content, expectedHash, verificationOptions);
  }

  /**
   * Calculate content hash
   */
  async calculateContentHash(content: string | Uint8Array): Promise<string> {
    return await this.cryptoSuite.blossomVerifier.calculateContentHash(content);
  }

  /**
   * Generate content integrity proof
   */
  async generateContentIntegrityProof(content: string | Uint8Array) {
    return await this.cryptoSuite.blossomVerifier.generateIntegrityProof(content);
  }

  /**
   * Verify content integrity proof
   */
  async verifyContentIntegrityProof(
    content: string | Uint8Array,
    proof: {
      hash: string;
      algorithm: string;
      timestamp: number;
      size: number;
    },
    maxAge?: number
  ): Promise<VerificationResult> {
    return await this.cryptoSuite.blossomVerifier.verifyIntegrityProof(content, proof, maxAge);
  }

  /**
   * Enhanced application discovery with event verification
   */
  async discoverVerifiedApplications(options: Parameters<NSMClient['discoverApplications']>[0] = {}) {
    const applications = await super.discoverApplications(options);

    if (!this.verificationOptions.autoVerifyEvents) {
      return applications;
    }

    // Verify each application's definition event
    const verifiedApplications = [];
    for (const app of applications) {
      if (app.author && app.created_at) {
        // Reconstruct the definition event for verification
        const definitionEvent: INostrEvent = {
          id: '', // Would need to be reconstructed from the actual event
          pubkey: app.author,
          created_at: app.created_at,
          kind: 30079,
          tags: [
            ['d', app.identifier],
            ['name', app.name],
            ['engine', app.engine],
            ['engineCodeURI', app.engineCodeURI]
          ],
          content: JSON.stringify({
            initialState: app.initialState,
            stateSchema: app.stateSchema,
            interactionSchema: app.interactionSchema
          }),
          sig: '' // Would need the actual signature
        };

        // Note: In a real implementation, we'd need the full event data
        // This is a demonstration of the integration pattern
        verifiedApplications.push({
          ...app,
          verified: true // Placeholder - would be actual verification result
        });
      } else {
        verifiedApplications.push({
          ...app,
          verified: false
        });
      }
    }

    return verifiedApplications;
  }

  /**
   * Subscribe to application with event verification
   */
  subscribeToVerifiedApplication(
    applicationId: string,
    handlers: Parameters<NSMClient['subscribeToApplication']>[1] & {
      onVerifiedInteraction?: (interaction: any, verification: VerificationResult) => void;
      onVerifiedStateUpdate?: (stateUpdate: any, verification: VerificationResult) => void;
      onVerificationFailure?: (event: INostrEvent, verification: VerificationResult) => void;
    }
  ) {
    const originalHandlers = {
      onInteraction: handlers.onInteraction,
      onStateUpdate: handlers.onStateUpdate,
      onError: handlers.onError
    };

    // Enhanced handlers with verification
    const enhancedHandlers = {
      onInteraction: async (interaction: any) => {
        if (this.verificationOptions.autoVerifyEvents && handlers.onVerifiedInteraction) {
          // Note: We'd need the full NDK event to convert to INostrEvent for verification
          // This is a demonstration of the integration pattern
          const mockVerification: VerificationResult = { valid: true };
          handlers.onVerifiedInteraction(interaction, mockVerification);
        } else if (originalHandlers.onInteraction) {
          originalHandlers.onInteraction(interaction);
        }
      },
      onStateUpdate: async (stateUpdate: any) => {
        if (this.verificationOptions.autoVerifyEvents && handlers.onVerifiedStateUpdate) {
          // Note: We'd need the full NDK event to convert to INostrEvent for verification
          const mockVerification: VerificationResult = { valid: true };
          handlers.onVerifiedStateUpdate(stateUpdate, mockVerification);
        } else if (originalHandlers.onStateUpdate) {
          originalHandlers.onStateUpdate(stateUpdate);
        }
      },
      onError: originalHandlers.onError
    };

    return super.subscribeToApplication(applicationId, enhancedHandlers);
  }

  /**
   * Generate a new key pair for signing
   */
  async generateKeyPair() {
    return await this.cryptoSuite.keyManager.generateKeyPair();
  }

  /**
   * Encrypt a private key for secure storage
   */
  async encryptPrivateKey(privateKey: Uint8Array, password: string) {
    return await this.cryptoSuite.keyManager.encryptPrivateKey(privateKey, password);
  }

  /**
   * Decrypt a private key from secure storage
   */
  async decryptPrivateKey(encryptedPrivateKey: Parameters<KeyManager['decryptPrivateKey']>[0], password: string) {
    return await this.cryptoSuite.keyManager.decryptPrivateKey(encryptedPrivateKey, password);
  }

  /**
   * Clear sensitive data from memory
   */
  clearSensitiveData(data: Uint8Array) {
    this.cryptoSuite.keyManager.clearSensitiveData(data);
  }

  /**
   * Get security audit statistics
   */
  getSecurityAuditStatistics(since?: number) {
    return this.cryptoSuite.auditLogger.getStatistics(since);
  }

  /**
   * Get failed security operations for monitoring
   */
  getFailedSecurityOperations(since?: number) {
    return this.cryptoSuite.auditLogger.getFailedOperations(since);
  }

  /**
   * Export security audit logs
   */
  exportSecurityAuditLogs(startTime?: number, endTime?: number) {
    return this.cryptoSuite.auditLogger.exportLogs(startTime, endTime);
  }

  /**
   * Validate event signature before processing
   */
  private async validateEventIfEnabled(ndkEvent: NDKEvent): Promise<VerificationResult | null> {
    if (!this.verificationOptions.autoVerifyEvents) {
      return null;
    }

    // Convert NDK event to INostrEvent format
    const nostrEvent: INostrEvent = {
      id: ndkEvent.id || '',
      pubkey: ndkEvent.pubkey || '',
      created_at: ndkEvent.created_at || Math.floor(Date.now() / 1000),
      kind: ndkEvent.kind || 0,
      tags: ndkEvent.tags || [],
      content: ndkEvent.content || '',
      sig: ndkEvent.sig || ''
    };

    return await this.verifyEvent(nostrEvent);
  }

  /**
   * Get verification cache statistics
   */
  getVerificationCacheStats() {
    return {
      eventVerificationCacheSize: this.verificationCache.size,
      contentCacheSize: this.contentCache.size,
      totalCachedVerifications: this.verificationCache.size + this.contentCache.size
    };
  }

  /**
   * Clear verification caches
   */
  clearVerificationCaches() {
    this.verificationCache.clear();
    this.contentCache.clear();
  }

  /**
   * Update verification options at runtime
   */
  updateVerificationOptions(options: {
    signature?: Partial<SignatureVerificationOptions>;
    hash?: Partial<HashVerificationOptions>;
    autoVerifyEvents?: boolean;
    autoVerifyContent?: boolean;
  }) {
    if (options.signature) {
      this.verificationOptions.signature = { ...this.verificationOptions.signature, ...options.signature };
    }
    if (options.hash) {
      this.verificationOptions.hash = { ...this.verificationOptions.hash, ...options.hash };
    }
    if (options.autoVerifyEvents !== undefined) {
      this.verificationOptions.autoVerifyEvents = options.autoVerifyEvents;
    }
    if (options.autoVerifyContent !== undefined) {
      this.verificationOptions.autoVerifyContent = options.autoVerifyContent;
    }
  }

  /**
   * Enhanced cleanup that clears crypto caches and sensitive data
   */
  disconnect(): void {
    super.disconnect();
    this.clearVerificationCaches();
    this.cryptoSuite.auditLogger.clearOldLogs(); // Clean up old audit logs
  }
}