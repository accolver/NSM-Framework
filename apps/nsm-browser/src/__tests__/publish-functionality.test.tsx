import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock authentication
const mockLogin = vi.fn();
const mockLogout = vi.fn();
vi.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: any) => children,
  useAuth: () => ({
    isAuthenticated: true, // Default to authenticated for tests
    pubkey: 'test-pubkey-123456789abcdef',
    signer: { /* mock signer */ },
    login: mockLogin,
    logout: mockLogout,
    error: null
  })
}));

// Mock NDK with publish tracking
const mockPublish = vi.fn();
vi.mock('@nostr-dev-kit/ndk', () => {
  // Mock NDKEvent class
  const MockNDKEvent = class {
    ndk: any;
    event: any;

    constructor(ndk: any, event: any) {
      this.ndk = ndk;
      this.event = event;
      // Copy event properties
      Object.assign(this, event);
    }

    async publish() {
      return mockPublish(this.event);
    }
  };

  return {
    default: vi.fn(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      pool: true,
      fetchEvents: vi.fn().mockResolvedValue(new Set()),
      publish: mockPublish
    })),
    NDKEvent: MockNDKEvent
  };
});

describe('Publish Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.alert = vi.fn();
    mockPublish.mockResolvedValue(undefined);
    mockLogin.mockResolvedValue(undefined);
    mockLogout.mockReturnValue(undefined);
  });

  it('should call NDK publish when publishing a state machine', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for connection
    await waitFor(() => {
      expect(screen.getByText(/Connected to Nostr relays/)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Go to publish tab
    await user.click(screen.getByRole('tab', { name: 'Publish' }));

    // Fill and submit form
    await user.type(screen.getByLabelText(/App Name/), 'Test Machine');
    await user.type(screen.getByLabelText(/Description/), 'Test Description');

    const machineJson = JSON.stringify({
      id: 'test',
      initial: 'idle',
      states: { idle: {} }
    });

    const machineInput = screen.getByLabelText(/XState Machine JSON/);
    await user.clear(machineInput);
    fireEvent.change(machineInput, { target: { value: machineJson } });

    await user.click(screen.getByText('🚀 Publish to Nostr'));

    // Verify that NDK publish was called
    expect(mockPublish).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 30079,
        content: expect.stringContaining('initialState'),
        tags: expect.arrayContaining([
          ['d', expect.any(String)],
          ['name', 'Test Machine'],
          ['description', 'Test Description'],
          ['engine', 'xstate']
        ])
      })
    );
  });

  it('should not publish when validation fails', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Connected to Nostr relays/)).toBeInTheDocument();
    }, { timeout: 5000 });

    await user.click(screen.getByRole('tab', { name: 'Publish' }));

    // Submit with invalid JSON
    await user.type(screen.getByLabelText(/App Name/), 'Invalid Machine');

    const machineInput = screen.getByLabelText(/XState Machine JSON/);
    await user.clear(machineInput);
    fireEvent.change(machineInput, { target: { value: 'invalid json' } });

    await user.click(screen.getByText('🚀 Publish to Nostr'));

    // Verify publish was not called
    expect(mockPublish).not.toHaveBeenCalled();

    // Verify error was shown in the form
    await waitFor(() => {
      expect(screen.getByText(/Invalid JSON/)).toBeInTheDocument();
    });
  });

  it('should handle publish errors gracefully', async () => {
    // Make publish throw an error
    mockPublish.mockRejectedValue(new Error('Publish failed'));

    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Connected to Nostr relays/)).toBeInTheDocument();
    }, { timeout: 5000 });

    await user.click(screen.getByRole('tab', { name: 'Publish' }));

    await user.type(screen.getByLabelText(/App Name/), 'Error Test');

    const machineInput = screen.getByLabelText(/XState Machine JSON/);
    await user.clear(machineInput);
    fireEvent.change(machineInput, {
      target: { value: JSON.stringify({ id: 'test', initial: 'idle', states: { idle: {} } }) }
    });

    await user.click(screen.getByText('🚀 Publish to Nostr'));

    // Should show error alert
    expect(global.alert).toHaveBeenCalledWith(
      expect.stringContaining('Failed to publish state machine')
    );
  });

  it('should require authentication before publishing', async () => {
    // Override the auth mock for this test to return unauthenticated
    vi.doMock('../contexts/AuthContext', () => ({
      AuthProvider: ({ children }: any) => children,
      useAuth: () => ({
        isAuthenticated: false,
        pubkey: null,
        signer: null,
        login: mockLogin,
        logout: mockLogout,
        error: null
      })
    }));

    // Re-import App after the mock override
    const { default: UnauthApp } = await import('../App');

    const user = userEvent.setup();
    render(<UnauthApp />);

    await waitFor(() => {
      expect(screen.getByText(/Connected to Nostr relays/)).toBeInTheDocument();
    }, { timeout: 5000 });

    await user.click(screen.getByRole('tab', { name: 'Publish' }));

    await user.type(screen.getByLabelText(/App Name/), 'Auth Test');

    const machineInput = screen.getByLabelText(/XState Machine JSON/);
    await user.clear(machineInput);
    fireEvent.change(machineInput, {
      target: { value: JSON.stringify({ id: 'test', initial: 'idle', states: { idle: {} } }) }
    });

    await user.click(screen.getByText('🚀 Publish to Nostr'));

    // Should show authentication required alert
    expect(global.alert).toHaveBeenCalledWith(
      'Please authenticate first to publish state machines.'
    );

    // Should not publish
    expect(mockPublish).not.toHaveBeenCalled();
  });
});