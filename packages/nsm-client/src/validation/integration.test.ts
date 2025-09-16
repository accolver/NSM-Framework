import { describe, it, expect } from "bun:test";
import {
  validateNostrEventComprehensive,
  sanitizeUserInput,
  type ValidationResult,
  type INostrEvent
} from "@nsm/core";

describe("NSM Validation Integration", () => {
  describe("Basic Integration", () => {
    it("should import validation functions correctly", () => {
      expect(typeof validateNostrEventComprehensive).toBe("function");
      expect(typeof sanitizeUserInput).toBe("function");
    });

    it("should validate a basic Nostr event", () => {
      const event: INostrEvent = {
        id: "a".repeat(64),
        pubkey: "b".repeat(64),
        created_at: Math.floor(Date.now() / 1000),
        kind: 1,
        tags: [["t", "test"]],
        content: "Hello world",
        sig: "c".repeat(128)
      };

      const result = validateNostrEventComprehensive(event, { checkSignature: false });
      expect(result.success).toBe(true);
    });

    it("should sanitize user input", () => {
      const input = "Hello, world!";
      const result = sanitizeUserInput(input);

      expect(result.success).toBe(true);
      expect(result.data).toBe("Hello, world!");
    });

    it("should reject dangerous input", () => {
      const dangerousInput = "<script>alert('xss')</script>";
      const result = sanitizeUserInput(dangerousInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain("dangerous content");
    });
  });
});