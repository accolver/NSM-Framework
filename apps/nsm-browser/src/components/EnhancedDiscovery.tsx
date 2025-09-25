import { useState, useEffect } from 'react';
import { NSMApplication } from '../utils/nostr-events';

interface EnhancedDiscoveryProps {
  nsmClient: any;
  applications?: NSMApplication[];
  onLaunchApplication?: (app: NSMApplication) => void;
}

interface ExtendedNSMApplication extends NSMApplication {
  category?: string;
  tags?: string[];
  rating?: number;
  metadata?: {
    version?: string;
    screenshots?: string[];
    previewImage?: string;
  };
  activity?: {
    downloads: number;
    lastUsed: number;
    userCount: number;
  };
}

export default function EnhancedDiscovery({ nsmClient, applications = [], onLaunchApplication }: EnhancedDiscoveryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState(0);
  const [activityFilter, setActivityFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [launchingApp, setLaunchingApp] = useState<string | null>(null);

  const extendedApplications: ExtendedNSMApplication[] = applications.map(app => ({
    ...app,
    category: app.category || 'tools',
    tags: app.tags || [],
    rating: app.rating || 4.0,
    metadata: app.metadata || { version: '1.0.0' },
    activity: app.activity || { downloads: 0, lastUsed: 0, userCount: 0 }
  }));

  // Real-time subscription effect
  useEffect(() => {
    if (!nsmClient?.subscribe) return;

    const subscription = nsmClient.subscribe(
      {
        kinds: [30079],
        since: Math.floor(Date.now() / 1000) - 3600 // Last hour
      },
      (event: any) => {
        // Handle new events in real-time
        console.log('New NSM event:', event);
      }
    );

    return () => {
      subscription?.close();
    };
  }, [nsmClient]);

  // Filter applications
  const filteredApplications = extendedApplications.filter(app => {
    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesText =
        app.name.toLowerCase().includes(query) ||
        app.description.toLowerCase().includes(query) ||
        app.author.toLowerCase().includes(query);

      const matchesTags = app.tags?.some(tag => tag.toLowerCase().includes(query));

      if (!matchesText && !matchesTags) return false;
    }

    // Category filter
    if (categoryFilter !== 'all' && app.category !== categoryFilter) {
      return false;
    }

    // Rating filter
    if (ratingFilter > 0 && (app.rating || 0) < ratingFilter) {
      return false;
    }

    // Activity filter
    if (activityFilter === 'high') {
      const hasHighActivity = (app.activity?.downloads || 0) > 100 || (app.activity?.userCount || 0) > 25;
      if (!hasHighActivity) return false;
    }

    return true;
  });

  // Featured applications (high rating >= 4.5) - separate from main grid
  const featuredApplications = extendedApplications
    .filter(app => (app.rating || 0) >= 4.5)
    .slice(0, 4); // Limit featured apps

  // Non-featured applications for main grid
  const mainGridApplications = filteredApplications;

  // Check if app is new (within last 24 hours)
  const isNewApp = (timestamp: number) => {
    return (Date.now() / 1000) - timestamp < 86400;
  };

  const handleLaunchApplication = async (app: ExtendedNSMApplication) => {
    if (!onLaunchApplication) return;

    setLaunchingApp(app.name);
    try {
      await onLaunchApplication(app);
    } finally {
      setLaunchingApp(null);
    }
  };

  const handleRetry = () => {
    setError(null);
    // Retry logic would go here
  };

  if (error) {
    return (
      <div className="error-container">
        <p>Failed to load applications: {error}</p>
        <button onClick={handleRetry}>Retry</button>
      </div>
    );
  }

  return (
    <div className="enhanced-discovery">
      <div className="search-container">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search NSM applications..."
          className="search-input"
        />

        <div className="filters">
          <label>
            Category:
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="games">Games</option>
              <option value="tools">Tools</option>
              <option value="social">Social</option>
              <option value="productivity">Productivity</option>
            </select>
          </label>

          <label>
            Minimum Rating:
            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={ratingFilter}
              onChange={(e) => setRatingFilter(parseFloat(e.target.value) || 0)}
            />
          </label>

          <label>
            Activity Level:
            <select
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="high">High Activity</option>
            </select>
          </label>
        </div>

        <div className="search-results-info">
          Showing {mainGridApplications.length} of {extendedApplications.length} applications
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
      </div>

      {featuredApplications.length > 0 && (
        <section className="featured-section">
          <h2>Featured Applications</h2>
          <div data-testid="featured-applications" className="featured-grid">
            {featuredApplications.map((app, index) => (
              <div key={`${app.name}-${index}`} className="app-card featured">
                <h3>{app.name}</h3>
                {isNewApp(app.timestamp) && <span className="badge">NEW</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="applications-grid">
        {mainGridApplications.map((app, index) => (
          <div key={`${app.name}-${index}`} className="app-card">
            <div className="app-header">
              {app.metadata?.previewImage && (
                <img
                  src={app.metadata.previewImage}
                  alt={`${app.name} preview`}
                  className="preview-image"
                />
              )}
              <div className="app-info">
                <h3>{app.name}</h3>
                <p>{app.description}</p>
                <div className="app-meta">
                  <span>{app.author.slice(0, 16)}...</span>
                  <span>★ {app.rating}</span>
                  <span className="category">{app.category}</span>
                  {app.metadata?.version && <span>v{app.metadata.version}</span>}
                </div>
                <div className="app-tags">
                  {app.tags?.map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="app-actions">
              <button
                onClick={() => handleLaunchApplication(app)}
                disabled={launchingApp === app.name}
                className="launch-button"
              >
                {launchingApp === app.name ? 'Launching...' : 'Launch'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {mainGridApplications.length === 0 && !loading && (
        <div className="empty-state">
          <p>No applications found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}