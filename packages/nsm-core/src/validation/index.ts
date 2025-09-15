import { z } from "zod";
import type {
  INostrEvent,
  ValidationResult,
  JSONSchema,
  NSMEventType,
  ConflictResolutionPolicy,
  INSMDefinitionEvent,
  INSMInteractionEvent,
  INSMStateUpdateEvent
} from "../events/index.js";
import {
  validateNSMDefinitionEvent,
  validateNSMInteractionEvent,
  validateNSMStateUpdateEvent
} from "../events/index.js";

/**
 * Extended validation result with event type information
 */
export interface NSMValidationResult<T = unknown> extends ValidationResult<T> {
  eventType?: NSMEventType;
}

/**
 * Generic NSM event union type
 */
export type NSMEvent = INSMDefinitionEvent | INSMInteractionEvent | INSMStateUpdateEvent;

/**
 * Validates any NSM event and determines its type
 */
export function validateNSMEvent(event: unknown): NSMValidationResult<NSMEvent> {
  if (!event || typeof event !== 'object') {
    return {
      success: false,
      error: "Event must be a valid object"
    };
  }

  const eventObj = event as Partial<INostrEvent>;

  // Check if it's an NSM event by kind
  const kind = eventObj.kind;
  if (typeof kind !== 'number') {
    return {
      success: false,
      error: "Event kind must be a number"
    };
  }

  // Route to appropriate validator based on kind
  if (kind === 30079) {
    const result = validateNSMDefinitionEvent(event);
    return {
      ...result,
      eventType: "definition"
    };
  } else if (kind >= 7000 && kind <= 7999) {
    const result = validateNSMInteractionEvent(event);
    return {
      ...result,
      eventType: "interaction"
    };
  } else if (kind === 10079) {
    const result = validateNSMStateUpdateEvent(event);
    return {
      ...result,
      eventType: "state-update"
    };
  } else {
    return {
      success: false,
      error: `Event kind ${kind} is not a valid NSM event kind`
    };
  }
}

/**
 * Validates data against a JSON Schema
 */
export function validateJSONSchema(data: unknown, schema: JSONSchema): ValidationResult<unknown> {
  try {
    // Convert JSON Schema to Zod schema for validation
    const zodSchema = convertJSONSchemaToZod(schema);
    const result = zodSchema.safeParse(data);

    if (result.success) {
      return {
        success: true,
        data: result.data
      };
    } else {
      return {
        success: false,
        error: `Schema validation failed: ${result.error.message}`
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `Schema validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Converts a JSON Schema to a Zod schema (simplified implementation)
 */
function convertJSONSchemaToZod(schema: JSONSchema): z.ZodTypeAny {
  switch (schema.type) {
    case "string":
      if (schema.enum) {
        return z.enum(schema.enum as [string, ...string[]]);
      }
      return z.string();

    case "number":
      let numberSchema = z.number();
      if (typeof schema.minimum === 'number') {
        numberSchema = numberSchema.min(schema.minimum);
      }
      if (typeof schema.maximum === 'number') {
        numberSchema = numberSchema.max(schema.maximum);
      }
      return numberSchema;

    case "boolean":
      return z.boolean();

    case "array":
      if (schema.items) {
        return z.array(convertJSONSchemaToZod(schema.items));
      }
      return z.array(z.any());

    case "object":
      if (schema.properties) {
        const shape: Record<string, z.ZodTypeAny> = {};
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          let zodProp = convertJSONSchemaToZod(propSchema);

          // Make optional if not in required array
          if (!schema.required?.includes(key)) {
            zodProp = zodProp.optional();
          }

          shape[key] = zodProp;
        }
        return z.object(shape);
      }
      return z.record(z.any());

    default:
      return z.any();
  }
}

/**
 * Resolves conflicts between multiple state update events
 */
export function resolveConflict<T extends INSMStateUpdateEvent>(
  conflictingEvents: T[],
  policy: ConflictResolutionPolicy,
  appOwner?: string
): T | null {
  if (conflictingEvents.length === 0) {
    return null;
  }

  if (conflictingEvents.length === 1) {
    return conflictingEvents[0]!;
  }

  switch (policy) {
    case "timestamp-based":
      return conflictingEvents.reduce((winner, current) => {
        if (current.created_at > winner.created_at) {
          return current;
        } else if (current.created_at === winner.created_at) {
          // Tie-breaker: use ID-based resolution
          return current.id < winner.id ? current : winner;
        }
        return winner;
      });

    case "id-based":
      return conflictingEvents.reduce((winner, current) => {
        return current.id < winner.id ? current : winner;
      });

    case "owner-based":
      if (!appOwner) {
        // Fall back to timestamp-based if no owner specified
        return resolveConflict(conflictingEvents, "timestamp-based");
      }

      const ownerEvents = conflictingEvents.filter(event => event.pubkey === appOwner);
      if (ownerEvents.length > 0) {
        // Resolve among owner events using timestamp
        return resolveConflict(ownerEvents, "timestamp-based");
      }

      // No owner events, fall back to timestamp-based
      return resolveConflict(conflictingEvents, "timestamp-based");

    default:
      throw new Error(`Unknown conflict resolution policy: ${policy}`);
  }
}

/**
 * Serializes an NSM event to JSON string
 */
export function serializeNSMEvent(event: NSMEvent): string {
  try {
    return JSON.stringify(event);
  } catch (error) {
    throw new Error(`Failed to serialize NSM event: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Deserializes a JSON string to an NSM event
 */
export function deserializeNSMEvent(serialized: string): ValidationResult<NSMEvent> {
  try {
    const event = JSON.parse(serialized);
    return validateNSMEvent(event);
  } catch (error) {
    return {
      success: false,
      error: `Failed to deserialize NSM event: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Validates event signature (placeholder implementation)
 * In a real implementation, this would verify the cryptographic signature
 */
export function validateEventSignature(event: INostrEvent): boolean {
  // Basic structure validation
  if (!event.sig || typeof event.sig !== 'string') {
    return false;
  }

  // Check signature format (hex string, typically 64 bytes = 128 hex chars)
  if (!/^[a-f0-9]{128}$/i.test(event.sig)) {
    return false;
  }

  // TODO: Implement actual cryptographic verification
  // This would involve:
  // 1. Recreating the event hash from id, pubkey, created_at, kind, tags, content
  // 2. Verifying the signature using the public key
  // For now, return true for basic format validation
  return true;
}

// Re-export types for convenience
export type {
  ValidationResult,
  JSONSchema,
  NSMEventType,
  ConflictResolutionPolicy
} from "../events/index.js";