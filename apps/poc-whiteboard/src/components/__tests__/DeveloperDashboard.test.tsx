import '../../test-setup';
import { describe, test, expect, beforeEach, afterEach, vi } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DeveloperDashboard } from '../DeveloperDashboard';
import { createEventLogService, type EventLogService } from '../../services/event-log-service';
import { createTimeTravelService, type TimeTravelService } from '../../services/time-travel-service';
import { createInspectorService, type InspectorService } from '../../services/inspector-service';
import { NSM_PROTOCOL } from '@nsm/core';
import type { INostrEvent } from '@nsm/core';

// Mock props factory
function createMockServices() {
  const eventLogService = createEventLogService({
    maxEvents: 100,
    enableRealtime: true,
    autoStart: false
  });

  const timeTravelService = createTimeTravelService({
    maxSnapshots: 100,
    enableRealtime: true,
    devOnly: false
  });

  const inspectorService = createInspectorService({
    autoStart: false,
    devOnly: false
  });

  return {
    eventLogService,
    timeTravelService,
    inspectorService
  };
}

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

describe('DeveloperDashboard', () => {
  let services: ReturnType<typeof createMockServices>;

  beforeEach(() => {
    services = createMockServices();
  });

  afterEach(() => {
    services.eventLogService.stop();
    services.timeTravelService.disconnect();
    services.inspectorService.disconnect();
  });

  describe('Component Rendering', () => {
    test('should render dashboard header', () => {
      render(<DeveloperDashboard {...services} />);

      expect(screen.getByText('NSM Developer Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Comprehensive developer tools and debugging interface')).toBeInTheDocument();
    });

    test('should render tool tabs', () => {
      render(<DeveloperDashboard {...services} />);

      expect(screen.getByText('XState Inspector')).toBeInTheDocument();
      expect(screen.getByText('Event Log')).toBeInTheDocument();
      expect(screen.getByText('Time Travel')).toBeInTheDocument();
      expect(screen.getByText('App Discovery')).toBeInTheDocument();
      expect(screen.getByText('Performance')).toBeInTheDocument();
    });

    test('should render default active tab content', () => {
      render(<DeveloperDashboard {...services} />);

      // By default, XState Inspector should be active
      expect(screen.getByText('XState Inspector')).toHaveClass('active'); // assuming we add active class
    });

    test('should render keyboard shortcuts panel', () => {
      render(<DeveloperDashboard {...services} />);

      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    test('should switch to Event Log tab when clicked', async () => {
      render(<DeveloperDashboard {...services} />);

      const eventLogTab = screen.getByText('Event Log');
      fireEvent.click(eventLogTab);

      await waitFor(() => {
        expect(screen.getByText('Nostr Event Log')).toBeInTheDocument();
      });
    });

    test('should switch to Time Travel tab when clicked', async () => {
      render(<DeveloperDashboard {...services} />);

      const timeTravelTab = screen.getByText('Time Travel');
      fireEvent.click(timeTravelTab);

      await waitFor(() => {
        expect(screen.getByText(/Time Travel|Recording/)).toBeInTheDocument();
      });
    });

    test('should switch to App Discovery tab when clicked', async () => {
      render(<DeveloperDashboard {...services} />);

      const appDiscoveryTab = screen.getByText('App Discovery');
      fireEvent.click(appDiscoveryTab);

      await waitFor(() => {
        expect(screen.getByText('NSM Application Discovery')).toBeInTheDocument();
      });
    });

    test('should switch to Performance tab when clicked', async () => {
      render(<DeveloperDashboard {...services} />);

      const performanceTab = screen.getByText('Performance');
      fireEvent.click(performanceTab);

      await waitFor(() => {
        expect(screen.getByText('Performance Monitor')).toBeInTheDocument();
      });
    });

    test('should maintain active state for selected tab', async () => {
      render(<DeveloperDashboard {...services} />);

      const eventLogTab = screen.getByText('Event Log');
      fireEvent.click(eventLogTab);

      await waitFor(() => {
        // Check active class or style
        expect(eventLogTab).toHaveClass('active'); // assuming we add active class
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    test('should switch tabs with number keys', async () => {
      render(<DeveloperDashboard {...services} />);

      // Press '1' for XState Inspector
      fireEvent.keyDown(document, { key: '1', code: 'Digit1' });
      expect(screen.getByText('XState Inspector')).toHaveClass('active');

      // Press '2' for Event Log
      fireEvent.keyDown(document, { key: '2', code: 'Digit2' });
      expect(screen.getByText('Event Log')).toHaveClass('active');

      // Press '3' for Time Travel
      fireEvent.keyDown(document, { key: '3', code: 'Digit3' });
      expect(screen.getByText('Time Travel')).toHaveClass('active');

      // Press '4' for App Discovery
      fireEvent.keyDown(document, { key: '4', code: 'Digit4' });
      expect(screen.getByText('App Discovery')).toHaveClass('active');

      // Press '5' for Performance
      fireEvent.keyDown(document, { key: '5', code: 'Digit5' });
      expect(screen.getByText('Performance')).toHaveClass('active');
    });

    test('should toggle dashboard with Alt+D', async () => {
      render(<DeveloperDashboard {...services} />);

      // Press Alt+D to toggle dashboard
      fireEvent.keyDown(document, { key: 'd', code: 'KeyD', altKey: true });

      // Dashboard should be hidden or minimized
      expect(screen.queryByText('NSM Developer Dashboard')).not.toBeInTheDocument();

      // Press Alt+D again to show dashboard
      fireEvent.keyDown(document, { key: 'd', code: 'KeyD', altKey: true });
      expect(screen.getByText('NSM Developer Dashboard')).toBeInTheDocument();
    });

    test('should handle Ctrl+Shift+I for inspector', async () => {
      render(<DeveloperDashboard {...services} />);

      fireEvent.keyDown(document, {
        key: 'i',
        code: 'KeyI',
        ctrlKey: true,
        shiftKey: true
      });

      expect(screen.getByText('XState Inspector')).toHaveClass('active');
    });
  });

  describe('Layout Management', () => {
    test('should support resizable panels', () => {
      render(<DeveloperDashboard {...services} />);

      const resizeHandle = screen.getByTestId('resize-handle');
      expect(resizeHandle).toBeInTheDocument();
    });

    test('should persist layout preferences', async () => {
      const mockStorage = vi.spyOn(Storage.prototype, 'setItem');
      render(<DeveloperDashboard {...services} />);

      const resizeHandle = screen.getByTestId('resize-handle');
      fireEvent.mouseDown(resizeHandle);
      fireEvent.mouseMove(resizeHandle, { clientX: 400 });
      fireEvent.mouseUp(resizeHandle);

      expect(mockStorage).toHaveBeenCalledWith('nsm-dashboard-layout', expect.any(String));
    });

    test('should restore layout from localStorage', () => {
      const mockLayout = JSON.stringify({ width: 500, activeTab: 'eventlog' });
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(mockLayout);

      render(<DeveloperDashboard {...services} />);

      expect(screen.getByText('Event Log')).toHaveClass('active');
    });

    test('should support minimized/maximized states', async () => {
      render(<DeveloperDashboard {...services} />);

      const minimizeButton = screen.getByTitle('Minimize Dashboard');
      fireEvent.click(minimizeButton);

      expect(screen.getByTestId('dashboard-container')).toHaveClass('minimized');
    });
  });

  describe('Application Discovery', () => {
    test('should show NSM applications when discovered', async () => {
      render(<DeveloperDashboard {...services} />);

      const appDiscoveryTab = screen.getByText('App Discovery');
      fireEvent.click(appDiscoveryTab);

      expect(screen.getByText('NSM Application Discovery')).toBeInTheDocument();
      expect(screen.getByText('Scanning for NSM applications...')).toBeInTheDocument();
    });

    test('should display application list', async () => {
      render(<DeveloperDashboard {...services} />);

      const appDiscoveryTab = screen.getByText('App Discovery');
      fireEvent.click(appDiscoveryTab);

      // Mock discovered applications would appear here
      await waitFor(() => {
        expect(screen.getByText('Found Applications')).toBeInTheDocument();
      });
    });

    test('should handle application connection', async () => {
      render(<DeveloperDashboard {...services} />);

      const appDiscoveryTab = screen.getByText('App Discovery');
      fireEvent.click(appDiscoveryTab);

      const connectButton = screen.getByText('Connect');
      fireEvent.click(connectButton);

      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });

  describe('Performance Monitoring', () => {
    test('should display performance metrics', async () => {
      render(<DeveloperDashboard {...services} />);

      const performanceTab = screen.getByText('Performance');
      fireEvent.click(performanceTab);

      expect(screen.getByText('Performance Monitor')).toBeInTheDocument();
      expect(screen.getByText('Memory Usage')).toBeInTheDocument();
      expect(screen.getByText('Event Processing')).toBeInTheDocument();
      expect(screen.getByText('Network Activity')).toBeInTheDocument();
    });

    test('should update metrics in real-time', async () => {
      render(<DeveloperDashboard {...services} />);

      const performanceTab = screen.getByText('Performance');
      fireEvent.click(performanceTab);

      // Should see initial metrics
      expect(screen.getByText(/\d+.*MB/)).toBeInTheDocument();

      // Metrics should update (this would need a mock timer)
      await waitFor(() => {
        expect(screen.getByTestId('memory-usage')).toHaveTextContent(/\d+/);
      });
    });
  });

  describe('Tool Integration', () => {
    test('should properly integrate with EventLogService', async () => {
      render(<DeveloperDashboard {...services} />);

      // Add an event to the service
      services.eventLogService.addEvent(createMockEvent({
        content: 'Test dashboard integration'
      }));

      const eventLogTab = screen.getByText('Event Log');
      fireEvent.click(eventLogTab);

      await waitFor(() => {
        expect(screen.getByText('Test dashboard integration')).toBeInTheDocument();
      });
    });

    test('should properly integrate with TimeTravelService', async () => {
      render(<DeveloperDashboard {...services} />);

      const timeTravelTab = screen.getByText('Time Travel');
      fireEvent.click(timeTravelTab);

      // Should show time travel controls
      expect(screen.getByText(/Recording|Time Traveling/)).toBeInTheDocument();
    });

    test('should handle service errors gracefully', async () => {
      // Create services that will error
      const errorServices = {
        ...services,
        eventLogService: null as any
      };

      render(<DeveloperDashboard {...errorServices} />);

      const eventLogTab = screen.getByText('Event Log');
      fireEvent.click(eventLogTab);

      // Should show error state instead of crashing
      expect(screen.getByText('Service Unavailable')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    test('should adapt layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 480,
      });

      render(<DeveloperDashboard {...services} />);

      expect(screen.getByTestId('dashboard-container')).toHaveClass('mobile-layout');
    });

    test('should stack tabs vertically on small screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600,
      });

      render(<DeveloperDashboard {...services} />);

      expect(screen.getByTestId('tab-container')).toHaveClass('vertical-tabs');
    });
  });

  describe('Accessibility', () => {
    test('should support keyboard navigation between tabs', async () => {
      render(<DeveloperDashboard {...services} />);

      const firstTab = screen.getByText('XState Inspector');
      firstTab.focus();

      // Arrow right should move to next tab
      fireEvent.keyDown(firstTab, { key: 'ArrowRight' });
      expect(screen.getByText('Event Log')).toHaveFocus();

      // Arrow left should move to previous tab
      fireEvent.keyDown(screen.getByText('Event Log'), { key: 'ArrowLeft' });
      expect(screen.getByText('XState Inspector')).toHaveFocus();
    });

    test('should have proper ARIA labels', () => {
      render(<DeveloperDashboard {...services} />);

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
      expect(screen.getByLabelText('Developer Tools Dashboard')).toBeInTheDocument();
    });

    test('should announce tab changes to screen readers', async () => {
      render(<DeveloperDashboard {...services} />);

      const eventLogTab = screen.getByText('Event Log');
      fireEvent.click(eventLogTab);

      expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'tab-eventlog');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing services gracefully', () => {
      const partialServices = {
        eventLogService: services.eventLogService,
        timeTravelService: null as any,
        inspectorService: null as any
      };

      render(<DeveloperDashboard {...partialServices} />);

      expect(screen.getByText('NSM Developer Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Some tools unavailable')).toBeInTheDocument();
    });

    test('should show error boundaries for component failures', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock a service that throws an error
      const errorServices = {
        ...services,
        eventLogService: {
          ...services.eventLogService,
          getEvents: () => { throw new Error('Service error'); }
        }
      };

      render(<DeveloperDashboard {...errorServices} />);

      const eventLogTab = screen.getByText('Event Log');
      fireEvent.click(eventLogTab);

      expect(screen.getByText('Something went wrong in the Event Log tool')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });
});