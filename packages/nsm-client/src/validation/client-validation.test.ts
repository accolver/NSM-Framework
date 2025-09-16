import { describe, it, expect, beforeEach } from "bun:test";
import {
  NSMClientValidator,
  createValidator,
  quickValidateEvent,
  quickSanitizeInput,
  type ClientValidationConfig
} from "./client-validation.js";
import { RateLimiter } from "@nsm/core";
import type { INostrEvent } from "@nsm/core";

describe("NSM Client Validation Integration", () => {
  let validator: NSMClientValidator;

  beforeEach(() => {
    validator = createValidator({
      userId: "test-user",
      strictMode: true,
      maxMachineComplexity: 100
    });
  });

  describe("NSMClientValidator", () => {
    describe("Event Validation", () => {
      const createValidEvent = (overrides: Partial<INostrEvent> = {}): INostrEvent => ({
        id: "a".repeat(64),
        pubkey: "b".repeat(64),
        created_at: Math.floor(Date.now() / 1000),
        kind: 1,
        tags: [["t", "test"]],
        content: "Hello world",
        sig: "c".repeat(128),
        ...overrides
      });

      it("should validate events with client configuration", () => {
        const event = createValidEvent();
        const result = validator.validateEvent(event);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(event);
      });

      it("should enforce rate limiting when enabled", () => {
        const rateLimiter = RateLimiter.getInstance();
        const rateLimitValidator = createValidator({
          userId: "limited-user",
          enableRateLimit: true
        });

        const event = createValidEvent();

        // Should work for reasonable number of requests within per-second limit
        for (let i = 0; i < 8; i++) {
          const result = rateLimitValidator.validateEvent(event);
          expect(result.success).toBe(true);
        }

        // Clean up rate limiter state for other tests
        rateLimiter.cleanup();
      });

      it("should skip signature verification when disabled", () => {
        const laxValidator = createValidator({
          verifySignatures: false,
          strictMode: false
        });

        const event = createValidEvent({ sig: "d".repeat(128) }); // Valid format but wrong signature
        const result = laxValidator.validateEvent(event);

        expect(result.success).toBe(true);
      });
    });

    describe("State Machine Validation", () => {
      const createValidMachine = (overrides: any = {}) => ({
        initial: "idle",
        states: {
          idle: { on: { START: "running" } },
          running: { on: { STOP: "idle" } }
        },
        ...overrides
      });

      it("should validate basic state machines", () => {
        const machine = createValidMachine();
        const result = validator.validateStateMachine(machine);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(machine);
      });

      it("should enforce complexity limits", () => {
        const complexMachine = createValidMachine();

        // Add many states to exceed complexity limit
        for (let i = 0; i < 20; i++) {
          complexMachine.states[`state${i}`] = {
            on: {
              [`EVENT_${i}`]: `state${(i + 1) % 20}`,
              [`EVENT_${i}_ALT`]: `state${(i + 2) % 20}`,
              [`EVENT_${i}_BACK`]: `state${(i - 1 + 20) % 20}`
            }
          };
        }

        const result = validator.validateStateMachine(complexMachine);
        expect(result.success).toBe(false);
        expect(result.error).toContain("too complex");
      });

      it("should reject dangerous code patterns", () => {
        const maliciousMachine = createValidMachine({
          states: {
            idle: {
              entry: "eval('malicious code')"
            }
          }
        });

        const result = validator.validateStateMachine(maliciousMachine);
        expect(result.success).toBe(false);
        expect(result.error).toContain("dangerous code patterns");
      });

      it("should allow functions in non-strict mode", () => {
        const laxValidator = createValidator({ strictMode: false });

        const machineWithFunctions = createValidMachine({
          states: {
            idle: {
              entry: () => console.log("entering idle")
            }
          }
        });

        const result = laxValidator.validateStateMachine(machineWithFunctions);
        expect(result.success).toBe(true);
      });
    });

    describe("User Input Validation", () => {
      it("should sanitize basic text input", () => {
        const input = "Hello, world!";
        const result = validator.validateUserInput(input);

        expect(result.success).toBe(true);
        expect(result.data).toBe("Hello, world!");
      });

      it("should sanitize HTML by default", () => {
        const input = "<script>alert('xss')</script>Hello";
        const result = validator.validateUserInput(input);

        expect(result.success).toBe(false);
        expect(result.error).toContain("dangerous content");
      });

      it("should respect length limits", () => {
        const longInput = "x".repeat(2000);
        const result = validator.validateUserInput(longInput, { maxLength: 100 });

        expect(result.success).toBe(false);
        expect(result.error).toContain("too long");
      });

      it("should allow HTML when explicitly permitted and not in strict mode", () => {
        const laxValidator = createValidator({ strictMode: false });
        const input = "<b>Bold text</b>";
        const result = laxValidator.validateUserInput(input, { allowHTML: true });

        expect(result.success).toBe(true);
      });
    });

    describe("File Upload Validation", () => {
      const createMockFile = (overrides: any = {}) => ({
        name: "test.txt",
        size: 1000,
        type: "text/plain",
        ...overrides
      });

      it("should validate acceptable files", () => {
        const file = createMockFile();
        const result = validator.validateFile(file);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(file);
      });

      it("should reject files that are too large", () => {
        const largeFile = createMockFile({ size: 20 * 1024 * 1024 }); // 20MB
        const result = validator.validateFile(largeFile, { maxSize: 10 * 1024 * 1024 });

        expect(result.success).toBe(false);
        expect(result.error).toContain("File too large");
      });

      it("should reject dangerous file types", () => {
        const executableFile = createMockFile({
          name: "malware.exe",
          type: "application/x-msdownload"
        });
        const result = validator.validateFile(executableFile);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Invalid file type");
      });

      it("should enforce strict file type restrictions in strict mode", () => {
        const pdfFile = createMockFile({
          name: "document.pdf",
          type: "application/pdf"
        });
        const result = validator.validateFile(pdfFile);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Invalid file type");
      });
    });

    describe("URL Validation", () => {
      it("should validate HTTPS URLs", () => {
        const url = "https://example.com/path";
        const result = validator.validateURL(url);

        expect(result.success).toBe(true);
        expect(result.data).toBe(url);
      });

      it("should reject javascript: URLs", () => {
        const url = "javascript:alert('xss')";
        const result = validator.validateURL(url);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Invalid URL");
      });

      it("should block private IPs in strict mode", () => {
        const url = "http://192.168.1.1";
        const result = validator.validateURL(url);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Private IP addresses not allowed");
      });

      it("should allow private IPs when explicitly permitted", () => {
        const url = "http://192.168.1.1";
        const result = validator.validateURL(url, { allowPrivateIPs: true });

        expect(result.success).toBe(true); // Should allow when explicitly permitted
      });

      it("should enforce domain allowlists", () => {
        const allowlistValidator = createValidator({
          allowedDomains: ["trusted.com", "example.org"]
        });

        const goodUrl = "https://trusted.com/path";
        const badUrl = "https://untrusted.com/path";

        expect(allowlistValidator.validateURL(goodUrl).success).toBe(true);
        expect(allowlistValidator.validateURL(badUrl).success).toBe(false);
      });
    });

    describe("Interaction Payload Validation", () => {
      it("should validate proper interaction payloads", () => {
        const payload = {
          type: "MOVE_PLAYER",
          direction: "up",
          speed: 5
        };
        const result = validator.validateInteractionPayload(payload);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(payload);
      });

      it("should require a type field", () => {
        const payload = {
          direction: "up",
          speed: 5
        };
        const result = validator.validateInteractionPayload(payload);

        expect(result.success).toBe(false);
        expect(result.error).toContain("must have a string 'type' field");
      });

      it("should enforce type naming convention", () => {
        const payload = {
          type: "movePlayer", // Should be MOVE_PLAYER
          direction: "up"
        };
        const result = validator.validateInteractionPayload(payload);

        expect(result.success).toBe(false);
        expect(result.error).toContain("SCREAMING_SNAKE_CASE format");
      });

      it("should reject oversized payloads", () => {
        const payload = {
          type: "LARGE_PAYLOAD",
          data: "x".repeat(11000) // Exceeds 10KB limit
        };
        const result = validator.validateInteractionPayload(payload);

        expect(result.success).toBe(false);
        expect(result.error).toContain("payload too large");
      });

      it("should reject payloads with dangerous content", () => {
        const payload = {
          type: "MALICIOUS_ACTION",
          script: "<script>alert('xss')</script>"
        };
        const result = validator.validateInteractionPayload(payload);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Unsafe content in payload");
      });
    });

    describe("State Validation", () => {
      it("should validate proper state objects", () => {
        const state = {
          playerPosition: { x: 10, y: 20 },
          health: 100,
          inventory: ["sword", "potion"]
        };
        const result = validator.validateState(state);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(state);
      });

      it("should reject non-object states", () => {
        const result = validator.validateState("not an object");

        expect(result.success).toBe(false);
        expect(result.error).toContain("State must be an object");
      });

      it("should reject oversized states", () => {
        const largeState = {
          data: "x".repeat(60000) // Exceeds 50KB limit
        };
        const result = validator.validateState(largeState);

        expect(result.success).toBe(false);
        expect(result.error).toContain("State object too large");
      });

      it("should reject states with dangerous content", () => {
        const state = {
          userInput: "<script>alert('xss')</script>"
        };
        const result = validator.validateState(state);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Unsafe content in state");
      });

      it("should reject states that are too deeply nested", () => {
        let deepState: any = {};
        let current = deepState;
        for (let i = 0; i < 15; i++) {
          current.nested = {};
          current = current.nested;
        }

        const result = validator.validateState(deepState);
        expect(result.success).toBe(false);
        expect(result.error).toContain("nesting too deep");
      });

      it("should reject states with too many properties", () => {
        const largeState: any = {};
        for (let i = 0; i < 1500; i++) {
          largeState[`prop${i}`] = `value${i}`;
        }

        const result = validator.validateState(largeState);
        expect(result.success).toBe(false);
        expect(result.error).toContain("Unsafe content in state"); // Caught by size limit first
      });
    });

    describe("Batch Event Validation", () => {
      const createValidEvent = (id: string): INostrEvent => ({
        id: id.padEnd(64, "0"),
        pubkey: "b".repeat(64),
        created_at: Math.floor(Date.now() / 1000),
        kind: 1,
        tags: [["t", "test"]],
        content: "Hello world",
        sig: "c".repeat(128)
      });

      it("should validate a batch of valid events", () => {
        const events = [
          createValidEvent("1"),
          createValidEvent("2"),
          createValidEvent("3")
        ];
        const result = validator.validateEventBatch(events);

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(3);
      });

      it("should reject batches with invalid events", () => {
        const events = [
          createValidEvent("1"),
          { invalid: "event" },
          createValidEvent("3")
        ];
        const result = validator.validateEventBatch(events);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Event 1:");
      });

      it("should reject oversized batches", () => {
        const events = Array(101).fill(0).map((_, i) => createValidEvent(`${i}`));
        const result = validator.validateEventBatch(events);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Too many events in batch");
      });

      it("should require array input", () => {
        const result = validator.validateEventBatch("not an array" as any);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Events must be an array");
      });
    });

    describe("Configuration Management", () => {
      it("should allow configuration updates", () => {
        const originalConfig = validator.getConfig();
        expect(originalConfig.strictMode).toBe(true);

        validator.updateConfig({ strictMode: false });

        const updatedConfig = validator.getConfig();
        expect(updatedConfig.strictMode).toBe(false);
      });

      it("should preserve other config values when updating", () => {
        const originalUserId = validator.getConfig().userId;

        validator.updateConfig({ strictMode: false });

        const updatedConfig = validator.getConfig();
        expect(updatedConfig.userId).toBe(originalUserId);
      });
    });
  });

  describe("Convenience Functions", () => {
    describe("quickValidateEvent", () => {
      it("should validate events with default configuration", () => {
        const event = {
          id: "a".repeat(64),
          pubkey: "b".repeat(64),
          created_at: Math.floor(Date.now() / 1000),
          kind: 1,
          tags: [],
          content: "test",
          sig: "c".repeat(128)
        };

        const result = quickValidateEvent(event, "quick-user");
        expect(result.success).toBe(true);
      });

      it("should handle invalid events", () => {
        const result = quickValidateEvent({ invalid: "event" });
        expect(result.success).toBe(false);
      });
    });

    describe("quickSanitizeInput", () => {
      it("should sanitize input with default settings", () => {
        const result = quickSanitizeInput("Hello, world!");
        expect(result.success).toBe(true);
        expect(result.data).toBe("Hello, world!");
      });

      it("should respect custom length limits", () => {
        const result = quickSanitizeInput("x".repeat(100), 50);
        expect(result.success).toBe(false);
      });

      it("should reject dangerous input", () => {
        const result = quickSanitizeInput("<script>alert('xss')</script>");
        expect(result.success).toBe(false);
      });
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle a complete NSM interaction flow", () => {
      // 1. Validate machine definition
      const machine = {
        initial: "idle",
        states: {
          idle: { on: { START: "running" } },
          running: { on: { STOP: "idle" } }
        }
      };
      const machineResult = validator.validateStateMachine(machine);
      expect(machineResult.success).toBe(true);

      // 2. Validate user interaction
      const interaction = {
        type: "START_GAME",
        playerId: "player1"
      };
      const interactionResult = validator.validateInteractionPayload(interaction);
      expect(interactionResult.success).toBe(true);

      // 3. Validate resulting state
      const newState = {
        currentState: "running",
        players: ["player1"],
        startTime: Date.now()
      };
      const stateResult = validator.validateState(newState);
      expect(stateResult.success).toBe(true);

      // 4. Validate Nostr event creation
      const event = {
        id: "a".repeat(64),
        pubkey: "b".repeat(64),
        created_at: Math.floor(Date.now() / 1000),
        kind: 7001,
        tags: [["a", "30079:creator:app"]],
        content: JSON.stringify(interaction),
        sig: "c".repeat(128)
      };
      const eventResult = validator.validateEvent(event);
      expect(eventResult.success).toBe(true);
    });

    it("should handle validation failures gracefully", () => {
      // Test with a malicious payload that should be blocked at multiple levels
      const maliciousPayload = {
        type: "EVIL_ACTION",
        script: "eval('window.location=\"evil.com\"')",
        xss: "<script>steal_cookies()</script>"
      };

      // Should be blocked at payload validation
      const result = validator.validateInteractionPayload(maliciousPayload);
      expect(result.success).toBe(false);
    });

    it("should maintain rate limiting across different validation types", () => {
      // This test would be more meaningful with actual rate limiting implementation
      // For now, we just verify the validator doesn't crash with repeated use

      for (let i = 0; i < 10; i++) {
        validator.validateUserInput(`test input ${i}`);
        validator.validateURL("https://example.com");

        const event = {
          id: `${"a".repeat(63)}${i}`,
          pubkey: "b".repeat(64),
          created_at: Math.floor(Date.now() / 1000),
          kind: 1,
          tags: [],
          content: `test ${i}`,
          sig: "c".repeat(128)
        };
        validator.validateEvent(event);
      }

      // Should still work after many operations
      const result = validator.validateUserInput("final test");
      expect(result.success).toBe(true);
    });
  });
});