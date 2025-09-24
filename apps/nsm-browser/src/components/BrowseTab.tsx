import { useState, useEffect } from 'react';
import { NSMApplication } from '../utils/nostr-events';
import type { NDKEvent } from '@nostr-dev-kit/ndk';

interface BrowseTabProps {
  nsmClient: any; // MockNSMClient with NDK
}

export default function BrowseTab({ nsmClient }: BrowseTabProps) {
  const [applications, setApplications] = useState<NSMApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadApplications();
  }, [nsmClient]);

  const loadApplications = async () => {
    setLoading(true);
    try {
      // Query for NSM events (kind 30079) using NDK
      const filter = {
        kinds: [30079],
        limit: 50
      };

      const events = await nsmClient.ndk.fetchEvents(filter);

      const mappedApps: NSMApplication[] = [];
      events.forEach((event: NDKEvent) => {
        try {
          // Extract metadata from tags
          const dTag = event.tags.find(t => t[0] === 'd');
          const nameTag = event.tags.find(t => t[0] === 'name');
          const descTag = event.tags.find(t => t[0] === 'description');

          // Filter out known non-NSM events
          const eventName = nameTag?.[1] || dTag?.[1] || '';
          const nonNSMTypes = ['youtube-channels', 'public-backup', 'relays', 'check-in'];
          if (nonNSMTypes.some(type => eventName.toLowerCase().includes(type))) {
            return; // Skip this event
          }

          // Validate XState JSON structure more robustly
          let machineContent = event.content;
          let isValidNSMEvent = false;

          try {
            const parsed = JSON.parse(event.content);

            // Check for XState machine structure - must have either:
            // 1. Direct machine with 'states' or 'initial' properties
            // 2. Nested structure with 'initialState' containing a machine
            if (parsed.states || parsed.initial) {
              // Direct XState machine
              isValidNSMEvent = true;
            } else if (parsed.initialState && (parsed.initialState.states || parsed.initialState.initial)) {
              // Nested structure (NSM event format)
              isValidNSMEvent = true;
            } else if (typeof parsed === 'object' && parsed !== null) {
              // Check if it's a valid machine-like object with state definitions
              const keys = Object.keys(parsed);
              const hasStateLikeStructure = keys.some(key =>
                key === 'states' ||
                key === 'initial' ||
                key === 'context' ||
                key === 'on'
              );
              isValidNSMEvent = hasStateLikeStructure;
            }
          } catch (e) {
            // Invalid JSON, not an NSM event
            return;
          }

          // Only include valid NSM events
          if (isValidNSMEvent) {
            mappedApps.push({
              name: nameTag?.[1] || dTag?.[1] || 'Unnamed Machine',
              description: descTag?.[1] || 'No description',
              author: event.pubkey || 'Unknown',
              timestamp: event.created_at || Date.now() / 1000,
              machine: machineContent
            });
          }
        } catch (e) {
          console.error('Failed to parse event:', e);
        }
      });

      // If no real machines found, add examples
      if (mappedApps.length === 0) {
        mappedApps.push(
          {
            name: 'Example: Counter Machine',
            description: 'A simple counter that increments and decrements',
            author: 'npub1example...',
            timestamp: Date.now() / 1000,
            machine: JSON.stringify({
              id: 'counter',
              initial: 'idle',
              states: {
                idle: {
                  on: {
                    INCREMENT: { actions: 'increment' },
                    DECREMENT: { actions: 'decrement' }
                  }
                }
              }
            }, null, 2)
          },
          {
            name: 'Example: Toggle Switch',
            description: 'A binary state toggle',
            author: 'npub1another...',
            timestamp: Date.now() / 1000 - 3600,
            machine: JSON.stringify({
              id: 'toggle',
              initial: 'off',
              states: {
                off: { on: { TOGGLE: 'on' } },
                on: { on: { TOGGLE: 'off' } }
              }
            }, null, 2)
          }
        );
      }

      setApplications(mappedApps);
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const toggleExpanded = (appName: string) => {
    setExpandedApp(expandedApp === appName ? null : appName);
  };

  // Filter applications based on search query
  const filteredApplications = applications.filter(app => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return (
      app.name.toLowerCase().includes(query) ||
      app.description.toLowerCase().includes(query) ||
      app.author.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="loading-state">
        Loading state machines...
      </div>
    );
  }

  return (
    <div className="browse-container">
      <div className="browse-header">
        <h2 className="browse-title">Published State Machines</h2>
        <button onClick={loadApplications} className="refresh-button">
          🔄 Refresh
        </button>
      </div>

      <div className="search-container">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, description, or author..."
          className="search-input"
        />
        {applications.length > 0 && (
          <div className="search-results-info">
            Showing {filteredApplications.length} of {applications.length} state machines
            {searchQuery && (
              <span className="search-note">
                {' '}for "{searchQuery}"
                <button
                  onClick={() => setSearchQuery('')}
                  className="clear-search"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      <div className="kind-notice">
        <p>
          📝 <strong>Note:</strong> Showing NSM state machines using Nostr kind 30079 (not officially reserved).
          Events are filtered to display only valid XState machines, excluding other data types.
        </p>
      </div>

      {applications.length === 0 ? (
        <div className="empty-state">
          <p>No state machines found on Nostr relays.</p>
          <p>Try publishing one using the Publish tab!</p>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="empty-state">
          <p>No state machines match your search criteria.</p>
          <p>Try a different search term or <button onClick={() => setSearchQuery('')} className="link-button">clear the search</button>.</p>
        </div>
      ) : (
        <div className="app-grid">
          {filteredApplications.map((app, index) => (
            <div key={`${app.name}-${index}`} className="app-card">
              <div className="app-card-header">
                <div className="app-info">
                  <h3>{app.name}</h3>
                  <p className="app-description">{app.description}</p>
                  <div className="app-meta">
                    <span>By: {app.author.slice(0, 16)}...</span>
                    <span>Date: {formatDate(app.timestamp)}</span>
                  </div>
                </div>
                <div className="app-actions">
                  <button
                    onClick={() => toggleExpanded(app.name)}
                    className="secondary-button"
                  >
                    {expandedApp === app.name ? '📄 Hide JSON' : '👁️ Show JSON'}
                  </button>
                  <button
                    onClick={() => copyToClipboard(app.machine)}
                    className="primary-button-small"
                  >
                    📋 Copy
                  </button>
                </div>
              </div>

              {expandedApp === app.name && (
                <div className="json-display">
                  <h4>State Machine JSON:</h4>
                  <pre className="json-content">
                    {app.machine}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}