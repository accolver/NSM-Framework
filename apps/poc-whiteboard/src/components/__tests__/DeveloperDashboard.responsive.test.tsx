import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { vi, afterEach, beforeEach, describe, it, expect } from 'bun:test';
import { DeveloperDashboard } from '../DeveloperDashboard';

// Mock services
const mockEventLogService = {
  getEventCount: () => 0,
} as any;

const mockTimeTravelService = {} as any;
const mockInspectorService = {
  isConnected: false,
  connectionStatus: 'disconnected',
  getRegisteredActors: () => [],
  copyMachineDefinition: vi.fn(),
  disconnect: vi.fn(),
} as any;

const mockConnectInspector = vi.fn();
const mockOpenVisualizer = vi.fn();

describe('DeveloperDashboard Responsive Layout', () => {
  beforeEach(() => {
    // Clean up any previous renders
    cleanup();

    // Mock window.innerWidth for responsive tests
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    // Mock matchMedia for responsive breakpoints
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Mock window event listeners
    window.addEventListener = vi.fn();
    window.removeEventListener = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders all 5 tabs', () => {
    const { container } = render(
      <DeveloperDashboard
        eventLogService={mockEventLogService}
        timeTravelService={mockTimeTravelService}
        inspectorService={mockInspectorService}
        connectInspector={mockConnectInspector}
        openVisualizer={mockOpenVisualizer}
      />
    );

    // Check that all 5 tabs are present by looking for tab elements
    const tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(5);

    // Check for specific tab content
    expect(container.textContent).toContain('XState Inspector');
    expect(container.textContent).toContain('Event Log');
    expect(container.textContent).toContain('Time Travel');
    expect(container.textContent).toContain('App Discovery');
    expect(container.textContent).toContain('Performance');
  });

  it('renders with horizontal scrollable tabs', () => {
    const { container } = render(
      <DeveloperDashboard
        eventLogService={mockEventLogService}
        timeTravelService={mockTimeTravelService}
        inspectorService={mockInspectorService}
        connectInspector={mockConnectInspector}
        openVisualizer={mockOpenVisualizer}
      />
    );

    const tabContainer = container.querySelector('[data-testid="tab-container"]');
    expect(tabContainer).toBeTruthy();
    expect(tabContainer?.classList.contains('tabs-horizontal-scroll')).toBe(true);
  });

  it('has proper responsive classes applied', () => {
    const { container } = render(
      <DeveloperDashboard
        eventLogService={mockEventLogService}
        timeTravelService={mockTimeTravelService}
        inspectorService={mockInspectorService}
        connectInspector={mockConnectInspector}
        openVisualizer={mockOpenVisualizer}
      />
    );

    const dashboard = container.querySelector('[data-testid="dashboard-container"]');
    expect(dashboard).toBeTruthy();
    expect(dashboard?.classList.contains('developer-dashboard')).toBe(true);
    expect(dashboard?.classList.contains('desktop-layout')).toBe(true);
  });

  it('renders without crashing on different screen sizes', () => {
    // Test mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 400,
    });

    const { rerender, container } = render(
      <DeveloperDashboard
        eventLogService={mockEventLogService}
        timeTravelService={mockTimeTravelService}
        inspectorService={mockInspectorService}
        connectInspector={mockConnectInspector}
        openVisualizer={mockOpenVisualizer}
      />
    );

    const dashboard = container.querySelector('[data-testid="dashboard-container"]');
    expect(dashboard).toBeTruthy();

    // Test tablet
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 800,
    });

    rerender(
      <DeveloperDashboard
        eventLogService={mockEventLogService}
        timeTravelService={mockTimeTravelService}
        inspectorService={mockInspectorService}
        connectInspector={mockConnectInspector}
        openVisualizer={mockOpenVisualizer}
      />
    );

    const dashboardAfterRerender = container.querySelector('[data-testid="dashboard-container"]');
    expect(dashboardAfterRerender).toBeTruthy();
  });
});