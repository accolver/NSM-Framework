import { type AnyActor, type AnyActorLogic } from 'xstate';

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

  /** Get current connection status with details */
  readonly connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';

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

  /** Copy machine definition to clipboard for external visualizer */
  copyMachineDefinition(actorName: string): Promise<boolean>;

  /** Get machine definition as JSON for external visualizer */
  getMachineDefinition(actorName: string): any;
}

/**
 * Implementation of InspectorService
 */
class InspectorServiceImpl implements InspectorService {
  private inspector: any = null;
  private receiver: any = null;
  private connected = false;
  private status: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  private lastError: Error | null = null;
  private connectionAttempts = 0;
  private maxRetries = 3;
  private retryDelay = 1000; // Start with 1 second
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

  get connectionStatus(): 'disconnected' | 'connecting' | 'connected' | 'error' {
    return this.status;
  }

  async connect(): Promise<boolean> {
    // Set status to connecting
    this.status = 'connecting';
    this.lastError = null;

    console.log('🔍 CONNECT CALLED - Environment check:');
    console.log('🔍 - NODE_ENV:', process.env.NODE_ENV);
    console.log('🔍 - devOnly:', this.config.devOnly);
    console.log('🔍 - window available:', typeof window !== 'undefined');
    console.log('🔍 - already connected:', this.connected);
    console.log('🔍 - connection attempts:', this.connectionAttempts);

    try {
      // Skip in production if configured
      if (this.config.devOnly && process.env.NODE_ENV === 'production') {
        console.log('🔍 Inspector connection skipped in production');
        this.status = 'disconnected';
        return false;
      }

      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        console.log('🔍 Inspector not available in non-browser environment');
        this.status = 'disconnected';
        return false;
      }

      // Check if already connected
      if (this.connected && this.inspector) {
        console.log('🔍 Inspector already connected, returning true');
        this.status = 'connected';
        return true;
      }

      // Check if we're in a test environment by detecting common test indicators
      const isTestEnvironment =
        process.env.NODE_ENV === 'test' ||
        typeof (globalThis as any).expect !== 'undefined' ||
        typeof (globalThis as any).vi !== 'undefined' ||
        typeof (globalThis as any).jest !== 'undefined' ||
        typeof (globalThis as any).bun !== 'undefined' ||
        // Check for happy-dom which is commonly used in test environments
        typeof (window as any)?.happyDOM !== 'undefined' ||
        // Check for jsdom
        navigator?.userAgent?.includes('jsdom');

      console.log('🔍 Test environment detected:', isTestEnvironment);
      console.log('🔍 window.open available:', typeof window.open === 'function');

      // Dynamic import to avoid bundling in production
      console.log('🔍 Attempting dynamic import of @statelyai/inspect...');
      const { createBrowserInspector } = await import('@statelyai/inspect');
      console.log('🔍 Successfully imported @statelyai/inspect');

      // In test environments, ensure window.open is available before creating inspector
      if (isTestEnvironment && (!window.open || typeof window.open !== 'function')) {
        console.log('🔍 Inspector connection skipped - test environment without window.open');
        return false;
      }

      // Create browser inspector with explicit window handling
      console.log('🔍 Creating browser inspector with config:', {
        url: 'https://stately.ai/viz',
        hasWindow: !!window,
        autoStart: false,
        isTestEnv: isTestEnvironment
      });

      // In test environments, create a mock inspector to avoid popup windows
      if (isTestEnvironment) {
        console.log('🔍 Creating mock inspector for test environment');
        this.inspector = {
          start: () => {
            console.log('🔍 Mock inspector started');
          },
          stop: () => {
            console.log('🔍 Mock inspector stopped');
          },
          actor: () => {
            console.log('🔍 Mock inspector actor registered');
          },
          targetWindow: null // Explicitly null for test environments
        };
      } else {
        this.inspector = createBrowserInspector({
          url: 'https://stately.ai/viz',
          window: window,
          iframe: null, // Allow popup for now
          autoStart: false // We'll start manually
        });
      }

      console.log('🔍 Inspector created successfully:', !!this.inspector);

      // Start the inspector - wrap in try-catch for better error handling
      try {
        console.log('🔍 Starting inspector...');
        this.inspector?.start();
        this.connected = true;
        console.log('🔍 Inspector started successfully');

        if (isTestEnvironment) {
          console.log('🔍 Inspector connected in test environment (mocked)');
        } else {
          console.log('🔍 Browser Inspector connected - popup window should open');
        }

        // Reset connection attempts on success
        this.connectionAttempts = 0;
        this.status = 'connected';

        // Re-register any actors that were stored while disconnected
        this.reregisterAllActors();

        return true;
      } catch (startError) {
        console.error('🔍 Failed to start inspector:', startError);
        console.error('🔍 Start error details:', {
          message: startError?.message,
          stack: startError?.stack,
          name: startError?.name
        });
        // Clean up inspector instance if start fails
        this.inspector = null;
        this.connected = false;
        this.status = 'error';
        this.lastError = startError as Error;
        return false;
      }

    } catch (error) {
      console.error('🔍 Failed to connect inspector:', error);
      console.error('🔍 Connection error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        cause: error?.cause
      });
      this.connected = false;
      this.status = 'error';
      this.lastError = error as Error;
      this.connectionAttempts++;

      // Implement automatic retry with exponential backoff for certain errors
      if (this.connectionAttempts < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, this.connectionAttempts - 1);
        console.log(`🔍 Retrying connection in ${delay}ms (attempt ${this.connectionAttempts}/${this.maxRetries})...`);

        setTimeout(() => {
          this.connect().catch(retryError => {
            console.error('🔍 Retry attempt failed:', retryError);
          });
        }, delay);
      } else {
        console.error(`🔍 Max retry attempts (${this.maxRetries}) reached. Connection failed permanently.`);
      }

      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.inspector) {
        // Check if inspector has a valid stop method and window target
        if (typeof this.inspector.stop === 'function') {
          try {
            // Add safety check for targetWindow before stopping
            if (this.inspector.targetWindow && typeof this.inspector.targetWindow.postMessage === 'function') {
              this.inspector.stop();
            } else {
              // Inspector window already closed or invalid, just clean up
              console.log('🔍 Inspector window unavailable, cleaning up silently');
            }
          } catch (stopError) {
            // Ignore postMessage errors - window might be closed
            if (stopError.message?.includes('postMessage')) {
              console.log('🔍 Inspector window already closed, ignoring postMessage error');
            } else {
              console.warn('🔍 Inspector stop error:', stopError.message);
            }
          }
        }
        this.inspector = null;
      }

      if (this.receiver) {
        // The receiver will be cleaned up when inspector stops
        this.receiver = null;
      }

      this.connected = false;
      this.status = 'disconnected';
      this.lastError = null;
      this.connectionAttempts = 0; // Reset attempts on manual disconnect
      this.registeredActors.clear();

      console.log('🔍 Inspector disconnected');
    } catch (error) {
      console.warn('🔍 Error during inspector disconnect:', error);
      // Don't rethrow - disconnect should be graceful
    }
  }

  registerActor(actor: AnyActor, name: string): boolean {
    // Store the actor even if not currently connected, for re-registration later
    this.registeredActors.set(name, actor);

    if (!this.connected || !this.inspector) {
      console.warn('🔍 Cannot register actor: inspector not connected');
      console.log(`🔍 Actor ${name} stored for registration when inspector connects`);
      return false;
    }

    try {
      console.log(`🔍 Registering actor ${name} with inspector...`);

      // Get the current snapshot
      const snapshot = actor.getSnapshot();

      console.log('🔍 Actor snapshot:', {
        value: snapshot.value,
        status: snapshot.status,
        contextKeys: Object.keys(snapshot.context || {}),
        logic: !!actor.logic,
        machineId: actor.logic?.config?.id
      });

      // Register the actor with the inspector
      // The inspector expects to receive state transitions and machine definition
      this.inspector.actor(actor);

      console.log(`🔍 Actor registered successfully: ${name}`);
      console.log('🔍 Inspector should now be tracking state transitions');
      console.log('🔍 Visit https://stately.ai/viz to see the visualization');

      return true;
    } catch (error) {
      console.error(`🔍 Failed to register actor ${name}:`, error);
      console.error('🔍 Registration error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });
      return false;
    }
  }

  /**
   * Re-register all stored actors with the inspector
   * Useful when reconnecting after a disconnection
   */
  private reregisterAllActors(): void {
    if (!this.connected || !this.inspector) {
      return;
    }

    console.log(`🔍 Re-registering ${this.registeredActors.size} stored actors...`);

    for (const [name, actor] of this.registeredActors.entries()) {
      try {
        this.inspector.actor(actor);
        console.log(`🔍 Re-registered actor: ${name}`);
      } catch (error) {
        console.warn(`🔍 Failed to re-register actor ${name}:`, error);
      }
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

  getMachineDefinition(actorName: string): any {
    const actor = this.registeredActors.get(actorName);
    if (!actor) {
      console.warn(`🔍 Actor ${actorName} not found for machine definition export`);
      return null;
    }

    try {
      // Get the machine logic from the actor
      const logic = actor.logic;
      if (!logic || !logic.config) {
        console.warn(`🔍 Actor ${actorName} has no machine logic or config`);
        return null;
      }

      // Extract the machine configuration
      const machineConfig = logic.config;

      // Create a clean definition suitable for stately.ai visualizer
      const definition = {
        id: machineConfig.id || actorName,
        initial: machineConfig.initial,
        context: machineConfig.context || {},
        states: machineConfig.states || {},
        // Include other relevant properties
        ...(machineConfig.on && { on: machineConfig.on }),
        ...(machineConfig.type && { type: machineConfig.type }),
        ...(machineConfig.schema && { schema: machineConfig.schema }),
        ...(machineConfig.meta && { meta: machineConfig.meta }),
        ...(machineConfig.description && { description: machineConfig.description }),
        ...(machineConfig.tags && { tags: machineConfig.tags })
      };

      console.log(`🔍 Generated machine definition for ${actorName}:`, definition);
      return definition;
    } catch (error) {
      console.error(`🔍 Failed to generate machine definition for ${actorName}:`, error);
      return null;
    }
  }

  async copyMachineDefinition(actorName: string): Promise<boolean> {
    try {
      const definition = this.getMachineDefinition(actorName);
      if (!definition) {
        console.warn(`🔍 Cannot copy machine definition: ${actorName} not found or invalid`);
        return false;
      }

      // Format as JSON string for easy copying
      const jsonString = JSON.stringify(definition, null, 2);

      // Use the Clipboard API if available
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(jsonString);
        console.log(`🔍 Machine definition for ${actorName} copied to clipboard`);
        console.log('🔍 You can now paste this into https://stately.ai/viz');
        return true;
      }

      // Fallback for older browsers - create a temporary textarea
      const textarea = document.createElement('textarea');
      textarea.value = jsonString;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();

      const success = document.execCommand('copy');
      document.body.removeChild(textarea);

      if (success) {
        console.log(`🔍 Machine definition for ${actorName} copied to clipboard (fallback method)`);
        console.log('🔍 You can now paste this into https://stately.ai/viz');
        return true;
      } else {
        console.error('🔍 Failed to copy to clipboard - both modern and fallback methods failed');
        return false;
      }

    } catch (error) {
      console.error(`🔍 Failed to copy machine definition for ${actorName}:`, error);
      return false;
    }
  }
}

/**
 * Create a new InspectorService instance
 */
export function createInspectorService(config?: InspectorConfig): InspectorService {
  return new InspectorServiceImpl(config);
}

/**
 * Create an XState actor with inspection enabled
 * This is the recommended approach for XState 5
 */
export async function createInspectedActor<T extends AnyActorLogic>(
  machine: T,
  options: any = {}
): Promise<{ actor: any; inspector?: any }> {
  // Check if we're in an environment that supports inspection
  if (typeof window === 'undefined' || process.env.NODE_ENV === 'production') {
    // No inspection in non-browser or production environments
    const { createActor } = await import('xstate');
    return { actor: createActor(machine, options) };
  }

  // Check if we're in a test environment
  const isTestEnvironment =
    process.env.NODE_ENV === 'test' ||
    typeof (globalThis as any).expect !== 'undefined' ||
    typeof (globalThis as any).vi !== 'undefined' ||
    typeof (globalThis as any).jest !== 'undefined' ||
    typeof (globalThis as any).bun !== 'undefined' ||
    // Check for happy-dom which is commonly used in test environments
    typeof (window as any)?.happyDOM !== 'undefined' ||
    // Check for jsdom
    navigator?.userAgent?.includes('jsdom');

  try {
    const [{ createActor }, { createBrowserInspector }] = await Promise.all([
      import('xstate'),
      import('@statelyai/inspect')
    ]);

    // In test environments, check if window.open is available
    if (isTestEnvironment && (!window.open || typeof window.open !== 'function')) {
      console.log('🔍 Creating actor without inspection in test environment');
      return { actor: createActor(machine, options) };
    }

    // Check if in development mode and enable additional logging
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Creating actor with inspection in development mode');
    }

    // Create the inspector with proper error handling
    let inspector: any = null;
    try {
      // In test environments, create a mock inspector
      if (isTestEnvironment) {
        inspector = {
          inspect: () => {
            console.log('🔍 Mock inspector inspect called');
          },
          start: () => {
            console.log('🔍 Mock inspector started');
          },
          stop: () => {
            console.log('🔍 Mock inspector stopped');
          },
          targetWindow: null
        };
      } else {
        inspector = createBrowserInspector({
          url: 'https://stately.ai/viz',
          window: window,
          iframe: null,
          autoStart: true
        });
      }
    } catch (inspectorError) {
      console.warn('🔍 Failed to create inspector, falling back to normal actor:', inspectorError);
      return { actor: createActor(machine, options) };
    }

    // Create actor with inspection enabled
    const actor = createActor(machine, {
      ...options,
      inspect: inspector?.inspect
    });

    console.log('🔍 Actor created with inspection:', {
      hasInspector: !!inspector,
      hasInspect: !!inspector?.inspect,
      machineId: machine.id || 'unknown',
      actorId: actor.sessionId || 'unknown'
    });

    if (isTestEnvironment) {
      console.log('🔍 Actor created with inspection enabled in test environment');
    } else {
      console.log('🔍 Actor created with inspection enabled');
    }

    return { actor, inspector };
  } catch (error) {
    console.warn('🔍 Failed to create inspected actor, falling back to normal actor:', error);
    const { createActor } = await import('xstate');
    return { actor: createActor(machine, options) };
  }
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
export async function createAndInspectActor<T extends AnyActor>(
  actorFactory: () => T,
  name: string = 'inspected-actor'
): Promise<{ actor: T; inspected: boolean }> {
  const actor = actorFactory();
  const inspected = await inspectActor(actor, name);

  return { actor, inspected };
}