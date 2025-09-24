/**
 * Nostr-based NSM Application Discovery Service
 * Replaces mock implementation with real Nostr relay queries
 */

import type { NSMClient, NSMApplication as CoreNSMApplication, DiscoverOptions } from '@nsm/client';

// Extended application interface for dashboard display
export interface NSMApplication {
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
  engineCodeURI?: string;
  initialState?: any;
  stateSchema?: any;
  interactionSchema?: any;
}

export interface NostrAppDiscoveryOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  maxRetries?: number;
  timeout?: number; // in milliseconds
}

export interface DiscoveryEventHandlers {
  appDiscovered?: (app: NSMApplication) => void;
  statusChanged?: (appId: string, status: NSMApplication['status']) => void;
  error?: (error: Error) => void;
}

export class NostrAppDiscoveryService {
  private nsmClient: NSMClient;
  private discoveredApps: Map<string, NSMApplication> = new Map();
  private scanning: boolean = false;
  private subscriptions: Map<string, any> = new Map();
  private eventHandlers: Map<string, Function[]> = new Map();
  private refreshTimer: NodeJS.Timeout | null = null;
  private options: NostrAppDiscoveryOptions;

  constructor(nsmClient: NSMClient, options: NostrAppDiscoveryOptions = {}) {
    this.nsmClient = nsmClient;
    this.options = {
      autoRefresh: false,
      refreshInterval: 30000, // 30 seconds
      maxRetries: 3,
      timeout: 5000, // 5 seconds
      ...options
    };

    // Start auto-refresh if enabled
    if (this.options.autoRefresh) {
      this.startAutoRefresh();
    }
  }

  /**
   * Start discovering NSM applications on the network
   */
  async startDiscovery(discoverOptions?: DiscoverOptions): Promise<void> {
    if (this.scanning) {
      return; // Already scanning
    }

    this.scanning = true;
    this.emit('scanningStarted');

    try {
      // Use NSMClient to discover applications
      const coreApps = await this.nsmClient.discoverApplications(discoverOptions);

      // Convert core applications to dashboard format
      const dashboardApps = this.convertTosDashboardApps(coreApps);

      // Update discovered apps map
      for (const app of dashboardApps) {
        if (this.isValidApplication(app)) {
          const existingApp = this.discoveredApps.get(app.id);
          const updatedApp: NSMApplication = {
            ...app,
            status: existingApp?.status || 'disconnected',
            lastSeen: Date.now()
          };

          this.discoveredApps.set(app.id, updatedApp);
          this.emit('appDiscovered', updatedApp);
        }
      }

    } catch (error) {
      console.error('Discovery failed:', error);
      this.emit('error', error as Error);
    } finally {
      this.scanning = false;
      this.emit('scanningStopped');
    }
  }

  /**
   * Connect to a discovered application
   */
  async connectToApp(appId: string): Promise<void> {
    const app = this.discoveredApps.get(appId);
    if (!app) {
      throw new Error('Application not found');
    }

    try {
      // Update status to connecting
      app.status = 'discovering';
      this.discoveredApps.set(appId, app);
      this.emit('statusChanged', appId, 'discovering');

      // Subscribe to application events via NSMClient
      const subscription = this.nsmClient.subscribeToApplication(app.identifier || appId, {
        onInteraction: (interaction) => {
          this.emit('appInteraction', appId, interaction);
        },
        onStateUpdate: (stateUpdate) => {
          this.emit('appStateUpdate', appId, stateUpdate);
        },
        onError: (error) => {
          console.error(`Error in subscription for ${appId}:`, error);
          this.emit('error', error);
        }
      });

      // Store subscription for cleanup
      this.subscriptions.set(appId, subscription);

      // Update status to connected
      app.status = 'connected';
      app.lastSeen = Date.now();
      this.discoveredApps.set(appId, app);
      this.emit('statusChanged', appId, 'connected');

    } catch (error) {
      // Update status to disconnected on error
      app.status = 'disconnected';
      this.discoveredApps.set(appId, app);
      this.emit('statusChanged', appId, 'disconnected');
      throw error;
    }
  }

  /**
   * Disconnect from an application
   */
  async disconnectFromApp(appId: string): Promise<void> {
    const app = this.discoveredApps.get(appId);
    if (!app) {
      throw new Error('Application not found');
    }

    // Stop subscription
    const subscription = this.subscriptions.get(appId);
    if (subscription) {
      subscription.stop();
      this.subscriptions.delete(appId);
    }

    // Update status
    app.status = 'disconnected';
    this.discoveredApps.set(appId, app);
    this.emit('statusChanged', appId, 'disconnected');
  }

  /**
   * Get currently discovered applications
   */
  getDiscoveredApps(): NSMApplication[] {
    return Array.from(this.discoveredApps.values());
  }

  /**
   * Check if discovery is currently in progress
   */
  isScanning(): boolean {
    return this.scanning;
  }

  /**
   * Get connected relays from NSMClient
   */
  getConnectedRelays(): string[] {
    return this.nsmClient.getConnectedRelays();
  }

  /**
   * Add event listener
   */
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * Remove event listener
   */
  off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to registered handlers
   */
  private emit(event: string, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Start auto-refresh timer
   */
  private startAutoRefresh(): void {
    if (this.refreshTimer) {
      return; // Already running
    }

    this.refreshTimer = setInterval(() => {
      this.startDiscovery().catch(error => {
        console.error('Auto-refresh discovery failed:', error);
      });
    }, this.options.refreshInterval);
  }

  /**
   * Stop auto-refresh timer
   */
  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Convert core NSM applications to dashboard format
   */
  private convertTosDashboardApps(coreApps: CoreNSMApplication[]): NSMApplication[] {
    return coreApps
      .filter(coreApp => coreApp && coreApp.identifier && coreApp.name) // Filter out malformed apps
      .map(coreApp => ({
        id: coreApp.identifier,
        name: coreApp.name,
        type: this.determineAppType(coreApp),
        status: 'disconnected' as const,
        lastSeen: coreApp.created_at || Date.now(),
        identifier: coreApp.identifier,
        engine: coreApp.engine,
        author: coreApp.author,
        created_at: coreApp.created_at,
        engineCodeURI: coreApp.engineCodeURI,
        initialState: coreApp.initialState,
        stateSchema: coreApp.stateSchema,
        interactionSchema: coreApp.interactionSchema
      }));
  }

  /**
   * Determine application type from metadata
   */
  private determineAppType(app: CoreNSMApplication): string {
    // Analyze app properties to determine type
    if (!app.name) {
      return 'application';
    }

    const name = app.name.toLowerCase();
    if (name.includes('wordle')) {
      return 'game';
    }
    if (name.includes('whiteboard')) {
      return 'collaborative-canvas';
    }
    if (name.includes('chat')) {
      return 'communication';
    }
    if (name.includes('todo') || name.includes('task')) {
      return 'productivity';
    }

    // Default type
    return 'application';
  }

  /**
   * Validate application data
   */
  private isValidApplication(app: any): app is NSMApplication {
    return app &&
           typeof app.id === 'string' &&
           typeof app.name === 'string' &&
           app.id.length > 0 &&
           app.name.length > 0;
  }

  /**
   * Cleanup resources and subscriptions
   */
  destroy(): void {
    this.scanning = false;
    this.stopAutoRefresh();

    // Stop all subscriptions
    for (const subscription of this.subscriptions.values()) {
      if (subscription && typeof subscription.stop === 'function') {
        subscription.stop();
      }
    }
    this.subscriptions.clear();

    // Clear discovered apps
    this.discoveredApps.clear();

    // Clear event handlers
    this.eventHandlers.clear();
  }
}