import { type AnyActor } from 'xstate';

/**
 * Configuration for the Inspector Service
 */
export interface InspectorConfig {
  /** WebSocket URL for the inspector connection */
  url?: string;
  /** Whether to automatically start the inspector on creation */
  autoStart?: boolean;
  /** Maximum buffer size for state events */
  maxBufferSize?: number;
  /** Whether to enable inspector in development mode only */
  devOnly?: boolean;
}

/**
 * Inspector Service for XState machine visualization
 * Integrates with @statelyai/inspect for live state machine monitoring
 */
export interface InspectorService {
  /** Check if inspector is currently connected */
  readonly isConnected: boolean;

  /** Connect to the inspector */
  connect(): Promise<boolean>;

  /** Disconnect from the inspector */
  disconnect(): Promise<void>;

  /** Register an actor for inspection */
  registerActor(actor: AnyActor, name: string): boolean;

  /** Unregister an actor from inspection */
  unregisterActor(name: string): boolean;

  /** Get list of registered actor names */
  getRegisteredActors(): string[];
}

/**
 * Implementation of InspectorService
 */
class InspectorServiceImpl implements InspectorService {
  private inspector: any = null;
  private receiver: any = null;
  private connected = false;
  private registeredActors = new Map<string, AnyActor>();
  private config: Required<InspectorConfig>;

  constructor(config: InspectorConfig = {}) {
    // Validate configuration
    this.validateConfig(config);

    // Set defaults
    this.config = {
      url: 'ws://localhost:8080',
      autoStart: true,
      maxBufferSize: 1000,
      devOnly: true,
      ...config
    };

    // Check if we should enable inspector (dev mode only by default)
    if (this.config.devOnly && process.env.NODE_ENV === 'production') {
      console.log('🔍 Inspector disabled in production mode');
      return;
    }

    // Auto-start if configured
    if (this.config.autoStart) {
      this.connect().catch(error => {
        console.warn('🔍 Inspector auto-start failed:', error.message);
      });
    }
  }

  private validateConfig(config: InspectorConfig): void {
    if (config.url && typeof config.url !== 'string') {
      throw new Error('Inspector config: url must be a string');
    }

    if (config.url && !config.url.startsWith('ws://') && !config.url.startsWith('wss://')) {
      throw new Error('Inspector config: url must be a valid WebSocket URL (ws:// or wss://)');
    }

    if (config.maxBufferSize && (typeof config.maxBufferSize !== 'number' || config.maxBufferSize <= 0)) {
      throw new Error('Inspector config: maxBufferSize must be a positive number');
    }
  }

  get isConnected(): boolean {
    return this.connected;
  }

  async connect(): Promise<boolean> {
    try {
      // Skip in production if configured
      if (this.config.devOnly && process.env.NODE_ENV === 'production') {
        console.log('🔍 Inspector connection skipped in production');
        return false;
      }

      // Dynamic import to avoid bundling in production
      const { createInspector, createWebSocketReceiver } = await import('@statelyai/inspect');

      // Create WebSocket receiver (this creates the connection)
      this.receiver = createWebSocketReceiver();

      // Create inspector with the receiver
      this.inspector = createInspector({
        adapter: this.receiver
      });

      // Start the inspector
      this.inspector.start();

      this.connected = true;
      console.log('🔍 Inspector connected');

      return true;
    } catch (error) {
      console.warn('🔍 Failed to connect inspector:', error);
      this.connected = false;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.inspector) {
        // Stop the inspector
        this.inspector.stop?.();
        this.inspector = null;
      }

      if (this.receiver) {
        // The receiver will be cleaned up when inspector stops
        this.receiver = null;
      }

      this.connected = false;
      this.registeredActors.clear();

      console.log('🔍 Inspector disconnected');
    } catch (error) {
      console.warn('🔍 Error during inspector disconnect:', error);
      // Don't rethrow - disconnect should be graceful
    }
  }

  registerActor(actor: AnyActor, name: string): boolean {
    if (!this.connected || !this.inspector) {
      console.warn('🔍 Cannot register actor: inspector not connected');
      return false;
    }

    try {
      // Register with the inspector
      this.inspector.actor(actor);

      // Store locally for management
      this.registeredActors.set(name, actor);

      console.log(`🔍 Actor registered: ${name}`);
      return true;
    } catch (error) {
      console.warn(`🔍 Failed to register actor ${name}:`, error);
      return false;
    }
  }

  unregisterActor(name: string): boolean {
    if (!this.registeredActors.has(name)) {
      console.warn(`🔍 Actor ${name} not found for unregistration`);
      return false;
    }

    try {
      this.registeredActors.delete(name);
      console.log(`🔍 Actor unregistered: ${name}`);
      return true;
    } catch (error) {
      console.warn(`🔍 Failed to unregister actor ${name}:`, error);
      return false;
    }
  }

  getRegisteredActors(): string[] {
    return Array.from(this.registeredActors.keys());
  }
}

/**
 * Create a new InspectorService instance
 */
export function createInspectorService(config?: InspectorConfig): InspectorService {
  return new InspectorServiceImpl(config);
}

/**
 * Global inspector service instance for easy access
 * Can be used across the application for consistent inspector management
 */
let globalInspectorService: InspectorService | null = null;

/**
 * Get or create the global inspector service
 */
export function getInspectorService(config?: InspectorConfig): InspectorService {
  if (!globalInspectorService) {
    globalInspectorService = createInspectorService(config);
  }
  return globalInspectorService;
}

/**
 * Utility function to quickly inspect an actor
 * Useful for quick debugging and development
 */
export async function inspectActor(actor: AnyActor, name: string = 'unnamed-actor'): Promise<boolean> {
  const inspector = getInspectorService();

  if (!inspector.isConnected) {
    const connected = await inspector.connect();
    if (!connected) {
      return false;
    }
  }

  return inspector.registerActor(actor, name);
}

/**
 * Utility function to create and inspect an actor in one call
 * Useful for development and debugging workflows
 */
export async function createInspectedActor<T extends AnyActor>(
  actorFactory: () => T,
  name: string = 'inspected-actor'
): Promise<{ actor: T; inspected: boolean }> {
  const actor = actorFactory();
  const inspected = await inspectActor(actor, name);

  return { actor, inspected };
}