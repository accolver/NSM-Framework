export { NSMClient } from './nsm-client';
export { CryptoNSMClient } from './crypto-client';
export type {
  NSMClientOptions,
  NSMApplication,
  DiscoverOptions,
  InteractionPayload,
  StateUpdatePayload,
  SubscriptionHandlers
} from './nsm-client';
export type {
  CryptoNSMClientOptions,
  VerifiedEvent,
  ContentIntegrityResult
} from './crypto-client';

// Re-export core types for convenience
export type {
  INSMDefinitionEvent as NSMDefinitionEvent,
  INSMInteractionEvent as NSMInteractionEvent,
  INSMStateUpdateEvent as NSMStateUpdateEvent
} from '@nsm/core';

// Re-export crypto utilities for convenience
export {
  createCryptoSuite,
  verifyNostrEvent,
  verifyBlossomContent,
  ValidationUtils,
  SECURITY_CONFIG
} from '@nsm/crypto';
export type {
  VerificationResult,
  SignatureVerificationOptions,
  HashVerificationOptions,
  CryptoAuditEntry
} from '@nsm/crypto';

// Export DoS protection components
export {
  DoSProtection,
  DoSViolationType
} from './security/dos-protection';
export type {
  DoSProtectionConfig,
  DoSCheckResult,
  DoSMetrics,
  ResourceUsage,
  RateLimitConfig,
  EventFilterConfig,
  ResourceMonitorConfig,
  ThrottlingConfig
} from './security/dos-protection';

// Export security sandbox components
export {
  SecuritySandbox,
  SecurityError,
  CSPManager,
  securitySandbox
} from './security/sandbox';
export type {
  SecurityPolicy,
  ExecutionContext,
  SecurityMetrics
} from './security/sandbox';