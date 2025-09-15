import { describe, it, expect } from "bun:test";
import type {
  INSMStateUpdateEvent,
  NSMStateUpdateContent
} from "../src/events/nsm-state-update.js";
import { validateNSMStateUpdateEvent, createNSMStateUpdateEvent } from "../src/events/nsm-state-update.js";

describe("NSM State Update Event (kind:10079)", () => {
  describe("Type Definitions", () => {
    it("should define correct event structure", () => {
      const event: INSMStateUpdateEvent = {
        id: "test-id",
        pubkey: "test-pubkey",
        created_at: Math.floor(Date.now() / 1000),
        kind: 10079,
        tags: [
          ["a", "30079:app-creator-pubkey:wordle-v1"],
          ["p", "player1"]
        ],
        content: JSON.stringify({
          state: {
            currentGuess: "HELLO",
            guesses: ["CRANE", "BLUNT"],
            gameStatus: "playing"
          },
          metadata: {
            stateVersion: 5,
            lastInteractionId: "interaction-abc123",
            timestamp: Date.now()
          }
        }),
        sig: "test-signature"
      };

      // Type assertion should pass
      expect(event.kind).toBe(10079);
      expect(event.tags.find(tag => tag[0] === "a")?.[1]).toBe("30079:app-creator-pubkey:wordle-v1");
    });
  });

  describe("Event Validation", () => {
    const validEvent: INSMStateUpdateEvent = {
      id: "valid-id",
      pubkey: "valid-pubkey",
      created_at: Math.floor(Date.now() / 1000),
      kind: 10079,
      tags: [
        ["a", "30079:creator-pubkey:test-app"]
      ],
      content: JSON.stringify({
        state: { count: 42 },
        metadata: {
          stateVersion: 1,
          timestamp: Date.now()
        }
      }),
      sig: "valid-signature"
    };

    it("should validate correct NSM State Update event", () => {
      const result = validateNSMStateUpdateEvent(validEvent);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.kind).toBe(10079);
        expect(result.data.tags.find(tag => tag[0] === "a")?.[1]).toBe("30079:creator-pubkey:test-app");
      }
    });

    it("should reject event with wrong kind", () => {
      const invalidEvent = { ...validEvent, kind: 1000 };
      const result = validateNSMStateUpdateEvent(invalidEvent);
      expect(result.success).toBe(false);
    });

    it("should reject event missing required 'a' tag", () => {
      const invalidEvent = {
        ...validEvent,
        tags: validEvent.tags.filter(tag => tag[0] !== "a")
      };
      const result = validateNSMStateUpdateEvent(invalidEvent);
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
        const event = { ...validEvent, tags: [["a", format]] };
        const result = validateNSMStateUpdateEvent(event);
        expect(result.success).toBe(true);
      });

      invalidFormats.forEach(format => {
        const event = { ...validEvent, tags: [["a", format]] };
        const result = validateNSMStateUpdateEvent(event);
        expect(result.success).toBe(false);
      });
    });

    it("should reject event with invalid JSON content", () => {
      const invalidEvent = { ...validEvent, content: "invalid-json" };
      const result = validateNSMStateUpdateEvent(invalidEvent);
      expect(result.success).toBe(false);
    });

    it("should require 'state' field in content", () => {
      const invalidContent = {
        metadata: { stateVersion: 1, timestamp: Date.now() }
      }; // missing state
      const invalidEvent = { ...validEvent, content: JSON.stringify(invalidContent) };
      const result = validateNSMStateUpdateEvent(invalidEvent);
      expect(result.success).toBe(false);
    });

    it("should accept event with minimal state content", () => {
      const minimalContent: NSMStateUpdateContent = {
        state: {}
      };
      const event = { ...validEvent, content: JSON.stringify(minimalContent) };
      const result = validateNSMStateUpdateEvent(event);
      expect(result.success).toBe(true);
    });

    it("should accept event with comprehensive metadata", () => {
      const contentWithMetadata: NSMStateUpdateContent = {
        state: {
          gameBoard: [[1, 2], [3, 4]],
          currentPlayer: "player1",
          score: { player1: 10, player2: 8 }
        },
        metadata: {
          stateVersion: 15,
          lastInteractionId: "interaction-xyz789",
          timestamp: Date.now(),
          conflictResolution: "timestamp-based",
          arbiter: "arbiter-pubkey",
          canonicalStateHash: "sha256-hash"
        }
      };

      const event = { ...validEvent, content: JSON.stringify(contentWithMetadata) };
      const result = validateNSMStateUpdateEvent(event);
      expect(result.success).toBe(true);
    });

    it("should accept event with participant tags", () => {
      const eventWithParticipants = {
        ...validEvent,
        tags: [
          ["a", "30079:creator-pubkey:multiplayer-game"],
          ["p", "player1"],
          ["p", "player2"],
          ["arbiter", "arbiter-pubkey"]
        ]
      };
      const result = validateNSMStateUpdateEvent(eventWithParticipants);
      expect(result.success).toBe(true);
    });

    it("should handle complex nested state objects", () => {
      const complexState = {
        state: {
          game: {
            board: {
              tiles: [
                { id: 1, position: { x: 0, y: 0 }, occupied: true },
                { id: 2, position: { x: 1, y: 0 }, occupied: false }
              ]
            },
            players: [
              { id: "player1", name: "Alice", score: 100, inventory: ["sword", "shield"] },
              { id: "player2", name: "Bob", score: 85, inventory: ["bow", "arrows"] }
            ],
            settings: {
              difficulty: "hard",
              timeLimit: 300000,
              allowSpectators: true
            }
          },
          ui: {
            selectedTile: 1,
            showInventory: false,
            chatMessages: [
              { sender: "player1", message: "Good game!", timestamp: Date.now() - 1000 }
            ]
          }
        },
        metadata: {
          stateVersion: 42,
          lastInteractionId: "move-piece-123",
          timestamp: Date.now()
        }
      };

      const event = { ...validEvent, content: JSON.stringify(complexState) };
      const result = validateNSMStateUpdateEvent(event);
      expect(result.success).toBe(true);
    });
  });

  describe("Event Creation Helpers", () => {
    it("should create valid NSM State Update event", () => {
      const appAddress = "30079:creator-pubkey:test-app";
      const content: NSMStateUpdateContent = {
        state: { count: 10, message: "Hello World" },
        metadata: {
          stateVersion: 3,
          timestamp: Date.now()
        }
      };

      const event = createNSMStateUpdateEvent(appAddress, content);

      expect(event.kind).toBe(10079);
      expect(event.tags.find(tag => tag[0] === "a")?.[1]).toBe(appAddress);

      const parsedContent = JSON.parse(event.content);
      expect(parsedContent.state.count).toBe(10);
      expect(parsedContent.state.message).toBe("Hello World");
      expect(parsedContent.metadata.stateVersion).toBe(3);
    });

    it("should create event with participants and arbiter", () => {
      const appAddress = "30079:creator-pubkey:multiplayer-game";
      const content: NSMStateUpdateContent = {
        state: { gamePhase: "playing", currentTurn: "player1" }
      };
      const participants = ["player1", "player2"];
      const arbiter = "arbiter-pubkey";

      const event = createNSMStateUpdateEvent(appAddress, content, { participants, arbiter });

      const participantTags = event.tags.filter(tag => tag[0] === "p");
      expect(participantTags).toHaveLength(2);
      expect(participantTags[0]?.[1]).toBe("player1");
      expect(participantTags[1]?.[1]).toBe("player2");

      const arbiterTag = event.tags.find(tag => tag[0] === "arbiter");
      expect(arbiterTag?.[1]).toBe("arbiter-pubkey");
    });

    it("should create event with minimal state", () => {
      const appAddress = "30079:creator-pubkey:simple-app";
      const content: NSMStateUpdateContent = {
        state: { active: true }
      };

      const event = createNSMStateUpdateEvent(appAddress, content);

      expect(event.kind).toBe(10079);

      const parsedContent = JSON.parse(event.content);
      expect(parsedContent.state.active).toBe(true);
      expect(parsedContent.metadata).toBeUndefined();
    });

    it("should preserve state object types", () => {
      const appAddress = "30079:creator-pubkey:type-test";
      const content: NSMStateUpdateContent = {
        state: {
          stringValue: "hello",
          numberValue: 42,
          booleanValue: true,
          arrayValue: [1, 2, 3],
          objectValue: { nested: "value" },
          nullValue: null
        }
      };

      const event = createNSMStateUpdateEvent(appAddress, content);
      const parsedContent = JSON.parse(event.content);

      expect(typeof parsedContent.state.stringValue).toBe("string");
      expect(typeof parsedContent.state.numberValue).toBe("number");
      expect(typeof parsedContent.state.booleanValue).toBe("boolean");
      expect(Array.isArray(parsedContent.state.arrayValue)).toBe(true);
      expect(typeof parsedContent.state.objectValue).toBe("object");
      expect(parsedContent.state.nullValue).toBe(null);
    });
  });
});