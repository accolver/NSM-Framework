import { describe, test, expect, beforeEach, afterEach, vi } from 'bun:test';
import { screen, render, fireEvent, waitFor, cleanup, userEvent } from '../../test-utils';
// Note: Using custom jest-dom matchers from test-utils instead of @testing-library/jest-dom
import { EventLogViewer } from '../EventLogViewer';
import { createEventLogService, type EventLogService } from '../../services/event-log-service';
import { NSM_PROTOCOL } from '@nsm/core';
import type { INostrEvent } from '@nsm/core';

// Mock event factory
function createMockEvent(overrides: Partial<INostrEvent> = {}): INostrEvent {
  return {
    id: 'mock-id-' + Math.random().toString(36).substr(2, 9),
    pubkey: 'mock-pubkey-' + Math.random().toString(36).substr(2, 16),
    created_at: Math.floor(Date.now() / 1000),
    kind: NSM_PROTOCOL.DEFINITION_KIND,
    tags: [],
    content: 'mock content',
    sig: 'mock-signature',
    ...overrides
  };
}

describe('EventLogViewer', () => {
  let eventLogService: EventLogService;

  beforeEach(() => {
    eventLogService = createEventLogService({
      maxEvents: 100,
      enableRealtime: true,
      autoStart: false
    });
  });

  afterEach(() => {
    cleanup();
    eventLogService.stop();
  });

  describe('Component Rendering', () => {
    test('should render event log viewer with header', () => {
      render(<EventLogViewer eventLogService={eventLogService} />);

      expect(screen.getByText('Nostr Event Log')).toBeInTheDocument();
      expect(screen.getByText('Real-time monitoring of NSM framework events')).toBeInTheDocument();
    });

    test('should render search input and filter controls', () => {
      render(<EventLogViewer eventLogService={eventLogService} />);

      expect(screen.getByPlaceholderText('Search events...')).toBeInTheDocument();
      expect(screen.getByText('Filter by Kind:')).toBeInTheDocument();
      expect(screen.getByText('All Events')).toBeInTheDocument();
    });

    test('should render clear button and event count', () => {
      render(<EventLogViewer eventLogService={eventLogService} />);

      expect(screen.getByText('Clear Events')).toBeInTheDocument();
      expect(screen.getByText('0 events')).toBeInTheDocument();
    });

    test('should show empty state when no events', () => {
      render(<EventLogViewer eventLogService={eventLogService} />);

      expect(screen.getByText('No events to display')).toBeInTheDocument();
      expect(screen.getByText('Events will appear here as they are captured')).toBeInTheDocument();
    });
  });

  describe('Event Display', () => {
    test('should display events when they exist', () => {
      const event1 = createMockEvent({
        content: 'First event content',
        kind: NSM_PROTOCOL.DEFINITION_KIND
      });
      const event2 = createMockEvent({
        content: 'Second event content',
        kind: NSM_PROTOCOL.STATE_UPDATE_KIND
      });

      eventLogService.addEvent(event1);
      eventLogService.addEvent(event2);

      render(<EventLogViewer eventLogService={eventLogService} />);

      expect(screen.getByText('First event content')).toBeInTheDocument();
      expect(screen.getByText('Second event content')).toBeInTheDocument();
      expect(screen.getByText('2 events')).toBeInTheDocument();
    });

    test('should display event metadata correctly', () => {
      const event = createMockEvent({
        content: '{"action": "draw", "x": 100}',
        kind: NSM_PROTOCOL.DEFINITION_KIND,
        pubkey: 'test-pubkey-123'
      });

      eventLogService.addEvent(event);

      render(<EventLogViewer eventLogService={eventLogService} />);

      expect(screen.getByText('definition')).toBeInTheDocument();
      // The pubkey might be displayed with "from: " prefix or truncated
      expect(screen.getByText(/test-pubkey-123/)).toBeInTheDocument();
      expect(screen.getByText(/just now|minute|hour|day/)).toBeInTheDocument();
    });

    test('should show parsed JSON content', () => {
      const event = createMockEvent({
        content: '{"action": "draw", "coordinates": {"x": 100, "y": 200}}',
        kind: NSM_PROTOCOL.INTERACTION_KIND_MIN + 100
      });

      eventLogService.addEvent(event);

      render(<EventLogViewer eventLogService={eventLogService} />);

      // Should show formatted JSON
      expect(screen.getByText(/"action"/)).toBeInTheDocument();
      expect(screen.getByText(/"draw"/)).toBeInTheDocument();
    });

    test('should handle invalid JSON content gracefully', () => {
      const event = createMockEvent({
        content: 'invalid json content',
        kind: NSM_PROTOCOL.STATE_UPDATE_KIND
      });

      eventLogService.addEvent(event);

      render(<EventLogViewer eventLogService={eventLogService} />);

      expect(screen.getByText('invalid json content')).toBeInTheDocument();
      expect(screen.queryByText(/"action"/)).not.toBeInTheDocument();
    });
  });

  describe('Event Filtering', () => {
    beforeEach(() => {
      // Add various event types for filtering tests
      eventLogService.addEvent(createMockEvent({
        content: 'Definition event',
        kind: NSM_PROTOCOL.DEFINITION_KIND
      }));
      eventLogService.addEvent(createMockEvent({
        content: 'State update event',
        kind: NSM_PROTOCOL.STATE_UPDATE_KIND
      }));
      eventLogService.addEvent(createMockEvent({
        content: 'Interaction event',
        kind: NSM_PROTOCOL.INTERACTION_KIND_MIN + 100
      }));
    });

    test('should filter by NSM Definition events', async () => {
      render(<EventLogViewer eventLogService={eventLogService} />);

      const filterSelect = screen.getByDisplayValue('All Events');
      fireEvent.change(filterSelect, { target: { value: 'definition' } });

      expect(screen.getByText('Definition event')).toBeInTheDocument();
      expect(screen.queryByText('State update event')).not.toBeInTheDocument();
      expect(screen.queryByText('Interaction event')).not.toBeInTheDocument();
      expect(screen.getByText('1 events')).toBeInTheDocument();
    });

    test('should filter by NSM State Update events', async () => {
      render(<EventLogViewer eventLogService={eventLogService} />);

      const filterSelect = screen.getByDisplayValue('All Events');
      fireEvent.change(filterSelect, { target: { value: 'state-update' } });

      expect(screen.queryByText('Definition event')).not.toBeInTheDocument();
      expect(screen.getByText('State update event')).toBeInTheDocument();
      expect(screen.queryByText('Interaction event')).not.toBeInTheDocument();
      expect(screen.getByText('1 events')).toBeInTheDocument();
    });

    test('should filter by NSM Interaction events', async () => {
      render(<EventLogViewer eventLogService={eventLogService} />);

      const filterSelect = screen.getByDisplayValue('All Events');
      fireEvent.change(filterSelect, { target: { value: 'interaction' } });

      expect(screen.queryByText('Definition event')).not.toBeInTheDocument();
      expect(screen.queryByText('State update event')).not.toBeInTheDocument();
      expect(screen.getByText('Interaction event')).toBeInTheDocument();
      expect(screen.getByText('1 events')).toBeInTheDocument();
    });

    test('should show all events when filter is reset', async () => {
      render(<EventLogViewer eventLogService={eventLogService} />);

      const filterSelect = screen.getByDisplayValue('All Events');
      fireEvent.change(filterSelect, { target: { value: 'definition' } });
      fireEvent.change(filterSelect, { target: { value: 'all' } });

      expect(screen.getByText('Definition event')).toBeInTheDocument();
      expect(screen.getByText('State update event')).toBeInTheDocument();
      expect(screen.getByText('Interaction event')).toBeInTheDocument();
      expect(screen.getByText('3 events')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      eventLogService.addEvent(createMockEvent({
        content: 'drawing a circle on the whiteboard',
        pubkey: 'user-123'
      }));
      eventLogService.addEvent(createMockEvent({
        content: 'changing color to red',
        pubkey: 'user-456'
      }));
      eventLogService.addEvent(createMockEvent({
        content: 'adding a rectangle shape',
        pubkey: 'user-123'
      }));
    });

    test('should search events by content', async () => {
      render(<EventLogViewer eventLogService={eventLogService} />);

      const searchInput = screen.getByPlaceholderText('Search events...');
      fireEvent.change(searchInput, { target: { value: 'circle' } });

      expect(screen.getByText('drawing a circle on the whiteboard')).toBeInTheDocument();
      expect(screen.queryByText('changing color to red')).not.toBeInTheDocument();
      expect(screen.queryByText('adding a rectangle shape')).not.toBeInTheDocument();
      expect(screen.getByText('1 events')).toBeInTheDocument();
    });

    test('should search events by pubkey', async () => {
      render(<EventLogViewer eventLogService={eventLogService} />);

      const searchInput = screen.getByPlaceholderText('Search events...');
      fireEvent.change(searchInput, { target: { value: 'user-123' } });

      expect(screen.getByText('drawing a circle on the whiteboard')).toBeInTheDocument();
      expect(screen.queryByText('changing color to red')).not.toBeInTheDocument();
      expect(screen.getByText('adding a rectangle shape')).toBeInTheDocument();
      expect(screen.getByText('2 events')).toBeInTheDocument();
    });

    test('should search case-insensitively', async () => {
      render(<EventLogViewer eventLogService={eventLogService} />);

      const searchInput = screen.getByPlaceholderText('Search events...');
      fireEvent.change(searchInput, { target: { value: 'CIRCLE' } });

      expect(screen.getByText('drawing a circle on the whiteboard')).toBeInTheDocument();
      expect(screen.getByText('1 events')).toBeInTheDocument();
    });

    test('should clear search when input is cleared', async () => {
      render(<EventLogViewer eventLogService={eventLogService} />);

      const searchInput = screen.getByPlaceholderText('Search events...');
      fireEvent.change(searchInput, { target: { value: 'circle' } });
      fireEvent.change(searchInput, { target: { value: '' } });

      expect(screen.getByText('drawing a circle on the whiteboard')).toBeInTheDocument();
      expect(screen.getByText('changing color to red')).toBeInTheDocument();
      expect(screen.getByText('adding a rectangle shape')).toBeInTheDocument();
      expect(screen.getByText('3 events')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    test('should update when new events are added', async () => {
      render(<EventLogViewer eventLogService={eventLogService} />);

      expect(screen.getByText('0 events')).toBeInTheDocument();

      const newEvent = createMockEvent({
        content: 'New real-time event'
      });

      eventLogService.addEvent(newEvent);

      await waitFor(() => {
        expect(screen.getByText('New real-time event')).toBeInTheDocument();
        expect(screen.getByText('1 events')).toBeInTheDocument();
      });
    });

    test('should update when events are cleared', async () => {
      eventLogService.addEvent(createMockEvent({ content: 'Test event' }));

      render(<EventLogViewer eventLogService={eventLogService} />);

      expect(screen.getByText('Test event')).toBeInTheDocument();
      expect(screen.getByText('1 events')).toBeInTheDocument();

      eventLogService.clearEvents();

      await waitFor(() => {
        expect(screen.queryByText('Test event')).not.toBeInTheDocument();
        expect(screen.getByText('0 events')).toBeInTheDocument();
        expect(screen.getByText('No events to display')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    test('should clear events when clear button is clicked', async () => {
      eventLogService.addEvent(createMockEvent({ content: 'Test event' }));

      render(<EventLogViewer eventLogService={eventLogService} />);

      expect(screen.getByText('Test event')).toBeInTheDocument();

      const clearButton = screen.getByText('Clear Events');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(screen.queryByText('Test event')).not.toBeInTheDocument();
        expect(screen.getByText('0 events')).toBeInTheDocument();
      });
    });

    test('should expand and collapse event details', async () => {
      const event = createMockEvent({
        content: '{"action": "draw", "coordinates": {"x": 100, "y": 200}}',
        id: 'test-event-id-123'
      });

      eventLogService.addEvent(event);

      render(<EventLogViewer eventLogService={eventLogService} />);

      // Initially should not show full event details
      expect(screen.queryByText('test-event-id-123')).not.toBeInTheDocument();

      // Click to expand - find clickable event row
      const eventRow = screen.getByText(/"action"/).closest('[data-testid="event-row"]') ||
                       screen.getByText(/"action"/).closest('div');
      if (eventRow) {
        fireEvent.click(eventRow);

        await waitFor(() => {
          expect(screen.getByText('test-event-id-123')).toBeInTheDocument();
        });
      }
    });

    test('should handle keyboard navigation', async () => {
      eventLogService.addEvent(createMockEvent({ content: 'Test event' }));

      render(<EventLogViewer eventLogService={eventLogService} />);

      const searchInput = screen.getByPlaceholderText('Search events...');

      // Focus should work
      searchInput.focus();
      expect(searchInput).toHaveFocus();

      // Tab navigation should work
      const user = userEvent.setup();
      await user.tab();
      const filterSelect = screen.getByDisplayValue('All Events');
      expect(filterSelect).toHaveFocus();
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle large number of events efficiently', () => {
      // Add many events
      for (let i = 0; i < 100; i++) {
        eventLogService.addEvent(createMockEvent({
          content: `Event ${i}`,
          id: `event-${i}`
        }));
      }

      render(<EventLogViewer eventLogService={eventLogService} />);

      expect(screen.getByText('100 events')).toBeInTheDocument();
      // Should still render without performance issues
      expect(screen.getByText('Event 0')).toBeInTheDocument();
      expect(screen.getByText('Event 99')).toBeInTheDocument();
    });

    test('should handle events with special characters', () => {
      const event = createMockEvent({
        content: 'Event with special chars: <>&"\'{}[]',
        pubkey: 'pubkey-with-special-chars-<>&"\''
      });

      eventLogService.addEvent(event);

      render(<EventLogViewer eventLogService={eventLogService} />);

      expect(screen.getByText('Event with special chars: <>&"\'{}[]')).toBeInTheDocument();
    });

    test('should handle malformed event data gracefully', () => {
      const malformedEvent = {
        ...createMockEvent(),
        content: null as any,
        tags: null as any
      };

      eventLogService.addEvent(malformedEvent);

      render(<EventLogViewer eventLogService={eventLogService} />);

      expect(screen.getByText('1 events')).toBeInTheDocument();
      // Should not crash the component
    });
  });
});