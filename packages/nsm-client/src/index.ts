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
  INSMDefinitionEvent as NSMDefinitionEvent,
  INSMInteractionEvent as NSMInteractionEvent,
  INSMStateUpdateEvent as NSMStateUpdateEvent
} from '@nsm/core';