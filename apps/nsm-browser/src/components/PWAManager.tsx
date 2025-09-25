import { useState, useEffect } from 'react';

interface PWAManagerProps {
  application: {
    name: string;
    manifest?: {
      name: string;
      short_name: string;
      description: string;
      theme_color: string;
      background_color: string;
      display: string;
      icons: Array<{
        src: string;
        sizes: string;
        type: string;
      }>;
      [key: string]: any;
    };
    [key: string]: any;
  };
  installPrompt?: {
    preventDefault: () => void;
    prompt: () => Promise<{ outcome: string }>;
  };
  hasCachedContent?: boolean;
  syncStatus?: 'idle' | 'syncing' | 'failed';
  onSync?: () => void;
  queuedOperations?: number;
  notificationPermission?: 'granted' | 'denied' | 'default';
  enableNotifications?: boolean;
}

export default function PWAManager({
  application,
  installPrompt,
  hasCachedContent = false,
  syncStatus = 'idle',
  onSync,
  queuedOperations = 0,
  notificationPermission = 'default',
  enableNotifications = false
}: PWAManagerProps) {
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState<'inactive' | 'active' | 'failed'>('inactive');
  const [installStatus, setInstallStatus] = useState<'none' | 'installing' | 'installed' | 'cancelled'>('none');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          setServiceWorkerStatus('active');

          // Register background sync
          if ('sync' in registration) {
            return registration.sync.register('nsm-data-sync');
          }
        })
        .catch((error) => {
          console.error('Service worker registration failed:', error);
          setServiceWorkerStatus('failed');
        });
    }

    // Request notification permissions if enabled
    if (enableNotifications && 'Notification' in window) {
      Notification.requestPermission();
    }

    // Listen for online/offline status
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for custom notification events
    const handleNotification = (event: any) => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(event.detail.title, {
            body: event.detail.body,
            icon: '/icon-192.png'
          });
        });
      }
    };

    window.addEventListener('nsm-notification', handleNotification);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('nsm-notification', handleNotification);
    };
  }, [enableNotifications]);

  useEffect(() => {
    // Generate and inject manifest
    if (application.manifest) {
      const manifestBlob = new Blob([JSON.stringify(application.manifest)], {
        type: 'application/json'
      });

      const manifestUrl = URL.createObjectURL(manifestBlob);

      // Create or update manifest link
      let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      if (!manifestLink) {
        manifestLink = document.createElement('link');
        manifestLink.rel = 'manifest';
        document.head.appendChild(manifestLink);
      }
      manifestLink.href = manifestUrl;

      // Set theme color
      let themeColorMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
      if (!themeColorMeta) {
        themeColorMeta = document.createElement('meta');
        themeColorMeta.name = 'theme-color';
        document.head.appendChild(themeColorMeta);
      }
      themeColorMeta.content = application.manifest.theme_color;
    }
  }, [application.manifest]);

  const handleInstall = async () => {
    if (!installPrompt) return;

    setInstallStatus('installing');

    try {
      installPrompt.preventDefault();
      const result = await installPrompt.prompt();

      if (result.outcome === 'accepted') {
        setInstallStatus('installed');
      } else {
        setInstallStatus('cancelled');
      }
    } catch (error) {
      console.error('Installation failed:', error);
      setInstallStatus('cancelled');
    }
  };

  const handleSync = () => {
    if (onSync) {
      onSync();
    }
  };

  return (
    <div className="pwa-manager">
      <div className="service-worker-status">
        {serviceWorkerStatus === 'active' && (
          <div>Service worker active</div>
        )}
        {serviceWorkerStatus === 'failed' && (
          <div>Service worker registration failed</div>
        )}
        {serviceWorkerStatus === 'inactive' && (
          <div>Service worker inactive</div>
        )}
      </div>

      {installPrompt && installStatus === 'none' && (
        <button onClick={handleInstall} className="install-button">
          Install App
        </button>
      )}

      {installStatus === 'installing' && (
        <div>Installing app...</div>
      )}

      {installStatus === 'installed' && (
        <div>App installed successfully!</div>
      )}

      {installStatus === 'cancelled' && (
        <div>App install cancelled</div>
      )}

      {isOffline && (
        <div className="offline-status">
          <div>Offline mode</div>
          {hasCachedContent && (
            <div>Running from cache</div>
          )}
          {!navigator.onLine && (
            <button onClick={handleSync} disabled>
              Sync when online
            </button>
          )}
          {queuedOperations > 0 && (
            <div>{queuedOperations} operation(s) queued</div>
          )}
        </div>
      )}

      {syncStatus === 'syncing' && <div>Syncing...</div>}
      {syncStatus === 'failed' && <div>Sync failed</div>}

      {notificationPermission === 'granted' && (
        <div>Notifications enabled</div>
      )}
      {notificationPermission === 'denied' && (
        <div>Notifications disabled</div>
      )}

      {/* Update notification */}
      {serviceWorkerStatus === 'active' && (
        <div className="update-notification">
          <div>Update available</div>
          <button>Update</button>
        </div>
      )}
    </div>
  );
}