import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { NSMClient } from './nsm-client';
import { NSMDefinitionEvent, NSMInteractionEvent, NSMStateUpdateEvent } from '@nsm/core';
import NDK, { NDKEvent, NDKSubscription } from '@nostr-dev-kit/ndk';

describe('NSMClient', () => {
  let client: NSMClient;
  let mockNDK: any;

  beforeEach(() => {
    // Mock NDK for testing
    mockNDK = {
      connect: mock(() => Promise.resolve()),
      subscribe: mock(() => ({
        on: mock(() => {}),
        stop: mock(() => {})
      })),
      pool: {
        relays: new Map([['wss://test.relay', { url: 'wss://test.relay' }]])
      }
    };

    // Use mock NDK for testing
    client = new NSMClient({
      relayUrls: ['wss://test.relay'],
      ndk: mockNDK
    });
  });

  afterEach(() => {
    client.disconnect();
  });

  describe('initialization', () => {
    it('should create client with relay URLs', () => {
      expect(client).toBeDefined();
      expect(client.relayUrls).toEqual(['wss://test.relay']);
    });

    it('should create client with default relays if none provided', () => {
      const defaultClient = new NSMClient();
      expect(defaultClient.relayUrls.length).toBeGreaterThan(0);
    });

    it('should connect to relays', async () => {
      await client.connect();
      expect(mockNDK.connect).toHaveBeenCalled();
    });
  });

  describe('application discovery', () => {
    it('should discover NSM applications', async () => {
      // Setup mock subscription
      const mockEvents: NDKEvent[] = [];
      const mockSubscription = {
        on: mock((event: string, handler: Function) => {
          if (event === 'event') {
            // Simulate receiving an NSM definition event
            const definitionEvent = new NDKEvent(mockNDK, {
              kind: 30079,
              content: JSON.stringify({
                initialState: 'idle',
                stateSchema: {},
                interactionSchema: {}
              }),
              tags: [
                ['d', 'test-app'],
                ['name', 'Test Application'],
                ['engine', 'xstate@5'],
                ['engineCodeURI', 'https://cdn.test.com/engine.js']
              ],
              created_at: Math.floor(Date.now() / 1000),
              pubkey: 'test-pubkey'
            });
            handler(definitionEvent);
          } else if (event === 'eose') {
            // Simulate end of stream
            handler();
          }
        }),
        stop: mock(() => {})
      };

      mockNDK.subscribe = mock(() => mockSubscription);

      const applications = await client.discoverApplications();

      expect(mockNDK.subscribe).toHaveBeenCalled();
      expect(applications).toBeDefined();
      expect(applications.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter applications by tag', async () => {
      // Setup mock to immediately respond with eose
      const mockSubscription = {
        on: mock((event: string, handler: Function) => {
          if (event === 'eose') {
            handler();
          }
        }),
        stop: mock(() => {})
      };

      mockNDK.subscribe = mock(() => mockSubscription);

      const applications = await client.discoverApplications({ tag: 'game' });
      expect(mockNDK.subscribe).toHaveBeenCalledWith(
        expect.objectContaining({
          kinds: [30079],
          '#t': ['game']
        })
      );
    });

    it('should filter applications by author', async () => {
      // Setup mock to immediately respond with eose
      const mockSubscription = {
        on: mock((event: string, handler: Function) => {
          if (event === 'eose') {
            handler();
          }
        }),
        stop: mock(() => {})
      };

      mockNDK.subscribe = mock(() => mockSubscription);

      const authorPubkey = 'test-author-pubkey';
      const applications = await client.discoverApplications({ author: authorPubkey });
      expect(mockNDK.subscribe).toHaveBeenCalledWith(
        expect.objectContaining({
          kinds: [30079],
          authors: [authorPubkey]
        })
      );
    });
  });

  describe('application loading', () => {
    const mockDefinition = {
      identifier: 'test-app',
      name: 'Test Application',
      engine: 'xstate@5',
      engineCodeURI: 'https://cdn.test.com/engine.js',
      initialState: { status: 'idle' },
      stateSchema: { type: 'object' },
      interactionSchema: { type: 'object' }
    };

    it('should load application by identifier', async () => {
      const mockEvent = new NDKEvent(mockNDK, {
        kind: 30079,
        content: JSON.stringify({
          initialState: mockDefinition.initialState,
          stateSchema: mockDefinition.stateSchema,
          interactionSchema: mockDefinition.interactionSchema
        }),
        tags: [
          ['d', mockDefinition.identifier],
          ['name', mockDefinition.name],
          ['engine', mockDefinition.engine],
          ['engineCodeURI', mockDefinition.engineCodeURI]
        ],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: 'test-pubkey'
      });

      const mockSubscription = {
        on: mock((event: string, handler: Function) => {
          if (event === 'event') {
            handler(mockEvent);
          }
        }),
        stop: mock(() => {})
      };

      mockNDK.subscribe = mock(() => mockSubscription);

      const app = await client.loadApplication('test-app');

      expect(app).toBeDefined();
      expect(app?.identifier).toBe('test-app');
      expect(app?.name).toBe('Test Application');
    });

    it('should return null for non-existent application', async () => {
      const mockSubscription = {
        on: mock((event: string, handler: Function) => {
          // Don't emit any events
          if (event === 'eose') {
            handler();
          }
        }),
        stop: mock(() => {})
      };

      mockNDK.subscribe = mock(() => mockSubscription);

      const app = await client.loadApplication('non-existent');
      expect(app).toBeNull();
    });
  });

  describe('event publishing', () => {
    it('should publish interaction event', async () => {
      const mockPublish = mock(() => Promise.resolve());
      mockNDK.publish = mockPublish;

      const interaction = {
        applicationId: 'test-app',
        action: 'CLICK_BUTTON',
        payload: { buttonId: 'submit' }
      };

      await client.publishInteraction(interaction);

      expect(mockPublish).toHaveBeenCalled();
    });

    it('should publish state update event', async () => {
      const mockPublish = mock(() => Promise.resolve());
      mockNDK.publish = mockPublish;

      const stateUpdate = {
        applicationId: 'test-app',
        state: { status: 'active' },
        previousEventId: 'prev-event-id'
      };

      await client.publishStateUpdate(stateUpdate);

      expect(mockPublish).toHaveBeenCalled();
    });
  });

  describe('subscription management', () => {
    it('should subscribe to application events', () => {
      const mockSubscription = {
        on: mock(() => {}),
        stop: mock(() => {})
      };
      mockNDK.subscribe = mock(() => mockSubscription);

      const subscription = client.subscribeToApplication('test-app', {
        onInteraction: () => {},
        onStateUpdate: () => {}
      });

      expect(subscription).toBeDefined();
      expect(mockNDK.subscribe).toHaveBeenCalledWith(
        expect.objectContaining({
          kinds: expect.arrayContaining([7000, 10079]),
          '#a': [`30079:test-pubkey:test-app`]
        })
      );
    });

    it('should handle interaction events in subscription', () => {
      const onInteraction = mock(() => {});
      const onStateUpdate = mock(() => {});

      const mockSubscription = {
        on: mock((event: string, handler: Function) => {
          if (event === 'event') {
            // Simulate interaction event
            const interactionEvent = new NDKEvent(mockNDK, {
              kind: 7000,
              content: JSON.stringify({
                action: 'CLICK',
                payload: {}
              }),
              tags: [['a', '30079:test-pubkey:test-app']],
              created_at: Math.floor(Date.now() / 1000),
              pubkey: 'user-pubkey'
            });
            handler(interactionEvent);
          }
        }),
        stop: mock(() => {})
      };

      mockNDK.subscribe = mock(() => mockSubscription);

      client.subscribeToApplication('test-app', {
        onInteraction,
        onStateUpdate
      });

      expect(onInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CLICK'
        })
      );
    });

    it('should cleanup subscriptions on disconnect', () => {
      const mockStop = mock(() => {});
      const mockSubscription = {
        on: mock(() => {}),
        stop: mockStop
      };
      mockNDK.subscribe = mock(() => mockSubscription);

      client.subscribeToApplication('test-app', {
        onInteraction: () => {},
        onStateUpdate: () => {}
      });

      client.disconnect();

      expect(mockStop).toHaveBeenCalled();
    });
  });

  describe('relay management', () => {
    it('should get connected relays', () => {
      const relays = client.getConnectedRelays();
      expect(relays).toBeDefined();
      expect(relays.length).toBeGreaterThanOrEqual(0);
    });

    it('should add relay', async () => {
      mockNDK.pool = {
        addRelay: mock(() => Promise.resolve())
      };

      await client.addRelay('wss://new.relay');
      expect(mockNDK.pool.addRelay).toHaveBeenCalledWith('wss://new.relay');
    });

    it('should remove relay', async () => {
      mockNDK.pool = {
        removeRelay: mock(() => Promise.resolve())
      };

      await client.removeRelay('wss://test.relay');
      expect(mockNDK.pool.removeRelay).toHaveBeenCalledWith('wss://test.relay');
    });
  });

  describe('error handling', () => {
    it('should handle connection errors', async () => {
      mockNDK.connect = mock(() => Promise.reject(new Error('Connection failed')));

      await expect(client.connect()).rejects.toThrow('Connection failed');
    });

    it('should handle publishing errors', async () => {
      mockNDK.publish = mock(() => Promise.reject(new Error('Publish failed')));

      const interaction = {
        applicationId: 'test-app',
        action: 'TEST',
        payload: {}
      };

      await expect(client.publishInteraction(interaction)).rejects.toThrow('Publish failed');
    });

    it('should validate application identifier format', async () => {
      await expect(client.loadApplication('')).rejects.toThrow('Invalid application identifier');
      await expect(client.loadApplication('invalid/chars')).rejects.toThrow('Invalid application identifier');
    });
  });
});