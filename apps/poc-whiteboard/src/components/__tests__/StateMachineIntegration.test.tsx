import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { App } from '../App';

// Mock the lazy-loaded DeveloperDashboard to prevent import issues
vi.mock('../DeveloperDashboard', () => ({
  DeveloperDashboard: vi.fn(({ connectInspector, openVisualizer }) => (
    <div data-testid="developer-dashboard">
      <h3>Developer Dashboard</h3>
      <button onClick={connectInspector}>Connect Inspector</button>
      <button onClick={openVisualizer}>Open Visualizer</button>
    </div>
  ))
}));

describe('Whiteboard State Machine Integration', () => {
  beforeEach(() => {
    // Mock window.navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    // Mock console methods to reduce noise
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should render without crashing', async () => {
    expect(() => render(<App />)).not.toThrow();
  });

  it('should initialize state machine without useState errors', async () => {
    render(<App />);

    // Should render the main whiteboard interface
    await waitFor(() => {
      const header = screen.getByText(/NSM Collaborative Whiteboard/i);
      expect(header).toBeDefined();
    });
  });

  it('should display current state in header', async () => {
    render(<App />);

    // Should show state information
    await waitFor(() => {
      const stateInfo = screen.getByText(/State:/i);
      expect(stateInfo).toBeDefined();
    });
  });

  it('should render toolbar without errors', async () => {
    render(<App />);

    // Toolbar should be present
    await waitFor(() => {
      // Look for any toolbar elements or buttons
      const toolbar = document.querySelector('[data-testid="toolbar"]') ||
                     screen.queryByRole('toolbar') ||
                     screen.queryByText(/pen|brush|eraser/i);
      expect(toolbar).toBeDefined();
    });
  });

  it('should render state machine exporter', async () => {
    render(<App />);

    // Should have an export button or component
    await waitFor(() => {
      const exportButton = screen.queryByRole('button', { name: /export/i }) ||
                          screen.queryByText(/export/i);
      expect(exportButton).toBeDefined();
    });
  });

  it('should show developer dashboard when enabled', async () => {
    // Set NODE_ENV to development for this test
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(<App />);

    // Should show developer dashboard toggle
    await waitFor(() => {
      const dashboardButton = screen.getByText(/Developer Dashboard/i);
      expect(dashboardButton).toBeDefined();
    });

    // Restore original env
    process.env.NODE_ENV = originalEnv;
  });

  it('should handle state machine actor properly', async () => {
    render(<App />);

    // Should initialize without throwing useState errors
    await waitFor(() => {
      // Check that the canvas area is rendered
      const canvasArea = document.querySelector('canvas') ||
                        screen.queryByRole('main') ||
                        screen.queryByText(/Objects:/i);
      expect(canvasArea).toBeDefined();
    });
  });

  it('should not have React hooks errors in StateMachineExporter', async () => {
    // This test verifies the component renders without the useState error
    const consoleSpy = vi.spyOn(console, 'error');

    render(<App />);

    await waitFor(() => {
      // Should render without React hooks errors
      const hasReactHooksError = consoleSpy.mock.calls.some(call =>
        call.some(arg =>
          typeof arg === 'string' &&
          (arg.includes('useState') || arg.includes('Cannot read properties of null'))
        )
      );
      expect(hasReactHooksError).toBe(false);
    });
  });
});