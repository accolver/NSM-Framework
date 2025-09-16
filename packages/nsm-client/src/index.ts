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

// Export state machine components
export { NSMStateMachine } from './state-machine';
export { OptimizedStateMachine, OptimizedActor } from './state-machine-optimized';
export type { OptimizationConfig, CachedMachine } from './state-machine-optimized';

// Export performance utilities
export { LRUCache } from './utils/lru-cache';
export { ObjectPool } from './utils/object-pool';

// Export cache components
export { MemoryCache } from './cache/memory-cache';
export { IndexedDBCache } from './cache/indexeddb-cache';
export { NostrEventCache } from './cache/nostr-event-cache';
export { BlossomContentCache } from './cache/blossom-content-cache';
export { CacheInvalidationManager, createNSMInvalidationManager, CommonInvalidationRules } from './cache/cache-invalidation';
export type {
  MemoryCacheEntry,
  MemoryCacheOptions,
  CacheStats
} from './cache/memory-cache';
export type {
  CacheEntry,
  CacheOptions,
  CacheQuery
} from './cache/indexeddb-cache';
export type {
  NostrEvent,
  NostrFilter,
  CachePolicy,
  EventCacheEntry,
  CacheMetrics
} from './cache/nostr-event-cache';
export type {
  BlossomContent,
  BlossomCacheEntry,
  BlossomCachePolicy,
  ContentQuery,
  CacheHealth
} from './cache/blossom-content-cache';
export type {
  InvalidationRule,
  InvalidationEvent,
  InvalidationPolicy,
  InvalidationMetrics,
  CacheManager
} from './cache/cache-invalidation';