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
  ["engine", string], // State machine engine (e.g., "xstate@5")
  ["engineCodeURI", string], // URI to the engine code (Blossom hash for implementation)
  ...Array<
    | ["ui-spec", string] // UI specification (optional)
    | ["ui-fallbacks", string] // Comma-separated UI fallback order (optional)
    | ["version", string] // Version string (optional)
    | ["description", string] // Description (optional)
    | [string, string] // Additional tags
  >
];

/**
 * XState v5 setup() configuration structure
 */
export interface XStateV5SetupConfig {
  /** State type definitions */
  types?: {
    context?: Record<string, any>;
    events?: Record<string, any>;
    actions?: Record<string, any>;
    guards?: Record<string, any>;
    delays?: Record<string, any>;
    actors?: Record<string, any>;
  };
  /** Action implementations (references only, actual impl in Blossom) */
  actions?: Record<string, string>; // action name -> Blossom URI
  /** Guard implementations (references only, actual impl in Blossom) */
  guards?: Record<string, string>; // guard name -> Blossom URI
  /** Service implementations (references only, actual impl in Blossom) */
  actors?: Record<string, string>; // actor name -> Blossom URI
  /** Delay configurations */
  delays?: Record<string, number | string>;
}

/**
 * Machine configuration that can be serialized to JSON
 */
export interface MachineConfig {
  /** Machine identifier */
  id: string;
  /** Initial state */
  initial: string;
  /** Machine context (initial data) */
  context?: Record<string, any>;
  /** State definitions */
  states: Record<string, any>;
  /** XState v5 setup configuration */
  setup?: XStateV5SetupConfig;
  /** Whether this uses XState v5 setup() pattern */
  version?: "v4" | "v5";
}

/**
 * Blossom-stored implementation reference with integrity verification
 */
export interface BlossomImplementationReference {
  /** SHA256 hash of the implementation bundle */
  hash: string;
  /** Blossom URI for downloading the implementation */
  uri: string;
  /** Content type (should be 'application/x-nsm-implementation') */
  contentType: string;
  /** Size in bytes (optional) */
  size?: number;
  /** Integrity verification metadata */
  integrity?: {
    /** Hashing algorithm used (e.g., 'sha256') */
    algorithm: string;
    /** Expected hash for verification */
    hash: string;
    /** Timestamp when integrity was last verified */
    verifiedAt: number;
  };
  /** Additional metadata about the implementation bundle */
  metadata?: {
    /** List of function names contained in the bundle */
    functions?: string[];
    /** Implementation version */
    version?: string;
    /** Dependencies required by implementations */
    dependencies?: string[];
    /** Timestamp when bundle was created */
    bundledAt?: number;
    /** List of inline function names (for mixed implementations) */
    inlineFunctions?: string[];
  };
}

/**
 * Content structure for NSM Definition events
 */
export interface NSMDefinitionContent {
  /** Inline machine configuration (XState JSON) */
  machineConfig: MachineConfig;
  /** Initial state/context of the state machine */
  initialState?: Record<string, any>;
  /** JSON Schema defining valid state structure */
  stateSchema: JSONSchema;
  /** JSON Schema defining valid interaction event structure */
  interactionSchema: JSONSchema;
  /** Conflict resolution strategy for multi-user scenarios */
  conflictResolution?: {
    strategy: "last-write-wins" | "operational-transform" | "crdt";
    metadata?: Record<string, any>;
  };
  /** Legacy support: external machine URI (deprecated) */
  machineURI?: string;
  /** Optional reference to Blossom-stored implementation bundle */
  implementations?: BlossomImplementationReference;
}

/**
 * UI Fallback specification types
 */
export type UIFallbackType = "mcp-ui" | "web-components" | "json-ui";

/**
 * MCP-UI specification for primary rich UI
 */
export interface MCPUISpec {
  type: "mcp-ui";
  uri: string; // Blossom URI to MCP-UI Remote DOM specification
  sandboxing?: {
    iframe?: boolean;
    webWorker?: boolean;
    csp?: string;
  };
  intents?: Record<string, string>; // intent name -> NSM event type mapping
}

/**
 * Web Components specification for framework-agnostic components
 */
export interface WebComponentsSpec {
  type: "web-components";
  uri: string; // Blossom URI to Web Components bundle
  customElements?: Record<string, string>; // element name -> tag mapping
  events?: Record<string, string>; // component event -> NSM event type mapping
}

/**
 * JSON-UI specification for minimal declarative UI
 */
export interface JSONUISpec {
  type: "json-ui";
  schema: JSONUISchema;
}

/**
 * JSON-UI schema for basic form-based interfaces
 */
export interface JSONUISchema {
  title?: string;
  description?: string;
  components: JSONUIComponent[];
}

/**
 * JSON-UI component definitions
 */
export type JSONUIComponent =
  | { type: "label"; text: string; id?: string }
  | { type: "button"; text: string; event: string; id?: string; disabled?: boolean }
  | { type: "input"; label?: string; placeholder?: string; event: string; id?: string; required?: boolean }
  | { type: "textarea"; label?: string; placeholder?: string; event: string; id?: string; rows?: number }
  | { type: "select"; label?: string; options: { value: string; text: string }[]; event: string; id?: string }
  | { type: "container"; layout?: "vertical" | "horizontal" | "grid"; children: JSONUIComponent[]; id?: string };

/**
 * UI Fallback specification union type
 */
export type UIFallbackSpec = MCPUISpec | WebComponentsSpec | JSONUISpec;

/**
 * UI Configuration with primary spec and fallbacks
 */
export interface UIConfiguration {
  primary?: UIFallbackSpec;
  fallbacks: UIFallbackSpec[];
}

/**
 * Metadata for creating NSM Definition events
 */
export interface NSMDefinitionMetadata {
  identifier: string;
  name: string;
  engine: "xstate" | "xstate@5" | string;
  engineCodeURI: string;
  uiSpec?: string; // Primary UI specification URI
  uiFallbacks?: UIFallbackSpec[]; // Ordered fallback specifications
  version?: string;
  description?: string;
}

// Zod schemas for UI fallback validation
const JSONUIComponentSchema: z.ZodType<JSONUIComponent> = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("label"),
    text: z.string(),
    id: z.string().optional(),
  }),
  z.object({
    type: z.literal("button"),
    text: z.string(),
    event: z.string(),
    id: z.string().optional(),
    disabled: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("input"),
    label: z.string().optional(),
    placeholder: z.string().optional(),
    event: z.string(),
    id: z.string().optional(),
    required: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("textarea"),
    label: z.string().optional(),
    placeholder: z.string().optional(),
    event: z.string(),
    id: z.string().optional(),
    rows: z.number().optional(),
  }),
  z.object({
    type: z.literal("select"),
    label: z.string().optional(),
    options: z.array(z.object({
      value: z.string(),
      text: z.string(),
    })),
    event: z.string(),
    id: z.string().optional(),
  }),
  z.object({
    type: z.literal("container"),
    layout: z.enum(["vertical", "horizontal", "grid"]).optional(),
    children: z.lazy(() => z.array(JSONUIComponentSchema)),
    id: z.string().optional(),
  }),
]);

const JSONUISchemaSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  components: z.array(JSONUIComponentSchema),
});

const MCPUISpecSchema = z.object({
  type: z.literal("mcp-ui"),
  uri: z.string(),
  sandboxing: z.object({
    iframe: z.boolean().optional(),
    webWorker: z.boolean().optional(),
    csp: z.string().optional(),
  }).optional(),
  intents: z.record(z.string()).optional(),
});

const WebComponentsSpecSchema = z.object({
  type: z.literal("web-components"),
  uri: z.string(),
  customElements: z.record(z.string()).optional(),
  events: z.record(z.string()).optional(),
});

const JSONUISpecSchema = z.object({
  type: z.literal("json-ui"),
  schema: JSONUISchemaSchema,
});

const UIFallbackSpecSchema = z.discriminatedUnion("type", [
  MCPUISpecSchema,
  WebComponentsSpecSchema,
  JSONUISpecSchema,
]);

const UIConfigurationSchema = z.object({
  primary: UIFallbackSpecSchema.optional(),
  fallbacks: z.array(UIFallbackSpecSchema),
});

// Zod schemas for validation
const BlossomImplementationReferenceSchema = z.object({
  hash: z.string(),
  uri: z.string(),
  contentType: z.string(),
  size: z.number().optional(),
  integrity: z.object({
    algorithm: z.string(),
    hash: z.string(),
    verifiedAt: z.number(),
  }).optional(),
  metadata: z.object({
    functions: z.array(z.string()).optional(),
    version: z.string().optional(),
    dependencies: z.array(z.string()).optional(),
    bundledAt: z.number().optional(),
    inlineFunctions: z.array(z.string()).optional(),
  }).optional(),
});

const XStateV5SetupConfigSchema = z.object({
  types: z.object({
    context: z.record(z.any()).optional(),
    events: z.record(z.any()).optional(),
    actions: z.record(z.any()).optional(),
    guards: z.record(z.any()).optional(),
    delays: z.record(z.any()).optional(),
    actors: z.record(z.any()).optional(),
  }).optional(),
  actions: z.record(z.string()).optional(),
  guards: z.record(z.string()).optional(),
  actors: z.record(z.string()).optional(),
  delays: z.record(z.union([z.number(), z.string()])).optional(),
}).optional();

const MachineConfigSchema = z.object({
  id: z.string(),
  initial: z.string(),
  context: z.record(z.any()).optional(),
  states: z.record(z.any()),
  setup: XStateV5SetupConfigSchema.optional(),
  version: z.enum(["v4", "v5"]).optional(),
});

const NSMDefinitionContentSchema = z.object({
  machineConfig: MachineConfigSchema,
  initialState: z.record(z.any()).optional(),
  stateSchema: z.record(z.any()).refine(
    (schema) => typeof schema.type === "string",
    { message: "stateSchema must be a valid JSON Schema" }
  ),
  interactionSchema: z.record(z.any()).refine(
    (schema) => typeof schema.type === "string",
    { message: "interactionSchema must be a valid JSON Schema" }
  ),
  conflictResolution: z.object({
    strategy: z.enum(["last-write-wins", "operational-transform", "crdt"]),
    metadata: z.record(z.any()).optional(),
  }).optional(),
  machineURI: z.string().optional(), // Legacy support
  implementations: BlossomImplementationReferenceSchema.optional(),
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

    // Validate content schema
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
  if (metadata.uiFallbacks && metadata.uiFallbacks.length > 0) {
    tags.push(["ui-fallbacks", JSON.stringify(metadata.uiFallbacks)]);
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


/**
 * Helper: Extract UI fallback specifications from tags
 */
export function extractUIFallbacks(tags: string[][]): UIFallbackSpec[] {
  const uiFallbacksTag = tags.find(tag => tag[0] === "ui-fallbacks");
  if (uiFallbacksTag && uiFallbacksTag[1]) {
    try {
      const parsed = JSON.parse(uiFallbacksTag[1]);
      const validation = z.array(UIFallbackSpecSchema).safeParse(parsed);
      if (validation.success) {
        return validation.data;
      }
    } catch (error) {
      // Fallback to legacy string format for backward compatibility
      const legacyFallbacks = uiFallbacksTag[1].split(",").map(s => s.trim());
      return createDefaultUIFallbacks(legacyFallbacks);
    }
  }

  // Default fallback configuration
  return createDefaultUIFallbacks(["mcp-ui", "web-components", "json-ui"]);
}

/**
 * Helper: Create default UI fallback specifications from type strings
 */
function createDefaultUIFallbacks(types: string[]): UIFallbackSpec[] {
  return types.map(type => {
    switch (type) {
      case "mcp-ui":
        return {
          type: "mcp-ui",
          uri: "", // Empty URI for default spec
          sandboxing: { iframe: true },
        } as MCPUISpec;
      case "web-components":
        return {
          type: "web-components",
          uri: "", // Empty URI for default spec
        } as WebComponentsSpec;
      case "json-ui":
        return {
          type: "json-ui",
          schema: {
            title: "Default UI",
            components: [
              { type: "label", text: "NSM Application UI" },
              { type: "button", text: "Refresh", event: "REFRESH" },
            ],
          },
        } as JSONUISpec;
      default:
        // Return a basic JSON-UI spec for unknown types
        return {
          type: "json-ui",
          schema: {
            title: "Fallback UI",
            components: [
              { type: "label", text: "Basic NSM Interface" },
            ],
          },
        } as JSONUISpec;
    }
  });
}