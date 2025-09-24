import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock the NDK module with proper event storage
vi.mock('@nostr-dev-kit/ndk', () => {
  let mockEvents = new Set();

  const MockNDK = vi.fn(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    pool: true,
    fetchEvents: vi.fn().mockImplementation(() => {
      // Return the events that have been "published"
      return Promise.resolve(mockEvents);
    }),
    publish: vi.fn().mockImplementation((event) => {
      // Add event to our mock storage when published
      const publishedEvent = {
        ...event,
        pubkey: 'test-pubkey',
        created_at: Date.now() / 1000,
        id: `event-${Date.now()}`,
        tags: event.tags || [],
        content: event.content || ''
      };
      mockEvents.add(publishedEvent);
      return Promise.resolve();
    })
  }));

  // Mock NDKEvent class
  const MockNDKEvent = class {
    constructor(ndk: any, event: any) {
      this.ndk = ndk;
      this.event = event;
      // Copy event properties
      Object.assign(this, event);
    }

    async publish() {
      // Add event to our mock storage when published
      const publishedEvent = {
        ...this.event,
        pubkey: 'test-pubkey',
        created_at: Date.now() / 1000,
        id: `event-${Date.now()}`,
        tags: this.event.tags || [],
        content: this.event.content || ''
      };
      mockEvents.add(publishedEvent);
      return Promise.resolve();
    }
  };

  return {
    default: MockNDK,
    NDKEvent: MockNDKEvent,
    // Reset function for tests
    __resetMockEvents: () => {
      mockEvents = new Set();
    }
  };
});

describe('Publish to Browse Integration', () => {
  beforeEach(() => {
    // Clear any mocked state
    vi.clearAllMocks();

    // Mock alert function for test environment
    global.alert = vi.fn();
  });

  it('should show published state machine in Browse tab after publishing', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for app to load and connect
    await waitFor(() => {
      expect(screen.getByText(/Connected to Nostr relays/)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Navigate to Publish tab
    await user.click(screen.getByRole('tab', { name: 'Publish' }));

    // Fill out the publish form
    const nameInput = screen.getByLabelText(/App Name/);
    const descriptionInput = screen.getByLabelText(/Description/);
    const machineInput = screen.getByLabelText(/XState Machine JSON/);

    await user.type(nameInput, 'Test State Machine');
    await user.type(descriptionInput, 'A test machine for integration testing');

    const testMachine = JSON.stringify({
      id: 'test-machine',
      initial: 'idle',
      states: {
        idle: {
          on: { START: 'running' }
        },
        running: {
          on: { STOP: 'idle' }
        }
      }
    });

    await user.clear(machineInput);
    fireEvent.change(machineInput, { target: { value: testMachine } });

    // Submit the form
    await user.click(screen.getByText('🚀 Publish to Nostr'));

    // Should automatically switch to Browse tab after publishing
    await waitFor(() => {
      expect(screen.getByText('Published State Machines')).toBeInTheDocument();
    });

    // The published machine should appear in the browse list
    await waitFor(() => {
      expect(screen.getByText('Test State Machine')).toBeInTheDocument();
      expect(screen.getByText('A test machine for integration testing')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should show published machine when manually refreshing Browse tab', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for connection
    await waitFor(() => {
      expect(screen.getByText(/Connected to Nostr relays/)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Publish a machine first
    await user.click(screen.getByRole('tab', { name: 'Publish' }));

    await user.type(screen.getByLabelText(/App Name/), 'Refresh Test Machine');
    await user.type(screen.getByLabelText(/Description/), 'Testing refresh functionality');

    const machineJson = JSON.stringify({
      id: 'refresh-test',
      initial: 'waiting',
      states: { waiting: { on: { PROCEED: 'done' } }, done: {} }
    });

    const machineInput = screen.getByLabelText(/XState Machine JSON/);
    await user.clear(machineInput);
    fireEvent.change(machineInput, { target: { value: machineJson } });

    await user.click(screen.getByText('🚀 Publish to Nostr'));

    // Go to Browse tab
    await user.click(screen.getByRole('tab', { name: 'Browse' }));

    // Click refresh button
    await user.click(screen.getByText('🔄 Refresh'));

    // Should see the published machine
    await waitFor(() => {
      expect(screen.getByText('Refresh Test Machine')).toBeInTheDocument();
      expect(screen.getByText('Testing refresh functionality')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should persist published machines across tab switches', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Connected to Nostr relays/)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Publish first machine
    await user.click(screen.getByRole('tab', { name: 'Publish' }));
    await user.type(screen.getByLabelText(/App Name/), 'Persistent Machine 1');
    await user.type(screen.getByLabelText(/Description/), 'First persistent machine');

    const machine1 = JSON.stringify({
      id: 'persistent-1',
      initial: 'start',
      states: { start: { on: { NEXT: 'end' } }, end: {} }
    });

    const machineInput = screen.getByLabelText(/XState Machine JSON/);
    await user.clear(machineInput);
    fireEvent.change(machineInput, { target: { value: machine1 } });
    await user.click(screen.getByText('🚀 Publish to Nostr'));

    // Publish second machine
    await user.click(screen.getByRole('tab', { name: 'Publish' }));

    // Clear and enter new values using fireEvent for problematic inputs
    const nameInput2 = screen.getByLabelText(/App Name/);
    const descInput2 = screen.getByLabelText(/Description/);
    const machineInput2 = screen.getByLabelText(/XState Machine JSON/);

    fireEvent.change(nameInput2, { target: { value: 'Persistent Machine 2' } });
    fireEvent.change(descInput2, { target: { value: 'Second persistent machine' } });

    const machine2 = JSON.stringify({
      id: 'persistent-2',
      initial: 'ready',
      states: { ready: { on: { GO: 'active' } }, active: {} }
    });

    fireEvent.change(machineInput2, { target: { value: machine2 } });
    await user.click(screen.getByText('🚀 Publish to Nostr'));

    // Switch to Browse and verify both machines are there
    await user.click(screen.getByRole('tab', { name: 'Browse' }));

    await waitFor(() => {
      expect(screen.getByText('Persistent Machine 1')).toBeInTheDocument();
      expect(screen.getByText('Persistent Machine 2')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Switch back and forth between tabs - machines should persist
    await user.click(screen.getByRole('tab', { name: 'Publish' }));
    await user.click(screen.getByRole('tab', { name: 'Browse' }));

    expect(screen.getByText('Persistent Machine 1')).toBeInTheDocument();
    expect(screen.getByText('Persistent Machine 2')).toBeInTheDocument();
  });
});