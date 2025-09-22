/**
 * Nostr event signature verification implementation
 * Implements robust cryptographic verification for Nostr events using noble libraries
 */
import type { INostrEvent } from '@nsm/core';
import type { INostrVerifier, VerificationResult, SignatureVerificationOptions } from '../types.js';
import { CryptoAuditLogger } from '../audit/logger.js';
/**
 * Nostr event signature verifier implementation
 */
export declare class NostrVerifier implements INostrVerifier {
    private auditLogger;
    constructor(auditLogger?: CryptoAuditLogger);
    /**
     * Verify a complete Nostr event including signature, ID, and format validation
     */
    verifyEvent(event: INostrEvent, options?: SignatureVerificationOptions): Promise<VerificationResult>;
    /**
     * Verify just the signature of an event using Schnorr signature verification
     * Note: This method has limited functionality because Schnorr signature verification
     * requires the complete event data to reconstruct the hash that was signed
     */
    verifySignature(eventId: string, signature: string, publicKey: string): Promise<boolean>;
    /**
     * Verify event ID matches the SHA-256 hash of the canonical event representation
     */
    verifyEventId(event: INostrEvent): boolean;
    /**
     * Validate public key format (32 bytes hex)
     */
    validatePublicKey(publicKey: string): boolean;
    /**
     * Validate signature format (64 bytes hex)
     */
    validateSignature(signature: string): boolean;
    /**
     * Check for signature malleability issues
     * Note: Schnorr signatures used in Nostr are not subject to malleability attacks
     * like ECDSA signatures, so this check is largely unnecessary for Nostr events
     */
    checkSignatureMalleability(signature: string): boolean;
    /**
     * Serialize event for ID calculation according to NIP-01
     */
    private serializeEventForId;
    /**
     * Validate basic event structure
     */
    validateEventStructure(event: INostrEvent): boolean;
    /**
     * Verify the signature of a complete event using nostr-tools
     */
    private verifyEventSignature;
    /**
     * Check if the error is expected during validation (e.g., malformed events in tests)
     */
    private isExpectedValidationError;
}
//# sourceMappingURL=verifier.d.ts.map