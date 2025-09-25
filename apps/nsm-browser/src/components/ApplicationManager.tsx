import { useState, useEffect } from 'react';

interface ApplicationManagerProps {
  applications: Array<{
    id?: string;
    name: string;
    description: string;
    version?: string;
    latestVersion?: string;
    installed?: boolean;
    cached?: boolean;
    changelog?: string;
    permissions?: string[];
    [key: string]: any;
  }>;
  onLaunchApplication?: (app: any) => void;
  syncStatus?: 'idle' | 'syncing' | 'failed';
  onSync?: () => void;
  queuedOperations?: number;
  notificationPermission?: 'granted' | 'denied' | 'default';
  enableNotifications?: boolean;
}

export default function ApplicationManager({
  applications,
  onLaunchApplication,
  syncStatus = 'idle',
  onSync,
  queuedOperations = 0,
  notificationPermission = 'default',
  enableNotifications = false
}: ApplicationManagerProps) {
  const [installingApps, setInstallingApps] = useState<Set<string>>(new Set());
  const [storageUsage, setStorageUsage] = useState<{ usage: number; quota: number } | null>(null);
  const [offlineMode, setOfflineMode] = useState(!navigator.onLine);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<Array<{ id: string; lastUsed: number }>>([]);
  const [uninstallConfirm, setUninstallConfirm] = useState<string | null>(null);

  useEffect(() => {
    // Load favorites from localStorage
    const storedFavorites = localStorage.getItem('nsm-favorites');
    if (storedFavorites) {
      setFavorites(new Set(JSON.parse(storedFavorites)));
    }

    // Load history from localStorage
    const storedHistory = localStorage.getItem('nsm-history');
    if (storedHistory) {
      setHistory(JSON.parse(storedHistory));
    }

    // Get storage usage
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then((estimate) => {
        setStorageUsage({
          usage: estimate.usage || 0,
          quota: estimate.quota || 0
        });
      });
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.warn('Service worker registration failed:', error);
      });
    }

    // Listen for online/offline events
    const handleOnline = () => {
      setOfflineMode(false);
      if (onSync && queuedOperations > 0) {
        onSync();
      }
    };
    const handleOffline = () => setOfflineMode(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onSync, queuedOperations]);

  const handleInstall = async (appId: string) => {
    if (installingApps.has(appId)) return;

    setInstallingApps(prev => new Set([...prev, appId]));

    try {
      // Mock IndexedDB storage
      if ('indexedDB' in window) {
        const db = await indexedDB.open('nsm-applications', 1);
        const transaction = db.transaction(['applications'], 'readwrite');
        const store = transaction.objectStore('applications');
        await store.put({ id: appId, installed: true });
      }

      // Mock caching with Cache API
      if ('caches' in window) {
        const cache = await caches.open('nsm-applications');
        await cache.add(`/app/${appId}`);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new Error('Insufficient storage space');
      }
      throw error;
    } finally {
      setInstallingApps(prev => {
        const newSet = new Set(prev);
        newSet.delete(appId);
        return newSet;
      });
    }
  };

  const handleUninstall = async (appId: string) => {
    if (!uninstallConfirm) {
      setUninstallConfirm(appId);
      return;
    }

    if (uninstallConfirm === appId) {
      try {
        const db = await indexedDB.open('nsm-applications', 1);
        const transaction = db.transaction(['applications'], 'readwrite');
        const store = transaction.objectStore('applications');
        await store.delete(appId);

        setUninstallConfirm(null);
      } catch (error) {
        console.error('Uninstall failed:', error);
      }
    }
  };

  const handleFavorite = (appId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(appId)) {
      newFavorites.delete(appId);
    } else {
      newFavorites.add(appId);
    }

    setFavorites(newFavorites);
    localStorage.setItem('nsm-favorites', JSON.stringify([...newFavorites]));
  };

  const handleLaunch = (app: any) => {
    // Add to history
    const newHistory = [
      { id: app.id || app.name, lastUsed: Date.now() },
      ...history.filter(h => h.id !== (app.id || app.name)).slice(0, 9) // Keep last 10
    ];
    setHistory(newHistory);
    localStorage.setItem('nsm-history', JSON.stringify(newHistory));

    if (onLaunchApplication) {
      onLaunchApplication(app);
    }
  };

  const formatStorageSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const favoriteApps = applications.filter(app => favorites.has(app.id || app.name));
  const recentApps = history
    .map(h => applications.find(app => (app.id || app.name) === h.id))
    .filter(Boolean)
    .slice(0, 5);

  return (
    <div className="application-manager">
      {offlineMode && (
        <div className="offline-banner">
          <span>Offline mode</span>
          {queuedOperations > 0 && (
            <span>{queuedOperations} operation(s) queued for sync</span>
          )}
        </div>
      )}

      {syncStatus === 'syncing' && <div>Syncing...</div>}
      {syncStatus === 'failed' && <div>Sync failed</div>}

      {storageUsage && (
        <div className="storage-info">
          {formatStorageSize(storageUsage.usage)} used of {formatStorageSize(storageUsage.quota)}
        </div>
      )}

      {notificationPermission === 'granted' && (
        <div>Notifications enabled</div>
      )}
      {notificationPermission === 'denied' && (
        <div>Notifications disabled</div>
      )}

      {favoriteApps.length > 0 && (
        <section>
          <h2>Favorites</h2>
          <div data-testid="favorites-section">
            {favoriteApps.map(app => (
              <div key={app.id || app.name}>{app.name}</div>
            ))}
          </div>
        </section>
      )}

      {recentApps.length > 0 && (
        <section>
          <h2>Recently Used</h2>
          <div data-testid="recent-section">
            {recentApps.map(app => (
              <div key={app.id || app.name}>{app.name}</div>
            ))}
          </div>
        </section>
      )}

      {offlineMode && (
        <div data-testid="offline-apps">
          <h2>Available Offline</h2>
          {applications.filter(app => app.cached).map(app => (
            <div key={app.id || app.name}>{app.name}</div>
          ))}
        </div>
      )}

      <div className="applications-list">
        {applications.map(app => {
          const appId = app.id || app.name;
          const isInstalling = installingApps.has(appId);
          const isFavorited = favorites.has(appId);
          const hasUpdate = app.version && app.latestVersion && app.version !== app.latestVersion;

          return (
            <div key={appId} className="app-item">
              <div className="app-info">
                <h3>{app.name}</h3>
                <p>{app.description}</p>
                {app.version && <span>v{app.version}</span>}

                {hasUpdate && (
                  <div data-testid="update-badge" className="update-badge">
                    Update available
                  </div>
                )}

                {app.permissions && (
                  <div>
                    <strong>Permissions:</strong>
                    {app.permissions.map(permission => (
                      <span key={permission}>{permission}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="app-actions">
                <button
                  onClick={() => handleFavorite(appId)}
                  aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                >
                  {isFavorited ? '★' : '☆'}
                </button>

                {!app.installed && (
                  <button
                    onClick={() => handleInstall(appId)}
                    disabled={isInstalling || offlineMode}
                  >
                    {isInstalling ? 'Installing...' : 'Install'}
                  </button>
                )}

                {app.installed && (
                  <>
                    <button onClick={() => handleLaunch(app)}>
                      Launch
                    </button>
                    <button onClick={() => handleUninstall(appId)}>
                      Uninstall
                    </button>
                  </>
                )}

                {hasUpdate && app.installed && (
                  <button>Update</button>
                )}

                {app.changelog && hasUpdate && (
                  <button>What's New</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {uninstallConfirm && (
        <div className="confirm-dialog">
          <p>Are you sure you want to uninstall this application?</p>
          <button onClick={() => handleUninstall(uninstallConfirm)}>
            Confirm
          </button>
          <button onClick={() => setUninstallConfirm(null)}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}