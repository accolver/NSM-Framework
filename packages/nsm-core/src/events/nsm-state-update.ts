import { z } from "zod";
import type { INostrEvent, ValidationResult } from "./base.js";

/**
 * NSM State Update Event (kind:10079) - Replaceable event for state snapshots
 * These events represent canonical state updates for NSM applications
 */
export interface INSMStateUpdateEvent extends INostrEvent {
  kind: 10079;
  tags: NSMStateUpdateEventTags;
  content: string; // JSON-stringified NSMStateUpdateContent
}

/**
 * Required and optional tags for NSM State Update events
 */
export type NSMStateUpdateEventTags = [
  ["a", string], // Address to NSM Definition event (30079:pubkey:identifier)
  ...Array<
    | ["p", string] // Participant pubkey (optional, can be multiple)
    | ["arbiter", string] // State arbiter pubkey (optional)
    | [string, string] // Additional tags
  >
];

/**
 * Content structure for NSM State Update events
 */
export interface NSMStateUpdateContent {
  /** Current state of the application (must conform to stateSchema) */
  state: Record<string, any>;
  /** Optional metadata about the state update */
  metadata?: {
    /** Version number of this state */
    stateVersion?: number;
    /** ID of the last interaction that caused this state change */
    lastInteractionId?: string;
    /** Timestamp of the state update */
    timestamp?: number;
    /** Conflict resolution policy used */
    conflictResolution?: string;
    /** Pubkey of the arbiter who resolved conflicts */
    arbiter?: string;
    /** Hash of the canonical state for integrity verification */
    canonicalStateHash?: string;
    [key: string]: any;
  };
}

/**
 * Options for creating NSM State Update events
 */
export interface NSMStateUpdateOptions {
  /** Array of participant pubkeys (optional) */
  participants?: string[];
  /** Arbiter pubkey for conflict resolution (optional) */
  arbiter?: string;
}

// Zod schemas for validation
const NSMStateUpdateContentSchema = z.object({
  state: z.record(z.any()),
  metadata: z.record(z.any()).optional()
});

const AddressTagSchema = z.string().regex(
  /^30079:[a-zA-Z0-9-_]+:.+$/,
  "Address tag must be in format '30079:pubkey:identifier'"
);

const NSMStateUpdateEventSchema = z.object({
  id: z.string(),
  pubkey: z.string(),
  created_at: z.number(),
  kind: z.literal(10079),
  tags: z.array(z.array(z.string())).refine(
    (tags) => {
      const aTags = tags.filter(tag => tag[0] === "a");
      return aTags.length === 1 && AddressTagSchema.safeParse(aTags[0]?.[1]).success;
    },
    { message: "Must have exactly one valid 'a' tag with format '30079:pubkey:identifier'" }
  ),
  content: z.string(),
  sig: z.string()
});

/**
 * Validates an NSM State Update event
 */
export function validateNSMStateUpdateEvent(event: unknown): ValidationResult<INSMStateUpdateEvent> {
  try {
    // Validate event structure
    const eventResult = NSMStateUpdateEventSchema.safeParse(event);
    if (!eventResult.success) {
      return {
        success: false,
        error: `Invalid NSM State Update event structure: ${eventResult.error.message}`
      };
    }

    // Validate JSON content
    let content: NSMStateUpdateContent;
    try {
      content = JSON.parse(eventResult.data.content);
    } catch (error) {
      return {
        success: false,
        error: "Invalid JSON in event content"
      };
    }

    // Validate content structure
    const contentResult = NSMStateUpdateContentSchema.safeParse(content);
    if (!contentResult.success) {
      return {
        success: false,
        error: `Invalid NSM State Update content: ${contentResult.error.message}`
      };
    }

    return {
      success: true,
      data: eventResult.data as INSMStateUpdateEvent
    };
  } catch (error) {
    return {
      success: false,
      error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Creates an NSM State Update event
 */
export function createNSMStateUpdateEvent(
  appAddress: string,
  content: NSMStateUpdateContent,
  options: NSMStateUpdateOptions = {}
): Omit<INSMStateUpdateEvent, 'id' | 'pubkey' | 'created_at' | 'sig'> {
  // Validate app address format
  const addressResult = AddressTagSchema.safeParse(appAddress);
  if (!addressResult.success) {
    throw new Error(`Invalid app address format: ${appAddress}`);
  }

  const tags: string[][] = [["a", appAddress]];

  // Add participant tags
  if (options.participants) {
    for (const participant of options.participants) {
      tags.push(["p", participant]);
    }
  }

  // Add arbiter tag
  if (options.arbiter) {
    tags.push(["arbiter", options.arbiter]);
  }

  return {
    kind: 10079,
    tags: tags as NSMStateUpdateEventTags,
    content: JSON.stringify(content)
  };
}