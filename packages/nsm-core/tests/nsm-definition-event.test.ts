import { describe, it, expect } from "bun:test";
import type {
  INSMDefinitionEvent,
  NSMDefinitionContent,
  NSMDefinitionEventTags
} from "../src/events/nsm-definition.js";
import { validateNSMDefinitionEvent, createNSMDefinitionEvent } from "../src/events/nsm-definition.js";

describe("NSM Definition Event (kind:30079)", () => {
  describe("Type Definitions", () => {
    it("should define correct event structure", () => {
      const event: INSMDefinitionEvent = {
        id: "test-id",
        pubkey: "test-pubkey",
        created_at: Math.floor(Date.now() / 1000),
        kind: 30079,
        tags: [
          ["d", "wordle-v1"],
          ["name", "Wordle Game"],
          ["engine", "xstate"],
          ["engineCodeURI", "https://example.com/wordle-engine.js"],
          ["ui-spec", "react"],
          ["version", "1.0.0"]
        ],
        content: JSON.stringify({
          initialState: { currentGuess: "", guesses: [], gameStatus: "playing" },
          stateSchema: {
            type: "object",
            properties: {
              currentGuess: { type: "string" },
              guesses: { type: "array", items: { type: "string" } },
              gameStatus: { type: "string", enum: ["playing", "won", "lost"] }
            },
            required: ["currentGuess", "guesses", "gameStatus"]
          },
          interactionSchema: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["KEYPRESS", "SUBMIT_GUESS"] },
              key: { type: "string" },
              guess: { type: "string" }
            }
          }
        }),
        sig: "test-signature"
      };

      // Type assertion should pass
      expect(event.kind).toBe(30079);
      expect(event.tags.find(tag => tag[0] === "d")?.[1]).toBe("wordle-v1");
    });
  });

  describe("Event Validation", () => {
    const validEvent: INSMDefinitionEvent = {
      id: "valid-id",
      pubkey: "valid-pubkey",
      created_at: Math.floor(Date.now() / 1000),
      kind: 30079,
      tags: [
        ["d", "test-app"],
        ["name", "Test Application"],
        ["engine", "xstate"],
        ["engineCodeURI", "https://example.com/engine.js"]
      ],
      content: JSON.stringify({
        initialState: { count: 0 },
        stateSchema: {
          type: "object",
          properties: { count: { type: "number" } },
          required: ["count"]
        },
        interactionSchema: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["INCREMENT", "DECREMENT"] }
          }
        }
      }),
      sig: "valid-signature"
    };

    it("should validate correct NSM Definition event", () => {
      const result = validateNSMDefinitionEvent(validEvent);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.kind).toBe(30079);
        expect(result.data.tags.find(tag => tag[0] === "d")?.[1]).toBe("test-app");
      }
    });

    it("should reject event with wrong kind", () => {
      const invalidEvent = { ...validEvent, kind: 1000 };
      const result = validateNSMDefinitionEvent(invalidEvent);
      expect(result.success).toBe(false);
    });

    it("should reject event missing required 'd' tag", () => {
      const invalidEvent = {
        ...validEvent,
        tags: validEvent.tags.filter(tag => tag[0] !== "d")
      };
      const result = validateNSMDefinitionEvent(invalidEvent);
      expect(result.success).toBe(false);
    });

    it("should reject event missing required 'name' tag", () => {
      const invalidEvent = {
        ...validEvent,
        tags: validEvent.tags.filter(tag => tag[0] !== "name")
      };
      const result = validateNSMDefinitionEvent(invalidEvent);
      expect(result.success).toBe(false);
    });

    it("should reject event missing required 'engine' tag", () => {
      const invalidEvent = {
        ...validEvent,
        tags: validEvent.tags.filter(tag => tag[0] !== "engine")
      };
      const result = validateNSMDefinitionEvent(invalidEvent);
      expect(result.success).toBe(false);
    });

    it("should reject event with invalid JSON content", () => {
      const invalidEvent = { ...validEvent, content: "invalid-json" };
      const result = validateNSMDefinitionEvent(invalidEvent);
      expect(result.success).toBe(false);
    });

    it("should reject event missing required content fields", () => {
      const invalidEvent = {
        ...validEvent,
        content: JSON.stringify({ initialState: { count: 0 } }) // missing stateSchema and interactionSchema
      };
      const result = validateNSMDefinitionEvent(invalidEvent);
      expect(result.success).toBe(false);
    });

    it("should accept event with optional tags", () => {
      const eventWithOptionals = {
        ...validEvent,
        tags: [
          ...validEvent.tags,
          ["ui-spec", "react"],
          ["version", "1.0.0"],
          ["description", "A test application"]
        ]
      };
      const result = validateNSMDefinitionEvent(eventWithOptionals);
      expect(result.success).toBe(true);
    });
  });

  describe("Event Creation Helpers", () => {
    it("should create valid NSM Definition event", () => {
      const metadata = {
        identifier: "test-app",
        name: "Test Application",
        engine: "xstate" as const,
        engineCodeURI: "https://example.com/engine.js"
      };

      const content: NSMDefinitionContent = {
        initialState: { count: 0 },
        stateSchema: {
          type: "object",
          properties: { count: { type: "number" } },
          required: ["count"]
        },
        interactionSchema: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["INCREMENT", "DECREMENT"] }
          }
        }
      };

      const event = createNSMDefinitionEvent(metadata, content);

      expect(event.kind).toBe(30079);
      expect(event.tags.find(tag => tag[0] === "d")?.[1]).toBe("test-app");
      expect(event.tags.find(tag => tag[0] === "name")?.[1]).toBe("Test Application");
      expect(event.tags.find(tag => tag[0] === "engine")?.[1]).toBe("xstate");

      const parsedContent = JSON.parse(event.content);
      expect(parsedContent.initialState.count).toBe(0);
      expect(parsedContent.stateSchema.type).toBe("object");
      expect(parsedContent.interactionSchema.type).toBe("object");
    });

    it("should create event with optional metadata", () => {
      const metadata = {
        identifier: "test-app",
        name: "Test Application",
        engine: "xstate" as const,
        engineCodeURI: "https://example.com/engine.js",
        uiSpec: "react",
        version: "1.0.0",
        description: "A test application"
      };

      const content: NSMDefinitionContent = {
        initialState: {},
        stateSchema: { type: "object" },
        interactionSchema: { type: "object" }
      };

      const event = createNSMDefinitionEvent(metadata, content);

      expect(event.tags.find(tag => tag[0] === "ui-spec")?.[1]).toBe("react");
      expect(event.tags.find(tag => tag[0] === "version")?.[1]).toBe("1.0.0");
      expect(event.tags.find(tag => tag[0] === "description")?.[1]).toBe("A test application");
    });
  });
});