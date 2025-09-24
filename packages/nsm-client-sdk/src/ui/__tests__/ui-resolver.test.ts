/**
 * @jest/environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import type { UIFallbackSpec } from '@nsm/core';
import { UIResolver, UICapabilities } from '../ui-resolver.js';

// Mock functions for testing
const mockFn = () => {
  const calls: any[][] = [];
  const fn = (...args: any[]) => {
    calls.push(args);
  };
  fn.mock = { calls };
  return fn;
};

const clearAllMocks = () => {
  // Mock function for compatibility
};

describe('UIResolver', () => {
  let resolver: UIResolver;
  let mockContainer: HTMLElement;

  beforeEach(() => {
    // Set test environment
    process.env.NODE_ENV = 'test';

    // Setup DOM environment
    const createMockElement = (tag: string): any => {
      const element = {
        tagName: tag.toUpperCase(),
        innerHTML: '',
        textContent: '',
        children: [],
        _eventListeners: {} as Record<string, Function[]>,
        appendChild: (child: any) => {
          element.children.push(child);
          // Update textContent when children are added
          element.textContent = element.children
            .map((c: any) => c.textContent || c.innerHTML || '')
            .join('');
        },
        removeChild: (child: any) => {
          const index = element.children.indexOf(child);
          if (index > -1) element.children.splice(index, 1);
          // Update textContent when children are removed
          element.textContent = element.children
            .map((c: any) => c.textContent || c.innerHTML || '')
            .join('');
        },
        querySelector: (selector: string) => {
          // Simple selector implementation for testing
          if (selector.startsWith('#')) {
            const id = selector.substring(1);
            const findById = (el: any): any => {
              if (el.id === id) return el;
              for (const child of el.children || []) {
                const found = findById(child);
                if (found) return found;
              }
              return null;
            };
            return findById(element);
          }
          return null;
        },
        addEventListener: (event: string, handler: Function) => {
          if (!element._eventListeners[event]) {
            element._eventListeners[event] = [];
          }
          element._eventListeners[event].push(handler);
        },
        removeEventListener: (event: string, handler: Function) => {
          if (element._eventListeners[event]) {
            const index = element._eventListeners[event].indexOf(handler);
            if (index > -1) {
              element._eventListeners[event].splice(index, 1);
            }
          }
        },
        click: () => {
          const handlers = element._eventListeners.click || [];
          handlers.forEach((handler: Function) => handler());
        },
        id: '',
        className: '',
        disabled: false,
        type: '',
        placeholder: '',
        required: false,
        value: '',
      };

      // Set textContent property behavior
      Object.defineProperty(element, 'textContent', {
        get: function() {
          return this._textContent || '';
        },
        set: function(value) {
          this._textContent = value;
          // Also update innerHTML for consistency
          this.innerHTML = value;
        }
      });

      return element;
    };

    if (typeof document === 'undefined') {
      globalThis.document = {
        createElement: createMockElement,
        body: {
          appendChild: () => {},
          removeChild: () => {}
        }
      } as any;

      globalThis.window = {
        customElements: {},
        HTMLIFrameElement: class {},
        Worker: class {}
      } as any;
    }

    resolver = new UIResolver();
    mockContainer = createMockElement('div');
  });

  afterEach(() => {
    clearAllMocks();
  });

  describe('capability detection', () => {
    it('should detect MCP-UI support capabilities', () => {
      const capabilities = resolver.detectCapabilities();

      expect(capabilities).toHaveProperty('mcpUI');
      expect(capabilities).toHaveProperty('webComponents');
      expect(capabilities).toHaveProperty('jsonUI');
      expect(typeof capabilities.mcpUI).toBe('boolean');
      expect(typeof capabilities.webComponents).toBe('boolean');
      expect(typeof capabilities.jsonUI).toBe('boolean');
    });

    it('should detect Web Components support', () => {
      const capabilities = resolver.detectCapabilities();

      // Web Components support requires customElements and not in test environment
      const expectedSupport = typeof window !== 'undefined' &&
                             'customElements' in window &&
                             process?.env?.NODE_ENV !== 'test';
      expect(capabilities.webComponents).toBe(expectedSupport);
    });

    it('should always support JSON-UI as baseline', () => {
      const capabilities = resolver.detectCapabilities();
      expect(capabilities.jsonUI).toBe(true);
    });
  });

  describe('fallback selection', () => {
    it('should select the first supported fallback specification', () => {
      const fallbacks: UIFallbackSpec[] = [
        { type: 'mcp-ui', uri: 'blossom://test-mcp' },
        { type: 'web-components', uri: 'blossom://test-wc' },
        { type: 'json-ui', schema: { components: [] } }
      ];

      const selected = resolver.selectFallback(fallbacks);

      expect(selected).toBeDefined();
      expect(selected?.type).toBe('json-ui'); // Should select JSON-UI as it's always supported
    });

    it('should return json-ui fallback when no other options work', () => {
      const fallbacks: UIFallbackSpec[] = [
        { type: 'mcp-ui', uri: 'blossom://invalid' }, // Will fail
      ];

      const selected = resolver.selectFallback(fallbacks);

      // Should create default JSON-UI fallback
      expect(selected).toBeDefined();
      expect(selected?.type).toBe('json-ui');
    });

    it('should handle empty fallbacks array gracefully', () => {
      const fallbacks: UIFallbackSpec[] = [];
      const selected = resolver.selectFallback(fallbacks);

      expect(selected).toBeDefined();
      expect(selected?.type).toBe('json-ui');
    });
  });

  describe('UI rendering', () => {
    it('should render a JSON-UI specification successfully', async () => {
      const spec: UIFallbackSpec = {
        type: 'json-ui',
        schema: {
          title: 'Test UI',
          components: [
            { type: 'label', text: 'Test Label' },
            { type: 'button', text: 'Test Button', event: 'TEST_CLICK' }
          ]
        }
      };

      const eventHandler = mockFn();
      const result = await resolver.renderUI(spec, mockContainer, eventHandler);

      expect(result.success).toBe(true);
      expect(mockContainer.children.length).toBeGreaterThan(0);

      // Should have rendered the title and components
      expect(mockContainer.textContent).toContain('Test UI');
      expect(mockContainer.textContent).toContain('Test Label');
      expect(mockContainer.textContent).toContain('Test Button');
    });

    it('should handle rendering errors gracefully', async () => {
      const invalidSpec = {
        type: 'invalid-type' as any,
        uri: 'invalid://spec'
      };

      const eventHandler = mockFn();
      const result = await resolver.renderUI(invalidSpec, mockContainer, eventHandler);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should call event handler when UI events occur', async () => {
      const spec: UIFallbackSpec = {
        type: 'json-ui',
        schema: {
          components: [
            { type: 'button', text: 'Click Me', event: 'BUTTON_CLICK', id: 'test-btn' }
          ]
        }
      };

      const eventHandler = mockFn();
      await resolver.renderUI(spec, mockContainer, eventHandler);

      // Find and click the button
      const button = mockContainer.querySelector('#test-btn') as HTMLButtonElement;
      expect(button).toBeDefined();

      button.click();

      expect(eventHandler.mock.calls.length).toBeGreaterThan(0);
      expect(eventHandler.mock.calls[0][0]).toMatchObject({
        type: 'BUTTON_CLICK',
        source: 'ui'
      });
    });
  });

  describe('UI lifecycle management', () => {
    it('should cleanup UI properly', async () => {
      const spec: UIFallbackSpec = {
        type: 'json-ui',
        schema: {
          components: [
            { type: 'label', text: 'Test' }
          ]
        }
      };

      await resolver.renderUI(spec, mockContainer, mockFn());
      expect(mockContainer.children.length).toBeGreaterThan(0);

      resolver.cleanup();
      expect(mockContainer.children.length).toBe(0);
    });

    it('should handle multiple renders on same container', async () => {
      const spec1: UIFallbackSpec = {
        type: 'json-ui',
        schema: { components: [{ type: 'label', text: 'First UI' }] }
      };

      const spec2: UIFallbackSpec = {
        type: 'json-ui',
        schema: { components: [{ type: 'label', text: 'Second UI' }] }
      };

      // First render
      await resolver.renderUI(spec1, mockContainer, mockFn());
      expect(mockContainer.textContent).toContain('First UI');

      // Second render should replace the first
      await resolver.renderUI(spec2, mockContainer, mockFn());
      expect(mockContainer.textContent).toContain('Second UI');
      expect(mockContainer.textContent).not.toContain('First UI');
    });
  });
});