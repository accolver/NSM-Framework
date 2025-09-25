// Export all event types and utilities
export type { INostrEvent, ValidationResult, JSONSchema, NSMEventType, ConflictResolutionPolicy } from "./base.js";

export type {
  INSMDefinitionEvent,
  NSMDefinitionContent,
  NSMDefinitionEventTags,
  NSMDefinitionMetadata,
  BlossomImplementationReference,
  MachineConfig,
  XStateV5SetupConfig,
  // UI Fallback types
  UIFallbackType,
  UIFallbackSpec,
  MCPUISpec,
  WebComponentsSpec,
  JSONUISpec,
  JSONUISchema,
  JSONUIComponent,
  UIConfiguration
} from "./nsm-definition.js";

export {
  validateNSMDefinitionEvent,
  createNSMDefinitionEvent,
  extractUIFallbacks
} from "./nsm-definition.js";

export type {
  INSMInteractionEvent,
  NSMInteractionContent,
  NSMInteractionEventTags,
  NSMInteractionOptions
} from "./nsm-interaction.js";

export {
  validateNSMInteractionEvent,
  createNSMInteractionEvent
} from "./nsm-interaction.js";

export type {
  INSMStateUpdateEvent,
  NSMStateUpdateContent,
  NSMStateUpdateEventTags,
  NSMStateUpdateOptions
} from "./nsm-state-update.js";

export {
  validateNSMStateUpdateEvent,
  createNSMStateUpdateEvent
} from "./nsm-state-update.js";