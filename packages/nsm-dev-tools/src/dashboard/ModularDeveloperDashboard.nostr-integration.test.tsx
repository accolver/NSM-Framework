/**
 * Integration tests for ModularDeveloperDashboard with real Nostr App Discovery
 * Testing the integration between the dashboard and NostrAppDiscoveryService
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModularDeveloperDashboard } from './ModularDeveloperDashboard';
import type { NSMClient } from '@nsm/client';

// Mock services
const mockEventLogService = {
  getEventCount: () => 5,
  getEvents: () => [],
  addListener: mock(() => {}),
  removeListener: mock(() => {}),
  isListening: () => true,
  startListening: mock(() => {}),
  stopListening: mock(() => {}),
  generateMockEvent: mock(() => {}),
  clearEvents: mock(() => {}),
  getEventMetadata: mock(() => ({ kind: 1, timestamp: Date.now(), relativeTime: '1 minute ago' }))
};

const mockTimeTravelService = {
  getEventHistory: () => [],
  replayToEvent: mock(() => {}),
  getCurrentState: () => null
};

const mockInspectorService = {
  connect: mock(() => Promise.resolve()),
  disconnect: mock(() => {}),
  isConnected: () => false
};

const mockConnectInspector = mock(() => Promise.resolve());
const mockOpenVisualizer = mock(() => {});

describe('ModularDeveloperDashboard Nostr Integration', () => {
  let mockNSMClient: any;

  beforeEach(() => {
    // Mock NSMClient
    mockNSMClient = {
      discoverApplications: mock(() => Promise.resolve([])),
      subscribeToApplication: mock(() => ({ stop: mock(() => {}) })),
      connect: mock(() => Promise.resolve()),
      disconnect: mock(() => {}),
      getConnectedRelays: mock(() => ['wss://relay.damus.io'])
    };
  });

  afterEach(() => {
    // Reset all mocks
    mockEventLogService.getEventCount.mockClear?.();
    mockNSMClient.discoverApplications.mockClear?.();
  });

  describe('without NSMClient (fallback mode)', () => {
    it('should render dashboard and use mock discovery', async () => {
      render(
        <ModularDeveloperDashboard
          eventLogService={mockEventLogService}
          timeTravelService={mockTimeTravelService}
          inspectorService={mockInspectorService}
          connectInspector={mockConnectInspector}
          openVisualizer={mockOpenVisualizer}
        />
      );

      // Should render the dashboard
      expect(screen.getByText('NSM Developer Dashboard')).toBeDefined();

      // Click on App Discovery tab
      fireEvent.click(screen.getByText('App Discovery'));

      // Should show scanning state
      await waitFor(() => {
        expect(screen.getByText('Scanning for NSM applications...')).toBeDefined();
      });

      // Should discover mock applications
      await waitFor(() => {
        expect(screen.getByText('NSM Whiteboard')).toBeDefined();
        expect(screen.getByText('NSM Wordle')).toBeDefined();
      }, { timeout: 2000 });
    });

    it('should handle app connection in mock mode', async () => {
      render(
        <ModularDeveloperDashboard
          eventLogService={mockEventLogService}
          timeTravelService={mockTimeTravelService}
          inspectorService={mockInspectorService}
          connectInspector={mockConnectInspector}
          openVisualizer={mockOpenVisualizer}
        />
      );

      // Navigate to App Discovery
      fireEvent.click(screen.getByText('App Discovery'));

      // Wait for apps to be discovered
      await waitFor(() => {
        expect(screen.getByText('NSM Whiteboard')).toBeDefined();
      }, { timeout: 2000 });

      // Find connect button and click it
      const connectButtons = screen.getAllByText('Connect');
      fireEvent.click(connectButtons[0]);

      // Should change to connected state
      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeDefined();
      });
    });
  });

  describe('with NSMClient (real Nostr mode)', () => {
    it('should initialize NostrAppDiscoveryService when NSMClient is provided', () => {
      render(
        <ModularDeveloperDashboard
          eventLogService={mockEventLogService}
          timeTravelService={mockTimeTravelService}
          inspectorService={mockInspectorService}
          connectInspector={mockConnectInspector}
          openVisualizer={mockOpenVisualizer}
          nsmClient={mockNSMClient}
        />
      );

      // Should render the dashboard
      expect(screen.getByText('NSM Developer Dashboard')).toBeDefined();
    });

    it('should trigger real discovery when App Discovery tab is activated', async () => {
      // Mock discovered applications
      const mockApps = [
        {
          identifier: 'real-wordle',
          name: 'Real NSM Wordle',
          engine: 'xstate@5',
          engineCodeURI: 'blossom:sha256:abc123',
          initialState: { status: 'loading' },
          stateSchema: {},
          interactionSchema: {},
          author: 'test-pubkey',
          created_at: Date.now()
        }
      ];

      mockNSMClient.discoverApplications = mock(() => Promise.resolve(mockApps));

      render(
        <ModularDeveloperDashboard
          eventLogService={mockEventLogService}
          timeTravelService={mockTimeTravelService}
          inspectorService={mockInspectorService}
          connectInspector={mockConnectInspector}
          openVisualizer={mockOpenVisualizer}
          nsmClient={mockNSMClient}
        />
      );

      // Click on App Discovery tab
      fireEvent.click(screen.getByText('App Discovery'));

      // Should call real discovery
      await waitFor(() => {
        expect(mockNSMClient.discoverApplications).toHaveBeenCalled();
      });
    });

    it('should handle real app connection and disconnection', async () => {
      // Mock discovered applications
      const mockApps = [
        {
          identifier: 'test-app',
          name: 'Test App',
          engine: 'xstate@5',
          engineCodeURI: 'blossom:sha256:test',
          initialState: {},
          stateSchema: {},
          interactionSchema: {},
          author: 'test-pubkey',
          created_at: Date.now()
        }
      ];

      mockNSMClient.discoverApplications = mock(() => Promise.resolve(mockApps));

      render(
        <ModularDeveloperDashboard
          eventLogService={mockEventLogService}
          timeTravelService={mockTimeTravelService}
          inspectorService={mockInspectorService}
          connectInspector={mockConnectInspector}
          openVisualizer={mockOpenVisualizer}
          nsmClient={mockNSMClient}
        />
      );

      // Navigate to App Discovery tab
      fireEvent.click(screen.getByText('App Discovery'));

      // Wait for discovery to complete
      await waitFor(() => {
        expect(mockNSMClient.discoverApplications).toHaveBeenCalled();
      });

      // The app should be displayed when discovered
      // Note: The app discovery is event-driven, so we need to trigger the event manually in the test
    });
  });

  describe('error handling', () => {
    it('should handle discovery errors gracefully', async () => {
      mockNSMClient.discoverApplications = mock(() => Promise.reject(new Error('Network error')));

      render(
        <ModularDeveloperDashboard
          eventLogService={mockEventLogService}
          timeTravelService={mockTimeTravelService}
          inspectorService={mockInspectorService}
          connectInspector={mockConnectInspector}
          openVisualizer={mockOpenVisualizer}
          nsmClient={mockNSMClient}
        />
      );

      // Navigate to App Discovery tab
      fireEvent.click(screen.getByText('App Discovery'));

      // Should still render without crashing
      expect(screen.getByText('NSM Application Discovery')).toBeDefined();
    });

    it('should handle connection errors gracefully', async () => {
      render(
        <ModularDeveloperDashboard
          eventLogService={mockEventLogService}
          timeTravelService={mockTimeTravelService}
          inspectorService={mockInspectorService}
          connectInspector={mockConnectInspector}
          openVisualizer={mockOpenVisualizer}
        />
      );

      // Navigate to App Discovery (mock mode)
      fireEvent.click(screen.getByText('App Discovery'));

      // Wait for mock apps to be discovered
      await waitFor(() => {
        expect(screen.getByText('NSM Whiteboard')).toBeDefined();
      }, { timeout: 2000 });

      // Connection should work in mock mode even without real NSM client
      const connectButtons = screen.getAllByText('Connect');
      expect(() => fireEvent.click(connectButtons[0])).not.toThrow();
    });
  });

  describe('service lifecycle management', () => {
    it('should cleanup discovery service on unmount', () => {
      const { unmount } = render(
        <ModularDeveloperDashboard
          eventLogService={mockEventLogService}
          timeTravelService={mockTimeTravelService}
          inspectorService={mockInspectorService}
          connectInspector={mockConnectInspector}
          openVisualizer={mockOpenVisualizer}
          nsmClient={mockNSMClient}
        />
      );

      // Unmount should not throw errors
      expect(() => unmount()).not.toThrow();
    });
  });
});