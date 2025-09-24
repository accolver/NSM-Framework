import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';

// Create a mock state that can be changed per test
let mockClientState = {
  client: {
    ndk: {
      fetchEvents: vi.fn().mockResolvedValue([])
    }
  },
  status: 'connected',
  relayStatuses: [
    { url: 'wss://relay.damus.io', status: 'connected' },
    { url: 'wss://nos.lol', status: 'connected' },
    { url: 'wss://relay.nostr.band', status: 'connecting' }
  ],
  reconnect: vi.fn(),
  isConnected: true
};

// Mock the useNSMClient hook
vi.mock('../hooks/useNSMClient', () => ({
  useNSMClient: () => mockClientState
}));

describe('Relay Status Indicators', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock state to default connected state
    mockClientState = {
      client: {
        ndk: {
          fetchEvents: vi.fn().mockResolvedValue([])
        }
      },
      status: 'connected',
      relayStatuses: [
        { url: 'wss://relay.damus.io', status: 'connected' },
        { url: 'wss://nos.lol', status: 'connected' },
        { url: 'wss://relay.nostr.band', status: 'connecting' }
      ],
      reconnect: vi.fn(),
      isConnected: true
    };
  });

  it('should show relay status indicators with correct colors', async () => {
    render(<App />);

    // Check that overall status shows connected
    await waitFor(() => {
      expect(screen.getByText(/Connected to Nostr relays/)).toBeInTheDocument();
    });

    // Check that relay indicators are rendered
    await waitFor(() => {
      const relayIndicators = document.querySelectorAll('.relay-indicator');
      expect(relayIndicators).toHaveLength(3);

      // Check that connected relays have the correct class
      const connectedIndicators = document.querySelectorAll('.relay-indicator.status-connected');
      expect(connectedIndicators).toHaveLength(2);

      // Check that connecting relays have the correct class
      const connectingIndicators = document.querySelectorAll('.relay-indicator.status-connecting');
      expect(connectingIndicators).toHaveLength(1);
    });

    // Check that relay URLs are displayed without wss://
    expect(screen.getByText('relay.damus.io')).toBeInTheDocument();
    expect(screen.getByText('nos.lol')).toBeInTheDocument();
    expect(screen.getByText('relay.nostr.band')).toBeInTheDocument();
  });

  it('should handle disconnected relay status correctly', async () => {
    // Update the mock state for this test
    mockClientState = {
      client: null,
      status: 'error',
      relayStatuses: [
        { url: 'wss://relay.damus.io', status: 'disconnected' },
        { url: 'wss://nos.lol', status: 'disconnected' },
        { url: 'wss://relay.nostr.band', status: 'disconnected' }
      ],
      reconnect: vi.fn(),
      isConnected: false
    };

    render(<App />);

    // Check that overall status shows error
    await waitFor(() => {
      expect(screen.getByText(/Connection error/)).toBeInTheDocument();
    });

    // Check that retry button is visible
    expect(screen.getByText('Retry')).toBeInTheDocument();

    // Check that all relay indicators have disconnected status
    await waitFor(() => {
      const disconnectedIndicators = document.querySelectorAll('.relay-indicator.status-disconnected');
      expect(disconnectedIndicators).toHaveLength(3);
    });
  });
});