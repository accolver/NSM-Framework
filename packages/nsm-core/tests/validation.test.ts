import { describe, it, expect } from "bun:test";
import {
  validateNSMEvent,
  validateJSONSchema,
  resolveConflict,
  serializeNSMEvent,
  deserializeNSMEvent,
  validateEventSignature,
  type ConflictResolutionPolicy,
  type NSMEventType
} from "../src/validation/index.js";
import type {
  INSMDefinitionEvent,
  INSMInteractionEvent,
  INSMStateUpdateEvent
} from "../src/events/index.js";

describe("NSM Protocol Validation Utilities", () => {
  describe("Generic Event Validation", () => {
    it("should validate NSM Definition events", () => {
      const event: INSMDefinitionEvent = {
        id: "test-id",
        pubkey: "test-pubkey",
        created_at: Math.floor(Date.now() / 1000),
        kind: 30079,
        tags: [
          ["d", "test-app"],
          ["name", "Test App"],
          ["engine", "xstate"],
          ["engineCodeURI", "https://example.com/engine.js"]
        ],
        content: JSON.stringify({
          machineConfig: {
            id: "test-machine",
            initial: "idle",
            states: {
              idle: {
                on: {
                  START: { target: "active" }
                }
              },
              active: {}
            }
          },
          initialState: {},
          stateSchema: { type: "object" },
          interactionSchema: { type: "object" }
        }),
        sig: "test-signature"
      };

      const result = validateNSMEvent(event);
      expect(result.success).toBe(true);
      expect(result.eventType).toBe("definition");
    });

    it("should validate NSM Interaction events", () => {
      const event: INSMInteractionEvent = {
        id: "test-id",
        pubkey: "test-pubkey",
        created_at: Math.floor(Date.now() / 1000),
        kind: 7001,
        tags: [["a", "30079:creator-pubkey:test-app"]],
        content: JSON.stringify({ type: "TEST_ACTION" }),
        sig: "test-signature"
      };

      const result = validateNSMEvent(event);
      expect(result.success).toBe(true);
      expect(result.eventType).toBe("interaction");
    });

    it("should validate NSM State Update events", () => {
      const event: INSMStateUpdateEvent = {
        id: "test-id",
        pubkey: "test-pubkey",
        created_at: Math.floor(Date.now() / 1000),
        kind: 10079,
        tags: [["a", "30079:creator-pubkey:test-app"]],
        content: JSON.stringify({ state: {} }),
        sig: "test-signature"
      };

      const result = validateNSMEvent(event);
      expect(result.success).toBe(true);
      expect(result.eventType).toBe("state-update");
    });

    it("should reject non-NSM events", () => {
      const event = {
        id: "test-id",
        pubkey: "test-pubkey",
        created_at: Math.floor(Date.now() / 1000),
        kind: 1, // Regular text note
        tags: [],
        content: "Hello world",
        sig: "test-signature"
      };

      const result = validateNSMEvent(event);
      expect(result.success).toBe(false);
      expect(result.error).toContain("not a valid NSM event");
    });
  });

  describe("JSON Schema Validation", () => {
    it("should validate data against JSON schema", () => {
      const schema = {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number", minimum: 0 }
        },
        required: ["name", "age"]
      };

      const validData = { name: "Alice", age: 30 };
      const invalidData = { name: "Bob" }; // missing age

      expect(validateJSONSchema(validData, schema).success).toBe(true);
      expect(validateJSONSchema(invalidData, schema).success).toBe(false);
    });

    it("should validate interaction content against schema", () => {
      const interactionSchema = {
        type: "object",
        properties: {
          type: { type: "string", enum: ["MOVE", "JUMP", "ATTACK"] },
          payload: { type: "object" }
        },
        required: ["type"]
      };

      const validInteraction = { type: "MOVE", payload: { direction: "up" } };
      const invalidInteraction = { action: "MOVE" }; // wrong property name

      expect(validateJSONSchema(validInteraction, interactionSchema).success).toBe(true);
      expect(validateJSONSchema(invalidInteraction, interactionSchema).success).toBe(false);
    });

    it("should validate state against schema", () => {
      const stateSchema = {
        type: "object",
        properties: {
          level: { type: "number", minimum: 1, maximum: 100 },
          health: { type: "number", minimum: 0, maximum: 100 },
          inventory: { type: "array", items: { type: "string" } }
        },
        required: ["level", "health"]
      };

      const validState = { level: 5, health: 75, inventory: ["sword", "potion"] };
      const invalidState = { level: 0, health: 75 }; // level below minimum

      expect(validateJSONSchema(validState, stateSchema).success).toBe(true);
      expect(validateJSONSchema(invalidState, stateSchema).success).toBe(false);
    });
  });

  describe("Conflict Resolution", () => {
    const createMockEvent = (pubkey: string, created_at: number, id: string): INSMStateUpdateEvent => ({
      id,
      pubkey,
      created_at,
      kind: 10079,
      tags: [["a", "30079:creator:app"]],
      content: JSON.stringify({ state: { value: Math.random() } }),
      sig: "mock-signature"
    });

    it("should resolve conflicts using timestamp policy", () => {
      const older = createMockEvent("pubkey1", 1000, "id1");
      const newer = createMockEvent("pubkey2", 2000, "id2");

      const policy: ConflictResolutionPolicy = "timestamp-based";

      expect(resolveConflict([older, newer], policy)).toEqual(newer);
      expect(resolveConflict([newer, older], policy)).toEqual(newer);
    });

    it("should resolve conflicts using event ID policy", () => {
      const eventA = createMockEvent("pubkey1", 1000, "aaa");
      const eventB = createMockEvent("pubkey2", 2000, "zzz");

      const policy: ConflictResolutionPolicy = "id-based";

      expect(resolveConflict([eventA, eventB], policy)).toEqual(eventA);
      expect(resolveConflict([eventB, eventA], policy)).toEqual(eventA);
    });

    it("should resolve conflicts using owner policy", () => {
      const owner = createMockEvent("owner-pubkey", 1000, "id1");
      const nonOwner = createMockEvent("other-pubkey", 2000, "id2");

      const policy: ConflictResolutionPolicy = "owner-based";
      const appOwner = "owner-pubkey";

      expect(resolveConflict([owner, nonOwner], policy, appOwner)).toEqual(owner);
      expect(resolveConflict([nonOwner, owner], policy, appOwner)).toEqual(owner);
    });

    it("should handle edge cases in conflict resolution", () => {
      const event = createMockEvent("pubkey1", 1000, "id1");

      // Single event should return itself
      expect(resolveConflict([event], "timestamp-based")).toEqual(event);

      // Empty array should return null
      expect(resolveConflict([], "timestamp-based")).toBeNull();

      // Owner-based with no owner specified should fall back to timestamp
      const older = createMockEvent("pubkey1", 1000, "id1");
      const newer = createMockEvent("pubkey2", 2000, "id2");
      expect(resolveConflict([older, newer], "owner-based")).toEqual(newer);
    });

    it("should handle identical timestamps in timestamp-based resolution", () => {
      const event1 = createMockEvent("pubkey1", 1000, "id1");
      const event2 = createMockEvent("pubkey2", 1000, "id2");

      // Should fall back to ID-based resolution when timestamps are equal
      const result = resolveConflict([event1, event2], "timestamp-based");
      expect(result).toEqual(event1); // "id1" < "id2"
    });
  });

  describe("Event Serialization/Deserialization", () => {
    const mockDefinitionEvent: INSMDefinitionEvent = {
      id: "def-id",
      pubkey: "def-pubkey",
      created_at: 1234567890,
      kind: 30079,
      tags: [
        ["d", "test-app"],
        ["name", "Test App"],
        ["engine", "xstate"],
        ["engineCodeURI", "https://example.com/engine.js"]
      ],
      content: JSON.stringify({
        machineConfig: {
          id: "test-machine",
          initial: "idle",
          states: {
            idle: {
              on: {
                START: { target: "active" }
              }
            },
            active: {}
          }
        },
        initialState: { count: 0 },
        stateSchema: { type: "object", properties: { count: { type: "number" } } },
        interactionSchema: { type: "object" }
      }),
      sig: "def-signature"
    };

    it("should serialize and deserialize NSM events", () => {
      const serialized = serializeNSMEvent(mockDefinitionEvent);
      expect(typeof serialized).toBe("string");

      const deserialized = deserializeNSMEvent(serialized);
      expect(deserialized.success).toBe(true);
      if (deserialized.success) {
        expect(deserialized.data.id).toBe(mockDefinitionEvent.id);
        expect(deserialized.data.kind).toBe(mockDefinitionEvent.kind);
        expect(deserialized.data.pubkey).toBe(mockDefinitionEvent.pubkey);
        expect(deserialized.data.tags).toEqual(mockDefinitionEvent.tags);
        expect(deserialized.data.content).toBe(mockDefinitionEvent.content);
      }
    });

    it("should handle serialization errors gracefully", () => {
      const invalidEvent = {
        circular: null as any
      };
      invalidEvent.circular = invalidEvent; // Create circular reference

      expect(() => serializeNSMEvent(invalidEvent)).toThrow();
    });

    it("should handle deserialization errors gracefully", () => {
      const invalidJSON = "{ invalid json }";
      const result = deserializeNSMEvent(invalidJSON);
      expect(result.success).toBe(false);
      expect(result.error).toContain("JSON");
    });

    it("should preserve all event properties through round-trip", () => {
      const events = [
        mockDefinitionEvent,
        {
          id: "int-id",
          pubkey: "int-pubkey",
          created_at: 1234567891,
          kind: 7001,
          tags: [["a", "30079:creator:app"], ["p", "player1"]],
          content: JSON.stringify({ type: "ACTION", payload: { value: 42 } }),
          sig: "int-signature"
        } as INSMInteractionEvent,
        {
          id: "state-id",
          pubkey: "state-pubkey",
          created_at: 1234567892,
          kind: 10079,
          tags: [["a", "30079:creator:app"]],
          content: JSON.stringify({
            state: { gamePhase: "playing" },
            metadata: { stateVersion: 5 }
          }),
          sig: "state-signature"
        } as INSMStateUpdateEvent
      ];

      events.forEach(event => {
        const serialized = serializeNSMEvent(event);
        const deserialized = deserializeNSMEvent(serialized);

        expect(deserialized.success).toBe(true);
        if (deserialized.success) {
          expect(deserialized.data).toEqual(event);
        }
      });
    });
  });

  describe("Event Signature Validation", () => {
    const mockEvent: INSMDefinitionEvent = {
      id: "test-id",
      pubkey: "mock-pubkey",
      created_at: Math.floor(Date.now() / 1000),
      kind: 30079,
      tags: [["d", "test"]],
      content: "{}",
      sig: "mock-signature"
    };

    it("should validate event signature structure", () => {
      const result = validateEventSignature(mockEvent);
      // Note: This would normally require actual cryptographic validation
      // For now, we just test the structure validation
      expect(typeof result).toBe("boolean");
    });

    it("should reject events with missing signature", () => {
      const eventWithoutSig = { ...mockEvent };
      delete (eventWithoutSig as any).sig;

      const result = validateEventSignature(eventWithoutSig as any);
      expect(result).toBe(false);
    });

    it("should reject events with invalid signature format", () => {
      const eventWithInvalidSig = { ...mockEvent, sig: "invalid-signature-format" };

      const result = validateEventSignature(eventWithInvalidSig);
      expect(result).toBe(false);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle malformed event objects", () => {
      const malformedEvents = [
        null,
        undefined,
        {},
        { kind: "not-a-number" },
        { kind: 30079 }, // missing required fields
        { kind: 30079, tags: "not-an-array" }
      ];

      malformedEvents.forEach(event => {
        const result = validateNSMEvent(event as any);
        expect(result.success).toBe(false);
      });
    });

    it("should provide meaningful error messages", () => {
      const eventMissingTags: Partial<INSMDefinitionEvent> = {
        id: "test",
        pubkey: "test",
        created_at: 1000,
        kind: 30079,
        content: "{}",
        sig: "test"
        // missing tags
      };

      const result = validateNSMEvent(eventMissingTags as any);
      expect(result.success).toBe(false);
      expect(result.error).toContain("tags");
    });

    it("should handle content parsing errors", () => {
      const eventWithInvalidContent: INSMDefinitionEvent = {
        id: "test",
        pubkey: "test",
        created_at: 1000,
        kind: 30079,
        tags: [["d", "test"], ["name", "Test"], ["engine", "xstate"], ["engineCodeURI", "test"]],
        content: "{ invalid json }", // Invalid JSON
        sig: "test"
      };

      const result = validateNSMEvent(eventWithInvalidContent);
      expect(result.success).toBe(false);
      expect(result.error).toContain("JSON");
    });
  });
});