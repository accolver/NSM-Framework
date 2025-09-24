/**
 * Tests for Nostr-based NSM Application Discovery Service
 * Following TDD methodology - RED phase
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { NostrAppDiscoveryService } from './nostr-app-discovery';
import type { NSMClient } from '@nsm/client';

// Mock NSM Application type
interface MockNSMApplication {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'disconnected' | 'discovering';
  url?: string;
  lastSeen: number;
  identifier?: string;
  engine?: string;
  author?: string;
  created_at?: number;
}

describe('NostrAppDiscoveryService', () => {
  let service: NostrAppDiscoveryService;
  let mockNSMClient: any;

  beforeEach(() => {
    // Mock NSMClient
    mockNSMClient = {
      discoverApplications: mock(() => Promise.resolve([])),
      loadApplication: mock(() => Promise.resolve(null)),
      subscribeToApplication: mock(() => ({ stop: mock(() => {}) })),
      connect: mock(() => Promise.resolve()),
      disconnect: mock(() => {}),
      getConnectedRelays: mock(() => ['wss://relay.damus.io'])
    };

    service = new NostrAppDiscoveryService(mockNSMClient);
  });

  afterEach(() => {
    service?.destroy();
  });

  describe('initialization', () => {
    it('should create service with NSMClient', () => {
      expect(service).toBeDefined();
      expect(service.isScanning()).toBe(false);
      expect(service.getDiscoveredApps()).toEqual([]);
    });

    it('should initialize with default relays', () => {
      const relays = service.getConnectedRelays();
      expect(relays).toBeDefined();
      expect(Array.isArray(relays)).toBe(true);
    });
  });

  describe('application discovery', () => {
    it('should scan for NSM applications', async () => {
      // Mock discovered applications
      const mockApps = [
        {
          identifier: 'wordle-v1',
          name: 'NSM Wordle',
          engine: 'xstate@5',
          engineCodeURI: 'blossom:sha256:abc123',
          initialState: { status: 'loading' },
          stateSchema: {},
          interactionSchema: {},
          author: 'test-pubkey',
          created_at: Date.now()
        },
        {
          identifier: 'whiteboard-v1',
          name: 'NSM Whiteboard',
          engine: 'xstate@5',
          engineCodeURI: 'blossom:sha256:def456',
          initialState: { objects: [] },
          stateSchema: {},
          interactionSchema: {},
          author: 'test-pubkey-2',
          created_at: Date.now()
        }
      ];

      mockNSMClient.discoverApplications = mock(() => Promise.resolve(mockApps));

      await service.startDiscovery();

      expect(mockNSMClient.discoverApplications).toHaveBeenCalled();
      expect(service.isScanning()).toBe(false);

      const discovered = service.getDiscoveredApps();
      expect(discovered.length).toBe(2);
      expect(discovered[0].name).toBe('NSM Wordle');
      expect(discovered[1].name).toBe('NSM Whiteboard');
    });

    it('should filter applications by type during discovery', async () => {
      await service.startDiscovery({ tag: 'game' });

      expect(mockNSMClient.discoverApplications).toHaveBeenCalledWith(
        expect.objectContaining({
          tag: 'game'
        })
      );
    });

    it('should filter applications by author during discovery', async () => {
      const authorPubkey = 'test-author-pubkey';
      await service.startDiscovery({ author: authorPubkey });

      expect(mockNSMClient.discoverApplications).toHaveBeenCalledWith(
        expect.objectContaining({
          author: authorPubkey
        })
      );
    });

    it('should handle discovery errors gracefully', async () => {
      mockNSMClient.discoverApplications = mock(() => Promise.reject(new Error('Network error')));

      await service.startDiscovery();

      expect(service.isScanning()).toBe(false);
      expect(service.getDiscoveredApps()).toEqual([]);
    });

    it('should set scanning state during discovery', async () => {
      let resolveFn: Function;
      mockNSMClient.discoverApplications = mock(() => new Promise(resolve => {
        resolveFn = resolve;
      }));

      const discoveryPromise = service.startDiscovery();
      expect(service.isScanning()).toBe(true);

      resolveFn!([]);
      await discoveryPromise;
      expect(service.isScanning()).toBe(false);
    });
  });

  describe('application connection status', () => {
    beforeEach(async () => {
      // Setup some discovered apps
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
      await service.startDiscovery();
    });

    it('should connect to application', async () => {
      await service.connectToApp('test-app');

      const apps = service.getDiscoveredApps();
      const testApp = apps.find(app => app.id === 'test-app');
      expect(testApp?.status).toBe('connected');
    });

    it('should disconnect from application', async () => {
      await service.connectToApp('test-app');
      await service.disconnectFromApp('test-app');

      const apps = service.getDiscoveredApps();
      const testApp = apps.find(app => app.id === 'test-app');
      expect(testApp?.status).toBe('disconnected');
    });

    it('should handle non-existent application connection', async () => {
      await expect(service.connectToApp('non-existent')).rejects.toThrow('Application not found');
    });
  });

  describe('real-time updates', () => {
    it('should emit events when applications are discovered', async () => {
      const onDiscovered = mock(() => {});
      service.on('appDiscovered', onDiscovered);

      const mockApps = [
        {
          identifier: 'new-app',
          name: 'New App',
          engine: 'xstate@5',
          engineCodeURI: 'blossom:sha256:new',
          initialState: {},
          stateSchema: {},
          interactionSchema: {},
          author: 'test-pubkey',
          created_at: Date.now()
        }
      ];
      mockNSMClient.discoverApplications = mock(() => Promise.resolve(mockApps));

      await service.startDiscovery();

      expect(onDiscovered).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New App'
      }));
    });

    it('should emit events when connection status changes', async () => {
      const onStatusChange = mock(() => {});
      service.on('statusChanged', onStatusChange);

      // Setup app first
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
      await service.startDiscovery();

      await service.connectToApp('test-app');

      expect(onStatusChange).toHaveBeenCalledWith('test-app', 'connected');
    });
  });

  describe('cleanup and resource management', () => {
    it('should cleanup subscriptions on destroy', async () => {
      const mockStop = mock(() => {});
      const mockSubscription = { stop: mockStop };
      mockNSMClient.subscribeToApplication = mock(() => mockSubscription);

      // Setup discovered app first
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
      await service.startDiscovery();

      // Connect to app to create subscription
      await service.connectToApp('test-app');
      service.destroy();

      // Should have cleaned up subscriptions
      expect(mockStop).toHaveBeenCalled();
    });

    it('should stop discovery on destroy', () => {
      service.destroy();
      expect(service.isScanning()).toBe(false);
    });
  });

  describe('configuration and options', () => {
    it('should accept discovery options', async () => {
      const options = {
        tag: 'productivity',
        author: 'specific-author',
        limit: 50
      };

      await service.startDiscovery(options);

      expect(mockNSMClient.discoverApplications).toHaveBeenCalledWith(options);
    });

    it('should refresh discovery periodically when enabled', () => {
      const refreshService = new NostrAppDiscoveryService(mockNSMClient, {
        autoRefresh: true,
        refreshInterval: 100 // 100ms for testing
      });

      expect(refreshService).toBeDefined();
      // Cleanup
      refreshService.destroy();
    });
  });

  describe('error handling and resilience', () => {
    it('should handle network timeouts gracefully', async () => {
      mockNSMClient.discoverApplications = mock(() => new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 50);
      }));

      await service.startDiscovery();

      expect(service.isScanning()).toBe(false);
      expect(service.getDiscoveredApps()).toEqual([]);
    });

    it('should handle malformed application data', async () => {
      const malformedApps = [
        { /* missing required fields */ },
        null,
        undefined,
        {
          identifier: 'valid-app',
          name: 'Valid App',
          engine: 'xstate@5',
          engineCodeURI: 'blossom:sha256:valid',
          initialState: {},
          stateSchema: {},
          interactionSchema: {},
          author: 'test-pubkey',
          created_at: Date.now()
        }
      ];

      mockNSMClient.discoverApplications = mock(() => Promise.resolve(malformedApps));

      await service.startDiscovery();

      const discovered = service.getDiscoveredApps();
      expect(discovered.length).toBe(1); // Only valid app should be included
      expect(discovered[0].name).toBe('Valid App');
    });
  });
});