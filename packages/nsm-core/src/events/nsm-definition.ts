import { z } from "zod";
import type { INostrEvent, ValidationResult, JSONSchema } from "./base.js";

/**
 * NSM Definition Event (kind:30079) - Parameterized replaceable event
 * Contains application metadata and state machine definition
 */
export interface INSMDefinitionEvent extends INostrEvent {
  kind: 30079;
  tags: NSMDefinitionEventTags;
  content: string; // JSON-stringified NSMDefinitionContent
}

/**
 * Required and optional tags for NSM Definition events
 */
export type NSMDefinitionEventTags = [
  ["d", string], // Identifier (required for parameterized replaceable events)
  ["name", string], // Human-readable application name
  ["engine", string], // State machine engine (e.g., "xstate")
  ["engineCodeURI", string], // URI to the engine code
  ...Array<
    | ["ui-spec", string] // UI specification (optional)
    | ["version", string] // Version string (optional)
    | ["description", string] // Description (optional)
    | [string, string] // Additional tags
  >
];

/**
 * Content structure for NSM Definition events
 */
export interface NSMDefinitionContent {
  /** Initial state of the state machine */
  initialState: Record<string, any>;
  /** JSON Schema defining valid state structure */
  stateSchema: JSONSchema;
  /** JSON Schema defining valid interaction event structure */
  interactionSchema: JSONSchema;
}

/**
 * Metadata for creating NSM Definition events
 */
export interface NSMDefinitionMetadata {
  identifier: string;
  name: string;
  engine: "xstate" | string;
  engineCodeURI: string;
  uiSpec?: string;
  version?: string;
  description?: string;
}

// Zod schemas for validation
const NSMDefinitionContentSchema = z.object({
  initialState: z.record(z.any()),
  stateSchema: z.record(z.any()).refine(
    (schema) => typeof schema.type === "string",
    { message: "stateSchema must be a valid JSON Schema" }
  ),
  interactionSchema: z.record(z.any()).refine(
    (schema) => typeof schema.type === "string",
    { message: "interactionSchema must be a valid JSON Schema" }
  )
});

const NSMDefinitionEventSchema = z.object({
  id: z.string(),
  pubkey: z.string(),
  created_at: z.number(),
  kind: z.literal(30079),
  tags: z.array(z.array(z.string())).refine(
    (tags) => {
      const tagNames = tags.map(tag => tag[0]);
      return tagNames.includes("d") &&
             tagNames.includes("name") &&
             tagNames.includes("engine") &&
             tagNames.includes("engineCodeURI");
    },
    { message: "Missing required tags: d, name, engine, engineCodeURI" }
  ),
  content: z.string(),
  sig: z.string()
});

/**
 * Validates an NSM Definition event
 */
export function validateNSMDefinitionEvent(event: unknown): ValidationResult<INSMDefinitionEvent> {
  try {
    // Validate event structure
    const eventResult = NSMDefinitionEventSchema.safeParse(event);
    if (!eventResult.success) {
      return {
        success: false,
        error: `Invalid NSM Definition event structure: ${eventResult.error.message}`
      };
    }

    // Validate JSON content
    let content: NSMDefinitionContent;
    try {
      content = JSON.parse(eventResult.data.content);
    } catch (error) {
      return {
        success: false,
        error: "Invalid JSON in event content"
      };
    }

    // Validate content structure
    const contentResult = NSMDefinitionContentSchema.safeParse(content);
    if (!contentResult.success) {
      return {
        success: false,
        error: `Invalid NSM Definition content: ${contentResult.error.message}`
      };
    }

    return {
      success: true,
      data: eventResult.data as INSMDefinitionEvent
    };
  } catch (error) {
    return {
      success: false,
      error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Creates an NSM Definition event
 */
export function createNSMDefinitionEvent(
  metadata: NSMDefinitionMetadata,
  content: NSMDefinitionContent
): Omit<INSMDefinitionEvent, 'id' | 'pubkey' | 'created_at' | 'sig'> {
  const tags: string[][] = [
    ["d", metadata.identifier],
    ["name", metadata.name],
    ["engine", metadata.engine],
    ["engineCodeURI", metadata.engineCodeURI]
  ];

  // Add optional tags
  if (metadata.uiSpec) {
    tags.push(["ui-spec", metadata.uiSpec]);
  }
  if (metadata.version) {
    tags.push(["version", metadata.version]);
  }
  if (metadata.description) {
    tags.push(["description", metadata.description]);
  }

  return {
    kind: 30079,
    tags: tags as NSMDefinitionEventTags,
    content: JSON.stringify(content)
  };
}