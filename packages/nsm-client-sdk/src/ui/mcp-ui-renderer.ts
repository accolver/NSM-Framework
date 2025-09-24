/**
 * MCP-UI Remote DOM Renderer
 * Implements sandboxed execution of MCP-UI components with event mapping to NSM interactions
 */

import type { MCPUISpec } from '@nsm/core';

export interface MCPUIRendererOptions {
  container: HTMLElement;
  spec: MCPUISpec;
  onInteraction: (eventType: string, data: any) => void;
}

export interface MCPUIResource {
  uri: string;
  mimeType: 'text/html' | 'text/uri-list' | 'application/vnd.mcp-ui.remote-dom';
  text?: string;
  blob?: string;
}

export class MCPUIRenderer {
  private iframe: HTMLIFrameElement | null = null;
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  private container: HTMLElement;
  private spec: MCPUISpec;
  private onInteraction: (eventType: string, data: any) => void;

  constructor(options: MCPUIRendererOptions) {
    this.container = options.container;
    this.spec = options.spec;
    this.onInteraction = options.onInteraction;
  }

  /**
   * Render MCP-UI component in sandboxed iframe
   */
  async render(): Promise<void> {
    // Clean up any existing iframe
    this.cleanup();

    // Fetch the UI resource
    const resource = await this.fetchResource(this.spec.uri);

    // Create sandboxed iframe
    this.iframe = this.createSandboxedIframe();

    // Set up message handling for cross-frame communication
    this.setupMessageHandler();

    // Load content into iframe based on type
    await this.loadContent(resource);

    // Append to container
    this.container.appendChild(this.iframe);
  }

  /**
   * Fetch MCP-UI resource from Blossom or other source
   */
  private async fetchResource(uri: string): Promise<MCPUIResource> {
    // Handle different URI schemes
    if (uri.startsWith('blossom://')) {
      // Fetch from Blossom storage
      const hash = uri.replace('blossom://', '');
      const response = await fetch(`/blossom/${hash}`);
      const content = await response.text();

      return {
        uri,
        mimeType: 'application/vnd.mcp-ui.remote-dom',
        text: content
      };
    } else if (uri.startsWith('http://') || uri.startsWith('https://')) {
      // Direct HTTP(S) URL
      return {
        uri,
        mimeType: 'text/uri-list',
        text: uri
      };
    } else {
      // Inline content or other scheme
      return {
        uri,
        mimeType: 'text/html',
        text: uri
      };
    }
  }

  /**
   * Create sandboxed iframe with appropriate security settings
   */
  private createSandboxedIframe(): HTMLIFrameElement {
    const iframe = document.createElement('iframe');

    // Apply sandboxing based on spec
    const sandboxAttrs = ['allow-scripts'];

    if (this.spec.sandboxing?.iframe !== false) {
      sandboxAttrs.push('allow-forms', 'allow-modals');
    }

    iframe.setAttribute('sandbox', sandboxAttrs.join(' '));

    // Apply CSP if specified
    if (this.spec.sandboxing?.csp) {
      iframe.setAttribute('csp', this.spec.sandboxing.csp);
    }

    // Style the iframe
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';

    return iframe;
  }

  /**
   * Set up message handler for iframe communication
   */
  private setupMessageHandler(): void {
    this.messageHandler = (event: MessageEvent) => {
      // Verify message origin
      if (this.iframe && event.source !== this.iframe.contentWindow) {
        return;
      }

      // Handle MCP-UI events
      if (event.data?.type === 'mcp-ui-action') {
        const { action, payload } = event.data;

        // Map intent to NSM event if mapping exists
        if (this.spec.intents && this.spec.intents[action]) {
          const nsmEventType = this.spec.intents[action];
          this.onInteraction(nsmEventType, payload);
        } else {
          // Forward unmapped action
          this.onInteraction(action, payload);
        }
      }
    };

    window.addEventListener('message', this.messageHandler);
  }

  /**
   * Load content into iframe based on resource type
   */
  private async loadContent(resource: MCPUIResource): Promise<void> {
    if (!this.iframe) return;

    switch (resource.mimeType) {
      case 'text/html':
        // Direct HTML content
        this.iframe.srcdoc = this.wrapHtmlContent(resource.text || '');
        break;

      case 'text/uri-list':
        // External URL
        this.iframe.src = resource.text || '';
        break;

      case 'application/vnd.mcp-ui.remote-dom':
        // Remote DOM content - wrap in execution context
        const remoteDomContent = this.createRemoteDomWrapper(resource.text || '');
        this.iframe.srcdoc = remoteDomContent;
        break;

      default:
        console.warn('Unknown MCP-UI resource type:', resource.mimeType);
    }
  }

  /**
   * Wrap HTML content with MCP-UI bridge
   */
  private wrapHtmlContent(html: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; }
          </style>
        </head>
        <body>
          ${html}
          <script>
            // MCP-UI bridge
            window.mcpUI = {
              sendAction: function(action, payload) {
                window.parent.postMessage({
                  type: 'mcp-ui-action',
                  action: action,
                  payload: payload
                }, '*');
              }
            };

            // Intercept clicks on elements with data-action
            document.addEventListener('click', function(e) {
              const target = e.target.closest('[data-action]');
              if (target) {
                const action = target.getAttribute('data-action');
                const payload = target.getAttribute('data-payload');
                window.mcpUI.sendAction(action, payload ? JSON.parse(payload) : {});
                e.preventDefault();
              }
            });
          </script>
        </body>
      </html>
    `;
  }

  /**
   * Create Remote DOM execution wrapper
   */
  private createRemoteDomWrapper(script: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <script src="https://unpkg.com/@remote-dom/core/dist/index.js"></script>
          <style>
            body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; }
          </style>
        </head>
        <body>
          <div id="root"></div>
          <script>
            // Remote DOM execution context
            const { RemoteRoot, RemoteElement } = window.RemoteDOM;

            // Create remote root
            const root = new RemoteRoot(document.getElementById('root'));

            // MCP-UI API
            window.mcpUI = {
              root: root,
              createElement: (tag, props, children) => {
                const element = new RemoteElement(tag, props);
                if (children) {
                  children.forEach(child => element.appendChild(child));
                }
                return element;
              },
              sendAction: function(action, payload) {
                window.parent.postMessage({
                  type: 'mcp-ui-action',
                  action: action,
                  payload: payload
                }, '*');
              }
            };

            // Execute the Remote DOM script
            try {
              ${script}
            } catch (error) {
              console.error('Remote DOM execution error:', error);
            }
          </script>
        </body>
      </html>
    `;
  }

  /**
   * Clean up iframe and event listeners
   */
  cleanup(): void {
    if (this.iframe) {
      this.iframe.remove();
      this.iframe = null;
    }

    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
  }
}