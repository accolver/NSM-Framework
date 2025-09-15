import { describe, it, expect } from "bun:test";
import type {
  INSMInteractionEvent,
  NSMInteractionContent
} from "../src/events/nsm-interaction.js";
import { validateNSMInteractionEvent, createNSMInteractionEvent } from "../src/events/nsm-interaction.js";

describe("NSM Interaction Event (kind:7000-7999)", () => {
  describe("Type Definitions", () => {
    it("should define correct event structure", () => {
      const event: INSMInteractionEvent = {
        id: "test-id",
        pubkey: "test-pubkey",
        created_at: Math.floor(Date.now() / 1000),
        kind: 7001,
        tags: [
          ["a", "30079:app-creator-pubkey:wordle-v1"],
          ["p", "participant1"],
          ["p", "participant2"]
        ],
        content: JSON.stringify({
          type: "KEYPRESS",
          key: "A",
          metadata: {
            timestamp: Date.now(),
            sessionId: "session-123"
          }
        }),
        sig: "test-signature"
      };

      // Type assertion should pass
      expect(event.kind).toBeGreaterThanOrEqual(7000);
      expect(event.kind).toBeLessThanOrEqual(7999);
      expect(event.tags.find(tag => tag[0] === "a")?.[1]).toBe("30079:app-creator-pubkey:wordle-v1");
    });
  });

  describe("Event Validation", () => {
    const validEvent: INSMInteractionEvent = {
      id: "valid-id",
      pubkey: "valid-pubkey",
      created_at: Math.floor(Date.now() / 1000),
      kind: 7001,
      tags: [
        ["a", "30079:creator-pubkey:test-app"],
        ["p", "participant1"]
      ],
      content: JSON.stringify({
        type: "INCREMENT",
        payload: { amount: 1 }
      }),
      sig: "valid-signature"
    };

    it("should validate correct NSM Interaction event", () => {
      const result = validateNSMInteractionEvent(validEvent);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.kind).toBe(7001);
        expect(result.data.tags.find(tag => tag[0] === "a")?.[1]).toBe("30079:creator-pubkey:test-app");
      }
    });

    it("should accept event within kind range 7000-7999", () => {
      const eventMin = { ...validEvent, kind: 7000 };
      const eventMax = { ...validEvent, kind: 7999 };
      const eventMid = { ...validEvent, kind: 7500 };

      expect(validateNSMInteractionEvent(eventMin).success).toBe(true);
      expect(validateNSMInteractionEvent(eventMax).success).toBe(true);
      expect(validateNSMInteractionEvent(eventMid).success).toBe(true);
    });

    it("should reject event outside kind range", () => {
      const eventTooLow = { ...validEvent, kind: 6999 };
      const eventTooHigh = { ...validEvent, kind: 8000 };

      expect(validateNSMInteractionEvent(eventTooLow).success).toBe(false);
      expect(validateNSMInteractionEvent(eventTooHigh).success).toBe(false);
    });

    it("should reject event missing required 'a' tag", () => {
      const invalidEvent = {
        ...validEvent,
        tags: validEvent.tags.filter(tag => tag[0] !== "a")
      };
      const result = validateNSMInteractionEvent(invalidEvent);
      expect(result.success).toBe(false);
    });

    it("should validate 'a' tag format", () => {
      const validFormats = [
        "30079:creator-pubkey:app-id",
        "30079:abc123:my-app-v2",
        "30079:1234567890abcdef:complex-app-name"
      ];

      const invalidFormats = [
        "30079:creator-pubkey", // missing app identifier
        "1000:creator-pubkey:app-id", // wrong event kind reference
        "30079::app-id", // empty pubkey
        "30079:creator-pubkey:", // empty app identifier
        "wrong-format"
      ];

      validFormats.forEach(format => {
        const event = { ...validEvent, tags: [["a", format], ...validEvent.tags.slice(1)] };
        const result = validateNSMInteractionEvent(event);
        expect(result.success).toBe(true);
      });

      invalidFormats.forEach(format => {
        const event = { ...validEvent, tags: [["a", format], ...validEvent.tags.slice(1)] };
        const result = validateNSMInteractionEvent(event);
        expect(result.success).toBe(false);
      });
    });

    it("should reject event with invalid JSON content", () => {
      const invalidEvent = { ...validEvent, content: "invalid-json" };
      const result = validateNSMInteractionEvent(invalidEvent);
      expect(result.success).toBe(false);
    });

    it("should require 'type' field in interaction content", () => {
      const invalidContent = { payload: { amount: 1 } }; // missing type
      const invalidEvent = { ...validEvent, content: JSON.stringify(invalidContent) };
      const result = validateNSMInteractionEvent(invalidEvent);
      expect(result.success).toBe(false);
    });

    it("should accept event with multiple participants", () => {
      const multiParticipantEvent = {
        ...validEvent,
        tags: [
          ["a", "30079:creator-pubkey:test-app"],
          ["p", "participant1"],
          ["p", "participant2"],
          ["p", "participant3"]
        ]
      };
      const result = validateNSMInteractionEvent(multiParticipantEvent);
      expect(result.success).toBe(true);
    });

    it("should accept event with no participant tags", () => {
      const noParticipantEvent = {
        ...validEvent,
        tags: [["a", "30079:creator-pubkey:test-app"]]
      };
      const result = validateNSMInteractionEvent(noParticipantEvent);
      expect(result.success).toBe(true);
    });

    it("should accept additional metadata in content", () => {
      const contentWithMetadata: NSMInteractionContent = {
        type: "MOVE_PIECE",
        payload: { from: "A1", to: "A2" },
        metadata: {
          timestamp: Date.now(),
          sessionId: "game-session-123",
          userAgent: "test-client/1.0"
        }
      };

      const event = {
        ...validEvent,
        content: JSON.stringify(contentWithMetadata)
      };

      const result = validateNSMInteractionEvent(event);
      expect(result.success).toBe(true);
    });
  });

  describe("Event Creation Helpers", () => {
    it("should create valid NSM Interaction event", () => {
      const appAddress = "30079:creator-pubkey:test-app";
      const content: NSMInteractionContent = {
        type: "INCREMENT",
        payload: { amount: 5 }
      };

      const event = createNSMInteractionEvent(appAddress, content);

      expect(event.kind).toBeGreaterThanOrEqual(7000);
      expect(event.kind).toBeLessThanOrEqual(7999);
      expect(event.tags.find(tag => tag[0] === "a")?.[1]).toBe(appAddress);

      const parsedContent = JSON.parse(event.content);
      expect(parsedContent.type).toBe("INCREMENT");
      expect(parsedContent.payload.amount).toBe(5);
    });

    it("should create event with participants", () => {
      const appAddress = "30079:creator-pubkey:multiplayer-game";
      const content: NSMInteractionContent = {
        type: "JOIN_GAME",
        payload: { playerName: "Alice" }
      };
      const participants = ["player1", "player2"];

      const event = createNSMInteractionEvent(appAddress, content, { participants });

      const participantTags = event.tags.filter(tag => tag[0] === "p");
      expect(participantTags).toHaveLength(2);
      expect(participantTags[0]?.[1]).toBe("player1");
      expect(participantTags[1]?.[1]).toBe("player2");
    });

    it("should create event with custom kind", () => {
      const appAddress = "30079:creator-pubkey:test-app";
      const content: NSMInteractionContent = {
        type: "CUSTOM_ACTION",
        payload: {}
      };

      const event = createNSMInteractionEvent(appAddress, content, { kind: 7555 });

      expect(event.kind).toBe(7555);
    });

    it("should auto-assign kind if not provided", () => {
      const appAddress = "30079:creator-pubkey:test-app";
      const content: NSMInteractionContent = {
        type: "AUTO_KIND",
        payload: {}
      };

      const event = createNSMInteractionEvent(appAddress, content);

      expect(event.kind).toBeGreaterThanOrEqual(7000);
      expect(event.kind).toBeLessThanOrEqual(7999);
    });
  });
});