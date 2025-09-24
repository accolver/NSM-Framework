/**
 * JSON-UI Fallback Renderer
 * Implements minimal declarative UI generation for maximum compatibility
 */

import type { JSONUISpec, JSONUIComponent } from '@nsm/core';

export interface JSONUIRendererOptions {
  container: HTMLElement;
  spec: JSONUISpec;
  onInteraction: (eventType: string, data: any) => void;
}

export class JSONUIRenderer {
  private container: HTMLElement;
  private spec: JSONUISpec;
  private onInteraction: (eventType: string, data: any) => void;
  private eventListeners: Array<() => void> = [];

  constructor(options: JSONUIRendererOptions) {
    this.container = options.container;
    this.spec = options.spec;
    this.onInteraction = options.onInteraction;
  }

  /**
   * Render JSON-UI specification
   */
  render(): void {
    // Clean up any existing UI
    this.cleanup();

    const { schema } = this.spec;

    // Create wrapper div
    const wrapper = document.createElement('div');
    wrapper.className = 'nsm-json-ui';
    wrapper.setAttribute('role', 'application');

    // Add title if present
    if (schema.title) {
      const title = document.createElement('h2');
      title.textContent = schema.title;
      title.className = 'nsm-json-ui-title';
      wrapper.appendChild(title);
    }

    // Add description if present
    if (schema.description) {
      const description = document.createElement('p');
      description.textContent = schema.description;
      description.className = 'nsm-json-ui-description';
      wrapper.appendChild(description);
    }

    // Render components
    const componentsContainer = document.createElement('div');
    componentsContainer.className = 'nsm-json-ui-components';

    for (const component of schema.components) {
      const element = this.createComponent(component);
      if (element) {
        componentsContainer.appendChild(element);
      }
    }

    wrapper.appendChild(componentsContainer);
    this.container.appendChild(wrapper);

    // Add basic styles
    this.injectStyles();
  }

  /**
   * Create HTML element for JSON-UI component
   */
  private createComponent(component: JSONUIComponent): HTMLElement | null {
    switch (component.type) {
      case 'label': {
        const label = document.createElement('label');
        label.textContent = component.text;
        label.className = 'nsm-json-ui-label';
        if (component.id) label.id = component.id;
        return label;
      }

      case 'button': {
        const button = document.createElement('button');
        button.textContent = component.text;
        button.className = 'nsm-json-ui-button';
        button.disabled = component.disabled || false;
        if (component.id) button.id = component.id;

        const clickHandler = () => {
          this.onInteraction(component.event, {
            componentId: component.id,
            componentType: 'button',
            text: component.text
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
        wrapper.className = 'nsm-json-ui-input-wrapper';

        if (component.label) {
          const label = document.createElement('label');
          label.textContent = component.label;
          label.className = 'nsm-json-ui-input-label';
          wrapper.appendChild(label);
        }

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'nsm-json-ui-input';
        input.placeholder = component.placeholder || '';
        input.required = component.required || false;
        if (component.id) input.id = component.id;

        const changeHandler = (e: Event) => {
          const target = e.target as HTMLInputElement;
          this.onInteraction(component.event, {
            componentId: component.id,
            componentType: 'input',
            value: target.value
          });
        };

        input.addEventListener('change', changeHandler);
        this.eventListeners.push(() => {
          input.removeEventListener('change', changeHandler);
        });

        wrapper.appendChild(input);
        return wrapper;
      }

      case 'textarea': {
        const wrapper = document.createElement('div');
        wrapper.className = 'nsm-json-ui-textarea-wrapper';

        if (component.label) {
          const label = document.createElement('label');
          label.textContent = component.label;
          label.className = 'nsm-json-ui-textarea-label';
          wrapper.appendChild(label);
        }

        const textarea = document.createElement('textarea');
        textarea.className = 'nsm-json-ui-textarea';
        textarea.placeholder = component.placeholder || '';
        textarea.rows = component.rows || 4;
        if (component.id) textarea.id = component.id;

        const changeHandler = (e: Event) => {
          const target = e.target as HTMLTextAreaElement;
          this.onInteraction(component.event, {
            componentId: component.id,
            componentType: 'textarea',
            value: target.value
          });
        };

        textarea.addEventListener('change', changeHandler);
        this.eventListeners.push(() => {
          textarea.removeEventListener('change', changeHandler);
        });

        wrapper.appendChild(textarea);
        return wrapper;
      }

      case 'select': {
        const wrapper = document.createElement('div');
        wrapper.className = 'nsm-json-ui-select-wrapper';

        if (component.label) {
          const label = document.createElement('label');
          label.textContent = component.label;
          label.className = 'nsm-json-ui-select-label';
          wrapper.appendChild(label);
        }

        const select = document.createElement('select');
        select.className = 'nsm-json-ui-select';
        if (component.id) select.id = component.id;

        for (const option of component.options) {
          const optionElement = document.createElement('option');
          optionElement.value = option.value;
          optionElement.textContent = option.text;
          select.appendChild(optionElement);
        }

        const changeHandler = (e: Event) => {
          const target = e.target as HTMLSelectElement;
          this.onInteraction(component.event, {
            componentId: component.id,
            componentType: 'select',
            value: target.value,
            selectedIndex: target.selectedIndex
          });
        };

        select.addEventListener('change', changeHandler);
        this.eventListeners.push(() => {
          select.removeEventListener('change', changeHandler);
        });

        wrapper.appendChild(select);
        return wrapper;
      }

      case 'container': {
        const container = document.createElement('div');
        container.className = `nsm-json-ui-container nsm-json-ui-container-${component.layout || 'vertical'}`;
        if (component.id) container.id = component.id;

        for (const child of component.children) {
          const childElement = this.createComponent(child);
          if (childElement) {
            container.appendChild(childElement);
          }
        }

        return container;
      }

      default:
        console.warn('Unknown JSON-UI component type:', (component as any).type);
        return null;
    }
  }

  /**
   * Inject basic styles for JSON-UI
   */
  private injectStyles(): void {
    // Check if styles already exist
    if (document.getElementById('nsm-json-ui-styles')) {
      return;
    }

    const styles = document.createElement('style');
    styles.id = 'nsm-json-ui-styles';
    styles.textContent = `
      .nsm-json-ui {
        font-family: system-ui, -apple-system, sans-serif;
        padding: 16px;
        max-width: 600px;
        margin: 0 auto;
      }

      .nsm-json-ui-title {
        font-size: 24px;
        margin: 0 0 8px 0;
        color: #333;
      }

      .nsm-json-ui-description {
        color: #666;
        margin: 0 0 16px 0;
      }

      .nsm-json-ui-components {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .nsm-json-ui-label {
        display: block;
        margin-bottom: 4px;
        color: #333;
        font-weight: 500;
      }

      .nsm-json-ui-button {
        padding: 8px 16px;
        border: 1px solid #ccc;
        border-radius: 4px;
        background: #fff;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.2s;
      }

      .nsm-json-ui-button:hover:not(:disabled) {
        background: #f0f0f0;
      }

      .nsm-json-ui-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .nsm-json-ui-input-wrapper,
      .nsm-json-ui-textarea-wrapper,
      .nsm-json-ui-select-wrapper {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .nsm-json-ui-input-label,
      .nsm-json-ui-textarea-label,
      .nsm-json-ui-select-label {
        font-size: 14px;
        color: #333;
        font-weight: 500;
      }

      .nsm-json-ui-input,
      .nsm-json-ui-textarea,
      .nsm-json-ui-select {
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 14px;
        font-family: inherit;
      }

      .nsm-json-ui-input:focus,
      .nsm-json-ui-textarea:focus,
      .nsm-json-ui-select:focus {
        outline: none;
        border-color: #0066cc;
        box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2);
      }

      .nsm-json-ui-container {
        display: flex;
        gap: 12px;
      }

      .nsm-json-ui-container-vertical {
        flex-direction: column;
      }

      .nsm-json-ui-container-horizontal {
        flex-direction: row;
        align-items: center;
      }

      .nsm-json-ui-container-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Clean up event listeners and DOM
   */
  cleanup(): void {
    // Remove all event listeners
    for (const removeListener of this.eventListeners) {
      removeListener();
    }
    this.eventListeners = [];

    // Clear container
    this.container.innerHTML = '';
  }
}