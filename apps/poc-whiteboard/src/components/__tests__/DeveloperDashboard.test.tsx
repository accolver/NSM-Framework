import '../../test-setup';
import { describe, test, expect, beforeEach, afterEach, vi } from 'bun:test';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';
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
    cleanup();
    services.eventLogService.stop();
    services.timeTravelService.disconnect();
    services.inspectorService.disconnect();
  });

  describe('Component Rendering', () => {
    test('should render dashboard header', () => {
      const { getByText } = render(<DeveloperDashboard {...services} connectInspector={vi.fn()} openVisualizer={vi.fn()} />);

      expect(getByText('NSM Developer Dashboard')).toBeInTheDocument();
      expect(getByText('Comprehensive developer tools and debugging interface')).toBeInTheDocument();
    });

    test('should render tool tabs', () => {
      const { container } = render(<DeveloperDashboard {...services} connectInspector={vi.fn()} openVisualizer={vi.fn()} />);

      // Check for tabs by role
      const tabs = container.querySelectorAll('[role="tab"]');
      expect(tabs.length).toBe(5);

      // Check tab content
      const tabTexts = Array.from(tabs).map(tab => tab.textContent);
      expect(tabTexts.some(text => text?.includes('XState Inspector'))).toBe(true);
      expect(tabTexts.some(text => text?.includes('Event Log'))).toBe(true);
      expect(tabTexts.some(text => text?.includes('Time Travel'))).toBe(true);
      expect(tabTexts.some(text => text?.includes('App Discovery'))).toBe(true);
      expect(tabTexts.some(text => text?.includes('Performance'))).toBe(true);
    });

    test('should render default active tab content', () => {
      const { getByTestId } = render(<DeveloperDashboard {...services} connectInspector={vi.fn()} openVisualizer={vi.fn()} />);

      // By default, dashboard should be rendered
      expect(getByTestId('dashboard-container')).toBeInTheDocument();
    });

    test('should render keyboard shortcuts panel', () => {
      const { getByText } = render(<DeveloperDashboard {...services} connectInspector={vi.fn()} openVisualizer={vi.fn()} />);

      expect(getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    test('should switch to Performance tab when clicked', async () => {
      const { getByText } = render(<DeveloperDashboard {...services} connectInspector={vi.fn()} openVisualizer={vi.fn()} />);

      const performanceTab = getByText('Performance');
      fireEvent.click(performanceTab);

      await waitFor(() => {
        expect(getByText('Performance Monitor')).toBeInTheDocument();
      });
    });

    test('should render tabs correctly', () => {
      const { container } = render(<DeveloperDashboard {...services} connectInspector={vi.fn()} openVisualizer={vi.fn()} />);

      // Check for tabs by role
      const tabs = container.querySelectorAll('[role="tab"]');
      expect(tabs.length).toBe(5);

      // Verify all expected tabs are present
      const tabTexts = Array.from(tabs).map(tab => tab.textContent);
      expect(tabTexts.some(text => text?.includes('XState Inspector'))).toBe(true);
      expect(tabTexts.some(text => text?.includes('Event Log'))).toBe(true);
      expect(tabTexts.some(text => text?.includes('Time Travel'))).toBe(true);
      expect(tabTexts.some(text => text?.includes('App Discovery'))).toBe(true);
      expect(tabTexts.some(text => text?.includes('Performance'))).toBe(true);
    });
  });

  describe('Keyboard Shortcuts', () => {
    test('should render keyboard shortcuts panel', () => {
      const { getByText } = render(<DeveloperDashboard {...services} connectInspector={vi.fn()} openVisualizer={vi.fn()} />);

      expect(getByText('Keyboard Shortcuts')).toBeInTheDocument();
      expect(getByText('1-5')).toBeInTheDocument();
      expect(getByText('Switch tools')).toBeInTheDocument();
    });
  });

  describe('Layout Management', () => {
    test('should support resizable panels', () => {
      const { getByTestId } = render(<DeveloperDashboard {...services} connectInspector={vi.fn()} openVisualizer={vi.fn()} />);

      const resizeHandle = getByTestId('resize-handle');
      expect(resizeHandle).toBeInTheDocument();
    });

    test('should render dashboard container', () => {
      const { getByTestId } = render(<DeveloperDashboard {...services} connectInspector={vi.fn()} openVisualizer={vi.fn()} />);

      const dashboardContainer = getByTestId('dashboard-container');
      expect(dashboardContainer).toBeInTheDocument();
      expect(dashboardContainer).toHaveClass('developer-dashboard');
    });
  });

  describe('Application Discovery', () => {
    test('should show App Discovery tab', () => {
      const { getByText } = render(<DeveloperDashboard {...services} connectInspector={vi.fn()} openVisualizer={vi.fn()} />);
      expect(getByText('App Discovery')).toBeInTheDocument();
    });
  });

  describe('Performance Monitoring', () => {
    test('should show Performance tab', () => {
      const { getByText } = render(<DeveloperDashboard {...services} connectInspector={vi.fn()} openVisualizer={vi.fn()} />);
      expect(getByText('Performance')).toBeInTheDocument();
    });
  });

  describe('Tool Integration', () => {
    test('should integrate with services', () => {
      expect(() => {
        render(<DeveloperDashboard {...services} connectInspector={vi.fn()} openVisualizer={vi.fn()} />);
      }).not.toThrow();
    });
  });

  describe('Responsive Design', () => {
    test('should render with responsive classes', () => {
      const { getByTestId } = render(<DeveloperDashboard {...services} connectInspector={vi.fn()} openVisualizer={vi.fn()} />);
      const container = getByTestId('dashboard-container');
      expect(container).toHaveClass('desktop-layout');
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      const { container } = render(<DeveloperDashboard {...services} connectInspector={vi.fn()} openVisualizer={vi.fn()} />);
      const tabList = container.querySelector('[role="tablist"]');
      const tabPanel = container.querySelector('[role="tabpanel"]');
      expect(tabList).toBeInTheDocument();
      expect(tabPanel).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('should handle missing services gracefully', () => {
      const partialServices = {
        eventLogService: services.eventLogService,
        timeTravelService: null as any,
        inspectorService: null as any,
        connectInspector: vi.fn(),
        openVisualizer: vi.fn()
      };

      expect(() => {
        render(<DeveloperDashboard {...partialServices} />);
      }).not.toThrow();
    });
  });
});