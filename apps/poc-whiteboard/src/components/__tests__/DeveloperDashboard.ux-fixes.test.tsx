import '../../test-setup';
import { describe, test, expect, beforeEach, afterEach, vi } from 'bun:test';
import { render, cleanup, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DeveloperDashboard } from '../DeveloperDashboard';
import { createEventLogService } from '../../services/event-log-service';
import { createTimeTravelService } from '../../services/time-travel-service';
import { createInspectorService } from '../../services/inspector-service';

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
    inspectorService,
    connectInspector: vi.fn(),
    openVisualizer: vi.fn()
  };
}

describe('DeveloperDashboard UX Fixes', () => {
  let services: ReturnType<typeof createMockServices>;

  beforeEach(() => {
    services = createMockServices();
  });

  afterEach(() => {
    cleanup();
    services.eventLogService.stop();
    services.timeTravelService.disconnect();
    services.inspectorService.disconnect();
  });

  describe('Critical Issue: Events Section Scrolling', () => {
    test('should have scrollable events container with proper test attributes', async () => {
      const { container } = render(<DeveloperDashboard {...services} />);

      // Switch to event log tab to make events visible
      const tabs = container.querySelectorAll('[role="tab"]');
      let eventLogTab: Element | null = null;
      tabs.forEach(tab => {
        if (tab.textContent?.includes('Event Log')) {
          eventLogTab = tab;
        }
      });

      if (eventLogTab) {
        await act(async () => {
          (eventLogTab as HTMLElement).click();
        });
      }

      // Wait for the events container to appear
      await waitFor(() => {
        const eventsContainer = container.querySelector('[data-testid="events-scroll-container"]');
        expect(eventsContainer).toBeTruthy();
      });
    });

    test('should apply scrollable CSS class to events section', async () => {
      const { container } = render(<DeveloperDashboard {...services} />);

      // Switch to event log tab to make events visible
      const tabs = container.querySelectorAll('[role="tab"]');
      let eventLogTab: Element | null = null;
      tabs.forEach(tab => {
        if (tab.textContent?.includes('Event Log')) {
          eventLogTab = tab;
        }
      });

      if (eventLogTab) {
        await act(async () => {
          (eventLogTab as HTMLElement).click();
        });
      }

      // Wait for the scrollable element to appear
      await waitFor(() => {
        const scrollableElement = container.querySelector('.events-scrollable');
        expect(scrollableElement).toBeTruthy();
      });
    });
  });

  describe('Critical Issue: Tab Visibility', () => {
    test('should render all 5 tabs', () => {
      const { container } = render(<DeveloperDashboard {...services} />);

      const tabs = container.querySelectorAll('[role="tab"]');
      expect(tabs.length).toBe(5); // This should already pass

      // Check specific tabs exist (including shortcut numbers)
      const tabLabels = Array.from(tabs).map(tab => tab.textContent);
      expect(tabLabels.some(label => label?.includes('Time Travel'))).toBe(true);
      expect(tabLabels.some(label => label?.includes('App Discovery'))).toBe(true);
      expect(tabLabels.some(label => label?.includes('Performance'))).toBe(true);
    });

    test('should have horizontal scroll support for tab container', () => {
      const { container } = render(<DeveloperDashboard {...services} />);

      const tabContainer = container.querySelector('[data-testid="tab-container"]');
      expect(tabContainer).toBeTruthy();

      // This should fail until we implement the fix
      expect(tabContainer?.classList.contains('tabs-horizontal-scroll')).toBeTruthy(); // This will fail - we need to add this CSS class
    });
  });

  describe('Modularity Requirements', () => {
    test('should export reusable TabContainer component', () => {
      // This test checks if we can import the modular components
      expect(() => {
        require('../TabContainer'); // This will fail until we create it
      }).not.toThrow(); // This will fail initially
    });

    test('should export reusable EventsPanel component', () => {
      expect(() => {
        require('../EventsPanel'); // This will fail until we create it
      }).not.toThrow(); // This will fail initially
    });

    test('should support responsive layout classes', () => {
      const { container } = render(<DeveloperDashboard {...services} />);

      const dashboardContainer = container.querySelector('[data-testid="dashboard-container"]');
      expect(dashboardContainer).toBeTruthy();

      // This should fail until we implement the responsive design fix
      expect(dashboardContainer?.classList.contains('desktop-layout')).toBeTruthy(); // This will fail initially
    });
  });
});