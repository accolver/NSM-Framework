import { z } from "zod";
import type { INostrEvent, ValidationResult } from "./base.js";

/**
 * NSM Interaction Event (kind:7000-7999) - Regular immutable events for user actions
 * These events represent user interactions with NSM applications
 */
export interface INSMInteractionEvent extends INostrEvent {
  kind: number; // 7000-7999 range
  tags: NSMInteractionEventTags;
  content: string; // JSON-stringified NSMInteractionContent
}

/**
 * Required and optional tags for NSM Interaction events
 */
export type NSMInteractionEventTags = [
  ["a", string], // Address to NSM Definition event (30079:pubkey:identifier)
  ...Array<
    | ["p", string] // Participant pubkey (optional, can be multiple)
    | [string, string] // Additional tags
  >
];

/**
 * Content structure for NSM Interaction events
 */
export interface NSMInteractionContent {
  /** Type of interaction (must conform to interactionSchema) */
  type: string;
  /** Payload data for the interaction (optional) */
  payload?: Record<string, any>;
  /** Additional metadata (optional) */
  metadata?: {
    timestamp?: number;
    sessionId?: string;
    userAgent?: string;
    [key: string]: any;
  };
}

/**
 * Options for creating NSM Interaction events
 */
export interface NSMInteractionOptions {
  /** Specific kind within 7000-7999 range (optional, auto-assigned if not provided) */
  kind?: number;
  /** Array of participant pubkeys (optional) */
  participants?: string[];
}

// Zod schemas for validation
const NSMInteractionContentSchema = z.object({
  type: z.string(),
  payload: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional()
});

const AddressTagSchema = z.string().regex(
  /^30079:[a-zA-Z0-9-_]+:.+$/,
  "Address tag must be in format '30079:pubkey:identifier'"
);

const NSMInteractionEventSchema = z.object({
  id: z.string(),
  pubkey: z.string(),
  created_at: z.number(),
  kind: z.number().min(7000).max(7999),
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
 * Validates an NSM Interaction event
 */
export function validateNSMInteractionEvent(event: unknown): ValidationResult<INSMInteractionEvent> {
  try {
    // Validate event structure
    const eventResult = NSMInteractionEventSchema.safeParse(event);
    if (!eventResult.success) {
      return {
        success: false,
        error: `Invalid NSM Interaction event structure: ${eventResult.error.message}`
      };
    }

    // Validate JSON content
    let content: NSMInteractionContent;
    try {
      content = JSON.parse(eventResult.data.content);
    } catch (error) {
      return {
        success: false,
        error: "Invalid JSON in event content"
      };
    }

    // Validate content structure
    const contentResult = NSMInteractionContentSchema.safeParse(content);
    if (!contentResult.success) {
      return {
        success: false,
        error: `Invalid NSM Interaction content: ${contentResult.error.message}`
      };
    }

    return {
      success: true,
      data: eventResult.data as INSMInteractionEvent
    };
  } catch (error) {
    return {
      success: false,
      error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Creates an NSM Interaction event
 */
export function createNSMInteractionEvent(
  appAddress: string,
  content: NSMInteractionContent,
  options: NSMInteractionOptions = {}
): Omit<INSMInteractionEvent, 'id' | 'pubkey' | 'created_at' | 'sig'> {
  // Validate app address format
  const addressResult = AddressTagSchema.safeParse(appAddress);
  if (!addressResult.success) {
    throw new Error(`Invalid app address format: ${appAddress}`);
  }

  // Auto-assign kind if not provided (simple hash-based assignment)
  let kind = options.kind;
  if (!kind) {
    // Simple deterministic kind assignment based on app address
    const hash = Array.from(appAddress).reduce((acc, char) => {
      return ((acc << 5) - acc + char.charCodeAt(0)) & 0xffffffff;
    }, 0);
    kind = 7000 + (Math.abs(hash) % 1000); // Ensure within 7000-7999 range
  }

  // Validate kind is in range
  if (kind < 7000 || kind > 7999) {
    throw new Error(`Kind must be within range 7000-7999, got ${kind}`);
  }

  const tags: string[][] = [["a", appAddress]];

  // Add participant tags
  if (options.participants) {
    for (const participant of options.participants) {
      tags.push(["p", participant]);
    }
  }

  return {
    kind,
    tags: tags as NSMInteractionEventTags,
    content: JSON.stringify(content)
  };
}