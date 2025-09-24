import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock NDK with full workflow support
let publishedEvents: any[] = [];

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
      // Store the published event
      const publishedEvent = {
        ...this.event,
        pubkey: 'npub1test...',
        created_at: Date.now() / 1000,
        id: `event-${Date.now()}`,
        tags: this.event.tags || [],
        content: this.event.content || ''
      };
      publishedEvents.push(publishedEvent);
      return Promise.resolve();
    }
  };

  return {
    default: vi.fn(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      pool: true,
      fetchEvents: vi.fn().mockImplementation(() => {
        // Return all published events as a Set (as NDK does)
        return Promise.resolve(new Set(publishedEvents));
      }),
      publish: vi.fn().mockImplementation((event) => {
        // Store the published event
        const publishedEvent = {
          ...event,
          pubkey: 'npub1test...',
          created_at: Date.now() / 1000,
          id: `event-${Date.now()}`,
          tags: event.tags || [],
          content: event.content || ''
        };
        publishedEvents.push(publishedEvent);
        return Promise.resolve();
      })
    })),
    NDKEvent: MockNDKEvent
  };
});

describe('Complete Publish-Browse Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.alert = vi.fn();
    publishedEvents = []; // Clear published events

    // Mock clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined)
      },
      configurable: true
    });
  });

  it('should complete full workflow: connect → publish → browse → refresh', async () => {
    const user = userEvent.setup();
    render(<App />);

    // 1. CONNECT - Wait for app to connect to Nostr relays
    await waitFor(() => {
      expect(screen.getByText(/Connected to Nostr relays/)).toBeInTheDocument();
    }, { timeout: 5000 });

    // 2. INITIAL BROWSE - Should show empty state or examples only
    expect(screen.getByText('Published State Machines')).toBeInTheDocument();

    // 3. PUBLISH - Go to publish tab and create a new state machine
    await user.click(screen.getByRole('tab', { name: 'Publish' }));

    // Fill out the publish form
    await user.type(screen.getByLabelText(/App Name/), 'Complete Workflow Test');
    await user.type(screen.getByLabelText(/Description/), 'Testing the complete publish-browse workflow');

    const testStateMachine = {
      id: 'workflow-test',
      initial: 'starting',
      states: {
        starting: {
          on: {
            BEGIN: 'working',
            SKIP: 'completed'
          }
        },
        working: {
          on: {
            COMPLETE: 'completed',
            RESTART: 'starting'
          }
        },
        completed: {
          type: 'final'
        }
      }
    };

    const machineInput = screen.getByLabelText(/XState Machine JSON/);
    await user.clear(machineInput);
    fireEvent.change(machineInput, {
      target: { value: JSON.stringify(testStateMachine, null, 2) }
    });

    // 4. SUBMIT - Publish the state machine
    await user.click(screen.getByText('🚀 Publish to Nostr'));

    // Should automatically switch to Browse tab after publishing
    await waitFor(() => {
      expect(screen.getByText('Published State Machines')).toBeInTheDocument();
    });

    // 5. VERIFY PUBLISHED - The published machine should appear in browse
    await waitFor(() => {
      expect(screen.getByText('Complete Workflow Test')).toBeInTheDocument();
      expect(screen.getByText('Testing the complete publish-browse workflow')).toBeInTheDocument();
    }, { timeout: 3000 });

    // 6. REFRESH - Test manual refresh functionality
    await user.click(screen.getByText('🔄 Refresh'));

    // Should still show the published machine after refresh
    await waitFor(() => {
      expect(screen.getByText('Complete Workflow Test')).toBeInTheDocument();
      expect(screen.getByText('Testing the complete publish-browse workflow')).toBeInTheDocument();
    }, { timeout: 3000 });

    // 7. VIEW JSON - Test expanding the machine JSON
    await user.click(screen.getByText('👁️ Show JSON'));

    // Should show the JSON content
    await waitFor(() => {
      expect(screen.getByText(/workflow-test/)).toBeInTheDocument();
      expect(screen.getByText(/starting/)).toBeInTheDocument();
      expect(screen.getByText(/working/)).toBeInTheDocument();
      expect(screen.getByText(/completed/)).toBeInTheDocument();
    });

    // 8. HIDE JSON - Test collapsing the JSON
    await user.click(screen.getByText('📄 Hide JSON'));

    // JSON should be hidden again
    expect(screen.queryByText(/workflow-test/)).not.toBeInTheDocument();

    // 9. VERIFY PERSISTENCE - Switch to publish tab and back
    await user.click(screen.getByRole('tab', { name: 'Publish' }));
    await user.click(screen.getByRole('tab', { name: 'Browse' }));

    // Machine should still be there
    expect(screen.getByText('Complete Workflow Test')).toBeInTheDocument();

    // 10. VERIFY EVENT STRUCTURE - Check that the event was properly formatted
    expect(publishedEvents).toHaveLength(1);
    const publishedEvent = publishedEvents[0];

    expect(publishedEvent.kind).toBe(30079);
    expect(publishedEvent.content).toContain('initialState');
    expect(publishedEvent.tags).toEqual(
      expect.arrayContaining([
        ['d', expect.any(String)],
        ['name', 'Complete Workflow Test'],
        ['description', 'Testing the complete publish-browse workflow'],
        ['engine', 'xstate'],
        ['engineCodeURI', 'https://xstate.js.org/']
      ])
    );

    // Verify the machine content is properly wrapped
    const eventContent = JSON.parse(publishedEvent.content);
    expect(eventContent.initialState).toEqual(testStateMachine);
  });

  it('should handle multiple publications and show them all', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Connected to Nostr relays/)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Publish multiple machines
    const machines = [
      { name: 'Traffic Light', desc: 'Simple traffic light controller' },
      { name: 'User Login', desc: 'Authentication state machine' },
      { name: 'Shopping Cart', desc: 'E-commerce cart management' }
    ];

    for (let i = 0; i < machines.length; i++) {
      const machine = machines[i];

      await user.click(screen.getByRole('tab', { name: 'Publish' }));

      // Clear previous values and enter new ones
      const nameInput = screen.getByLabelText(/App Name/);
      const descInput = screen.getByLabelText(/Description/);
      const machineInput = screen.getByLabelText(/XState Machine JSON/);

      fireEvent.change(nameInput, { target: { value: machine.name } });
      fireEvent.change(descInput, { target: { value: machine.desc } });
      fireEvent.change(machineInput, {
        target: { value: JSON.stringify({
          id: `machine-${i}`,
          initial: 'idle',
          states: { idle: { on: { START: 'active' } }, active: {} }
        })}
      });

      await user.click(screen.getByText('🚀 Publish to Nostr'));

      // Wait for publish to complete
      await waitFor(() => {
        expect(screen.getByText(machine.name)).toBeInTheDocument();
      });
    }

    // Verify all machines are visible
    for (const machine of machines) {
      expect(screen.getByText(machine.name)).toBeInTheDocument();
      expect(screen.getByText(machine.desc)).toBeInTheDocument();
    }

    // Verify correct count
    expect(publishedEvents).toHaveLength(3);
  });
});