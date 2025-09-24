export { NSMClient } from './nsm-client.js';
export { CryptoNSMClient } from './crypto-client.js';
export type {
  NSMClientOptions,
  NSMApplication,
  DiscoverOptions,
  InteractionPayload,
  StateUpdatePayload,
  SubscriptionHandlers
} from './nsm-client.js';
export type {
  CryptoNSMClientOptions,
  VerifiedEvent,
  ContentIntegrityResult
} from './crypto-client.js';

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
} from './security/dos-protection.js';
export type {
  DoSProtectionConfig,
  DoSCheckResult,
  DoSMetrics,
  ResourceUsage,
  RateLimitConfig,
  EventFilterConfig,
  ResourceMonitorConfig,
  ThrottlingConfig
} from './security/dos-protection.js';

// Export security sandbox components
export {
  SecuritySandbox,
  SecurityError,
  CSPManager,
  securitySandbox
} from './security/sandbox.js';
export type {
  SecurityPolicy,
  ExecutionContext,
  SecurityMetrics
} from './security/sandbox.js';

// Export state machine components
export { NSMStateMachine } from './state-machine.js';
export { OptimizedStateMachine, OptimizedActor } from './state-machine-optimized.js';
export type { OptimizationConfig, CachedMachine } from './state-machine-optimized.js';

// Export performance utilities
export { LRUCache } from './utils/lru-cache.js';
export { ObjectPool } from './utils/object-pool.js';

// Export cache components
export { MemoryCache } from './cache/memory-cache.js';
export { IndexedDBCache } from './cache/indexeddb-cache.js';
export { NostrEventCache } from './cache/nostr-event-cache.js';
export { BlossomContentCache } from './cache/blossom-content-cache.js';
export { CacheInvalidationManager, createNSMInvalidationManager, CommonInvalidationRules } from './cache/cache-invalidation.js';
export type {
  MemoryCacheEntry,
  MemoryCacheOptions,
  CacheStats
} from './cache/memory-cache.js';
export type {
  CacheEntry,
  CacheOptions,
  CacheQuery
} from './cache/indexeddb-cache.js';
export type {
  NostrEvent,
  NostrFilter,
  CachePolicy,
  EventCacheEntry,
  CacheMetrics
} from './cache/nostr-event-cache.js';
export type {
  BlossomContent,
  BlossomCacheEntry,
  BlossomCachePolicy,
  ContentQuery,
  CacheHealth
} from './cache/blossom-content-cache.js';
export type {
  InvalidationRule,
  InvalidationEvent,
  InvalidationPolicy,
  InvalidationMetrics,
  CacheManager
} from './cache/cache-invalidation.js';