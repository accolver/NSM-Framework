// NSM Client SDK - Main SDK for building NSM applications
import { version } from '../package.json';
import { NSMEvent } from '@nsm/core';

export { version };
export * from '@nsm/core';

// Blossom Protocol Integration (Task 4)
export * from './blossom';

// Progressive UI Fallback System (Task 20)
export * from './ui/ui-resolver';
export * from './ui/mcp-ui-renderer';
export * from './ui/web-components-renderer';

import type { INSMDefinitionEvent, UIFallbackSpec, extractUIFallbacks } from '@nsm/core';
import { UIResolver } from './ui/ui-resolver';
import { MCPUIRenderer } from './ui/mcp-ui-renderer';
import { WebComponentsRenderer } from './ui/web-components-renderer';
import { JSONUIRenderer } from './ui/json-ui-renderer';

export interface NSMClientOptions {
  // Options will be expanded in future tasks
  debug?: boolean;
}

export interface UIRenderResult {
  success: boolean;
  renderer: 'mcp-ui' | 'web-components' | 'json-ui' | null;
  error?: string;
}

// SDK class with progressive UI support
export class NSMClient {
  private options: NSMClientOptions;
  private currentUIRenderer: MCPUIRenderer | WebComponentsRenderer | JSONUIRenderer | null = null;
  private uiResolver: UIResolver;

  constructor(options: NSMClientOptions = {}) {
    this.options = options;
    this.uiResolver = new UIResolver();
  }

  async initialize(): Promise<void> {
    // Load Web Components polyfill if needed
    if (!WebComponentsRenderer.isSupported()) {
      await WebComponentsRenderer.loadPolyfill();
    }
  }

  /**
   * Render UI from NSM Definition Event using progressive fallback
   */
  async renderUI(
    definitionEvent: INSMDefinitionEvent,
    container: HTMLElement,
    onInteraction?: (eventType: string, data: any) => void
  ): Promise<UIRenderResult> {
    // Clean up any existing UI
    this.cleanupUI();

    // Extract UI fallbacks from event tags
    const extractFallbacks = (await import('@nsm/core')).extractUIFallbacks;
    const uiFallbacks = extractFallbacks(definitionEvent.tags);

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

    // Default interaction handler
    const handleInteraction = onInteraction || ((type, data) => {
      if (this.options.debug) {
        console.log('NSM UI Interaction:', type, data);
      }
    });

    try {
      // Render based on selected spec type
      switch (selectedSpec.type) {
        case 'mcp-ui':
          this.currentUIRenderer = new MCPUIRenderer({
            container,
            spec: selectedSpec,
            onInteraction: handleInteraction
          });
          await this.currentUIRenderer.render();
          return { success: true, renderer: 'mcp-ui' };

        case 'web-components':
          this.currentUIRenderer = new WebComponentsRenderer({
            container,
            spec: selectedSpec,
            onInteraction: handleInteraction
          });
          await this.currentUIRenderer.render();
          return { success: true, renderer: 'web-components' };

        case 'json-ui':
          this.currentUIRenderer = new JSONUIRenderer({
            container,
            spec: selectedSpec,
            onInteraction: handleInteraction
          });
          this.currentUIRenderer.render();
          return { success: true, renderer: 'json-ui' };

        default:
          return {
            success: false,
            renderer: null,
            error: `Unknown UI spec type: ${(selectedSpec as any).type}`
          };
      }
    } catch (error) {
      // Try next fallback if available
      const currentIndex = uiFallbacks.indexOf(selectedSpec);
      if (currentIndex < uiFallbacks.length - 1) {
        if (this.options.debug) {
          console.warn(`Failed to render ${selectedSpec.type}, trying next fallback...`, error);
        }

        // Recursive fallback attempt
        const remainingFallbacks = uiFallbacks.slice(currentIndex + 1);
        const nextSpec = this.uiResolver.selectUISpec(remainingFallbacks, capabilities);

        if (nextSpec) {
          // Update the definition event with remaining fallbacks
          const modifiedEvent = {
            ...definitionEvent,
            tags: definitionEvent.tags.map(tag => {
              if (tag[0] === 'ui-fallbacks') {
                return ['ui-fallbacks', JSON.stringify(remainingFallbacks)];
              }
              return tag;
            })
          } as INSMDefinitionEvent;

          return this.renderUI(modifiedEvent, container, onInteraction);
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
}