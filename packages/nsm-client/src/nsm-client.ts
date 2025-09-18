import NDK, { NDKEvent, NDKFilter, NDKSubscription, NDKRelay, NDKPrivateKeySigner, NDKNip07Signer } from '@nostr-dev-kit/ndk';
import {
  INSMDefinitionEvent,
  INSMInteractionEvent,
  INSMStateUpdateEvent,
  createNSMDefinitionEvent,
  createNSMInteractionEvent,
  createNSMStateUpdateEvent,
  validateNSMDefinitionEvent,
  validateNSMInteractionEvent,
  validateNSMStateUpdateEvent
} from '@nsm/core';

export interface NSMClientOptions {
  relayUrls?: string[];
  ndk?: NDK; // Allow injecting NDK for testing
  autoConnect?: boolean;
  privateKey?: string; // Private key for signing events
  useNip07?: boolean; // Use NIP-07 browser extension for signing
}

export interface NSMApplication {
  identifier: string;
  name: string;
  engine: string;
  engineCodeURI: string;
  initialState: any;
  stateSchema: any;
  interactionSchema: any;
  author?: string;
  created_at?: number;
}

export interface DiscoverOptions {
  tag?: string;
  author?: string;
  limit?: number;
}

export interface InteractionPayload {
  applicationId: string;
  action: string;
  payload: any;
}

export interface StateUpdatePayload {
  applicationId: string;
  state: any;
  previousEventId?: string;
}

export interface SubscriptionHandlers {
  onInteraction?: (interaction: any) => void;
  onStateUpdate?: (stateUpdate: any) => void;
  onError?: (error: Error) => void;
}

export class NSMClient {
  private ndk: NDK;
  public relayUrls: string[];
  private subscriptions: Map<string, NDKSubscription> = new Map();
  private applicationCache: Map<string, NSMApplication> = new Map();

  constructor(options: NSMClientOptions = {}) {
    this.relayUrls = options.relayUrls || [
      'wss://relay.damus.io',
      'wss://nos.lol',
      'wss://relay.nostr.band'
    ];

    // Use provided NDK or create new instance
    this.ndk = options.ndk || new NDK({
      explicitRelayUrls: this.relayUrls
    });

    // Set up signer based on options
    if (!options.ndk) {
      if (options.useNip07) {
        // Use NIP-07 browser extension for signing
        const nip07Signer = new NDKNip07Signer();
        this.ndk.signer = nip07Signer;
      } else if (options.privateKey) {
        // Use private key for signing
        const signer = new NDKPrivateKeySigner(options.privateKey);
        this.ndk.signer = signer;
      }
    }

    if (options.autoConnect !== false && !options.ndk) {
      this.connect().catch(console.error);
    }
  }

  async connect(): Promise<void> {
    try {
      // Add timeout for connection attempts
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      );

      await Promise.race([
        this.ndk.connect(),
        timeout
      ]);
    } catch (error) {
      throw new Error(`Failed to connect to relays: ${error}`);
    }
  }

  disconnect(): void {
    // Stop all subscriptions
    this.subscriptions.forEach(sub => sub.stop());
    this.subscriptions.clear();
    this.applicationCache.clear();
  }

  async discoverApplications(options: DiscoverOptions = {}): Promise<NSMApplication[]> {
    const filter: NDKFilter = {
      kinds: [30079 as any], // NSM Definition Event
      limit: options.limit || 100
    };

    if (options.tag) {
      filter['#t'] = [options.tag];
    }

    if (options.author) {
      filter.authors = [options.author];
    }

    return new Promise((resolve) => {
      const applications: NSMApplication[] = [];
      const subscription = this.ndk.subscribe(filter);

      subscription.on('event', (event: NDKEvent) => {
        try {
          const app = this.parseApplicationFromEvent(event);
          if (app) {
            applications.push(app);
            this.applicationCache.set(app.identifier, app);
          }
        } catch (error) {
          console.error('Error parsing application event:', error);
        }
      });

      subscription.on('eose', () => {
        subscription.stop();
        resolve(applications);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        subscription.stop();
        resolve(applications);
      }, 5000);
    });
  }

  async loadApplication(identifier: string): Promise<NSMApplication | null> {
    // Validate identifier
    if (!identifier || identifier.includes('/')) {
      throw new Error('Invalid application identifier');
    }

    // Check cache first
    if (this.applicationCache.has(identifier)) {
      return this.applicationCache.get(identifier)!;
    }

    const filter: NDKFilter = {
      kinds: [30079 as any],
      '#d': [identifier],
      limit: 1
    };

    return new Promise((resolve) => {
      let found = false;
      const subscription = this.ndk.subscribe(filter);

      subscription.on('event', (event: NDKEvent) => {
        try {
          const app = this.parseApplicationFromEvent(event);
          if (app) {
            this.applicationCache.set(app.identifier, app);
            found = true;
            subscription.stop();
            resolve(app);
          }
        } catch (error) {
          console.error('Error parsing application event:', error);
        }
      });

      subscription.on('eose', () => {
        subscription.stop();
        if (!found) {
          resolve(null);
        }
      });

      // Timeout after 3 seconds
      setTimeout(() => {
        subscription.stop();
        if (!found) {
          resolve(null);
        }
      }, 3000);
    });
  }

  private parseApplicationFromEvent(event: NDKEvent): NSMApplication | null {
    try {
      const dTag = event.tags.find(t => t[0] === 'd')?.[1];
      const nameTag = event.tags.find(t => t[0] === 'name')?.[1];
      const engineTag = event.tags.find(t => t[0] === 'engine')?.[1];
      const engineCodeURITag = event.tags.find(t => t[0] === 'engineCodeURI')?.[1];

      if (!dTag || !nameTag || !engineTag || !engineCodeURITag) {
        return null;
      }

      const content = JSON.parse(event.content);

      return {
        identifier: dTag,
        name: nameTag,
        engine: engineTag,
        engineCodeURI: engineCodeURITag,
        initialState: content.initialState,
        stateSchema: content.stateSchema,
        interactionSchema: content.interactionSchema,
        author: event.pubkey,
        created_at: event.created_at
      };
    } catch (error) {
      console.error('Error parsing application event:', error);
      return null;
    }
  }

  async publishInteraction(interaction: InteractionPayload): Promise<void> {
    const event = new NDKEvent(this.ndk, {
      kind: 7000 as any, // NSM Interaction Event
      content: JSON.stringify({
        action: interaction.action,
        payload: interaction.payload
      }),
      tags: [
        ['a', `30079:test-pubkey:${interaction.applicationId}`]
      ],
      created_at: Math.floor(Date.now() / 1000)
    });

    // Publish the event using NDK
    await event.publish();
  }

  async publishStateUpdate(stateUpdate: StateUpdatePayload): Promise<void> {
    const tags = [
      ['a', `30079:test-pubkey:${stateUpdate.applicationId}`]
    ];

    if (stateUpdate.previousEventId) {
      tags.push(['e', stateUpdate.previousEventId]);
    }

    const event = new NDKEvent(this.ndk, {
      kind: 10079 as any, // NSM State Update Event
      content: JSON.stringify(stateUpdate.state),
      tags,
      created_at: Math.floor(Date.now() / 1000)
    });

    // Publish the event using NDK
    await event.publish();
  }

  subscribeToApplication(
    applicationId: string,
    handlers: SubscriptionHandlers
  ): NDKSubscription {
    const filter: NDKFilter = {
      kinds: [7000 as any, 10079 as any], // Interaction and State Update events
      '#a': [`30079:test-pubkey:${applicationId}`]
    };

    const subscription = this.ndk.subscribe(filter);

    subscription.on('event', (event: NDKEvent) => {
      try {
        if (event.kind === 7000 && handlers.onInteraction) {
          const content = JSON.parse(event.content);
          handlers.onInteraction(content);
        } else if (event.kind === 10079 && handlers.onStateUpdate) {
          const content = JSON.parse(event.content);
          handlers.onStateUpdate(content);
        }
      } catch (error) {
        if (handlers.onError) {
          handlers.onError(error as Error);
        }
      }
    });

    // Store subscription for cleanup
    const subId = `${applicationId}-${Date.now()}`;
    this.subscriptions.set(subId, subscription);

    return subscription;
  }

  getConnectedRelays(): string[] {
    if (!this.ndk.pool?.relays) {
      return [];
    }
    return Array.from(this.ndk.pool.relays.keys());
  }

  async addRelay(url: string): Promise<void> {
    if (!this.ndk.pool?.addRelay) {
      throw new Error('NDK pool not available');
    }
    const relay = new NDKRelay(url, undefined, this.ndk);
    await this.ndk.pool.addRelay(relay);
  }

  async removeRelay(url: string): Promise<void> {
    if (!this.ndk.pool?.removeRelay) {
      throw new Error('NDK pool not available');
    }
    await this.ndk.pool.removeRelay(url);
  }

  // NIP-07 specific methods
  static isNip07Available(): boolean {
    return typeof window !== 'undefined' && window.nostr !== undefined;
  }

  async getUserPublicKey(): Promise<string | null> {
    if (!this.ndk.signer) {
      return null;
    }

    try {
      const user = await this.ndk.signer.user();
      return user.pubkey;
    } catch (error) {
      console.error('Failed to get user public key:', error);
      return null;
    }
  }

  async requestNip07Permission(): Promise<boolean> {
    if (!NSMClient.isNip07Available()) {
      return false;
    }

    try {
      // Request permission from the extension
      const pubkey = await window.nostr!.getPublicKey();
      return !!pubkey;
    } catch (error) {
      console.error('Failed to get NIP-07 permission:', error);
      return false;
    }
  }
}