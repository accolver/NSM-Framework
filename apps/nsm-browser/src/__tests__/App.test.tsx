import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the NSM Client before importing App
vi.mock('@nsm/client', () => ({
  NSMClient: class MockNSMClient {
    static isNip07Available() {
      return false;
    }
    async discoverApplications() {
      return [];
    }
    async connect() {
      return;
    }
    disconnect() {
      return;
    }
  }
}));

// Mock the useNSMClient hook
vi.mock('../hooks/useNSMClient', () => ({
  useNSMClient: () => ({
    client: null,
    status: 'connecting',
    relayStatuses: [],
    reconnect: vi.fn()
  })
}));

describe('NSM Browser App', () => {
  it('should be able to import App component', async () => {
    const { default: App } = await import('../App');
    expect(App).toBeDefined();
    expect(typeof App).toBe('function');
  });

  it('should render the main app structure', async () => {
    const { default: App } = await import('../App');
    render(<App />);

    // Check for main title
    expect(screen.getByText('NSM Browser')).toBeInTheDocument();
    expect(screen.getByText('Browse and Publish Nostr State Machines')).toBeInTheDocument();

    // Check for tab buttons
    expect(screen.getByRole('tab', { name: 'Browse' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Publish' })).toBeInTheDocument();
  });

  it('should switch between tabs', async () => {
    const { default: App } = await import('../App');
    render(<App />);

    const browseTab = screen.getByRole('tab', { name: 'Browse' });
    const publishTab = screen.getByRole('tab', { name: 'Publish' });

    // Browse tab should be active by default
    expect(browseTab).toHaveAttribute('aria-selected', 'true');
    expect(publishTab).toHaveAttribute('aria-selected', 'false');

    // Click publish tab
    fireEvent.click(publishTab);

    await waitFor(() => {
      expect(publishTab).toHaveAttribute('aria-selected', 'true');
      expect(browseTab).toHaveAttribute('aria-selected', 'false');
    });
  });

  it('should show connection status', async () => {
    const { default: App } = await import('../App');
    render(<App />);

    // Should show connecting status
    expect(screen.getByText(/Status:/)).toBeInTheDocument();
    expect(screen.getByText(/Connecting to relays/)).toBeInTheDocument();
  });
});