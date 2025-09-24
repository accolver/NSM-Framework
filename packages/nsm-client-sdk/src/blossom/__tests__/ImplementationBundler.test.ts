import { describe, it, expect } from "bun:test";
import { ImplementationBundler } from "../ImplementationBundler";
import type { ImplementationBundle, ExtractedImplementations } from "../ImplementationBundler";

describe("ImplementationBundler", () => {
  describe("Class Instantiation", () => {
    it("should create ImplementationBundler instance with default options", () => {
      // This test will fail until ImplementationBundler class is implemented
      const bundler = new ImplementationBundler();
      expect(bundler).toBeInstanceOf(ImplementationBundler);
    });

    it("should create ImplementationBundler with custom options", () => {
      const options = {
        minify: true,
        includeSourceMaps: true,
        targetVersion: "v5" as const
      };
      const bundler = new ImplementationBundler(options);
      expect(bundler).toBeInstanceOf(ImplementationBundler);
    });

    it("should have default configuration options", () => {
      const bundler = new ImplementationBundler();
      const config = bundler.getConfig();

      expect(config.minify).toBe(false);
      expect(config.includeSourceMaps).toBe(true);
      expect(config.targetVersion).toBe("v5");
      expect(config.validateFunctions).toBe(false);
    });
  });

  describe("Function Extraction from XState Machines", () => {
    it("should extract actions from XState v5 machine configuration", () => {
      // This test will fail until extractImplementations method is implemented
      const bundler = new ImplementationBundler();

      const machineConfig = {
        id: "testMachine",
        initial: "idle",
        states: {
          idle: {
            on: {
              START: {
                target: "active",
                actions: ["logStart", "notifyUser"]
              }
            }
          },
          active: {
            on: { STOP: "idle" },
            entry: ["trackEntry"],
            exit: ["cleanup"]
          }
        },
        setup: {
          actions: {
            logStart: "(context, event) => console.log('Starting:', event)",
            notifyUser: "() => alert('Started!')",
            trackEntry: "assign({ startTime: Date.now() })",
            cleanup: "() => console.log('Cleaning up')"
          },
          guards: {
            isAuthorized: "(context) => context.user?.authorized === true",
            canProceed: "(context, event) => event.valid && context.ready"
          },
          actors: {
            timerService: "fromPromise(() => new Promise(resolve => setTimeout(resolve, 1000)))"
          }
        }
      };

      const result: ExtractedImplementations = bundler.extractImplementations(machineConfig);

      expect(result.actions).toHaveProperty("logStart");
      expect(result.actions).toHaveProperty("notifyUser");
      expect(result.actions).toHaveProperty("trackEntry");
      expect(result.actions).toHaveProperty("cleanup");
      expect(result.guards).toHaveProperty("isAuthorized");
      expect(result.guards).toHaveProperty("canProceed");
      expect(result.actors).toHaveProperty("timerService");
    });

    it("should handle mixed inline and reference implementations", () => {
      const bundler = new ImplementationBundler();

      const mixedMachineConfig = {
        id: "mixedMachine",
        initial: "start",
        states: {
          start: { on: { NEXT: "end" } },
          end: {}
        },
        setup: {
          actions: {
            // Inline implementation
            simpleLog: "() => console.log('simple')",
            // Blossom reference (should be skipped from extraction)
            complexAction: "ref:blossom:abc123"
          },
          guards: {
            // Inline guard
            alwaysTrue: "() => true",
            // Blossom reference
            authGuard: "ref:blossom:def456"
          }
        }
      };

      const result: ExtractedImplementations = bundler.extractImplementations(mixedMachineConfig);

      // Should only extract inline implementations
      expect(result.actions).toHaveProperty("simpleLog");
      expect(result.actions).not.toHaveProperty("complexAction");
      expect(result.guards).toHaveProperty("alwaysTrue");
      expect(result.guards).not.toHaveProperty("authGuard");

      expect(result.skippedReferences.actions).toContain("complexAction");
      expect(result.skippedReferences.guards).toContain("authGuard");
    });

    it("should validate function syntax during extraction", () => {
      const bundler = new ImplementationBundler({ validateFunctions: true });

      const invalidMachineConfig = {
        id: "invalidMachine",
        initial: "idle",
        states: { idle: {} },
        setup: {
          actions: {
            validAction: "() => console.log('valid')",
            invalidAction: "(() => { invalid syntax })"  // Syntax error
          }
        }
      };

      expect(() => {
        bundler.extractImplementations(invalidMachineConfig);
      }).toThrow("Function validation failed for action 'invalidAction'");
    });

    it("should preserve TypeScript type annotations in functions", () => {
      const bundler = new ImplementationBundler({ preserveTypes: true });

      const typedMachineConfig = {
        id: "typedMachine",
        initial: "idle",
        states: { idle: {} },
        setup: {
          actions: {
            typedAction: "(context: { count: number }, event: { type: 'INCREMENT' }) => { context.count++; }"
          },
          guards: {
            typedGuard: "(context: { user?: User }, event: CustomEvent): boolean => context.user?.isActive === true"
          }
        }
      };

      const result: ExtractedImplementations = bundler.extractImplementations(typedMachineConfig);

      expect(result.actions.typedAction.source).toContain("context: { count: number }");
      expect(result.guards.typedGuard.source).toContain("context: { user?: User }");
      expect(result.guards.typedGuard.source).toContain("): boolean =>");
    });
  });

  describe("Bundle Creation", () => {
    it("should create implementation bundle with metadata", () => {
      // This test will fail until createBundle method is implemented
      const bundler = new ImplementationBundler();

      const implementations: ExtractedImplementations = {
        actions: {
          logStart: {
            name: "logStart",
            source: "(context, event) => console.log('Starting:', event)",
            type: "action"
          }
        },
        guards: {
          isReady: {
            name: "isReady",
            source: "(context) => context.ready === true",
            type: "guard"
          }
        },
        actors: {},
        skippedReferences: { actions: [], guards: [], actors: [] }
      };

      const bundle: ImplementationBundle = bundler.createBundle(implementations, {
        version: "1.0.0",
        dependencies: ["xstate@5.19.0"]
      });

      expect(bundle.version).toBe("1.0.0");
      expect(bundle.contentType).toBe("application/x-nsm-implementation");
      expect(bundle.functions).toHaveProperty("logStart");
      expect(bundle.functions).toHaveProperty("isReady");
      expect(bundle.metadata.functionCount).toBe(2);
      expect(bundle.metadata.dependencies).toContain("xstate@5.19.0");
      expect(bundle.hash).toBeDefined();
      expect(bundle.hash).toMatch(/^[a-f0-9]{64}$/); // SHA256 hash format
    });

    it("should minify bundle content when minify option is true", () => {
      const bundler = new ImplementationBundler({ minify: true });

      const implementations: ExtractedImplementations = {
        actions: {
          verbose: {
            name: "verbose",
            source: `(context, event) => {
              // This is a verbose function
              const result = context.data + event.value;
              console.log('Processing:', result);
              return result;
            }`,
            type: "action"
          }
        },
        guards: {},
        actors: {},
        skippedReferences: { actions: [], guards: [], actors: [] }
      };

      const bundle: ImplementationBundle = bundler.createBundle(implementations);
      const minifiedCode = bundle.functions.verbose.source;

      // Minified code should not contain comments or extra whitespace
      expect(minifiedCode).not.toContain("// This is a verbose function");
      expect(minifiedCode).not.toContain("\n");
      expect(minifiedCode.length).toBeLessThan(implementations.actions.verbose.source.length);
    });

    it("should include source maps when option is enabled", () => {
      const bundler = new ImplementationBundler({ includeSourceMaps: true });

      const implementations: ExtractedImplementations = {
        actions: {
          testAction: {
            name: "testAction",
            source: "(context) => context.value++",
            type: "action"
          }
        },
        guards: {},
        actors: {},
        skippedReferences: { actions: [], guards: [], actors: [] }
      };

      const bundle: ImplementationBundle = bundler.createBundle(implementations);

      expect(bundle.sourceMaps).toBeDefined();
      expect(bundle.sourceMaps?.testAction).toBeDefined();
      expect(bundle.sourceMaps?.testAction.originalSource).toBe("(context) => context.value++");
    });

    it("should generate deterministic hashes for identical content", () => {
      const bundler1 = new ImplementationBundler();
      const bundler2 = new ImplementationBundler();

      const implementations: ExtractedImplementations = {
        actions: {
          test: {
            name: "test",
            source: "() => console.log('test')",
            type: "action"
          }
        },
        guards: {},
        actors: {},
        skippedReferences: { actions: [], guards: [], actors: [] }
      };

      const bundle1 = bundler1.createBundle(implementations);
      const bundle2 = bundler2.createBundle(implementations);

      expect(bundle1.hash).toBe(bundle2.hash);
    });
  });

  describe("Bundle Serialization", () => {
    it("should serialize bundle to JSON string", () => {
      // This test will fail until serializeBundle method is implemented
      const bundler = new ImplementationBundler();

      const implementations: ExtractedImplementations = {
        actions: {
          serialize: {
            name: "serialize",
            source: "() => 'serialized'",
            type: "action"
          }
        },
        guards: {},
        actors: {},
        skippedReferences: { actions: [], guards: [], actors: [] }
      };

      const bundle = bundler.createBundle(implementations);
      const serialized: string = bundler.serializeBundle(bundle);

      expect(typeof serialized).toBe("string");
      const parsed = JSON.parse(serialized);
      expect(parsed.version).toBe(bundle.version);
      expect(parsed.functions).toHaveProperty("serialize");
      expect(parsed.hash).toBe(bundle.hash);
    });

    it("should deserialize bundle from JSON string", () => {
      const bundler = new ImplementationBundler();

      const originalImplementations: ExtractedImplementations = {
        actions: {
          deserialize: {
            name: "deserialize",
            source: "() => 'deserialized'",
            type: "action"
          }
        },
        guards: {},
        actors: {},
        skippedReferences: { actions: [], guards: [], actors: [] }
      };

      const originalBundle = bundler.createBundle(originalImplementations);
      const serialized = bundler.serializeBundle(originalBundle);
      const deserialized: ImplementationBundle = bundler.deserializeBundle(serialized);

      expect(deserialized.hash).toBe(originalBundle.hash);
      expect(deserialized.functions.deserialize.source).toBe("() => 'deserialized'");
      expect(deserialized.metadata.functionCount).toBe(1);
    });

    it("should validate bundle integrity during deserialization", () => {
      const bundler = new ImplementationBundler();

      const corruptedBundle = JSON.stringify({
        version: "1.0.0",
        hash: "invalid-hash",
        functions: { test: { source: "() => 'test'" } },
        metadata: { functionCount: 1 }
      });

      expect(() => {
        bundler.deserializeBundle(corruptedBundle);
      }).toThrow("Bundle integrity verification failed");
    });
  });

  describe("TypeScript Compilation Support", () => {
    it("should compile TypeScript functions to JavaScript", () => {
      // This test will fail until compileToJavaScript method is implemented
      const bundler = new ImplementationBundler({ compileTypeScript: true });

      const tsImplementations: ExtractedImplementations = {
        actions: {
          tsAction: {
            name: "tsAction",
            source: `(context: { count: number }, event: { value: number }): void => {
              context.count += event.value;
            }`,
            type: "action"
          }
        },
        guards: {},
        actors: {},
        skippedReferences: { actions: [], guards: [], actors: [] }
      };

      const compiled = bundler.compileToJavaScript(tsImplementations);

      expect(compiled.actions.tsAction.source).not.toContain(": { count: number }");
      expect(compiled.actions.tsAction.source).not.toContain(": { value: number }");
      expect(compiled.actions.tsAction.source).not.toContain("): void =>");
      expect(compiled.actions.tsAction.compiledFromTypeScript).toBe(true);
    });

    it("should preserve original TypeScript source in metadata", () => {
      const bundler = new ImplementationBundler({
        compileTypeScript: true,
        preserveOriginalSource: true
      });

      const tsImplementations: ExtractedImplementations = {
        guards: {
          tsGuard: {
            name: "tsGuard",
            source: "(context: AppContext): boolean => context.isValid",
            type: "guard"
          }
        },
        actions: {},
        actors: {},
        skippedReferences: { actions: [], guards: [], actors: [] }
      };

      const bundle = bundler.createBundle(tsImplementations);

      expect(bundle.functions.tsGuard.originalTypeScriptSource).toBe(
        "(context: AppContext): boolean => context.isValid"
      );
      expect(bundle.functions.tsGuard.source).not.toContain("AppContext");
      expect(bundle.functions.tsGuard.source).not.toContain(": boolean");
    });
  });

  describe("Error Handling", () => {
    it("should handle extraction from malformed machine config gracefully", () => {
      const bundler = new ImplementationBundler();

      const malformedConfig = {
        // Missing required fields
        setup: {
          actions: "not-an-object" // Should be object
        }
      };

      expect(() => {
        bundler.extractImplementations(malformedConfig);
      }).toThrow("Invalid machine configuration");
    });

    it("should provide detailed error messages for bundle creation failures", () => {
      const bundler = new ImplementationBundler();

      const invalidImplementations = {
        // Missing required fields
      } as ExtractedImplementations;

      expect(() => {
        bundler.createBundle(invalidImplementations);
      }).toThrow("ExtractedImplementations must contain actions, guards, actors, and skippedReferences fields");
    });

    it("should handle circular references in function extraction", () => {
      const bundler = new ImplementationBundler();

      const circularConfig: any = {
        id: "circular",
        initial: "idle",
        states: { idle: {} },
        setup: {
          actions: {
            circular: "() => console.log('test')"
          }
        }
      };

      // Create circular reference
      circularConfig.setup.actions.circular = circularConfig;

      expect(() => {
        bundler.extractImplementations(circularConfig);
      }).toThrow("Circular reference detected");
    });
  });
});