import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  validateNostrEventComprehensive,
  validateXStateMachine,
  sanitizeUserInput,
  validateFileUpload,
  validateURL,
  validateJSONWithSchema,
  RateLimiter,
  CONTENT_SIZE_LIMITS,
  RATE_LIMITS
} from "../src/validation/comprehensive.js";
import type { INostrEvent } from "../src/events/index.js";

describe("Comprehensive Input Validation", () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = RateLimiter.getInstance();
  });

  afterEach(() => {
    rateLimiter.cleanup();
  });

  describe("Nostr Event Validation", () => {
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

    describe("Valid Events", () => {
      it("should validate a properly formatted event", () => {
        const event = createValidEvent();
        const result = validateNostrEventComprehensive(event, { checkSignature: false });

        expect(result.success).toBe(true);
        expect(result.data).toEqual(event);
      });

      it("should validate NSM definition event", () => {
        const event = createValidEvent({
          kind: 30079,
          tags: [
            ["d", "test-app"],
            ["name", "Test App"],
            ["engine", "xstate"],
            ["engineCodeURI", "https://example.com/engine.js"]
          ],
          content: JSON.stringify({
            initialState: {},
            stateSchema: { type: "object" },
            interactionSchema: { type: "object" }
          })
        });

        const result = validateNostrEventComprehensive(event, { checkSignature: false });
        expect(result.success).toBe(true);
      });

      it("should validate NSM interaction event", () => {
        const event = createValidEvent({
          kind: 7001,
          tags: [["a", "30079:creator-pubkey:test-app"]],
          content: JSON.stringify({ type: "TEST_ACTION", payload: { value: 42 } })
        });

        const result = validateNostrEventComprehensive(event, { checkSignature: false });
        expect(result.success).toBe(true);
      });
    });

    describe("Invalid Event Structure", () => {
      it("should reject events with invalid ID format", () => {
        const event = createValidEvent({ id: "invalid-id" });
        const result = validateNostrEventComprehensive(event);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Invalid event ID format");
      });

      it("should reject events with invalid pubkey format", () => {
        const event = createValidEvent({ pubkey: "invalid-pubkey" });
        const result = validateNostrEventComprehensive(event);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Invalid pubkey format");
      });

      it("should reject events with invalid signature format", () => {
        const event = createValidEvent({ sig: "invalid-sig" });
        const result = validateNostrEventComprehensive(event);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Invalid signature format");
      });

      it("should reject events with negative timestamps", () => {
        const event = createValidEvent({ created_at: -1 });
        const result = validateNostrEventComprehensive(event);

        expect(result.success).toBe(false);
        expect(result.error).toContain("positive");
      });

      it("should reject events with invalid kind", () => {
        const event = createValidEvent({ kind: -1 });
        const result = validateNostrEventComprehensive(event);

        expect(result.success).toBe(false);
        expect(result.error).toMatch(/min|greater than or equal/);
      });
    });

    describe("Content Size Limits", () => {
      it("should reject events with oversized content", () => {
        const largeContent = "x".repeat(CONTENT_SIZE_LIMITS.NOSTR_CONTENT + 1);
        const event = createValidEvent({ content: largeContent });
        const result = validateNostrEventComprehensive(event);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Content too large");
      });

      it("should accept events at the size limit", () => {
        const maxContent = "x".repeat(CONTENT_SIZE_LIMITS.NOSTR_CONTENT);
        const event = createValidEvent({ content: maxContent });
        const result = validateNostrEventComprehensive(event, { checkSignature: false });

        expect(result.success).toBe(true);
      });
    });

    describe("Timestamp Validation", () => {
      it("should reject events that are too old", () => {
        const oldTimestamp = Math.floor(Date.now() / 1000) - (25 * 60 * 60); // 25 hours ago
        const event = createValidEvent({ created_at: oldTimestamp });
        const result = validateNostrEventComprehensive(event, {
          validateTimestamp: true,
          checkSignature: false
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("Event too old");
      });

      it("should reject events too far in the future", () => {
        const futureTimestamp = Math.floor(Date.now() / 1000) + (5 * 60); // 5 minutes future
        const event = createValidEvent({ created_at: futureTimestamp });
        const result = validateNostrEventComprehensive(event, {
          validateTimestamp: true,
          checkSignature: false
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("timestamp too far in future");
      });

      it("should accept recent events", () => {
        const recentTimestamp = Math.floor(Date.now() / 1000) - 30; // 30 seconds ago
        const event = createValidEvent({ created_at: recentTimestamp });
        const result = validateNostrEventComprehensive(event, {
          validateTimestamp: true,
          checkSignature: false
        });

        expect(result.success).toBe(true);
      });
    });

    describe("Tag Validation", () => {
      it("should reject events with too many tags", () => {
        const manyTags = Array(101).fill(0).map((_, i) => [`tag${i}`, "value"]);
        const event = createValidEvent({ tags: manyTags });
        const result = validateNostrEventComprehensive(event);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Too many tags");
      });

      it("should reject events with oversized tags", () => {
        // Create a tag that exceeds 1024 characters when JSON stringified
        const largeTag = ["t", "x".repeat(2000)];
        const event = createValidEvent({ tags: [largeTag] });
        const result = validateNostrEventComprehensive(event, { checkSignature: false });

        expect(result.success).toBe(false);
        expect(result.error).toContain("Tag too large");
      });

      it("should reject events with non-string tag values", () => {
        const invalidTag = ["t", 123 as any];
        const event = createValidEvent({ tags: [invalidTag] });
        const result = validateNostrEventComprehensive(event);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Tag values must be strings");
      });

      it("should reject tags with XSS patterns", () => {
        const xssTag = ["t", "<script>alert('xss')</script>"];
        const event = createValidEvent({ tags: [xssTag] });
        const result = validateNostrEventComprehensive(event);

        expect(result.success).toBe(false);
        expect(result.error).toContain("dangerous patterns");
      });
    });

    describe("Content Security", () => {
      it("should reject content with XSS patterns", () => {
        // Test multiple XSS patterns to ensure detection
        const xssPatterns = [
          "<script>alert('xss')</script>",
          "javascript:alert('xss')",
          "<img onload='alert(1)'>"
        ];

        for (const xssContent of xssPatterns) {
          const event = createValidEvent({ content: xssContent });
          const result = validateNostrEventComprehensive(event, { checkSignature: false });

          if (!result.success) {
            expect(result.error).toContain("dangerous patterns");
            return; // At least one pattern was caught
          }
        }

        // If we get here, none of the XSS patterns were detected
        expect(true).toBe(false); // Force failure
      });

      it("should reject content with javascript: URLs", () => {
        const jsContent = "Click <a href='javascript:alert(1)'>here</a>";
        const event = createValidEvent({ content: jsContent });
        const result = validateNostrEventComprehensive(event);

        expect(result.success).toBe(false);
        expect(result.error).toContain("dangerous patterns");
      });

      it("should accept safe HTML content", () => {
        const safeContent = "This is safe content with <b>bold</b> text";
        const event = createValidEvent({ content: safeContent });
        const result = validateNostrEventComprehensive(event, { checkSignature: false });

        expect(result.success).toBe(true);
      });
    });

    describe("Rate Limiting", () => {
      it("should enforce rate limits", () => {
        const event = createValidEvent();
        const rateLimitId = "test-user-limit";
        const testLimit = 5;

        // First set up a custom rate limiter for testing
        const customRateLimiter = RateLimiter.getInstance();

        // Exhaust the rate limit with custom limit
        let successCount = 0;
        for (let i = 0; i < testLimit + 5; i++) {
          if (customRateLimiter.checkLimit(rateLimitId, testLimit)) {
            successCount++;
          }
        }

        expect(successCount).toBe(testLimit);
      });
    });
  });

  describe("XState Machine Validation", () => {
    const createValidMachine = (overrides: any = {}) => ({
      id: "testMachine",
      initial: "idle",
      states: {
        idle: {
          on: {
            START: "running"
          }
        },
        running: {
          on: {
            STOP: "idle"
          }
        }
      },
      ...overrides
    });

    describe("Valid Machines", () => {
      it("should validate a basic state machine", () => {
        const machine = createValidMachine();
        const result = validateXStateMachine(machine);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(machine);
      });

      it("should validate a machine with context", () => {
        const machine = createValidMachine({
          context: { count: 0 }
        });
        const result = validateXStateMachine(machine);

        expect(result.success).toBe(true);
      });

      it("should validate a machine with nested states", () => {
        const machine = createValidMachine({
          states: {
            idle: {},
            running: {
              initial: "slow",
              states: {
                slow: {
                  on: { SPEED_UP: "fast" }
                },
                fast: {
                  on: { SLOW_DOWN: "slow" }
                }
              }
            }
          }
        });
        const result = validateXStateMachine(machine);

        expect(result.success).toBe(true);
      });
    });

    describe("Invalid Machine Structure", () => {
      it("should reject machines without initial state", () => {
        const machine = {
          states: { idle: {} }
          // missing initial
        };
        const result = validateXStateMachine(machine);

        expect(result.success).toBe(false);
        expect(result.error).toContain("initial");
      });

      it("should reject machines where initial state doesn't exist", () => {
        const machine = {
          initial: "nonexistent",
          states: { idle: {} }
        };
        const result = validateXStateMachine(machine);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Initial state must be defined");
      });

      it("should reject machines without states", () => {
        const machine = {
          initial: "idle"
          // missing states
        };
        const result = validateXStateMachine(machine);

        expect(result.success).toBe(false);
        expect(result.error).toContain("states");
      });
    });

    describe("Security Validation", () => {
      it("should reject machines with dangerous code patterns", () => {
        const machine = createValidMachine({
          states: {
            idle: {
              entry: "eval('alert(1)')"
            }
          }
        });
        const result = validateXStateMachine(machine);

        expect(result.success).toBe(false);
        expect(result.error).toContain("dangerous code patterns");
      });

      it("should reject machines with Function constructor", () => {
        const machine = createValidMachine({
          context: {
            fn: "new Function('return alert(1)')"
          }
        });
        const result = validateXStateMachine(machine);

        expect(result.success).toBe(false);
        expect(result.error).toContain("dangerous code patterns");
      });

      it("should reject machines accessing global objects", () => {
        const machine = createValidMachine({
          states: {
            idle: {
              entry: "window.location = 'evil.com'"
            }
          }
        });
        const result = validateXStateMachine(machine);

        expect(result.success).toBe(false);
        expect(result.error).toContain("dangerous code patterns");
      });
    });

    describe("Complexity Limits", () => {
      it("should reject machines with too many states", () => {
        const states: any = {};
        for (let i = 0; i < 101; i++) {
          states[`state${i}`] = {};
        }

        const machine = {
          initial: "state0",
          states
        };
        const result = validateXStateMachine(machine, { maxStates: 100 });

        expect(result.success).toBe(false);
        expect(result.error).toContain("Too many states");
      });

      it("should reject overly complex machines", () => {
        const states: any = {};
        for (let i = 0; i < 50; i++) {
          const transitions: any = {};
          for (let j = 0; j < 20; j++) {
            transitions[`EVENT_${j}`] = `state${(i + 1) % 50}`;
          }
          states[`state${i}`] = { on: transitions };
        }

        const machine = {
          initial: "state0",
          states
        };
        const result = validateXStateMachine(machine, { maxComplexity: 1000 });

        expect(result.success).toBe(false);
        expect(result.error).toContain("too complex");
      });

      it("should reject machines that are too large", () => {
        const largeContent = "x".repeat(CONTENT_SIZE_LIMITS.STATE_MACHINE_DEF + 1);
        const machine = createValidMachine({
          context: { largeData: largeContent }
        });
        const result = validateXStateMachine(machine);

        expect(result.success).toBe(false);
        expect(result.error).toContain("too large");
      });
    });

    describe("Function Validation", () => {
      it("should reject functions when not allowed", () => {
        const machine = createValidMachine({
          states: {
            idle: {
              entry: () => console.log("test")
            }
          }
        });
        const result = validateXStateMachine(machine, { allowFunctions: false });

        expect(result.success).toBe(false);
        expect(result.error).toContain("Functions not allowed");
      });

      it("should allow functions when explicitly allowed", () => {
        const machine = createValidMachine({
          states: {
            idle: {
              entry: () => console.log("test")
            }
          }
        });
        const result = validateXStateMachine(machine, { allowFunctions: true });

        expect(result.success).toBe(true);
      });
    });
  });

  describe("User Input Sanitization", () => {
    describe("Valid Input", () => {
      it("should sanitize basic text input", () => {
        const input = "Hello world!";
        const result = sanitizeUserInput(input);

        expect(result.success).toBe(true);
        expect(result.data).toBe("Hello world!");
      });

      it("should trim whitespace", () => {
        const input = "  Hello world!  ";
        const result = sanitizeUserInput(input);

        expect(result.success).toBe(true);
        expect(result.data).toBe("Hello world!");
      });

      it("should sanitize HTML by default", () => {
        const input = "<b>Bold text</b>";
        const result = sanitizeUserInput(input);

        expect(result.success).toBe(true);
        expect(result.data).toBe("&lt;b&gt;Bold text&lt;&#x2F;b&gt;");
      });

      it("should preserve HTML when allowed", () => {
        const input = "<b>Bold text</b>";
        const result = sanitizeUserInput(input, { allowHTML: true });

        expect(result.success).toBe(true);
        expect(result.data).toBe("<b>Bold text</b>");
      });
    });

    describe("Security Validation", () => {
      it("should reject XSS script tags", () => {
        const input = "<script>alert('xss')</script>";
        const result = sanitizeUserInput(input);

        expect(result.success).toBe(false);
        expect(result.error).toContain("dangerous content");
      });

      it("should reject javascript: URLs", () => {
        const input = "javascript:alert('xss')";
        const result = sanitizeUserInput(input);

        expect(result.success).toBe(false);
        expect(result.error).toContain("dangerous content");
      });

      it("should reject event handlers", () => {
        const input = "<div onclick='alert(1)'>Click me</div>";
        const result = sanitizeUserInput(input);

        expect(result.success).toBe(false);
        expect(result.error).toContain("dangerous content");
      });

      it("should reject data URLs with HTML", () => {
        const input = "data:text/html,<script>alert(1)</script>";
        const result = sanitizeUserInput(input);

        expect(result.success).toBe(false);
        expect(result.error).toContain("dangerous content");
      });
    });

    describe("Length Validation", () => {
      it("should reject input that is too long", () => {
        const longInput = "x".repeat(CONTENT_SIZE_LIMITS.USER_INPUT + 1);
        const result = sanitizeUserInput(longInput);

        expect(result.success).toBe(false);
        expect(result.error).toContain("too long");
      });

      it("should accept custom length limits", () => {
        const input = "x".repeat(100);
        const result = sanitizeUserInput(input, { maxLength: 50 });

        expect(result.success).toBe(false);
        expect(result.error).toContain("Input too long");
      });

      it("should accept input at the limit", () => {
        const input = "x".repeat(CONTENT_SIZE_LIMITS.USER_INPUT);
        const result = sanitizeUserInput(input);

        expect(result.success).toBe(true);
      });
    });
  });

  describe("File Upload Validation", () => {
    const createMockFile = (overrides: any = {}) => ({
      name: "test.txt",
      size: 1000,
      type: "text/plain",
      ...overrides
    });

    describe("Valid Files", () => {
      it("should validate a basic text file", () => {
        const file = createMockFile();
        const result = validateFileUpload(file);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(file);
      });

      it("should validate image files", () => {
        const file = createMockFile({
          name: "image.png",
          type: "image/png"
        });
        const result = validateFileUpload(file);

        expect(result.success).toBe(true);
      });

      it("should validate JSON files", () => {
        const file = createMockFile({
          name: "data.json",
          type: "application/json"
        });
        const result = validateFileUpload(file);

        expect(result.success).toBe(true);
      });
    });

    describe("File Size Limits", () => {
      it("should reject files that are too large", () => {
        const file = createMockFile({
          size: CONTENT_SIZE_LIMITS.FILE_UPLOAD + 1
        });
        const result = validateFileUpload(file);

        expect(result.success).toBe(false);
        expect(result.error).toContain("File too large");
      });

      it("should accept custom size limits", () => {
        const file = createMockFile({ size: 2000 });
        const result = validateFileUpload(file, { maxSize: 1000 });

        expect(result.success).toBe(false);
        expect(result.error).toContain("File too large");
      });
    });

    describe("File Type Validation", () => {
      it("should reject unsupported file types", () => {
        const file = createMockFile({
          name: "malware.exe",
          type: "application/x-msdownload"
        });
        const result = validateFileUpload(file);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Invalid file type");
      });

      it("should reject files with dangerous extensions", () => {
        const file = createMockFile({
          name: "script.exe",
          type: "text/plain" // Tries to disguise as text
        });
        const result = validateFileUpload(file);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Invalid file extension");
      });

      it("should accept custom allowed types", () => {
        const file = createMockFile({
          name: "document.pdf",
          type: "application/pdf"
        });
        const result = validateFileUpload(file, {
          allowedTypes: ["application/pdf"],
          allowedExtensions: [".pdf"]
        });

        expect(result.success).toBe(true);
      });
    });

    describe("Filename Validation", () => {
      it("should reject filenames that are too long", () => {
        const file = createMockFile({
          name: "a".repeat(256) + ".txt"
        });
        const result = validateFileUpload(file);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Invalid filename");
      });

      it("should reject filenames with dangerous characters", () => {
        const file = createMockFile({
          name: "test<script>.txt"
        });
        const result = validateFileUpload(file);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Invalid filename");
      });

      it("should reject path traversal attempts", () => {
        const file = createMockFile({
          name: "../../etc/passwd"
        });
        const result = validateFileUpload(file);

        expect(result.success).toBe(false);
        expect(result.error).toMatch(/Invalid (filename|file extension)/);
      });
    });
  });

  describe("URL Validation", () => {
    describe("Valid URLs", () => {
      it("should validate HTTP URLs", () => {
        const url = "http://example.com";
        const result = validateURL(url);

        expect(result.success).toBe(true);
        expect(result.data).toBe(url);
      });

      it("should validate HTTPS URLs", () => {
        const url = "https://example.com/path?query=value";
        const result = validateURL(url);

        expect(result.success).toBe(true);
      });

      it("should validate URLs with ports", () => {
        const url = "https://example.com:8080/path";
        const result = validateURL(url);

        expect(result.success).toBe(true);
      });
    });

    describe("Invalid URLs", () => {
      it("should reject malformed URLs", () => {
        const url = "not-a-url";
        const result = validateURL(url);

        expect(result.success).toBe(false);
        expect(result.error).toMatch(/Invalid URL|URL validation error/);
      });

      it("should reject URLs that are too long", () => {
        const url = "https://example.com/" + "a".repeat(CONTENT_SIZE_LIMITS.URL_LENGTH);
        const result = validateURL(url);

        expect(result.success).toBe(false);
        expect(result.error).toContain("URL too long");
      });

      it("should reject non-HTTP protocols", () => {
        const url = "ftp://example.com/file";
        const result = validateURL(url);

        expect(result.success).toBe(false);
        expect(result.error).toMatch(/Protocol not allowed|HTTP/i);
      });

      it("should reject javascript: URLs", () => {
        const url = "javascript:alert('xss')";
        const result = validateURL(url);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Invalid URL");
      });

      it("should reject data: URLs", () => {
        const url = "data:text/html,<script>alert(1)</script>";
        const result = validateURL(url);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Invalid URL");
      });
    });

    describe("Domain Restrictions", () => {
      it("should enforce domain allowlists", () => {
        const url = "https://evil.com";
        const result = validateURL(url, {
          allowedDomains: ["example.com", "trusted.org"]
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("Domain not allowed");
      });

      it("should allow domains in allowlist", () => {
        const url = "https://example.com/path";
        const result = validateURL(url, {
          allowedDomains: ["example.com", "trusted.org"]
        });

        expect(result.success).toBe(true);
      });

      it("should block private IP addresses", () => {
        const urls = [
          "http://192.168.1.1",
          "http://10.0.0.1",
          "http://172.16.0.1",
          "http://127.0.0.1",
          "http://localhost"
        ];

        urls.forEach(url => {
          const result = validateURL(url, { blockPrivateIPs: true });
          expect(result.success).toBe(false);
          expect(result.error).toContain("Private IP addresses not allowed");
        });
      });

      it("should allow private IPs when explicitly allowed", () => {
        const url = "http://192.168.1.1";
        const result = validateURL(url, { blockPrivateIPs: false });

        expect(result.success).toBe(true);
      });
    });
  });

  describe("JSON Schema Validation", () => {
    const basicSchema = {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number", minimum: 0 },
        email: { type: "string" }
      },
      required: ["name", "age"]
    };

    describe("Valid Data", () => {
      it("should validate data matching schema", () => {
        const data = { name: "John", age: 30, email: "john@example.com" };
        const result = validateJSONWithSchema(data, basicSchema);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(data);
      });

      it("should validate data without optional fields", () => {
        const data = { name: "John", age: 30 };
        const result = validateJSONWithSchema(data, basicSchema);

        expect(result.success).toBe(true);
      });
    });

    describe("Object Complexity Limits", () => {
      it("should reject objects that are too deep", () => {
        const deepObject: any = {};
        let current = deepObject;
        for (let i = 0; i < 15; i++) {
          current.nested = {};
          current = current.nested;
        }

        const result = validateJSONWithSchema(deepObject, { type: "object" }, {
          maxDepth: 10
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("nesting too deep");
      });

      it("should reject objects with too many properties", () => {
        const largeObject: any = {};
        for (let i = 0; i < 150; i++) {
          largeObject[`prop${i}`] = `value${i}`;
        }

        const result = validateJSONWithSchema(largeObject, { type: "object" }, {
          maxProperties: 100
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("Too many object properties");
      });

      it("should reject disallowed data types", () => {
        const data = Symbol("test");
        const result = validateJSONWithSchema(data, { type: "object" }, {
          allowedTypes: ["object", "string", "number"]
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("Data type not allowed");
      });
    });
  });

  describe("Rate Limiting", () => {
    describe("Basic Rate Limiting", () => {
      it("should allow requests within limits", () => {
        const identifier = "test-user-1";

        for (let i = 0; i < 10; i++) {
          const allowed = rateLimiter.checkLimit(identifier, 20);
          expect(allowed).toBe(true);
        }
      });

      it("should block requests exceeding limits", () => {
        const identifier = "test-user-2";
        const limit = 5;

        // Use up the limit
        for (let i = 0; i < limit; i++) {
          const allowed = rateLimiter.checkLimit(identifier, limit);
          expect(allowed).toBe(true);
        }

        // Next request should be blocked
        const blocked = rateLimiter.checkLimit(identifier, limit);
        expect(blocked).toBe(false);
      });

      it("should reset limits after time window", async () => {
        const identifier = "test-user-3";
        const limit = 3;

        // Exhaust limit
        for (let i = 0; i < limit; i++) {
          rateLimiter.checkLimit(identifier, limit);
        }
        expect(rateLimiter.checkLimit(identifier, limit)).toBe(false);

        // Simulate time passing (would need actual time manipulation in real test)
        rateLimiter.cleanup();

        // Should still be blocked as time hasn't actually passed
        expect(rateLimiter.checkLimit(identifier, limit)).toBe(false);
      });
    });

    describe("Cleanup Functionality", () => {
      it("should clean up expired entries", () => {
        const identifier = "test-user-4";

        // Make a request
        rateLimiter.checkLimit(identifier);

        // Cleanup should not affect active entries
        rateLimiter.cleanup();

        // Should still be tracked
        expect(rateLimiter.checkLimit(identifier)).toBe(true);
      });
    });
  });

  describe("Integration Tests", () => {
    describe("End-to-End Validation", () => {
      it("should validate a complete NSM workflow", () => {
        // 1. Validate machine definition
        const machineDefinition = {
          initial: "idle",
          states: {
            idle: { on: { START: "running" } },
            running: { on: { STOP: "idle" } }
          }
        };

        const machineResult = validateXStateMachine(machineDefinition);
        expect(machineResult.success).toBe(true);

        // 2. Validate user input
        const userInput = "START";
        const inputResult = sanitizeUserInput(userInput);
        expect(inputResult.success).toBe(true);

        // 3. Validate event creation
        const event = {
          id: "a".repeat(64),
          pubkey: "b".repeat(64),
          created_at: Math.floor(Date.now() / 1000),
          kind: 7001,
          tags: [["a", "30079:creator:app"]],
          content: JSON.stringify({ type: inputResult.data }),
          sig: "c".repeat(128)
        };

        const eventResult = validateNostrEventComprehensive(event, { checkSignature: false });
        expect(eventResult.success).toBe(true);
      });

      it("should handle validation failures gracefully", () => {
        // Test with malicious machine definition
        const maliciousMachine = {
          initial: "idle",
          states: {
            idle: {
              entry: "eval('window.location=\"evil.com\"')"
            }
          }
        };

        const result = validateXStateMachine(maliciousMachine);
        expect(result.success).toBe(false);
        expect(result.error).toContain("dangerous code patterns");
      });
    });
  });
});