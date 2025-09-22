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
  private recentEventHashes: Set<string> = new Set();
  private lastCleanup: number = Date.now();

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
    // CRITICAL FIX: Prevent event flooding with deduplication
    const eventHash = this.createEventHash(event);

    // Check if we've seen this exact event recently
    if (this.recentEventHashes.has(eventHash)) {
      console.debug('Duplicate event detected, skipping:', event.id.slice(0, 8));
      return;
    }

    // Cleanup old hashes periodically to prevent memory leak
    if (Date.now() - this.lastCleanup > 60000) { // Every minute
      this.cleanupRecentHashes();
    }

    // Add event to deduplication tracking
    this.recentEventHashes.add(eventHash);

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

  /**
   * Create a hash for event deduplication
   */
  private createEventHash(event: INostrEvent): string {
    // For state-update events, prioritize content-based deduplication to prevent floods
    if (event.kind === NSM_PROTOCOL.STATE_UPDATE_KIND) {
      try {
        const content = JSON.parse(event.content);
        // Focus on the core state information that defines uniqueness
        const relevantContent = {
          state: content.state,
          previousState: content.previousState,
          // Only include context properties that actually matter for duplication
          contextSummary: {
            currentTool: content.context?.currentTool,
            isDrawing: content.context?.isDrawing,
            pathsCount: content.context?.pathsCount,
            shapesCount: content.context?.shapesCount
          }
        };
        // Use content-based hash for state updates to prevent identical state floods
        return `state-${event.kind}-${JSON.stringify(relevantContent)}-${event.pubkey}`;
      } catch {
        // Fallback to ID-based for invalid content
        return `${event.id}-${event.created_at}-${event.kind}-${event.content}`;
      }
    }

    // For other events, use ID + timestamp + kind + content for exact deduplication
    return `${event.id}-${event.created_at}-${event.kind}-${event.content}`;
  }

  /**
   * Clean up old hashes to prevent memory leak
   */
  private cleanupRecentHashes(): void {
    // Keep only recent hashes (last 100 for performance)
    if (this.recentEventHashes.size > 100) {
      const hashArray = Array.from(this.recentEventHashes);
      this.recentEventHashes = new Set(hashArray.slice(-50)); // Keep last 50
    }
    this.lastCleanup = Date.now();
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
        event.content || '',
        event.pubkey || '',
        event.id || '',
        event.tags ? event.tags.flat().join(' ') : ''
      ].join(' ').toLowerCase();

      // Check if all query words are present in the searchable text
      return queryWords.every(word => searchableText.includes(word));
    });
  }

  clearEvents(): void {
    this.events = [];
    this.recentEventHashes.clear(); // Clear deduplication hashes too

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

    // Parse JSON content safely - handle null/undefined content
    let parsedContent: any | null = null;
    let parseError: string | undefined;
    try {
      if (event.content != null && typeof event.content === 'string') {
        parsedContent = JSON.parse(event.content);
      }
    } catch (error) {
      parseError = error instanceof Error ? error.message : 'Invalid JSON';
    }

    // Format timestamp
    const date = new Date(event.created_at * 1000);
    const formattedTimestamp = date.toISOString().replace('T', ' ').substring(0, 19);

    // Calculate relative time with improved edge case handling
    const now = Date.now();
    const eventTime = event.created_at * 1000;

    // Validate timestamp - if event timestamp is unrealistic, treat as invalid
    const maxReasonableAge = 1000 * 60 * 60 * 24 * 365 * 10; // 10 years
    const minReasonableTime = new Date('1970-01-01').getTime(); // Unix epoch start

    let relativeTime: string;

    if (eventTime < minReasonableTime || eventTime > now + 1000 * 60 * 60 * 24) { // Future limit: 1 day
      relativeTime = 'invalid timestamp';
    } else {
      const diffMs = Math.max(0, now - eventTime); // Ensure non-negative

      // Add bounds checking for unrealistic time differences
      if (diffMs > maxReasonableAge) {
        relativeTime = 'very old';
      } else {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffWeeks = Math.floor(diffDays / 7);
        const diffMonths = Math.floor(diffDays / 30);

        // Handle edge cases for very old events with bounds checking
        if (diffMs < 0) {
          relativeTime = 'in the future';
        } else if (diffMinutes < 1) {
          relativeTime = 'just now';
        } else if (diffMinutes < 60) {
          relativeTime = `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
        } else if (diffHours < 24) {
          relativeTime = `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
        } else if (diffDays < 7) {
          relativeTime = `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
        } else if (diffWeeks < 4) {
          relativeTime = `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`;
        } else if (diffMonths < 12) {
          relativeTime = `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
        } else {
          const years = Math.floor(diffMonths / 12);
          // Cap at reasonable maximum to prevent display of extreme values
          if (years > 100) {
            relativeTime = 'very old';
          } else {
            relativeTime = `${years} year${years === 1 ? '' : 's'} ago`;
          }
        }
      }
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