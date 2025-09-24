import type { UIFallbackSpec, JSONUISpec, MCPUISpec, WebComponentsSpec } from '@nsm/core';

/**
 * Client UI capabilities for progressive enhancement
 */
export interface UICapabilities {
  mcpUI: boolean;
  webComponents: boolean;
  jsonUI: boolean;
}

/**
 * UI render result
 */
export interface UIRenderResult {
  success: boolean;
  error?: string;
  renderer?: string;
}

/**
 * NSM event from UI interactions
 */
export interface NSMUIEvent {
  type: string;
  source: 'ui';
  data: Record<string, any>;
}

/**
 * Event handler for UI interactions
 */
export type UIEventHandler = (event: NSMUIEvent) => void;

/**
 * Progressive UI Selection Engine
 *
 * Implements capability detection and fallback logic for the three-tier UI system:
 * 1. MCP-UI Remote DOM (primary)
 * 2. Web Components (fallback 1)
 * 3. JSON-UI schema (fallback 2)
 */
export class UIResolver {
  private currentRenderer?: string;
  private currentContainer?: HTMLElement;
  private eventListeners: Array<() => void> = [];

  /**
   * Select the best UI spec based on capabilities
   */
  selectUISpec(specs: UIFallbackSpec[], capabilities: UICapabilities): UIFallbackSpec | null {
    for (const spec of specs) {
      switch (spec.type) {
        case 'mcp-ui':
          if (capabilities.mcpUI) return spec;
          break;
        case 'web-components':
          if (capabilities.webComponents) return spec;
          break;
        case 'json-ui':
          if (capabilities.jsonUI) return spec;
          break;
      }
    }
    return null;
  }

  /**
   * Detect client capabilities for UI rendering
   */
  detectCapabilities(): UICapabilities {
    return {
      // MCP-UI support requires iframe/WebWorker sandboxing
      mcpUI: this.detectMCPUISupport(),

      // Web Components support requires customElements API
      webComponents: typeof window !== 'undefined' && 'customElements' in window && process?.env?.NODE_ENV !== 'test',

      // JSON-UI is always supported as baseline
      jsonUI: true
    };
  }

  /**
   * Select the best supported UI fallback specification
   */
  selectFallback(fallbacks: UIFallbackSpec[]): UIFallbackSpec {
    const capabilities = this.detectCapabilities();

    // Try each fallback in order of preference
    for (const fallback of fallbacks) {
      if (this.isFallbackSupported(fallback, capabilities)) {
        return fallback;
      }
    }

    // Default JSON-UI fallback if nothing else works
    return this.createDefaultJSONUI();
  }

  /**
   * Render UI specification in the container
   */
  async renderUI(
    spec: UIFallbackSpec,
    container: HTMLElement,
    eventHandler: UIEventHandler
  ): Promise<UIRenderResult> {
    try {
      // Cleanup previous render
      this.cleanup();

      this.currentContainer = container;

      switch (spec.type) {
        case 'mcp-ui':
          return await this.renderMCPUI(spec as MCPUISpec, container, eventHandler);

        case 'web-components':
          return await this.renderWebComponents(spec as WebComponentsSpec, container, eventHandler);

        case 'json-ui':
          return await this.renderJSONUI(spec as JSONUISpec, container, eventHandler);

        default:
          throw new Error(`Unsupported UI specification type: ${(spec as any).type}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown rendering error'
      };
    }
  }

  /**
   * Cleanup current UI rendering
   */
  cleanup(): void {
    if (this.currentContainer) {
      this.currentContainer.innerHTML = '';
      // Also clear children array for mock testing
      if ('children' in this.currentContainer && Array.isArray((this.currentContainer as any).children)) {
        (this.currentContainer as any).children = [];
      }
      // Reset textContent for mock testing
      if ('_textContent' in this.currentContainer) {
        (this.currentContainer as any)._textContent = '';
      }
    }

    // Remove all event listeners
    this.eventListeners.forEach(remove => remove());
    this.eventListeners = [];

    this.currentRenderer = undefined;
    this.currentContainer = undefined;
  }

  /**
   * Detect MCP-UI support (iframe/WebWorker sandboxing)
   */
  private detectMCPUISupport(): boolean {
    if (typeof window === 'undefined') return false;

    // Check for iframe sandboxing support
    const hasIframeSupport = 'HTMLIFrameElement' in window;

    // Check for WebWorker support
    const hasWebWorkerSupport = 'Worker' in window;

    // For testing environments, we can disable MCP-UI support
    if (process?.env?.NODE_ENV === 'test') {
      return false;
    }

    return hasIframeSupport || hasWebWorkerSupport;
  }

  /**
   * Check if a fallback specification is supported
   */
  private isFallbackSupported(fallback: UIFallbackSpec, capabilities: UICapabilities): boolean {
    switch (fallback.type) {
      case 'mcp-ui':
        return capabilities.mcpUI;
      case 'web-components':
        return capabilities.webComponents;
      case 'json-ui':
        return capabilities.jsonUI;
      default:
        return false;
    }
  }

  /**
   * Create default JSON-UI fallback
   */
  private createDefaultJSONUI(): JSONUISpec {
    return {
      type: 'json-ui',
      schema: {
        title: 'NSM Application',
        description: 'Minimal UI fallback',
        components: [
          { type: 'label', text: 'NSM Application Interface' },
          { type: 'button', text: 'Refresh', event: 'REFRESH' }
        ]
      }
    };
  }

  /**
   * Render MCP-UI specification (placeholder for now)
   */
  private async renderMCPUI(
    spec: MCPUISpec,
    container: HTMLElement,
    eventHandler: UIEventHandler
  ): Promise<UIRenderResult> {
    // TODO: Implement MCP-UI sandboxed rendering
    // For now, fall back to JSON-UI
    const fallback = this.createDefaultJSONUI();
    return await this.renderJSONUI(fallback, container, eventHandler);
  }

  /**
   * Render Web Components specification (placeholder for now)
   */
  private async renderWebComponents(
    spec: WebComponentsSpec,
    container: HTMLElement,
    eventHandler: UIEventHandler
  ): Promise<UIRenderResult> {
    // TODO: Implement Web Components loading and registration
    // For now, fall back to JSON-UI
    const fallback = this.createDefaultJSONUI();
    return await this.renderJSONUI(fallback, container, eventHandler);
  }

  /**
   * Render JSON-UI specification
   */
  private async renderJSONUI(
    spec: JSONUISpec,
    container: HTMLElement,
    eventHandler: UIEventHandler
  ): Promise<UIRenderResult> {
    const { schema } = spec;

    // Clear container
    container.innerHTML = '';

    // Create wrapper div
    const wrapper = document.createElement('div');
    wrapper.className = 'nsm-json-ui';

    // Add title if present
    if (schema.title) {
      const title = document.createElement('h2');
      title.textContent = schema.title;
      wrapper.appendChild(title);
    }

    // Add description if present
    if (schema.description) {
      const description = document.createElement('p');
      description.textContent = schema.description;
      wrapper.appendChild(description);
    }

    // Render components
    for (const component of schema.components) {
      const element = this.createJSONUIComponent(component, eventHandler);
      if (element) {
        wrapper.appendChild(element);
      }
    }

    container.appendChild(wrapper);
    this.currentRenderer = 'json-ui';

    return { success: true, renderer: 'json-ui' };
  }

  /**
   * Create HTML element for JSON-UI component
   */
  private createJSONUIComponent(
    component: any,
    eventHandler: UIEventHandler
  ): HTMLElement | null {
    switch (component.type) {
      case 'label': {
        const label = document.createElement('label');
        label.textContent = component.text;
        if (component.id) label.id = component.id;
        return label;
      }

      case 'button': {
        const button = document.createElement('button');
        button.textContent = component.text;
        button.disabled = component.disabled || false;
        if (component.id) button.id = component.id;

        const clickHandler = () => {
          eventHandler({
            type: component.event,
            source: 'ui',
            data: {
              componentId: component.id,
              componentType: 'button',
              text: component.text
            }
          });
        };

        button.addEventListener('click', clickHandler);
        this.eventListeners.push(() => {
          button.removeEventListener('click', clickHandler);
        });

        return button;
      }

      case 'input': {
        const wrapper = document.createElement('div');

        if (component.label) {
          const label = document.createElement('label');
          label.textContent = component.label;
          wrapper.appendChild(label);
        }

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = component.placeholder || '';
        input.required = component.required || false;
        if (component.id) input.id = component.id;

        const changeHandler = () => {
          eventHandler({
            type: component.event,
            source: 'ui',
            data: {
              componentId: component.id,
              componentType: 'input',
              value: input.value
            }
          });
        };

        input.addEventListener('change', changeHandler);
        this.eventListeners.push(() => {
          input.removeEventListener('change', changeHandler);
        });

        wrapper.appendChild(input);
        return wrapper;
      }

      case 'container': {
        const container = document.createElement('div');
        container.className = `nsm-container nsm-layout-${component.layout || 'vertical'}`;
        if (component.id) container.id = component.id;

        // Recursively render children
        if (component.children) {
          for (const child of component.children) {
            const childElement = this.createJSONUIComponent(child, eventHandler);
            if (childElement) {
              container.appendChild(childElement);
            }
          }
        }

        return container;
      }

      default:
        console.warn(`Unsupported JSON-UI component type: ${component.type}`);
        return null;
    }
  }
}