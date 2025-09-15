/**
 * Base Nostr event interface following NIP-01 specification
 */
export interface INostrEvent {
  /** 32-byte SHA-256 hash of the serialized event data */
  id: string;
  /** 32-byte hex-encoded public key of the event creator */
  pubkey: string;
  /** Unix timestamp in seconds */
  created_at: number;
  /** Integer event kind */
  kind: number;
  /** Array of tag arrays */
  tags: string[][];
  /** Arbitrary string content */
  content: string;
  /** 64-byte hex signature */
  sig: string;
}

/**
 * Base validation result interface
 */
export interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * JSON Schema definition interface
 */
export interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  enum?: (string | number | boolean)[];
  minimum?: number;
  maximum?: number;
  [key: string]: any;
}

/**
 * NSM event types
 */
export type NSMEventType = "definition" | "interaction" | "state-update";

/**
 * Conflict resolution policies for handling concurrent state updates
 */
export type ConflictResolutionPolicy = "timestamp-based" | "id-based" | "owner-based";