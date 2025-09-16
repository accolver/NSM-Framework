import type { INostrEvent } from '@nsm/core';
import { NSM_PROTOCOL } from '@nsm/core';

/**
 * Configuration for the Event Log Service
 */
export interface EventLogConfig {
  /** Maximum number of events to store in memory */
  maxEvents?: number;
  /** Whether to enable real-time event updates */
  enableRealtime?: boolean;
  /** Event kinds to automatically filter for */
  filterKinds?: number[];
  /** Whether to automatically start the service */
  autoStart?: boolean;
}

/**
 * Metadata extracted from Nostr events for display purposes
 */
export interface EventMetadata {
  /** NSM event type derived from kind */
  nsmEventType: 'definition' | 'interaction' | 'state-update' | 'other';
  /** Parsed JSON content if valid, null if invalid */
  parsedContent: any | null;
  /** Error message if JSON parsing failed */
  parseError?: string;
  /** Human-readable timestamp */
  formattedTimestamp: string;
  /** Relative time (e.g., "2 minutes ago") */
  relativeTime: string;
}

/**
 * Event Log Service for capturing and managing Nostr events
 */
export interface EventLogService {
  /** Check if the service is currently running */
  isRunning(): boolean;

  /** Start the service */
  start(): void;

  /** Stop the service */
  stop(): void;

  /** Add a new event to the log */
  addEvent(event: INostrEvent): void;

  /** Get all stored events */
  getEvents(): INostrEvent[];

  /** Get events filtered by a specific kind */
  getEventsByKind(kind: number): INostrEvent[];

  /** Get events filtered by multiple kinds */
  getEventsByKinds(kinds: number[]): INostrEvent[];

  /** Get events filtered by kind range (inclusive) */
  getEventsByKindRange(minKind: number, maxKind: number): INostrEvent[];

  /** Search events by content, pubkey, or event ID */
  searchEvents(query: string): INostrEvent[];

  /** Clear all events */
  clearEvents(): void;

  /** Get total event count */
  getEventCount(): number;

  /** Get metadata for an event */
  getEventMetadata(event: INostrEvent): EventMetadata;

  /** Subscribe to new events */
  onEvent(callback: (event: INostrEvent) => void): () => void;

  /** Subscribe to clear events */
  onClear(callback: () => void): () => void;
}

/**
 * Implementation of EventLogService
 */
class EventLogServiceImpl implements EventLogService {
  private events: INostrEvent[] = [];
  private running = false;
  private config: Required<EventLogConfig>;
  private eventListeners: Set<(event: INostrEvent) => void> = new Set();
  private clearListeners: Set<() => void> = new Set();

  constructor(config: EventLogConfig = {}) {
    this.config = {
      maxEvents: 1000,
      enableRealtime: true,
      filterKinds: [NSM_PROTOCOL.DEFINITION_KIND, NSM_PROTOCOL.STATE_UPDATE_KIND],
      autoStart: false,
      ...config
    };

    if (this.config.autoStart) {
      this.start();
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  start(): void {
    this.running = true;
  }

  stop(): void {
    this.running = false;
    this.eventListeners.clear();
    this.clearListeners.clear();
  }

  addEvent(event: INostrEvent): void {
    // Add event to the end of the array (insertion order)
    this.events.push(event);

    // Enforce maxEvents limit - remove from beginning (oldest first)
    if (this.events.length > this.config.maxEvents) {
      this.events = this.events.slice(-this.config.maxEvents);
    }

    // Emit event to listeners if realtime is enabled
    if (this.config.enableRealtime) {
      this.eventListeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.warn('Error in event listener:', error);
        }
      });
    }
  }

  getEvents(): INostrEvent[] {
    return [...this.events]; // Return a copy to prevent mutation
  }

  getEventsByKind(kind: number): INostrEvent[] {
    return this.events.filter(event => event.kind === kind);
  }

  getEventsByKinds(kinds: number[]): INostrEvent[] {
    return this.events.filter(event => kinds.includes(event.kind));
  }

  getEventsByKindRange(minKind: number, maxKind: number): INostrEvent[] {
    return this.events.filter(event => event.kind >= minKind && event.kind <= maxKind);
  }

  searchEvents(query: string): INostrEvent[] {
    if (!query.trim()) {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    const queryWords = lowerQuery.split(/\s+/).filter(word => word.length > 0);

    return this.events.filter(event => {
      const searchableText = [
        event.content,
        event.pubkey,
        event.id,
        event.tags.flat().join(' ')
      ].join(' ').toLowerCase();

      // Check if all query words are present in the searchable text
      return queryWords.every(word => searchableText.includes(word));
    });
  }

  clearEvents(): void {
    this.events = [];

    // Emit clear event to listeners
    this.clearListeners.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.warn('Error in clear listener:', error);
      }
    });
  }

  getEventCount(): number {
    return this.events.length;
  }

  getEventMetadata(event: INostrEvent): EventMetadata {
    // Determine NSM event type from kind
    let nsmEventType: EventMetadata['nsmEventType'] = 'other';
    if (event.kind === NSM_PROTOCOL.DEFINITION_KIND) {
      nsmEventType = 'definition';
    } else if (event.kind === NSM_PROTOCOL.STATE_UPDATE_KIND) {
      nsmEventType = 'state-update';
    } else if (event.kind >= NSM_PROTOCOL.INTERACTION_KIND_MIN && event.kind <= NSM_PROTOCOL.INTERACTION_KIND_MAX) {
      nsmEventType = 'interaction';
    }

    // Parse JSON content safely
    let parsedContent: any | null = null;
    let parseError: string | undefined;
    try {
      parsedContent = JSON.parse(event.content);
    } catch (error) {
      parseError = error instanceof Error ? error.message : 'Invalid JSON';
    }

    // Format timestamp
    const date = new Date(event.created_at * 1000);
    const formattedTimestamp = date.toISOString().replace('T', ' ').substring(0, 19);

    // Calculate relative time
    const now = Date.now();
    const eventTime = event.created_at * 1000;
    const diffMs = now - eventTime;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    let relativeTime: string;
    if (diffMinutes < 1) {
      relativeTime = 'just now';
    } else if (diffMinutes < 60) {
      relativeTime = `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      relativeTime = `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else {
      relativeTime = `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    }

    return {
      nsmEventType,
      parsedContent,
      parseError,
      formattedTimestamp,
      relativeTime
    };
  }

  onEvent(callback: (event: INostrEvent) => void): () => void {
    this.eventListeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.eventListeners.delete(callback);
    };
  }

  onClear(callback: () => void): () => void {
    this.clearListeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.clearListeners.delete(callback);
    };
  }
}

/**
 * Create a new EventLogService instance
 */
export function createEventLogService(config?: EventLogConfig): EventLogService {
  return new EventLogServiceImpl(config);
}

/**
 * Global event log service instance for easy access across the application
 */
let globalEventLogService: EventLogService | null = null;

/**
 * Get or create the global event log service
 */
export function getEventLogService(config?: EventLogConfig): EventLogService {
  if (!globalEventLogService) {
    globalEventLogService = createEventLogService(config);
  }
  return globalEventLogService;
}

/**
 * Utility function to log a Nostr event quickly
 */
export function logNostrEvent(event: INostrEvent): void {
  const service = getEventLogService();
  service.addEvent(event);
}

/**
 * Utility function to get NSM-specific events
 */
export function getNSMEvents(): INostrEvent[] {
  const service = getEventLogService();
  const nsmKinds = [
    NSM_PROTOCOL.DEFINITION_KIND,
    NSM_PROTOCOL.STATE_UPDATE_KIND
  ];

  // Get NSM kinds and interaction range
  const kindEvents = service.getEventsByKinds(nsmKinds);
  const interactionEvents = service.getEventsByKindRange(NSM_PROTOCOL.INTERACTION_KIND_MIN, NSM_PROTOCOL.INTERACTION_KIND_MAX);

  // Combine and sort by timestamp (most recent first)
  const allEvents = [...kindEvents, ...interactionEvents];
  return allEvents.sort((a, b) => b.created_at - a.created_at);
}