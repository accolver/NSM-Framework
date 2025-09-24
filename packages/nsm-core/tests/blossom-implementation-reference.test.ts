import { describe, it, expect } from "bun:test";
import type {
  BlossomImplementationReference,
  NSMDefinitionContent,
  MachineConfig
} from "../src/events/nsm-definition.js";
import { validateNSMDefinitionEvent, createNSMDefinitionEvent } from "../src/events/nsm-definition.js";

describe("Blossom Implementation Reference Integration", () => {
  describe("BlossomImplementationReference Interface", () => {
    it("should define correct structure for implementation references", () => {
      // This test will fail until we implement BlossomImplementationReference
      const implementationRef: BlossomImplementationReference = {
        hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        uri: "blossom://server1.example.com/e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        contentType: "application/x-nsm-implementation",
        size: 1024,
        integrity: {
          algorithm: "sha256",
          hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          verifiedAt: Date.now()
        },
        metadata: {
          functions: ["loginAction", "validateGuard", "timerService"],
          version: "1.0.0",
          dependencies: ["lodash@4.17.21"]
        }
      };

      expect(implementationRef.hash).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
      expect(implementationRef.contentType).toBe("application/x-nsm-implementation");
      expect(implementationRef.integrity.algorithm).toBe("sha256");
      expect(implementationRef.metadata.functions).toContain("loginAction");
    });

    it("should support minimal implementation reference", () => {
      // Test minimal required fields for BlossomImplementationReference
      const minimalRef: BlossomImplementationReference = {
        hash: "abc123",
        uri: "blossom://server.example.com/abc123",
        contentType: "application/x-nsm-implementation"
      };

      expect(minimalRef.hash).toBe("abc123");
      expect(minimalRef.uri).toBe("blossom://server.example.com/abc123");
      expect(minimalRef.contentType).toBe("application/x-nsm-implementation");
    });
  });

  describe("Enhanced NSMDefinitionContent with Implementations", () => {
    it("should support implementations field in NSMDefinitionContent", () => {
      // This test will fail until we add implementations field to NSMDefinitionContent
      const content: NSMDefinitionContent = {
        machineConfig: {
          id: "testMachine",
          initial: "idle",
          states: {
            idle: {},
            active: {}
          }
        },
        stateSchema: {
          type: "object",
          properties: { status: { type: "string" } }
        },
        interactionSchema: {
          type: "object",
          properties: { type: { type: "string" } }
        },
        // This should not cause TypeScript error when implementations field is added
        implementations: {
          hash: "def456",
          uri: "blossom://server.example.com/def456",
          contentType: "application/x-nsm-implementation",
          integrity: {
            algorithm: "sha256",
            hash: "def456",
            verifiedAt: Date.now()
          }
        }
      };

      expect(content.implementations).toBeDefined();
      expect(content.implementations?.hash).toBe("def456");
      expect(content.implementations?.contentType).toBe("application/x-nsm-implementation");
    });

    it("should validate NSM Definition event with Blossom implementations", () => {
      // This test will fail until validation supports Blossom implementation references
      const eventWithImplementations = {
        id: "test-id",
        pubkey: "test-pubkey",
        created_at: Math.floor(Date.now() / 1000),
        kind: 30079,
        tags: [
          ["d", "test-app"],
          ["name", "Test Application"],
          ["engine", "xstate@5"],
          ["engineCodeURI", "https://example.com/xstate.js"]
        ],
        content: JSON.stringify({
          machineConfig: {
            id: "testMachine",
            initial: "idle",
            states: {
              idle: {
                on: { START: "active" }
              },
              active: {
                on: { STOP: "idle" }
              }
            },
            version: "v5",
            setup: {
              actions: {
                logStart: "ref:blossom:abc123"  // Reference to Blossom-stored implementation
              },
              guards: {
                isAuthorized: "ref:blossom:def456"  // Reference to Blossom-stored implementation
              }
            }
          },
          stateSchema: {
            type: "object",
            properties: { status: { type: "string" } }
          },
          interactionSchema: {
            type: "object",
            properties: { type: { type: "string" } }
          },
          implementations: {
            hash: "bundle789",
            uri: "blossom://server.example.com/bundle789",
            contentType: "application/x-nsm-implementation",
            size: 2048,
            integrity: {
              algorithm: "sha256",
              hash: "bundle789",
              verifiedAt: Date.now()
            },
            metadata: {
              functions: ["logStart", "isAuthorized"],
              version: "1.0.0",
              bundledAt: Date.now()
            }
          }
        }),
        sig: "test-signature"
      };

      const result = validateNSMDefinitionEvent(eventWithImplementations);
      expect(result.success).toBe(true);

      if (result.success) {
        const content = JSON.parse(result.data.content);
        expect(content.implementations).toBeDefined();
        expect(content.implementations.hash).toBe("bundle789");
        expect(content.machineConfig.setup.actions.logStart).toBe("ref:blossom:abc123");
      }
    });

    it("should support mixed inline and Blossom implementations", () => {
      // Test that some implementations can be inline while others reference Blossom
      const mixedContent: NSMDefinitionContent = {
        machineConfig: {
          id: "mixedMachine",
          initial: "start",
          states: {
            start: {},
            end: {}
          },
          version: "v5",
          setup: {
            actions: {
              // Inline implementation (simple function)
              simpleLog: "() => console.log('simple')",
              // Blossom reference for complex implementation
              complexAction: "ref:blossom:complex123"
            },
            guards: {
              // Inline guard
              alwaysTrue: "() => true",
              // Blossom reference for complex guard
              authGuard: "ref:blossom:auth456"
            }
          }
        },
        stateSchema: {
          type: "object",
          properties: { mixed: { type: "boolean" } }
        },
        interactionSchema: {
          type: "object",
          properties: { type: { type: "string" } }
        },
        implementations: {
          hash: "mixed789",
          uri: "blossom://server.example.com/mixed789",
          contentType: "application/x-nsm-implementation",
          metadata: {
            functions: ["complexAction", "authGuard"],
            inlineFunctions: ["simpleLog", "alwaysTrue"]
          }
        }
      };

      expect(mixedContent.machineConfig.setup?.actions?.simpleLog).toBe("() => console.log('simple')");
      expect(mixedContent.machineConfig.setup?.actions?.complexAction).toBe("ref:blossom:complex123");
      expect(mixedContent.implementations?.metadata?.functions).toContain("complexAction");
      expect(mixedContent.implementations?.metadata?.inlineFunctions).toContain("simpleLog");
    });

    it("should maintain backward compatibility with existing events", () => {
      // Existing events without implementations field should still validate
      const legacyContent: NSMDefinitionContent = {
        machineConfig: {
          id: "legacyMachine",
          initial: "idle",
          states: {
            idle: {},
            active: {}
          }
        },
        stateSchema: {
          type: "object",
          properties: { legacy: { type: "boolean" } }
        },
        interactionSchema: {
          type: "object",
          properties: { type: { type: "string" } }
        }
        // No implementations field - should still be valid
      };

      const legacyEvent = {
        id: "legacy-id",
        pubkey: "legacy-pubkey",
        created_at: Math.floor(Date.now() / 1000),
        kind: 30079,
        tags: [
          ["d", "legacy-app"],
          ["name", "Legacy App"],
          ["engine", "xstate"],
          ["engineCodeURI", "https://example.com/legacy.js"]
        ],
        content: JSON.stringify(legacyContent),
        sig: "legacy-signature"
      };

      const result = validateNSMDefinitionEvent(legacyEvent);
      expect(result.success).toBe(true);
    });
  });

  describe("XState v5 Setup Configuration with Blossom References", () => {
    it("should support Blossom references in XState v5 setup config", () => {
      // Test that XStateV5SetupConfig supports Blossom references
      const machineWithBlossomRefs: MachineConfig = {
        id: "blossomMachine",
        initial: "idle",
        states: {
          idle: {
            on: { START: "active" }
          },
          active: {
            on: { STOP: "idle" }
          }
        },
        version: "v5",
        setup: {
          types: {
            events: {
              START: {},
              STOP: {}
            }
          },
          actions: {
            // These should reference Blossom-stored implementations
            onStart: "ref:blossom:start123",
            onStop: "ref:blossom:stop456"
          },
          guards: {
            canStart: "ref:blossom:guard789",
            canStop: "ref:blossom:guard012"
          },
          actors: {
            timerActor: "ref:blossom:timer345"
          }
        }
      };

      expect(machineWithBlossomRefs.setup?.actions?.onStart).toBe("ref:blossom:start123");
      expect(machineWithBlossomRefs.setup?.guards?.canStart).toBe("ref:blossom:guard789");
      expect(machineWithBlossomRefs.setup?.actors?.timerActor).toBe("ref:blossom:timer345");
    });
  });
});