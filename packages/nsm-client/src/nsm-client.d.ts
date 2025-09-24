import NDK, { NDKSubscription } from '@nostr-dev-kit/ndk';
export interface NSMClientOptions {
    relayUrls?: string[];
    ndk?: NDK;
    autoConnect?: boolean;
    privateKey?: string;
    useNip07?: boolean;
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
export declare class NSMClient {
    private ndk;
    relayUrls: string[];
    private subscriptions;
    private applicationCache;
    constructor(options?: NSMClientOptions);
    connect(): Promise<void>;
    disconnect(): void;
    discoverApplications(options?: DiscoverOptions): Promise<NSMApplication[]>;
    loadApplication(identifier: string): Promise<NSMApplication | null>;
    private parseApplicationFromEvent;
    publishInteraction(interaction: InteractionPayload): Promise<void>;
    publishStateUpdate(stateUpdate: StateUpdatePayload): Promise<void>;
    subscribeToApplication(applicationId: string, handlers: SubscriptionHandlers): NDKSubscription;
    getConnectedRelays(): string[];
    addRelay(url: string): Promise<void>;
    removeRelay(url: string): Promise<void>;
    static isNip07Available(): boolean;
    getUserPublicKey(): Promise<string | null>;
    requestNip07Permission(): Promise<boolean>;
}
//# sourceMappingURL=nsm-client.d.ts.map