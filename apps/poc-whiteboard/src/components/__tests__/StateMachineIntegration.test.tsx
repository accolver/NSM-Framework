import { render, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'bun:test';
import { vi } from 'bun:test';
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
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true
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
    const { container } = render(<App />);

    // Should render the main whiteboard interface
    await waitFor(() => {
      expect(container.textContent).toContain('NSM Collaborative Whiteboard');
    });
  });

  it('should display current state in header', async () => {
    const { container } = render(<App />);

    // Should show state information
    await waitFor(() => {
      expect(container.textContent).toContain('State:');
    });
  });

  it('should render toolbar without errors', async () => {
    const { container } = render(<App />);

    // Toolbar should be present - check for drawing tool text
    await waitFor(() => {
      expect(container.textContent).toMatch(/pen|brush|eraser/i);
    });
  });

  it('should render state machine exporter', async () => {
    const { container } = render(<App />);

    // Should have export functionality
    await waitFor(() => {
      expect(container.textContent).toMatch(/export/i);
    });
  });

  it('should show developer dashboard when enabled', async () => {
    // Set NODE_ENV to development for this test
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const { container } = render(<App />);

    // Should show developer dashboard toggle
    await waitFor(() => {
      expect(container.textContent).toMatch(/Developer Dashboard/i);
    });

    // Restore original env
    process.env.NODE_ENV = originalEnv;
  });

  it('should handle state machine actor properly', async () => {
    const { container } = render(<App />);

    // Should initialize without throwing useState errors
    await waitFor(() => {
      // Check that object count is displayed (indicates proper state management)
      expect(container.textContent).toMatch(/Objects:/i);
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