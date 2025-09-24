/**
 * Minimal index for NSMClient package
 * Exports only the core NSMClient functionality needed by applications
 */

export { NSMClient } from './nsm-client.js';
export type {
  NSMClientOptions,
  NSMApplication,
  DiscoverOptions,
  InteractionPayload,
  StateUpdatePayload,
  SubscriptionHandlers
} from './nsm-client.js';