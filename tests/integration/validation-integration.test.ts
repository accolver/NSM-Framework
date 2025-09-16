/**
 * End-to-End Validation Integration Tests
 * Tests the complete validation system across all NSM packages
 */

import { describe, it, expect } from "bun:test";
import {
  validateNostrEventComprehensive,
  validateXStateMachine,
  sanitizeUserInput,
  validateFileUpload,
  validateURL,
  RateLimiter,
  CONTENT_SIZE_LIMITS,
  type INostrEvent,
  type ValidationResult
} from "@nsm/core";

describe("NSM Framework Validation Integration", () => {
  describe("Complete NSM Workflow Validation", () => {
    it("should validate a complete NSM application flow", async () => {
      // 1. Validate state machine definition
      const machineDefinition = {
        id: "wordleGame",
        initial: "waiting",
        states: {
          waiting: {
            on: {
              START_GAME: "playing"
            }
          },
          playing: {
            on: {
              MAKE_GUESS: "checking",
              GIVE_UP: "finished"
            }
          },
          checking: {
            on: {
              GUESS_CORRECT: "finished",
              GUESS_INCORRECT: "playing"
            }
          },
          finished: {
            on: {
              RESET: "waiting"
            }
          }
        },
        context: {
          word: "",
          guesses: [],
          currentGuess: "",
          maxGuesses: 6
        }
      };

      const machineResult = validateXStateMachine(machineDefinition, {
        maxComplexity: 1000,
        allowFunctions: false,
        maxStates: 50
      });

      expect(machineResult.success).toBe(true);
      expect(machineResult.data).toEqual(machineDefinition);

      // 2. Validate NSM Definition Event
      const definitionEvent: INostrEvent = {
        id: "a".repeat(64),
        pubkey: "b".repeat(64),
        created_at: Math.floor(Date.now() / 1000),
        kind: 30079, // NSM Definition Event
        tags: [
          ["d", "wordle-game"],
          ["name", "Wordle Game"],
          ["engine", "xstate"],
          ["engineCodeURI", "https://cdn.jsdelivr.net/npm/xstate@5/dist/xstate.min.js"]
        ],
        content: JSON.stringify({
          initialState: machineDefinition.context,
          stateSchema: {
            type: "object",
            properties: {
              word: { type: "string", maxLength: 5 },
              guesses: { type: "array", maxItems: 6 },
              currentGuess: { type: "string", maxLength: 5 },
              maxGuesses: { type: "number", maximum: 6 }
            }
          },
          interactionSchema: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["START_GAME", "MAKE_GUESS", "GIVE_UP", "RESET"] },
              payload: { type: "object" }
            },
            required: ["type"]
          }
        }),
        sig: "c".repeat(128)
      };

      const eventResult = validateNostrEventComprehensive(definitionEvent, {
        checkSignature: false,
        validateTimestamp: true
      });

      expect(eventResult.success).toBe(true);
      expect(eventResult.data?.kind).toBe(30079);

      // 3. Validate user interactions
      const userGuess = "HOUSE";
      const sanitizedGuess = sanitizeUserInput(userGuess, {
        maxLength: 5,
        allowHTML: false
      });

      expect(sanitizedGuess.success).toBe(true);
      expect(sanitizedGuess.data).toBe("HOUSE");

      // 4. Validate interaction event
      const interactionEvent: INostrEvent = {
        id: "d".repeat(64),
        pubkey: "e".repeat(64),
        created_at: Math.floor(Date.now() / 1000),
        kind: 7001, // NSM Interaction Event
        tags: [
          ["a", "30079:" + "b".repeat(64) + ":wordle-game"],
          ["p", "b".repeat(64)]
        ],
        content: JSON.stringify({
          type: "MAKE_GUESS",
          payload: { guess: sanitizedGuess.data }
        }),
        sig: "f".repeat(128)
      };

      const interactionResult = validateNostrEventComprehensive(interactionEvent, {
        checkSignature: false,
        validateTimestamp: true
      });

      expect(interactionResult.success).toBe(true);
      expect(interactionResult.data?.kind).toBe(7001);

      // 5. Validate state update event
      const newState = {
        word: "WORLD",
        guesses: ["HOUSE"],
        currentGuess: "",
        maxGuesses: 6,
        gameStatus: "playing"
      };

      const stateUpdateEvent: INostrEvent = {
        id: "1".repeat(64),
        pubkey: "2".repeat(64),
        created_at: Math.floor(Date.now() / 1000),
        kind: 10079, // NSM State Update Event
        tags: [
          ["a", "30079:" + "b".repeat(64) + ":wordle-game"]
        ],
        content: JSON.stringify({
          state: newState,
          metadata: {
            stateVersion: 1,
            timestamp: Date.now()
          }
        }),
        sig: "3".repeat(128)
      };

      const stateResult = validateNostrEventComprehensive(stateUpdateEvent, {
        checkSignature: false,
        validateTimestamp: true
      });

      expect(stateResult.success).toBe(true);
      expect(stateResult.data?.kind).toBe(10079);
    });

    it("should handle security threats across the validation pipeline", () => {
      // Test XSS in state machine definition
      const maliciousMachine = {
        initial: "idle",
        states: {
          idle: {
            entry: "eval('malicious code')"
          }
        }
      };

      const machineResult = validateXStateMachine(maliciousMachine);
      expect(machineResult.success).toBe(false);
      expect(machineResult.error).toContain("dangerous code patterns");

      // Test XSS in user input
      const xssInput = "<script>steal_cookies()</script>";
      const inputResult = sanitizeUserInput(xssInput);
      expect(inputResult.success).toBe(false);
      expect(inputResult.error).toContain("dangerous content");

      // Test XSS in event content
      const maliciousEvent: INostrEvent = {
        id: "4".repeat(64),
        pubkey: "5".repeat(64),
        created_at: Math.floor(Date.now() / 1000),
        kind: 1,
        tags: [["t", "<script>alert('xss')</script>"]],
        content: "javascript:alert('pwned')",
        sig: "6".repeat(128)
      };

      const eventResult = validateNostrEventComprehensive(maliciousEvent, {
        checkSignature: false
      });
      expect(eventResult.success).toBe(false);
    });

    it("should enforce size limits across all validation types", () => {
      // Test oversized event content
      const largeContent = "x".repeat(CONTENT_SIZE_LIMITS.NOSTR_CONTENT + 1);
      const largeEvent: INostrEvent = {
        id: "7".repeat(64),
        pubkey: "8".repeat(64),
        created_at: Math.floor(Date.now() / 1000),
        kind: 1,
        tags: [],
        content: largeContent,
        sig: "9".repeat(128)
      };

      const eventResult = validateNostrEventComprehensive(largeEvent);
      expect(eventResult.success).toBe(false);
      expect(eventResult.error).toContain("Content too large");

      // Test oversized user input
      const largeInput = "x".repeat(CONTENT_SIZE_LIMITS.USER_INPUT + 1);
      const inputResult = sanitizeUserInput(largeInput);
      expect(inputResult.success).toBe(false);
      expect(inputResult.error).toContain("too long");

      // Test oversized state machine
      const largeStates: any = {};
      for (let i = 0; i < 200; i++) {
        largeStates[`state${i}`] = { on: { [`EVENT_${i}`]: `state${(i + 1) % 200}` } };
      }

      const largeMachine = {
        initial: "state0",
        states: largeStates
      };

      const machineResult = validateXStateMachine(largeMachine, { maxStates: 100 });
      expect(machineResult.success).toBe(false);
      expect(machineResult.error).toContain("Too many states");
    });

    it("should validate file uploads securely", () => {
      // Valid file
      const validFile = {
        name: "state-machine.json",
        size: 1000,
        type: "application/json"
      };

      const validResult = validateFileUpload(validFile);
      expect(validResult.success).toBe(true);

      // Dangerous file
      const dangerousFile = {
        name: "malware.exe",
        size: 1000,
        type: "application/x-msdownload"
      };

      const dangerousResult = validateFileUpload(dangerousFile);
      expect(dangerousResult.success).toBe(false);
      expect(dangerousResult.error).toContain("Invalid file type");

      // Path traversal attempt
      const traversalFile = {
        name: "../../etc/passwd",
        size: 1000,
        type: "text/plain"
      };

      const traversalResult = validateFileUpload(traversalFile);
      expect(traversalResult.success).toBe(false);
    });

    it("should validate URLs securely", () => {
      // Valid URLs
      const validUrls = [
        "https://example.com",
        "https://cdn.jsdelivr.net/npm/xstate@5/dist/xstate.min.js"
      ];

      for (const url of validUrls) {
        const result = validateURL(url);
        expect(result.success).toBe(true);
      }

      // Invalid/dangerous URLs
      const dangerousUrls = [
        "ftp://example.com/file",
        "file:///etc/passwd",
        "not-a-url"
      ];

      for (const url of dangerousUrls) {
        const result = validateURL(url);
        expect(result.success).toBe(false);
      }
    });

    it("should enforce rate limiting", () => {
      const rateLimiter = RateLimiter.getInstance();
      const testId = "rate-test-user";
      const limit = 5;

      // Should allow up to limit
      for (let i = 0; i < limit; i++) {
        expect(rateLimiter.checkLimit(testId, limit)).toBe(true);
      }

      // Should block after limit
      expect(rateLimiter.checkLimit(testId, limit)).toBe(false);

      // Cleanup
      rateLimiter.cleanup();
    });

    it("should handle edge cases gracefully", () => {
      // Null/undefined inputs
      expect(validateNostrEventComprehensive(null).success).toBe(false);
      expect(validateNostrEventComprehensive(undefined).success).toBe(false);
      expect(validateXStateMachine(null).success).toBe(false);
      expect(sanitizeUserInput("").success).toBe(true); // Empty string is valid

      // Malformed objects
      const malformedEvent = {
        id: "invalid",
        kind: "not-a-number",
        content: null
      };

      expect(validateNostrEventComprehensive(malformedEvent).success).toBe(false);

      // Deeply nested objects
      let deepObject: any = {};
      let current = deepObject;
      for (let i = 0; i < 20; i++) {
        current.nested = {};
        current = current.nested;
      }

      const deepMachine = {
        initial: "start",
        states: {
          start: {
            context: deepObject
          }
        }
      };

      // This should be caught by size limits or complexity checks
      const result = validateXStateMachine(deepMachine);
      // Result might succeed or fail depending on how the deep nesting is handled
      // The important thing is that it doesn't crash
      expect(typeof result.success).toBe("boolean");
    });
  });

  describe("Performance and Scalability", () => {
    it("should handle batch validation efficiently", () => {
      const events: INostrEvent[] = [];

      // Create 50 valid events
      for (let i = 0; i < 50; i++) {
        const hexChar = (i % 16).toString(16);
        events.push({
          id: hexChar.repeat(64),
          pubkey: "a".repeat(64),
          created_at: Math.floor(Date.now() / 1000),
          kind: 1,
          tags: [["i", i.toString()]],
          content: `Event ${i}`,
          sig: hexChar.repeat(128)
        });
      }

      // Validate all events
      const startTime = Date.now();
      const results = events.map(event =>
        validateNostrEventComprehensive(event, { checkSignature: false })
      );
      const endTime = Date.now();

      // All should be valid
      expect(results.every(r => r.success)).toBe(true);

      // Should complete in reasonable time (< 1 second for 50 events)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it("should maintain performance with complex state machines", () => {
      // Create a moderately complex state machine
      const states: any = {};
      for (let i = 0; i < 20; i++) {
        const transitions: any = {};
        for (let j = 0; j < 5; j++) {
          transitions[`EVENT_${i}_${j}`] = `state${(i + j + 1) % 20}`;
        }
        states[`state${i}`] = {
          on: transitions,
          entry: `enterState${i}`,
          exit: `exitState${i}`
        };
      }

      const complexMachine = {
        initial: "state0",
        states,
        context: {
          counters: Array(20).fill(0),
          data: "some data".repeat(100)
        }
      };

      const startTime = Date.now();
      const result = validateXStateMachine(complexMachine, {
        maxComplexity: 5000,
        maxStates: 50
      });
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should validate quickly
    });
  });
});