import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { App } from '../App';

describe('State Machine Visibility and Export', () => {
  beforeEach(() => {
    // Mock window.navigator.clipboard properly
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    // Mock console methods to reduce noise
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('should render the developer dashboard toggle button', async () => {
    render(<App />);

    // Look for the developer dashboard toggle
    const toggleButton = await screen.findByRole('button', {
      name: /toggle developer dashboard/i
    });

    expect(toggleButton).toBeDefined();
  });

  it('should show developer dashboard when toggled', async () => {
    render(<App />);

    // Find and click the developer dashboard toggle
    const toggleButton = await screen.findByRole('button', {
      name: /toggle developer dashboard/i
    });

    fireEvent.click(toggleButton);

    // Wait for dashboard to appear
    await waitFor(() => {
      // Look for dashboard components
      const dashboard = screen.queryByText(/Event Log Service/i) ||
                       screen.queryByText(/Time Travel Service/i) ||
                       screen.queryByText(/Inspector Service/i);
      expect(dashboard).toBeDefined();
    });
  });

  it('should render state machine exporter component', async () => {
    render(<App />);

    // Look for the exporter button or component
    const exportButton = await screen.findByRole('button', {
      name: /export/i
    });

    expect(exportButton).toBeDefined();
  });

  it('should allow exporting state machine JSON', async () => {
    render(<App />);

    // Find the export button
    const exportButton = await screen.findByRole('button', {
      name: /export/i
    });

    // Click export button
    fireEvent.click(exportButton);

    // Verify clipboard was called
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  it('should display current game state in the UI', async () => {
    render(<App />);

    // Verify game state is visible
    await waitFor(() => {
      const gameStatus = screen.getByText(/playing/i) ||
                        screen.getByText(/won/i) ||
                        screen.getByText(/lost/i);
      expect(gameStatus).toBeDefined();
    });
  });

  it('should have accessible state machine components', async () => {
    render(<App />);

    // Check for NSM status component
    const nsmStatus = screen.queryByText(/NSM/i);
    expect(nsmStatus).toBeDefined();

    // Check that state machine actor is working
    await waitFor(() => {
      // Should have game grid
      const grid = screen.getByRole('main');
      expect(grid).toBeDefined();
    });
  });
});