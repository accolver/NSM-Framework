import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock NDK with persistent storage
let mockEventStorage: any[] = [];

vi.mock('@nostr-dev-kit/ndk', () => {
  // Mock NDKEvent class
  const MockNDKEvent = class {
    constructor(ndk: any, event: any) {
      this.ndk = ndk;
      this.event = event;
      // Copy event properties
      Object.assign(this, event);
    }

    async publish() {
      // Add event to storage
      const publishedEvent = {
        ...this.event,
        pubkey: 'test-pubkey',
        created_at: Date.now() / 1000,
        id: `event-${Date.now()}`,
        tags: this.event.tags || [],
        content: this.event.content || ''
      };
      mockEventStorage.push(publishedEvent);
      return Promise.resolve();
    }
  };

  return {
    default: vi.fn(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      pool: true,
      fetchEvents: vi.fn().mockImplementation(() => {
        // Return published events
        return Promise.resolve(new Set(mockEventStorage));
      }),
      publish: vi.fn().mockImplementation((event) => {
        // Add event to storage
        const publishedEvent = {
          ...event,
          pubkey: 'test-pubkey',
          created_at: Date.now() / 1000,
          id: `event-${Date.now()}`,
          tags: event.tags || [],
          content: event.content || ''
        };
        mockEventStorage.push(publishedEvent);
        return Promise.resolve();
      })
    })),
    NDKEvent: MockNDKEvent
  };
});

describe('Browse Refresh Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.alert = vi.fn();
    mockEventStorage = []; // Clear storage
  });

  it('should show published machine after refreshing Browse tab', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for connection
    await waitFor(() => {
      expect(screen.getByText(/Connected to Nostr relays/)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Verify Browse is initially empty (except for examples)
    expect(screen.getByText('Published State Machines')).toBeInTheDocument();

    // Go to Publish tab and publish a machine
    await user.click(screen.getByRole('tab', { name: 'Publish' }));

    await user.type(screen.getByLabelText(/App Name/), 'Browse Refresh Test');
    await user.type(screen.getByLabelText(/Description/), 'Testing browse refresh after publish');

    const machineJson = JSON.stringify({
      id: 'browse-refresh-test',
      initial: 'start',
      states: {
        start: { on: { NEXT: 'end' } },
        end: {}
      }
    });

    const machineInput = screen.getByLabelText(/XState Machine JSON/);
    await user.clear(machineInput);
    fireEvent.change(machineInput, { target: { value: machineJson } });

    await user.click(screen.getByText('🚀 Publish to Nostr'));

    // Should automatically switch to Browse tab
    await waitFor(() => {
      expect(screen.getByText('Published State Machines')).toBeInTheDocument();
    });

    // The published machine should appear
    await waitFor(() => {
      expect(screen.getByText('Browse Refresh Test')).toBeInTheDocument();
      expect(screen.getByText('Testing browse refresh after publish')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Manually refresh and verify it persists
    await user.click(screen.getByText('🔄 Refresh'));

    await waitFor(() => {
      expect(screen.getByText('Browse Refresh Test')).toBeInTheDocument();
      expect(screen.getByText('Testing browse refresh after publish')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should accumulate multiple published machines', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Connected to Nostr relays/)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Publish first machine
    await user.click(screen.getByRole('tab', { name: 'Publish' }));

    await user.type(screen.getByLabelText(/App Name/), 'Machine One');
    await user.type(screen.getByLabelText(/Description/), 'First machine');

    let machineInput = screen.getByLabelText(/XState Machine JSON/);
    await user.clear(machineInput);
    fireEvent.change(machineInput, {
      target: { value: JSON.stringify({
        id: 'machine-one',
        initial: 'state1',
        states: { state1: {} }
      })}
    });

    await user.click(screen.getByText('🚀 Publish to Nostr'));

    // Wait for first machine to appear
    await waitFor(() => {
      expect(screen.getByText('Machine One')).toBeInTheDocument();
    });

    // Publish second machine
    await user.click(screen.getByRole('tab', { name: 'Publish' }));

    // Clear previous values and enter new ones
    await user.clear(screen.getByLabelText(/App Name/));
    await user.clear(screen.getByLabelText(/Description/));

    await user.type(screen.getByLabelText(/App Name/), 'Machine Two');
    await user.type(screen.getByLabelText(/Description/), 'Second machine');

    machineInput = screen.getByLabelText(/XState Machine JSON/);
    await user.clear(machineInput);
    fireEvent.change(machineInput, {
      target: { value: JSON.stringify({
        id: 'machine-two',
        initial: 'state2',
        states: { state2: {} }
      })}
    });

    await user.click(screen.getByText('🚀 Publish to Nostr'));

    // Both machines should be visible
    await waitFor(() => {
      expect(screen.getByText('Machine One')).toBeInTheDocument();
      expect(screen.getByText('Machine Two')).toBeInTheDocument();
    });

    // Refresh and verify both persist
    await user.click(screen.getByText('🔄 Refresh'));

    await waitFor(() => {
      expect(screen.getByText('Machine One')).toBeInTheDocument();
      expect(screen.getByText('Machine Two')).toBeInTheDocument();
    });
  });
});