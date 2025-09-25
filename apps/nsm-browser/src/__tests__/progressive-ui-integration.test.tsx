import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { UIResolver } from '@nsm/client/ui/ui-resolver';
import ProgressiveUIRenderer from '../components/ProgressiveUIRenderer';
import ApplicationLauncher from '../components/ApplicationLauncher';

// Mock UI Resolver
vi.mock('@nsm/client/ui/ui-resolver');

// Mock application data with UI fallbacks
const mockApplicationWithUI = {
  name: 'Test App',
  description: 'Test application with progressive UI',
  author: 'npub1test...',
  timestamp: Date.now() / 1000,
  machine: JSON.stringify({
    id: 'testApp',
    initial: 'idle',
    states: {
      idle: { on: { START: 'running' } }
    }
  }),
  ui: {
    fallbacks: [
      {
        type: 'mcp-ui',
        mcpServerUrl: 'https://example.com/ui-server',
        componentPath: '/test-app-ui',
        capabilities: ['remote-dom', 'state-sync']
      },
      {
        type: 'web-components',
        bundle: {
          url: 'https://example.com/test-app-components.js',
          integrity: 'sha256-abc123...',
          components: ['test-app-main', 'test-app-controls']
        }
      },
      {
        type: 'json-ui',
        schema: {
          title: 'Test Application',
          description: 'Fallback UI',
          components: [
            { type: 'button', text: 'Start', event: 'START' },
            { type: 'label', text: 'Application Status: Idle' }
          ]
        }
      }
    ]
  }
};

describe('Progressive UI Renderer', () => {
  let mockUIResolver: UIResolver;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock UI resolver instance
    mockUIResolver = {
      detectCapabilities: vi.fn(),
      selectFallback: vi.fn(),
      renderUI: vi.fn(),
      cleanup: vi.fn()
    } as any;

    (UIResolver as any).mockImplementation(() => mockUIResolver);
  });

  describe('Capability Detection', () => {
    it('should detect client capabilities on mount', () => {
      mockUIResolver.detectCapabilities.mockReturnValue({
        mcpUI: true,
        webComponents: true,
        jsonUI: true
      });

      render(<ProgressiveUIRenderer application={mockApplicationWithUI} />);

      expect(mockUIResolver.detectCapabilities).toHaveBeenCalled();
    });

    it('should fallback to JSON-UI when MCP-UI unavailable', () => {
      mockUIResolver.detectCapabilities.mockReturnValue({
        mcpUI: false,
        webComponents: false,
        jsonUI: true
      });

      mockUIResolver.selectFallback.mockReturnValue(mockApplicationWithUI.ui.fallbacks[2]); // JSON-UI

      render(<ProgressiveUIRenderer application={mockApplicationWithUI} />);

      expect(mockUIResolver.selectFallback).toHaveBeenCalledWith(mockApplicationWithUI.ui.fallbacks);
    });

    it('should prefer MCP-UI when available', () => {
      mockUIResolver.detectCapabilities.mockReturnValue({
        mcpUI: true,
        webComponents: true,
        jsonUI: true
      });

      mockUIResolver.selectFallback.mockReturnValue(mockApplicationWithUI.ui.fallbacks[0]); // MCP-UI

      render(<ProgressiveUIRenderer application={mockApplicationWithUI} />);

      expect(mockUIResolver.selectFallback).toHaveBeenCalledWith(mockApplicationWithUI.ui.fallbacks);
    });
  });

  describe('UI Rendering', () => {
    it('should render selected UI specification', async () => {
      const mockContainer = document.createElement('div');
      mockUIResolver.selectFallback.mockReturnValue(mockApplicationWithUI.ui.fallbacks[2]);
      mockUIResolver.renderUI.mockResolvedValue({ success: true, renderer: 'json-ui' });

      render(<ProgressiveUIRenderer application={mockApplicationWithUI} />);

      await waitFor(() => {
        expect(mockUIResolver.renderUI).toHaveBeenCalledWith(
          mockApplicationWithUI.ui.fallbacks[2],
          expect.any(HTMLElement),
          expect.any(Function)
        );
      });
    });

    it('should show loading state during UI rendering', () => {
      mockUIResolver.selectFallback.mockReturnValue(mockApplicationWithUI.ui.fallbacks[0]);
      mockUIResolver.renderUI.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100)));

      render(<ProgressiveUIRenderer application={mockApplicationWithUI} />);

      expect(screen.getByText(/loading ui/i)).toBeInTheDocument();
    });

    it('should show error message when rendering fails', async () => {
      mockUIResolver.selectFallback.mockReturnValue(mockApplicationWithUI.ui.fallbacks[0]);
      mockUIResolver.renderUI.mockResolvedValue({
        success: false,
        error: 'Failed to load MCP-UI server'
      });

      render(<ProgressiveUIRenderer application={mockApplicationWithUI} />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load ui/i)).toBeInTheDocument();
      });
    });

    it('should attempt fallback when primary renderer fails', async () => {
      mockUIResolver.selectFallback
        .mockReturnValueOnce(mockApplicationWithUI.ui.fallbacks[0]) // First attempt: MCP-UI
        .mockReturnValueOnce(mockApplicationWithUI.ui.fallbacks[1]); // Second attempt: Web Components

      mockUIResolver.renderUI
        .mockResolvedValueOnce({ success: false, error: 'MCP server unavailable' })
        .mockResolvedValueOnce({ success: true, renderer: 'web-components' });

      render(<ProgressiveUIRenderer application={mockApplicationWithUI} />);

      await waitFor(() => {
        expect(mockUIResolver.renderUI).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Event Handling', () => {
    it('should handle UI events and translate to NSM events', async () => {
      const mockOnNSMEvent = vi.fn();
      mockUIResolver.selectFallback.mockReturnValue(mockApplicationWithUI.ui.fallbacks[2]);
      mockUIResolver.renderUI.mockImplementation(async (spec, container, eventHandler) => {
        // Simulate button click event
        setTimeout(() => {
          eventHandler({
            type: 'START',
            source: 'ui',
            data: { componentId: 'start-button' }
          });
        }, 50);
        return { success: true, renderer: 'json-ui' };
      });

      render(
        <ProgressiveUIRenderer
          application={mockApplicationWithUI}
          onNSMEvent={mockOnNSMEvent}
        />
      );

      await waitFor(() => {
        expect(mockOnNSMEvent).toHaveBeenCalledWith({
          type: 'START',
          source: 'ui',
          data: { componentId: 'start-button' }
        });
      });
    });

    it('should provide state updates to UI renderer', async () => {
      const mockStateUpdate = { value: 'running', context: { count: 5 } };
      mockUIResolver.selectFallback.mockReturnValue(mockApplicationWithUI.ui.fallbacks[2]);
      mockUIResolver.renderUI.mockResolvedValue({ success: true, renderer: 'json-ui' });

      const { rerender } = render(
        <ProgressiveUIRenderer
          application={mockApplicationWithUI}
          currentState={mockStateUpdate}
        />
      );

      // Update state
      const newState = { value: 'paused', context: { count: 10 } };
      rerender(
        <ProgressiveUIRenderer
          application={mockApplicationWithUI}
          currentState={newState}
        />
      );

      // Should trigger re-render with new state
      expect(mockUIResolver.renderUI).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('should cleanup UI renderer on unmount', () => {
      const { unmount } = render(<ProgressiveUIRenderer application={mockApplicationWithUI} />);

      unmount();

      expect(mockUIResolver.cleanup).toHaveBeenCalled();
    });

    it('should cleanup before switching applications', () => {
      const { rerender } = render(<ProgressiveUIRenderer application={mockApplicationWithUI} />);

      const newApplication = { ...mockApplicationWithUI, name: 'Different App' };
      rerender(<ProgressiveUIRenderer application={newApplication} />);

      expect(mockUIResolver.cleanup).toHaveBeenCalledTimes(1); // Called before new render
    });
  });

  describe('Renderer Type Indicators', () => {
    it('should show renderer type indicator for MCP-UI', async () => {
      mockUIResolver.selectFallback.mockReturnValue(mockApplicationWithUI.ui.fallbacks[0]);
      mockUIResolver.renderUI.mockResolvedValue({ success: true, renderer: 'mcp-ui' });

      render(<ProgressiveUIRenderer application={mockApplicationWithUI} />);

      await waitFor(() => {
        expect(screen.getByText(/mcp-ui/i)).toBeInTheDocument();
      });
    });

    it('should show renderer type indicator for Web Components', async () => {
      mockUIResolver.selectFallback.mockReturnValue(mockApplicationWithUI.ui.fallbacks[1]);
      mockUIResolver.renderUI.mockResolvedValue({ success: true, renderer: 'web-components' });

      render(<ProgressiveUIRenderer application={mockApplicationWithUI} />);

      await waitFor(() => {
        expect(screen.getByText(/web components/i)).toBeInTheDocument();
      });
    });

    it('should show renderer type indicator for JSON-UI', async () => {
      mockUIResolver.selectFallback.mockReturnValue(mockApplicationWithUI.ui.fallbacks[2]);
      mockUIResolver.renderUI.mockResolvedValue({ success: true, renderer: 'json-ui' });

      render(<ProgressiveUIRenderer application={mockApplicationWithUI} />);

      await waitFor(() => {
        expect(screen.getByText(/json-ui/i)).toBeInTheDocument();
      });
    });
  });
});

describe('Application Launcher Integration', () => {
  let mockUIResolver: UIResolver;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUIResolver = {
      detectCapabilities: vi.fn(),
      selectFallback: vi.fn(),
      renderUI: vi.fn(),
      cleanup: vi.fn()
    } as any;

    (UIResolver as any).mockImplementation(() => mockUIResolver);
  });

  describe('Application Lifecycle', () => {
    it('should initialize XState machine with application config', () => {
      render(<ApplicationLauncher application={mockApplicationWithUI} />);

      expect(screen.getByTestId('xstate-machine')).toBeInTheDocument();
    });

    it('should sync UI state with XState machine state', async () => {
      mockUIResolver.selectFallback.mockReturnValue(mockApplicationWithUI.ui.fallbacks[2]);
      mockUIResolver.renderUI.mockResolvedValue({ success: true, renderer: 'json-ui' });

      render(<ApplicationLauncher application={mockApplicationWithUI} />);

      await waitFor(() => {
        expect(screen.getByTestId('current-state')).toHaveTextContent('idle');
      });
    });

    it('should send NSM events to XState machine', async () => {
      const user = userEvent.setup();
      mockUIResolver.selectFallback.mockReturnValue(mockApplicationWithUI.ui.fallbacks[2]);

      // Mock UI rendering to create interactive button
      mockUIResolver.renderUI.mockImplementation(async (spec, container, eventHandler) => {
        const button = document.createElement('button');
        button.textContent = 'Start';
        button.onclick = () => eventHandler({ type: 'START', source: 'ui', data: {} });
        container.appendChild(button);
        return { success: true, renderer: 'json-ui' };
      });

      render(<ApplicationLauncher application={mockApplicationWithUI} />);

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /start/i });
        expect(button).toBeInTheDocument();
      });

      const startButton = screen.getByRole('button', { name: /start/i });
      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByTestId('current-state')).toHaveTextContent('running');
      });
    });
  });

  describe('State Persistence', () => {
    it('should save application state to localStorage', async () => {
      const mockSetItem = vi.spyOn(Storage.prototype, 'setItem');

      render(<ApplicationLauncher application={mockApplicationWithUI} />);

      // Trigger state change
      fireEvent.click(screen.getByTestId('trigger-state-change'));

      await waitFor(() => {
        expect(mockSetItem).toHaveBeenCalledWith(
          `nsm-app-state-${mockApplicationWithUI.name}`,
          expect.stringContaining('"value":"running"')
        );
      });

      mockSetItem.mockRestore();
    });

    it('should restore application state from localStorage', () => {
      const mockGetItem = vi.spyOn(Storage.prototype, 'getItem');
      mockGetItem.mockReturnValue(JSON.stringify({
        value: 'running',
        context: { count: 5 }
      }));

      render(<ApplicationLauncher application={mockApplicationWithUI} />);

      expect(screen.getByTestId('current-state')).toHaveTextContent('running');

      mockGetItem.mockRestore();
    });

    it('should handle corrupted localStorage data gracefully', () => {
      const mockGetItem = vi.spyOn(Storage.prototype, 'getItem');
      mockGetItem.mockReturnValue('invalid json');

      render(<ApplicationLauncher application={mockApplicationWithUI} />);

      // Should fall back to initial state
      expect(screen.getByTestId('current-state')).toHaveTextContent('idle');

      mockGetItem.mockRestore();
    });
  });

  describe('Error Boundaries', () => {
    it('should catch and display XState machine errors', () => {
      const appWithInvalidMachine = {
        ...mockApplicationWithUI,
        machine: 'invalid json'
      };

      render(<ApplicationLauncher application={appWithInvalidMachine} />);

      expect(screen.getByText(/failed to load application/i)).toBeInTheDocument();
    });

    it('should recover from UI rendering failures', async () => {
      mockUIResolver.selectFallback
        .mockReturnValueOnce(mockApplicationWithUI.ui.fallbacks[0])
        .mockReturnValueOnce(mockApplicationWithUI.ui.fallbacks[2]);

      mockUIResolver.renderUI
        .mockRejectedValueOnce(new Error('Rendering failed'))
        .mockResolvedValueOnce({ success: true, renderer: 'json-ui' });

      render(<ApplicationLauncher application={mockApplicationWithUI} />);

      await waitFor(() => {
        expect(screen.getByText(/json-ui/i)).toBeInTheDocument();
      });
    });
  });
});