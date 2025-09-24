/**
 * Web Components Fallback Renderer
 * Implements framework-agnostic Web Components loading with NSM event mapping
 */

import type { WebComponentsSpec } from '@nsm/core';

export interface WebComponentsRendererOptions {
  container: HTMLElement;
  spec: WebComponentsSpec;
  onInteraction: (eventType: string, data: any) => void;
}

export class WebComponentsRenderer {
  private container: HTMLElement;
  private spec: WebComponentsSpec;
  private onInteraction: (eventType: string, data: any) => void;
  private loadedElements: Set<string> = new Set();
  private eventListeners: Map<Element, Map<string, EventListener>> = new Map();

  constructor(options: WebComponentsRendererOptions) {
    this.container = options.container;
    this.spec = options.spec;
    this.onInteraction = options.onInteraction;
  }

  /**
   * Load and render Web Components
   */
  async render(): Promise<void> {
    // Clean up any existing components
    this.cleanup();

    // Load Web Components bundle
    await this.loadComponentsBundle();

    // Wait for custom elements to be defined
    await this.waitForCustomElements();

    // Create and mount components
    this.mountComponents();

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Load Web Components bundle from URI
   */
  private async loadComponentsBundle(): Promise<void> {
    if (!this.spec.uri) {
      console.warn('No Web Components bundle URI specified');
      return;
    }

    // Handle different URI schemes
    let bundleUrl: string;

    if (this.spec.uri.startsWith('blossom://')) {
      // Fetch from Blossom storage
      const hash = this.spec.uri.replace('blossom://', '');
      bundleUrl = `/blossom/${hash}`;
    } else if (this.spec.uri.startsWith('http://') || this.spec.uri.startsWith('https://')) {
      bundleUrl = this.spec.uri;
    } else {
      console.warn('Unknown Web Components bundle URI scheme:', this.spec.uri);
      return;
    }

    // Load the bundle as a module script
    const script = document.createElement('script');
    script.type = 'module';
    script.src = bundleUrl;

    return new Promise((resolve, reject) => {
      script.onload = () => resolve();
      script.onerror = (error) => {
        console.error('Failed to load Web Components bundle:', error);
        reject(error);
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Wait for custom elements to be defined
   */
  private async waitForCustomElements(): Promise<void> {
    if (!this.spec.customElements) return;

    const promises = Object.entries(this.spec.customElements).map(([elementName, tagName]) => {
      if (!tagName) {
        console.warn(`No tag name defined for element ${elementName}`);
        return Promise.resolve();
      }

      // Check if element is already defined
      if (customElements.get(tagName)) {
        this.loadedElements.add(tagName);
        return Promise.resolve();
      }

      // Wait for element to be defined
      return customElements.whenDefined(tagName).then(() => {
        this.loadedElements.add(tagName);
      });
    });

    await Promise.all(promises);
  }

  /**
   * Mount Web Components in container
   */
  private mountComponents(): void {
    if (!this.spec.customElements) {
      // If no specific elements defined, try to render a default root element
      const rootElement = document.createElement('nsm-app-root');
      this.container.appendChild(rootElement);
      return;
    }

    // Create wrapper for components
    const wrapper = document.createElement('div');
    wrapper.className = 'nsm-web-components-wrapper';

    // Mount each defined custom element
    Object.entries(this.spec.customElements).forEach(([elementName, tagName]) => {
      const element = document.createElement(tagName);
      element.setAttribute('data-nsm-component', elementName);

      // Pass any initial properties
      if (element instanceof HTMLElement) {
        (element as any).nsmContext = {
          sendEvent: (eventType: string, data: any) => {
            this.onInteraction(eventType, data);
          }
        };
      }

      wrapper.appendChild(element);
    });

    this.container.appendChild(wrapper);
  }

  /**
   * Set up event listeners for Web Components
   */
  private setupEventListeners(): void {
    if (!this.spec.events) return;

    // Find all mounted components
    const components = this.container.querySelectorAll('[data-nsm-component]');

    components.forEach(component => {
      const elementListeners = new Map<string, EventListener>();

      Object.entries(this.spec.events || {}).forEach(([componentEvent, nsmEventType]) => {
        // Parse event name (e.g., "button-click" -> "click" on button)
        const [targetElement, eventName] = this.parseEventMapping(componentEvent);

        // Create event listener
        const listener = (event: Event) => {
          // Extract data from event
          const data = this.extractEventData(event);

          // Map to NSM event
          this.onInteraction(nsmEventType, data);
        };

        // Add listener to appropriate target
        if (targetElement === '*' || targetElement === component.getAttribute('data-nsm-component')) {
          component.addEventListener(eventName, listener);
          elementListeners.set(eventName, listener);
        } else {
          // Look for child elements
          const targets = component.querySelectorAll(targetElement);
          targets.forEach(target => {
            target.addEventListener(eventName, listener);
            elementListeners.set(`${targetElement}:${eventName}`, listener);
          });
        }
      });

      this.eventListeners.set(component, elementListeners);
    });

    // Set up global custom event listener for Web Component events
    this.container.addEventListener('nsm-event', ((event: Event) => {
      const customEvent = event as CustomEvent;
      const { type, data } = customEvent.detail;

      // Check if there's a mapping for this event
      if (this.spec.events && this.spec.events[type]) {
        this.onInteraction(this.spec.events[type], data);
      } else {
        // Forward unmapped events
        this.onInteraction(type, data);
      }
    }) as EventListener);
  }

  /**
   * Parse event mapping string
   */
  private parseEventMapping(mapping: string): [string, string] {
    const parts = mapping.split(':');
    if (parts.length === 2 && parts[0] && parts[1]) {
      return [parts[0], parts[1]];
    }
    // Default to global event
    return ['*', mapping];
  }

  /**
   * Extract relevant data from DOM event
   */
  private extractEventData(event: Event): any {
    const target = event.target as HTMLElement;
    const data: any = {};

    // Extract form data if available
    if (target instanceof HTMLInputElement) {
      data.value = target.value;
      data.name = target.name;
      data.type = target.type;
    } else if (target instanceof HTMLTextAreaElement) {
      data.value = target.value;
      data.name = target.name;
    } else if (target instanceof HTMLSelectElement) {
      data.value = target.value;
      data.name = target.name;
      data.selectedIndex = target.selectedIndex;
    }

    // Extract data attributes
    if (target.dataset) {
      Object.assign(data, target.dataset);
    }

    // Extract custom event detail
    if (event instanceof CustomEvent && event.detail) {
      Object.assign(data, event.detail);
    }

    return data;
  }

  /**
   * Clean up mounted components and event listeners
   */
  cleanup(): void {
    // Remove event listeners
    this.eventListeners.forEach((listeners, element) => {
      listeners.forEach((listener, eventName) => {
        if (eventName.includes(':')) {
          // Child element listener
          const parts = eventName.split(':');
          if (parts.length === 2 && parts[0] && parts[1]) {
            const [selector, event] = parts;
            const targets = element.querySelectorAll(selector);
            targets.forEach(target => {
              target.removeEventListener(event, listener);
            });
          }
        } else {
          // Direct element listener
          element.removeEventListener(eventName, listener);
        }
      });
    });
    this.eventListeners.clear();

    // Clear container
    this.container.innerHTML = '';

    // Clear loaded elements tracking
    this.loadedElements.clear();
  }

  /**
   * Check if Web Components are supported
   */
  static isSupported(): boolean {
    return 'customElements' in window;
  }

  /**
   * Load Web Components polyfill if needed
   */
  static async loadPolyfill(): Promise<void> {
    if (!WebComponentsRenderer.isSupported()) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@webcomponents/webcomponentsjs@2.8.0/webcomponents-bundle.js';

      return new Promise((resolve, reject) => {
        script.onload = () => resolve();
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
  }
}