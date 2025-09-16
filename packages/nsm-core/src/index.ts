/**
 * @nsm/core - Core NSM Protocol Implementation
 *
 * This package provides TypeScript interfaces and validation utilities
 * for the Nostr State Machine (NSM) protocol events.
 */

// Export all event types and utilities
export * from "./events/index.js";

// Export validation utilities
export * from "./validation/index.js";

// Export security utilities
export {
  RateLimiter,
  MultiTierRateLimiter,
  DistributedRateLimiter,
  RateLimitAlgorithm
} from './security/rate-limiting';
export type {
  RateLimitOptions,
  RateLimitResult,
  RateLimitEntry,
  DistributedRateLimitBackend
} from './security/rate-limiting';

export {
  ResourceMonitor
} from './security/resource-monitor';
export type {
  ResourceLimits,
  AlertThresholds,
  ResourceMetrics,
  AlertEvent,
  ResourceMonitorConfig
} from './security/resource-monitor';

// Package version and metadata
export const NSM_CORE_VERSION = "0.1.0";

/**
 * NSM Protocol specification constants
 */
export const NSM_PROTOCOL = {
  /** NSM Definition Event kind */
  DEFINITION_KIND: 30079,
  /** NSM Interaction Event kind range */
  INTERACTION_KIND_MIN: 7000,
  INTERACTION_KIND_MAX: 7999,
  /** NSM State Update Event kind */
  STATE_UPDATE_KIND: 10079,
  /** Protocol version */
  VERSION: "1.0.0"
} as const;

/**
 * Supported state machine engines
 */
export const SUPPORTED_ENGINES = ["xstate"] as const;
export type SupportedEngine = typeof SUPPORTED_ENGINES[number];

/**
 * Utility function to check if an event kind is a valid NSM event kind
 */
export function isNSMEventKind(kind: number): boolean {
  return kind === NSM_PROTOCOL.DEFINITION_KIND ||
         kind === NSM_PROTOCOL.STATE_UPDATE_KIND ||
         (kind >= NSM_PROTOCOL.INTERACTION_KIND_MIN && kind <= NSM_PROTOCOL.INTERACTION_KIND_MAX);
}

/**
 * Utility function to get the NSM event type from a kind
 */
export function getNSMEventType(kind: number): "definition" | "interaction" | "state-update" | null {
  if (kind === NSM_PROTOCOL.DEFINITION_KIND) {
    return "definition";
  } else if (kind >= NSM_PROTOCOL.INTERACTION_KIND_MIN && kind <= NSM_PROTOCOL.INTERACTION_KIND_MAX) {
    return "interaction";
  } else if (kind === NSM_PROTOCOL.STATE_UPDATE_KIND) {
    return "state-update";
  }
  return null;
}