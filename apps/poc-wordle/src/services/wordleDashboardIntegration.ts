/**
 * Wordle Dashboard Integration Services
 *
 * Integrates the NSM Developer Dashboard with the Wordle state machine
 */

import { createActor, type Actor } from 'xstate';
import {
  createEventLogService,
  createTimeTravelService,
  createInspectorService,
  type EventLogService,
  type TimeTravelService,
  type InspectorService
} from '@nsm/dev-tools';
import type { wordleMachine } from '../wordle-machine';

/**
 * Configuration for Wordle dashboard integration
 */
export interface WordleDashboardConfig {
  enableEventLogging?: boolean;
  enableTimeTravel?: boolean;
  enableInspector?: boolean;
  enableAutoConnect?: boolean;
  maxStoredEvents?: number;
  maxStoredSnapshots?: number;
}

/**
 * Default configuration for Wordle dashboard
 */
const DEFAULT_CONFIG: Required<WordleDashboardConfig> = {
  enableEventLogging: true,
  enableTimeTravel: true,
  enableInspector: true,
  enableAutoConnect: true,
  maxStoredEvents: 500,
  maxStoredSnapshots: 50
};

/**
 * Dashboard services configured for Wordle integration
 */
export interface WordleDashboardServices {
  eventLogService: EventLogService;
  timeTravelService: TimeTravelService;
  inspectorService: InspectorService;
  connectInspector: () => Promise<void>;
  openVisualizer: () => void;
  connectToActor: (actor: Actor<typeof wordleMachine>) => void;
  cleanup: () => void;
}

/**
 * Create dashboard services configured for Wordle state machine integration
 */
export function createWordleDashboardServices(
  config: WordleDashboardConfig = {}
): WordleDashboardServices {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Create core services
  const eventLogService = createEventLogService({
    maxEvents: finalConfig.maxStoredEvents,
    enableRealtime: true,
    autoStart: true
  });

  const timeTravelService = createTimeTravelService({
    maxSnapshots: finalConfig.maxStoredSnapshots,
    enableAutoSnapshot: true,
    snapshotInterval: 1000 // Snapshot every second during active gameplay
  });

  const inspectorService = createInspectorService({
    enableDevtools: true,
    autoConnect: finalConfig.enableAutoConnect,
    reconnectOnError: true
  });

  let connectedActor: Actor<typeof wordleMachine> | null = null;
  let actorSubscriptions: (() => void)[] = [];

  /**
   * Connect the dashboard services to a Wordle state machine actor
   */
  const connectToActor = (actor: Actor<typeof wordleMachine>) => {
    // Validate actor input
    if (!actor || typeof actor.subscribe !== 'function') {
      console.warn('⚠️ Invalid actor provided to connectToActor');
      return;
    }

    // Clean up previous connections
    cleanup();
    connectedActor = actor;

    // Subscribe to actor events for event logging
    if (finalConfig.enableEventLogging) {
      const unsubscribeEventLog = actor.subscribe({
        next: (snapshot) => {
          // Log state transitions as custom events
          const event = {
            id: `wordle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            kind: 10001, // Custom event kind for Wordle state updates
            created_at: Math.floor(Date.now() / 1000),
            tags: [
              ['state', String(snapshot.value)],
              ['attempt', String(snapshot.context.attemptNumber)],
              ['guessCount', String(snapshot.context.guesses.length)]
            ],
            content: JSON.stringify({
              state: snapshot.value,
              context: {
                attemptNumber: snapshot.context.attemptNumber,
                currentGuess: snapshot.context.currentGuess,
                guessCount: snapshot.context.guesses.length,
                gameStatus: snapshot.context.gameStatus,
                isComplete: snapshot.matches('won') || snapshot.matches('lost')
              },
              timestamp: Date.now()
            }),
            pubkey: 'wordle-app',
            sig: ''
          };

          eventLogService.addEvent(event);
        },
        error: (error) => {
          console.error('🚨 Actor error:', error);
        }
      });

      actorSubscriptions.push(unsubscribeEventLog);
    }

    // Set up time travel snapshots
    if (finalConfig.enableTimeTravel) {
      try {
        // Connect time travel service and register the actor
        timeTravelService.connect();
        timeTravelService.registerActor(actor, 'wordle-machine');
        // Time travel service connected
      } catch (error) {
        console.warn('⚠️ Failed to register machine with time travel service:', error);
      }
    }

    // Connect to XState inspector
    if (finalConfig.enableInspector) {
      try {
        inspectorService.registerMachine(actor, 'wordle-machine');
        // Inspector service connected
      } catch (error) {
        console.warn('⚠️ Failed to register machine with inspector:', error);
      }
    }
  };

  /**
   * Connect to XState inspector (browser devtools)
   */
  const connectInspector = async (): Promise<void> => {
    try {
      await inspectorService.connect();
      // XState inspector connected

      // Re-register the machine if we have an active actor
      if (connectedActor) {
        inspectorService.registerMachine(connectedActor, 'wordle-machine');
      }
    } catch (error) {
      console.error('❌ Failed to connect to inspector:', error);
      throw error;
    }
  };

  /**
   * Open the XState visualizer
   */
  const openVisualizer = () => {
    try {
      // Open XState visualizer in new tab
      const visualizerUrl = 'https://xstate.js.org/viz/';
      window.open(visualizerUrl, '_blank');
      // XState visualizer opened
    } catch (error) {
      console.error('❌ Failed to open visualizer:', error);
    }
  };

  /**
   * Clean up all connections and subscriptions
   */
  const cleanup = () => {
    // Cleaning up dashboard services

    // Unsubscribe from all actor events
    actorSubscriptions.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (error) {
        console.warn('⚠️ Error during unsubscribe:', error);
      }
    });
    actorSubscriptions = [];

    // Clear connected actor reference
    connectedActor = null;

    // Stop services
    eventLogService.stop();
    timeTravelService.clearHistory();
    inspectorService.disconnect();
  };

  // Auto-connect inspector if enabled
  if (finalConfig.enableAutoConnect && finalConfig.enableInspector) {
    connectInspector().catch(error => {
      console.warn('⚠️ Auto-connect to inspector failed:', error);
    });
  }

  return {
    eventLogService,
    timeTravelService,
    inspectorService,
    connectInspector,
    openVisualizer,
    connectToActor,
    cleanup
  };
}

/**
 * Global dashboard services instance for the Wordle app
 */
let globalWordleDashboardServices: WordleDashboardServices | null = null;

/**
 * Get or create the global Wordle dashboard services
 */
export function getWordleDashboardServices(config?: WordleDashboardConfig): WordleDashboardServices {
  if (!globalWordleDashboardServices) {
    globalWordleDashboardServices = createWordleDashboardServices(config);
  }
  return globalWordleDashboardServices;
}

/**
 * Clean up global dashboard services
 */
export function cleanupWordleDashboardServices(): void {
  if (globalWordleDashboardServices) {
    globalWordleDashboardServices.cleanup();
    globalWordleDashboardServices = null;
  }
}