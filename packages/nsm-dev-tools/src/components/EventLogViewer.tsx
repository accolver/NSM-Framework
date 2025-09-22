import type { INostrEvent } from '@nsm/core';
import { NSM_PROTOCOL } from '@nsm/core';
import React, { useEffect, useMemo, useState } from 'react';
import type { EventLogService } from '../services/event-log-service';

interface EventLogViewerProps {
  eventLogService: EventLogService;
  className?: string;
}

type FilterOption = 'all' | 'definition' | 'state-update' | 'interaction';

interface FilterConfig {
  value: FilterOption;
  label: string;
  getEvents: (service: EventLogService) => INostrEvent[];
}

const FILTER_OPTIONS: FilterConfig[] = [
  {
    value: 'all',
    label: 'All Events',
    getEvents: service => service.getEvents(),
  },
  {
    value: 'definition',
    label: `NSM Definition (${NSM_PROTOCOL.DEFINITION_KIND})`,
    getEvents: service => service.getEventsByKind(NSM_PROTOCOL.DEFINITION_KIND),
  },
  {
    value: 'state-update',
    label: `NSM State Update (${NSM_PROTOCOL.STATE_UPDATE_KIND})`,
    getEvents: service => service.getEventsByKind(NSM_PROTOCOL.STATE_UPDATE_KIND),
  },
  {
    value: 'interaction',
    label: `NSM Interactions (${NSM_PROTOCOL.INTERACTION_KIND_MIN}-${NSM_PROTOCOL.INTERACTION_KIND_MAX})`,
    getEvents: service =>
      service.getEventsByKindRange(
        NSM_PROTOCOL.INTERACTION_KIND_MIN,
        NSM_PROTOCOL.INTERACTION_KIND_MAX
      ),
  },
];

export const EventLogViewer: React.FC<EventLogViewerProps> = ({
  eventLogService,
  className = '',
}) => {
  const [events, setEvents] = useState<INostrEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>('all');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  // Update events when service changes or filter changes
  useEffect(() => {
    const updateEvents = () => {
      const filterConfig = FILTER_OPTIONS.find(option => option.value === selectedFilter);
      if (filterConfig) {
        const raw = filterConfig.getEvents(eventLogService);
        // Sort by timestamp DESC so latest entries appear at the top
        const sorted = [...raw].sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
        setEvents(sorted);
      }
    };

    updateEvents();

    // Subscribe to real-time updates
    const unsubscribeEvent = eventLogService.onEvent(() => {
      updateEvents();
    });

    const unsubscribeClear = eventLogService.onClear(() => {
      updateEvents();
      setExpandedEvents(new Set());
    });

    return () => {
      unsubscribeEvent();
      unsubscribeClear();
    };
  }, [eventLogService, selectedFilter]);

  // Filter events by search query
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) {
      return events;
    }

    // First filter by search query, then by current filter
    const lowerQuery = searchQuery.toLowerCase();
    const queryWords = lowerQuery.split(/\s+/).filter(word => word.length > 0);

    return events.filter(event => {
      const searchableText = [
        event.content || '',
        event.pubkey || '',
        event.id || '',
        event.tags ? event.tags.flat().join(' ') : '',
      ]
        .join(' ')
        .toLowerCase();

      // Check if all query words are present in the searchable text
      return queryWords.every(word => searchableText.includes(word));
    });
  }, [events, searchQuery]);

  const handleClearEvents = () => {
    eventLogService.clearEvents();
  };

  const handleToggleExpand = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const formatEventContent = (event: INostrEvent) => {
    try {
      if (event.content == null) {
        return '[No content]';
      }
      const parsed = JSON.parse(event.content);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return event.content || '[Invalid content]';
    }
  };

  const getEventTypeColor = (kind: number): string => {
    if (kind === NSM_PROTOCOL.DEFINITION_KIND) {
      return 'text-blue-600 bg-blue-50';
    } else if (kind === NSM_PROTOCOL.STATE_UPDATE_KIND) {
      return 'text-green-600 bg-green-50';
    } else if (
      kind >= NSM_PROTOCOL.INTERACTION_KIND_MIN &&
      kind <= NSM_PROTOCOL.INTERACTION_KIND_MAX
    ) {
      return 'text-purple-600 bg-purple-50';
    }
    return 'text-gray-600 bg-gray-50';
  };

  const truncateText = (text: string, maxLength: number = 50): string => {
    if (!text || typeof text !== 'string') {
      return '[Invalid text]';
    }
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col ${className}`}
    >
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900">Nostr Event Log</h3>
        <p className="text-sm text-gray-600 mt-1">Real-time monitoring of NSM framework events</p>
      </div>

      {/* Controls */}
      <div className="border-b border-gray-200 p-4 space-y-4">
        {/* Search */}
        <div>
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Filter and Controls */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-4">
            <label htmlFor="event-filter" className="text-sm font-medium text-gray-700">
              Filter by Kind:
            </label>
            <select
              id="event-filter"
              value={selectedFilter}
              onChange={e => setSelectedFilter(e.target.value as FilterOption)}
              className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {FILTER_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{filteredEvents.length} events</span>
            <button
              onClick={handleClearEvents}
              className="px-3 py-1 text-sm bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Clear Events
            </button>
          </div>
        </div>
      </div>

      {/* Event List */}
      <div
        className="flex-1 overflow-y-auto events-scrollable"
        data-testid="events-scroll-container"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#cbd5e0 #f7fafc',
          maxHeight: '500px',
        }}
      >
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-lg font-medium">No events to display</div>
            <div className="text-sm mt-1">Events will appear here as they are captured</div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredEvents.map(event => {
              const metadata = eventLogService.getEventMetadata(event);
              const isExpanded = expandedEvents.has(event.id);

              return (
                <div
                  key={event.id}
                  data-testid="event-row"
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleToggleExpand(event.id)}
                >
                  {/* Event Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEventTypeColor(event.kind)}`}
                        >
                          {metadata.nsmEventType}
                        </span>
                        <span className="text-xs text-gray-500">kind: {event.kind}</span>
                        <span className="text-xs text-gray-500">{metadata.relativeTime}</span>
                      </div>

                      {/* Event Content Preview */}
                      <div className="text-sm text-gray-900 mb-2">
                        {metadata.parsedContent ? (
                          <pre className="font-mono text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                            {isExpanded
                              ? formatEventContent(event)
                              : truncateText(formatEventContent(event), 100)}
                          </pre>
                        ) : (
                          <div className="break-words">
                            {isExpanded
                              ? event.content || '[No content]'
                              : truncateText(event.content || '[No content]', 100)}
                          </div>
                        )}
                      </div>

                      {/* Author */}
                      <div className="text-xs text-gray-500">
                        from: {truncateText(event.pubkey || '[Unknown]', 32)}
                      </div>
                    </div>

                    <div className="ml-4 flex-shrink-0">
                      <button className="text-gray-400 hover:text-gray-600">
                        {isExpanded ? (
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                          <div className="text-gray-500 font-medium">Event ID</div>
                          <div className="font-mono break-all">{event.id}</div>
                        </div>
                        <div>
                          <div className="text-gray-500 font-medium">Signature</div>
                          <div className="font-mono break-all">{truncateText(event.sig, 32)}</div>
                        </div>
                        <div>
                          <div className="text-gray-500 font-medium">Timestamp</div>
                          <div>{metadata.formattedTimestamp}</div>
                        </div>
                        <div>
                          <div className="text-gray-500 font-medium">Tags</div>
                          <div>{event.tags.length > 0 ? JSON.stringify(event.tags) : 'None'}</div>
                        </div>
                      </div>

                      {metadata.parseError && (
                        <div className="bg-red-50 border border-red-200 rounded p-2">
                          <div className="text-red-700 text-xs font-medium">JSON Parse Error</div>
                          <div className="text-red-600 text-xs">{metadata.parseError}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventLogViewer;
