"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NSMClient = void 0;
const ndk_1 = require("@nostr-dev-kit/ndk");
class NSMClient {
    ndk;
    relayUrls;
    subscriptions = new Map();
    applicationCache = new Map();
    constructor(options = {}) {
        this.relayUrls = options.relayUrls || [
            'wss://relay.damus.io',
            'wss://nos.lol',
            'wss://relay.nostr.band'
        ];
        // Use provided NDK or create new instance
        this.ndk = options.ndk || new ndk_1.default({
            explicitRelayUrls: this.relayUrls
        });
        // Set up signer based on options
        if (!options.ndk) {
            if (options.useNip07) {
                // Use NIP-07 browser extension for signing
                const nip07Signer = new ndk_1.NDKNip07Signer();
                this.ndk.signer = nip07Signer;
            }
            else if (options.privateKey) {
                // Use private key for signing
                const signer = new ndk_1.NDKPrivateKeySigner(options.privateKey);
                this.ndk.signer = signer;
            }
        }
        if (options.autoConnect !== false && !options.ndk) {
            this.connect().catch(console.error);
        }
    }
    async connect() {
        try {
            // Add timeout for connection attempts
            const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 5000));
            await Promise.race([
                this.ndk.connect(),
                timeout
            ]);
        }
        catch (error) {
            throw new Error(`Failed to connect to relays: ${error}`);
        }
    }
    disconnect() {
        // Stop all subscriptions
        this.subscriptions.forEach(sub => sub.stop());
        this.subscriptions.clear();
        this.applicationCache.clear();
    }
    async discoverApplications(options = {}) {
        const filter = {
            kinds: [30079], // NSM Definition Event
            limit: options.limit || 100
        };
        if (options.tag) {
            filter['#t'] = [options.tag];
        }
        if (options.author) {
            filter.authors = [options.author];
        }
        return new Promise((resolve) => {
            const applications = [];
            const subscription = this.ndk.subscribe(filter);
            subscription.on('event', (event) => {
                try {
                    const app = this.parseApplicationFromEvent(event);
                    if (app) {
                        applications.push(app);
                        this.applicationCache.set(app.identifier, app);
                    }
                }
                catch (error) {
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
    async loadApplication(identifier) {
        // Validate identifier
        if (!identifier || identifier.includes('/')) {
            throw new Error('Invalid application identifier');
        }
        // Check cache first
        if (this.applicationCache.has(identifier)) {
            return this.applicationCache.get(identifier);
        }
        const filter = {
            kinds: [30079],
            '#d': [identifier],
            limit: 1
        };
        return new Promise((resolve) => {
            let found = false;
            const subscription = this.ndk.subscribe(filter);
            subscription.on('event', (event) => {
                try {
                    const app = this.parseApplicationFromEvent(event);
                    if (app) {
                        this.applicationCache.set(app.identifier, app);
                        found = true;
                        subscription.stop();
                        resolve(app);
                    }
                }
                catch (error) {
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
    parseApplicationFromEvent(event) {
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
        }
        catch (error) {
            console.error('Error parsing application event:', error);
            return null;
        }
    }
    async publishInteraction(interaction) {
        const event = new ndk_1.NDKEvent(this.ndk, {
            kind: 7000, // NSM Interaction Event
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
    async publishStateUpdate(stateUpdate) {
        const tags = [
            ['a', `30079:test-pubkey:${stateUpdate.applicationId}`]
        ];
        if (stateUpdate.previousEventId) {
            tags.push(['e', stateUpdate.previousEventId]);
        }
        const event = new ndk_1.NDKEvent(this.ndk, {
            kind: 10079, // NSM State Update Event
            content: JSON.stringify(stateUpdate.state),
            tags,
            created_at: Math.floor(Date.now() / 1000)
        });
        // Publish the event using NDK
        await event.publish();
    }
    subscribeToApplication(applicationId, handlers) {
        const filter = {
            kinds: [7000, 10079], // Interaction and State Update events
            '#a': [`30079:test-pubkey:${applicationId}`]
        };
        const subscription = this.ndk.subscribe(filter);
        subscription.on('event', (event) => {
            try {
                if (event.kind === 7000 && handlers.onInteraction) {
                    const content = JSON.parse(event.content);
                    handlers.onInteraction(content);
                }
                else if (event.kind === 10079 && handlers.onStateUpdate) {
                    const content = JSON.parse(event.content);
                    handlers.onStateUpdate(content);
                }
            }
            catch (error) {
                if (handlers.onError) {
                    handlers.onError(error);
                }
            }
        });
        // Store subscription for cleanup
        const subId = `${applicationId}-${Date.now()}`;
        this.subscriptions.set(subId, subscription);
        return subscription;
    }
    getConnectedRelays() {
        if (!this.ndk.pool?.relays) {
            return [];
        }
        return Array.from(this.ndk.pool.relays.keys());
    }
    async addRelay(url) {
        if (!this.ndk.pool?.addRelay) {
            throw new Error('NDK pool not available');
        }
        const relay = new ndk_1.NDKRelay(url, undefined, this.ndk);
        await this.ndk.pool.addRelay(relay);
    }
    async removeRelay(url) {
        if (!this.ndk.pool?.removeRelay) {
            throw new Error('NDK pool not available');
        }
        await this.ndk.pool.removeRelay(url);
    }
    // NIP-07 specific methods
    static isNip07Available() {
        return typeof window !== 'undefined' && window.nostr !== undefined;
    }
    async getUserPublicKey() {
        if (!this.ndk.signer) {
            return null;
        }
        try {
            const user = await this.ndk.signer.user();
            return user.pubkey;
        }
        catch (error) {
            console.error('Failed to get user public key:', error);
            return null;
        }
    }
    async requestNip07Permission() {
        if (!NSMClient.isNip07Available()) {
            return false;
        }
        try {
            // Request permission from the extension
            const pubkey = await window.nostr.getPublicKey();
            return !!pubkey;
        }
        catch (error) {
            console.error('Failed to get NIP-07 permission:', error);
            return false;
        }
    }
}
exports.NSMClient = NSMClient;
