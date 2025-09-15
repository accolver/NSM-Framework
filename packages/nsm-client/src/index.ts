export { NSMClient } from './nsm-client';
export type {
  NSMClientOptions,
  NSMApplication,
  DiscoverOptions,
  InteractionPayload,
  StateUpdatePayload,
  SubscriptionHandlers
} from './nsm-client';

// Re-export core types for convenience
export type {
  NSMDefinitionEvent,
  NSMInteractionEvent,
  NSMStateUpdateEvent
} from '@nsm/core';