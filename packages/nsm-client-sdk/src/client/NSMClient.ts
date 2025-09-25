/**
 * Enhanced NSMClient SDK - Task 22 Implementation
 *
 * Integrates:
 * - Inline machine configurations (Task 19)
 * - Progressive UI fallback resolution (Task 20)
 * - Blossom implementation loading (Task 21)
 * - MCP-UI to NSM event translation
 * - Application migration utilities
 */

import type {
  INSMDefinitionEvent,
  NSMDefinitionContent,
  BlossomImplementationReference,
  UIFallbackSpec,
  extractUIFallbacks,
  MachineConfig,
  XStateV5SetupConfig
} from '@nsm/core';
import { UIResolver, type UICapabilities, type UIEventHandler } from '../ui/ui-resolver';
import { MCPUIRenderer } from '../ui/mcp-ui-renderer';
import { WebComponentsRenderer } from '../ui/web-components-renderer';
import { JSONUIRenderer } from '../ui/json-ui-renderer';
import { ImplementationLoader, type LoaderConfig, type MixedImplementations, type ExtractedFunction } from '../blossom/ImplementationLoader';
import { BlossomClient } from '../blossom/BlossomClient';
import type { ImplementationBundle } from '../blossom/ImplementationBundler';

export interface NSMClientOptions {
  /** Debug mode for verbose logging */
  debug?: boolean;
  /** BlossomClient for downloading implementations (optional) */
  blossomClient?: BlossomClient;
  /** Security context for sandboxed execution */
  securityContext?: {
    allowUnsafeEval?: boolean;
    maxExecutionTime?: number;
    allowNetworkAccess?: boolean;
    trustedDomains?: string[];
    cspPolicy?: string;
  };
  /** Enable offline mode with fallback implementations */
  offlineMode?: boolean;
  /** Fallback implementations for offline mode */
  fallbackImplementations?: Record<string, ImplementationBundle>;
  /** Cache configuration for implementations */
  cacheConfig?: {
    maxSize?: number;
    ttl?: number;
    persistToDisk?: boolean;
  };
}

export interface MachineParseResult {
  success: boolean;
  config?: MachineConfig;
  implementations?: MixedImplementations;
  error?: string;
  warnings?: string[];
}

export interface UIRenderResult {
  success: boolean;
  renderer: 'mcp-ui' | 'web-components' | 'json-ui' | null;
  error?: string;
}

export interface NSMUIInteractionEvent {
  type: 'NSM_UI_INTERACTION';
  applicationId: string;
  interactionType: string;
  targetElement?: string;
  data: Record<string, any>;
  timestamp: number;
}

export interface NSMDOMUpdateEvent {
  type: 'NSM_DOM_UPDATE';
  applicationId: string;
  domUpdate: {
    type: string;
    path: string[];
    operation: string;
    value: any;
  };
  timestamp: number;
}

export interface MigrationResult {
  success: boolean;
  config?: MachineConfig;
  warnings: string[];
  errors?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Enhanced NSM Client SDK with full Task 19-21 integration
 */
export class NSMClient {
  private options: Omit<Required<NSMClientOptions>, 'blossomClient'> & { blossomClient?: BlossomClient };
  private uiResolver: UIResolver;
  private implementationLoader?: ImplementationLoader;
  private currentUIRenderer: MCPUIRenderer | WebComponentsRenderer | JSONUIRenderer | null = null;

  constructor(options: NSMClientOptions = {}) {
    // Set defaults
    this.options = {
      debug: options.debug || false,
      blossomClient: options.blossomClient || undefined, // Don't create default automatically
      securityContext: {
        allowUnsafeEval: false,
        maxExecutionTime: 5000,
        allowNetworkAccess: false,
        trustedDomains: [],
        cspPolicy: "default-src 'self'",
        ...options.securityContext
      },
      offlineMode: options.offlineMode || false,
      fallbackImplementations: options.fallbackImplementations || {},
      cacheConfig: {
        maxSize: 100,
        ttl: 3600000, // 1 hour
        persistToDisk: false,
        ...options.cacheConfig
      }
    };

    this.uiResolver = new UIResolver();

    // Initialize ImplementationLoader if BlossomClient available
    if (this.options.blossomClient) {
      this.implementationLoader = new ImplementationLoader({
        blossomClient: this.options.blossomClient,
        securityContext: this.options.securityContext,
        cacheConfig: this.options.cacheConfig,
        offlineMode: this.options.offlineMode,
        fallbackImplementations: this.options.fallbackImplementations
      });
    } else if (this.options.debug) {
      console.log('NSMClient: No BlossomClient provided - Blossom implementation loading disabled');
    }
  }

  private createDefaultBlossomClient(): BlossomClient {
    return new BlossomClient({
      servers: ['https://cdn.satellite.earth'],
      privateKey: 'dummy-key-for-readonly-access' // This won't be used for read-only access
    });
  }

  /**
   * Parse machine configuration from NSM Definition Event (Task 19)
   * Supports both inline and external machine configurations
   */
  async parseMachineConfiguration(definitionEvent: INSMDefinitionEvent): Promise<MachineParseResult> {
    try {
      const content: NSMDefinitionContent = JSON.parse(definitionEvent.content);

      // Validate basic structure
      if (!content.machineConfig || !content.machineConfig.id || !content.machineConfig.initial || !content.machineConfig.states) {
        return {
          success: false,
          error: 'Invalid machine configuration: missing required fields (machineConfig.id, machineConfig.initial, machineConfig.states)'
        };
      }

      const machineConfig = content.machineConfig;

      // Detect version - prefer explicit version, fall back to setup presence
      const version = machineConfig.version || (machineConfig.setup ? 'v5' : 'v4');
      const warnings: string[] = [];

      if (!machineConfig.version && machineConfig.setup) {
        warnings.push('No explicit version specified, but setup() config found - assuming XState v5');
      }

      // Parse machine config (it's already a MachineConfig from content.machineConfig)
      const config: MachineConfig = {
        ...machineConfig,
        version: version as 'v4' | 'v5'
      };

      // Load mixed implementations if ImplementationLoader is available
      let implementations: MixedImplementations | undefined;
      if (this.implementationLoader && (machineConfig.setup || content.implementations)) {
        try {
          implementations = await this.implementationLoader.loadMixedImplementations(content);

          // Validate inline implementations for security
          this.validateInlineImplementations(implementations.inline);
        } catch (error) {
          if (this.options.offlineMode) {
            // In offline mode, continue without Blossom implementations
            warnings.push(`Failed to load Blossom implementations (offline mode): ${error instanceof Error ? error.message : 'Unknown error'}`);
            implementations = {
              inline: this.extractInlineImplementations(machineConfig.setup || {}),
              blossom: {
                functions: {},
                metadata: { functionCount: 0, createdAt: Date.now() }
              }
            };
          } else {
            return {
              success: false,
              error: `Failed to load implementations: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
          }
        }
      }

      return {
        success: true,
        config,
        implementations,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse machine configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Render UI using progressive fallback resolution (Task 20)
   */
  async renderUI(
    definitionEvent: INSMDefinitionEvent,
    container: HTMLElement,
    onInteraction?: (eventType: string, data: any) => void
  ): Promise<UIRenderResult> {
    try {
      // Clean up any existing UI
      this.cleanupUI();

      // Extract UI fallbacks from event tags
      const { extractUIFallbacks } = await import('@nsm/core');
      const uiFallbacks = extractUIFallbacks(definitionEvent.tags);

      if (!uiFallbacks || uiFallbacks.length === 0) {
        return {
          success: false,
          renderer: null,
          error: 'No UI fallbacks specified in Definition Event'
        };
      }

      // Detect client capabilities
      const capabilities = this.uiResolver.detectCapabilities();

      // Select appropriate UI spec
      const selectedSpec = this.uiResolver.selectUISpec(uiFallbacks, capabilities);

      if (!selectedSpec) {
        return {
          success: false,
          renderer: null,
          error: 'No compatible UI renderer available'
        };
      }

      // Default interaction handler that converts UIEventHandler format to simple callback
      const handleInteraction = onInteraction || ((eventType: string, data: any) => {
        if (this.options.debug) {
          console.log('NSM UI Interaction:', eventType, data);
        }
      });

      // Create adapter for UIEventHandler format
      const uiEventHandler: UIEventHandler = (event) => {
        handleInteraction(event.type, event.data);
      };

      // Render based on selected spec type
      return await this.renderUISpec(selectedSpec, container, uiEventHandler, uiFallbacks);
    } catch (error) {
      return {
        success: false,
        renderer: null,
        error: `Failed to render UI: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async renderUISpec(
    spec: UIFallbackSpec,
    container: HTMLElement,
    handleInteraction: UIEventHandler,
    allFallbacks: UIFallbackSpec[]
  ): Promise<UIRenderResult> {
    try {
      switch (spec.type) {
        case 'mcp-ui':
          this.currentUIRenderer = new MCPUIRenderer({
            container,
            spec,
            onInteraction: (eventType: string, data: any) => handleInteraction({ type: eventType, source: 'ui' as const, data })
          });
          await this.currentUIRenderer.render();
          return { success: true, renderer: 'mcp-ui' };

        case 'web-components':
          this.currentUIRenderer = new WebComponentsRenderer({
            container,
            spec,
            onInteraction: (eventType: string, data: any) => handleInteraction({ type: eventType, source: 'ui' as const, data })
          });
          await this.currentUIRenderer.render();
          return { success: true, renderer: 'web-components' };

        case 'json-ui':
          this.currentUIRenderer = new JSONUIRenderer({
            container,
            spec,
            onInteraction: (eventType: string, data: any) => handleInteraction({ type: eventType, source: 'ui' as const, data })
          });
          this.currentUIRenderer.render();
          return { success: true, renderer: 'json-ui' };

        default:
          return {
            success: false,
            renderer: null,
            error: `Unknown UI spec type: ${(spec as any).type}`
          };
      }
    } catch (error) {
      // Try next fallback if available
      const currentIndex = allFallbacks.indexOf(spec);
      if (currentIndex < allFallbacks.length - 1) {
        if (this.options.debug) {
          console.warn(`Failed to render ${spec.type}, trying next fallback...`, error);
        }

        const capabilities = this.uiResolver.detectCapabilities();
        const remainingFallbacks = allFallbacks.slice(currentIndex + 1);
        const nextSpec = this.uiResolver.selectUISpec(remainingFallbacks, capabilities);

        if (nextSpec) {
          return await this.renderUISpec(nextSpec, container, handleInteraction, allFallbacks);
        }
      }

      return {
        success: false,
        renderer: null,
        error: `Failed to render UI: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Convert MCP-UI intents to NSM interaction events
   */
  translateMCPUIIntent(mcpIntent: any, applicationId: string): NSMUIInteractionEvent {
    return {
      type: 'NSM_UI_INTERACTION',
      applicationId,
      interactionType: mcpIntent.type,
      targetElement: mcpIntent.target,
      data: mcpIntent.data || {},
      timestamp: Date.now()
    };
  }

  /**
   * Handle Remote DOM messages from MCP-UI
   */
  processRemoteDOMMessage(remoteDOMMessage: any, applicationId: string): NSMDOMUpdateEvent {
    return {
      type: 'NSM_DOM_UPDATE',
      applicationId,
      domUpdate: {
        type: remoteDOMMessage.type,
        path: remoteDOMMessage.path || [],
        operation: remoteDOMMessage.operation,
        value: remoteDOMMessage.value
      },
      timestamp: Date.now()
    };
  }

  /**
   * Migrate XState v4 configuration to v5 (Task 22 migration utilities)
   */
  migrateV4ToV5(v4Config: any): MigrationResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      const v5Config: MachineConfig = {
        id: v4Config.id,
        initial: v4Config.initial,
        context: v4Config.context,
        states: this.migrateStates(v4Config.states, warnings),
        version: 'v5',
        setup: {}
      };

      // Migrate options to setup
      if (v4Config.options) {
        v5Config.setup = this.migrateOptionsToSetup(v4Config.options, warnings);
      }

      // Migrate activities to actors
      if (v4Config.activities) {
        warnings.push('Activities are deprecated in v5, consider using actors instead');
        // Convert activities to actors if possible
        v5Config.setup!.actors = v4Config.activities;
      }

      return {
        success: errors.length === 0,
        config: v5Config,
        warnings,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      return {
        success: false,
        warnings,
        errors: [`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Validate hybrid v4/v5 configuration for gradual migration
   */
  validateHybridConfiguration(config: any): ValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check for v4 legacy patterns
    if (config.options) {
      warnings.push('Legacy "options" detected - consider migrating to setup() for v5 compatibility');
    }

    if (config.activities) {
      warnings.push('Activities are deprecated in v5 - migrate to actors');
    }

    // Check for v5 patterns
    if (config.setup && !config.version) {
      warnings.push('setup() configuration found but no version specified - add version: "v5"');
    }

    // Validate required fields
    if (!config.id) {
      errors.push('Machine id is required');
    }

    if (!config.initial) {
      errors.push('Initial state is required');
    }

    if (!config.states) {
      errors.push('States configuration is required');
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }

  /**
   * Clean up current UI renderer
   */
  cleanupUI(): void {
    if (this.currentUIRenderer) {
      this.currentUIRenderer.cleanup();
      this.currentUIRenderer = null;
    }
  }

  /**
   * Get current UI renderer type
   */
  getCurrentRenderer(): string | null {
    if (!this.currentUIRenderer) return null;

    if (this.currentUIRenderer instanceof MCPUIRenderer) return 'mcp-ui';
    if (this.currentUIRenderer instanceof WebComponentsRenderer) return 'web-components';
    if (this.currentUIRenderer instanceof JSONUIRenderer) return 'json-ui';

    return 'unknown';
  }

  // Private helper methods

  private validateInlineImplementations(inline: MixedImplementations['inline']): void {
    const allImplementations = [
      ...Object.values(inline.actions),
      ...Object.values(inline.guards),
      ...Object.values(inline.actors)
    ];

    for (const impl of allImplementations) {
      this.validateInlineImplementation(impl);
    }
  }

  private validateInlineImplementation(impl: ExtractedFunction): void {
    const source = impl.source;

    // Security validation for inline implementations
    const unsafePatterns = [
      /eval\s*\(/,
      /Function\s*\(/,
      /setTimeout\s*\(/,
      /setInterval\s*\(/,
      /XMLHttpRequest/,
      /fetch\s*\(/,
      /import\s*\(/,
      /require\s*\(/
    ];

    for (const pattern of unsafePatterns) {
      if (pattern.test(source)) {
        throw new Error(`Unsafe operation detected in inline implementation "${impl.name}": function contains potentially dangerous code`);
      }
    }
  }

  private extractInlineImplementations(setup: XStateV5SetupConfig): MixedImplementations['inline'] {
    const inline = {
      actions: {} as Record<string, ExtractedFunction>,
      guards: {} as Record<string, ExtractedFunction>,
      actors: {} as Record<string, ExtractedFunction>
    };

    // Extract inline implementations from setup
    ['actions', 'guards', 'actors'].forEach(type => {
      const implementations = setup[type as keyof XStateV5SetupConfig] as Record<string, string> | undefined;
      if (implementations) {
        Object.entries(implementations).forEach(([name, impl]) => {
          if (!impl.startsWith('ref:blossom:')) {
            // Inline implementation
            const extractedFunction: ExtractedFunction = {
              name,
              source: impl,
              type: type.slice(0, -1) as 'action' | 'guard' | 'actor' // Remove 's' suffix
            };
            (inline[type as keyof typeof inline] as Record<string, ExtractedFunction>)[name] = extractedFunction;
          }
        });
      }
    });

    return inline;
  }

  private migrateStates(states: any, warnings: string[]): any {
    // Deep clone and migrate state definitions
    const migratedStates = JSON.parse(JSON.stringify(states));

    // Look for v4-specific patterns and convert them
    for (const [stateName, stateConfig] of Object.entries(migratedStates)) {
      if (typeof stateConfig === 'object' && stateConfig !== null) {
        const state = stateConfig as any;

        // Migrate invoke to spawn actors pattern
        if (state.invoke) {
          warnings.push(`State "${stateName}": invoke pattern detected - consider migrating to actors`);
        }

        // Migrate activities to entry/exit actions
        if (state.activities) {
          warnings.push(`State "${stateName}": activities detected - migrate to entry/exit actions`);
        }
      }
    }

    return migratedStates;
  }

  private migrateOptionsToSetup(options: any, warnings: string[]): XStateV5SetupConfig {
    const setup: XStateV5SetupConfig = {};

    if (options.actions) {
      setup.actions = {};
      for (const [name, action] of Object.entries(options.actions)) {
        if (typeof action === 'function') {
          // Convert function to string representation
          setup.actions[name] = action.toString();
          warnings.push(`Action "${name}": converted function to string - verify implementation correctness`);
        } else {
          setup.actions[name] = action as string;
        }
      }
    }

    if (options.guards) {
      setup.guards = {};
      for (const [name, guard] of Object.entries(options.guards)) {
        if (typeof guard === 'function') {
          setup.guards[name] = guard.toString();
          warnings.push(`Guard "${name}": converted function to string - verify implementation correctness`);
        } else {
          setup.guards[name] = guard as string;
        }
      }
    }

    if (options.services) {
      setup.actors = {};
      for (const [name, service] of Object.entries(options.services)) {
        setup.actors[name] = typeof service === 'function' ? service.toString() : service as string;
        warnings.push(`Service "${name}": migrated to actor - verify compatibility`);
      }
    }

    if (options.delays) {
      setup.delays = options.delays;
    }

    return setup;
  }
}

export default NSMClient;