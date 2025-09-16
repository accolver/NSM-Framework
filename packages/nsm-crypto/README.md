# @nsm/crypto

Cryptographic verification utilities for the NSM (Nostr State Machine) framework, providing secure verification for Nostr events, Blossom content integrity, and key management operations.

## Features

### 🔐 Nostr Event Verification
- **Schnorr Signature Verification**: Robust cryptographic verification using noble libraries and nostr-tools
- **Event ID Validation**: Verify event IDs match content hash according to NIP-01
- **Public Key Format Validation**: Ensure secp256k1 public key validity
- **Signature Format Validation**: 64-byte hex signature format checking
- **Anti-Malleability Protection**: Detection and prevention of signature malleability attacks
- **Timestamp Validation**: Configurable age limits and future timestamp rejection

### 🔗 Blossom Content Hash Verification
- **SHA-256 Content Verification**: Secure hash calculation and verification
- **File Integrity Checking**: Comprehensive content integrity validation
- **Hash Format Validation**: Proper hash format and algorithm validation
- **Secure Comparison**: Constant-time hash comparison to prevent timing attacks
- **Batch Verification**: Efficient verification of multiple content items
- **Integrity Proofs**: Generate and verify content integrity proofs with timestamps

### 🔑 Secure Key Management
- **Key Pair Generation**: Generate secp256k1 key pairs with proper entropy
- **Private Key Encryption**: AES-256-GCM encryption with PBKDF2 key derivation
- **Key Derivation Functions**: PBKDF2 with SHA-256/SHA-512 and configurable iterations
- **Secure Random Generation**: Cryptographically secure random number generation
- **Memory Security**: Safe clearing of sensitive data from memory
- **Key Rotation**: Secure encryption key rotation and backup/restore

### 📊 Security Audit Logging
- **Operation Logging**: Comprehensive logging of all cryptographic operations
- **Failed Operation Tracking**: Monitor security failures and potential attacks
- **Statistics Generation**: Performance and security metrics
- **Configurable Retention**: Automatic cleanup of old audit logs
- **Persistent Storage**: Optional localStorage persistence for audit trails
- **Export/Import**: JSON export and import of audit logs

## Installation

```bash
bun install @nsm/crypto
```

## Quick Start

### Basic Crypto Suite
```typescript
import { createCryptoSuite } from '@nsm/crypto';

// Create a complete crypto suite
const crypto = createCryptoSuite({
  persistentAuditLogs: true,
  auditOptions: {
    maxEntries: 10000,
    retentionDays: 30
  }
});

// Use individual components
const { nostrVerifier, blossomVerifier, keyManager, auditLogger } = crypto;
```

### Nostr Event Verification
```typescript
import { verifyNostrEvent } from '@nsm/crypto';

const event = {
  id: 'event_id_here',
  pubkey: 'public_key_here',
  sig: 'signature_here',
  created_at: Math.floor(Date.now() / 1000),
  kind: 1,
  tags: [],
  content: 'Hello, Nostr!'
};

const result = await verifyNostrEvent(event, {
  verifyEventId: true,
  verifyPublicKey: true,
  verifyTimestamp: true,
  maxAge: 86400, // 24 hours
  checkMalleability: true
});

if (result.valid) {
  console.log('Event is cryptographically valid!');
} else {
  console.error('Verification failed:', result.error);
}
```

### Blossom Content Verification
```typescript
import { verifyBlossomContent } from '@nsm/crypto';

const content = 'Important content to verify';
const expectedHash = 'sha256_hash_here';

const result = await verifyBlossomContent(content, expectedHash, {
  algorithm: 'SHA-256',
  secureComparison: true,
  validateFormat: true
});

if (result.valid) {
  console.log('Content integrity verified!');
} else {
  console.error('Content verification failed:', result.error);
}
```

### Key Management
```typescript
import { KeyManager } from '@nsm/crypto';

const keyManager = new KeyManager();

// Generate a new key pair
const { privateKey, publicKey } = await keyManager.generateKeyPair();

// Encrypt private key for storage
const encrypted = await keyManager.encryptPrivateKey(privateKey, 'strong_password');

// Later, decrypt the private key
const decrypted = await keyManager.decryptPrivateKey(encrypted, 'strong_password');

// Clear sensitive data from memory
keyManager.clearSensitiveData(decrypted);
```

### Content Integrity Proofs
```typescript
import { BlossomVerifier } from '@nsm/crypto';

const verifier = new BlossomVerifier();

// Generate integrity proof
const content = 'Content to protect';
const proof = await verifier.generateIntegrityProof(content);

console.log('Proof:', {
  hash: proof.hash,
  algorithm: proof.algorithm,
  timestamp: proof.timestamp,
  size: proof.size
});

// Verify integrity proof later
const verification = await verifier.verifyIntegrityProof(content, proof, 86400); // 24 hour max age
```

## Advanced Usage

### Custom Crypto Suite Configuration
```typescript
import { createCryptoSuite } from '@nsm/crypto';

const crypto = createCryptoSuite({
  persistentAuditLogs: true,
  auditOptions: {
    maxEntries: 50000,
    retentionDays: 90,
    storageKey: 'my-app-crypto-audit'
  }
});

// Get security statistics
const stats = crypto.auditLogger.getStatistics();
console.log('Crypto operations:', stats);

// Get failed operations for monitoring
const failures = crypto.auditLogger.getFailedOperations();
console.log('Security failures:', failures);
```

### Batch Content Verification
```typescript
import { BlossomVerifier } from '@nsm/crypto';

const verifier = new BlossomVerifier();

const contentItems = [
  { content: 'Item 1', expectedHash: 'hash1' },
  { content: 'Item 2', expectedHash: 'hash2' },
  { content: 'Item 3', expectedHash: 'hash3' }
];

const results = await verifier.verifyBatchHashes(contentItems);
console.log(`${results.successfulVerifications}/${results.totalItems} verified successfully`);
```

### Enhanced NSM Client Integration
```typescript
import { CryptoNSMClient } from '@nsm/client';

const client = new CryptoNSMClient({
  relayUrls: ['wss://relay.example.com'],
  autoVerifyEvents: true,
  autoVerifyContent: true,
  persistentAuditLogs: true,
  signatureOptions: {
    maxAge: 3600, // 1 hour
    checkMalleability: true
  }
});

// Events are automatically verified
client.subscribeToVerifiedApplication('app-id', {
  onVerifiedInteraction: (interaction, verification) => {
    if (verification.valid) {
      console.log('Verified interaction:', interaction);
    }
  },
  onVerificationFailure: (event, verification) => {
    console.error('Event failed verification:', verification.error);
  }
});
```

## Security Configuration

### Default Security Settings
```typescript
import { SECURITY_CONFIG } from '@nsm/crypto';

console.log('Security defaults:', {
  pbkdf2Iterations: SECURITY_CONFIG.DEFAULT_PBKDF2_ITERATIONS, // 100,000
  maxEventAge: SECURITY_CONFIG.DEFAULT_MAX_EVENT_AGE, // 24 hours
  supportedHashAlgorithms: SECURITY_CONFIG.SUPPORTED_HASH_ALGORITHMS,
  supportedEncryption: SECURITY_CONFIG.SUPPORTED_ENCRYPTION_ALGORITHMS
});
```

### Validation Utilities
```typescript
import { ValidationUtils } from '@nsm/crypto';

// Validate various formats
const isValidPubkey = ValidationUtils.isValidNostrPublicKey('64_char_hex');
const isValidSig = ValidationUtils.isValidNostrSignature('128_char_hex');
const isValidHash = ValidationUtils.isValidSHA256Hash('64_char_hex');
```

## Testing

The package includes comprehensive tests covering all cryptographic operations:

```bash
bun test                           # Run all tests
bun test blossom-verifier         # Test content verification
bun test nostr-verifier           # Test event verification
bun test key-manager              # Test key management
bun test integration              # Test complete workflows
```

## Security Considerations

1. **Private Key Security**: Never store private keys in plaintext. Always use the encryption functions provided.

2. **Memory Management**: Use `clearSensitiveData()` to securely clear private keys from memory after use.

3. **Audit Logging**: Enable audit logging in production to monitor for potential security issues.

4. **Key Rotation**: Regularly rotate encryption keys using the key rotation functions.

5. **Validation**: Always validate signatures and content integrity before processing events or content.

6. **Timing Attacks**: Use secure comparison functions for hash verification to prevent timing attacks.

## Performance

- **Nostr Verification**: ~1-5ms per event depending on validation options
- **Content Hashing**: ~10-50ms per MB of content
- **Key Generation**: ~50-200ms per key pair
- **Encryption/Decryption**: ~10-100ms depending on PBKDF2 iterations

## Dependencies

- `@noble/secp256k1`: Elliptic curve cryptography
- `@noble/hashes`: Cryptographic hash functions
- `nostr-tools`: Nostr protocol utilities
- `@nsm/core`: NSM framework core types

## License

MIT License - see LICENSE file for details.