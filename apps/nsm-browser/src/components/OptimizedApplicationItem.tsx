import { memo, useCallback } from 'react';

interface ApplicationItemProps {
  app: {
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
  };
  isInstalling: boolean;
  isUpdating: boolean;
  isRetrying: boolean;
  isFavorited: boolean;
  hasUpdate: boolean;
  hasError: string | undefined;
  onFavorite: (appId: string) => void;
  onInstall: (appId: string) => void;
  onRetry: (appId: string) => void;
  onLaunch: (app: any) => void;
  onUninstall: (appId: string) => void;
  onUpdate: (appId: string) => void;
  onShowChangelog: (appId: string) => void;
  onGrantPermissions: (appId: string) => void;
  offlineMode: boolean;
}

const OptimizedApplicationItem = memo(function OptimizedApplicationItem({
  app,
  isInstalling,
  isUpdating,
  isRetrying,
  isFavorited,
  hasUpdate,
  hasError,
  onFavorite,
  onInstall,
  onRetry,
  onLaunch,
  onUninstall,
  onUpdate,
  onShowChangelog,
  onGrantPermissions,
  offlineMode
}: ApplicationItemProps) {
  const appId = app.id || app.name;

  const handleFavorite = useCallback(() => {
    onFavorite(appId);
  }, [onFavorite, appId]);

  const handleInstall = useCallback(() => {
    onInstall(appId);
  }, [onInstall, appId]);

  const handleRetry = useCallback(() => {
    onRetry(appId);
  }, [onRetry, appId]);

  const handleLaunch = useCallback(() => {
    onLaunch(app);
  }, [onLaunch, app]);

  const handleUninstall = useCallback(() => {
    onUninstall(appId);
  }, [onUninstall, appId]);

  const handleUpdate = useCallback(() => {
    onUpdate(appId);
  }, [onUpdate, appId]);

  const handleShowChangelog = useCallback(() => {
    onShowChangelog(appId);
  }, [onShowChangelog, appId]);

  const handleGrantPermissions = useCallback(() => {
    onGrantPermissions(appId);
  }, [onGrantPermissions, appId]);

  return (
    <div className="app-item">
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

        {hasError && (
          <div className="error-message" data-testid="error-message">
            {hasError}
          </div>
        )}
      </div>

      <div className="app-actions">
        <button
          onClick={handleFavorite}
          aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          {isFavorited ? '★' : '☆'}
        </button>

        {!app.installed && !hasError && (
          <button
            onClick={handleInstall}
            disabled={isInstalling || offlineMode}
          >
            {isInstalling ? 'Installing...' : 'Install'}
          </button>
        )}

        {!app.installed && hasError && (
          <button
            onClick={handleRetry}
            disabled={isRetrying}
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
        )}

        {app.installed && (
          <>
            <button onClick={handleLaunch}>
              Launch
            </button>
            <button onClick={handleUninstall}>
              Uninstall
            </button>
          </>
        )}

        {hasUpdate && app.installed && (
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
          >
            {isUpdating ? 'Updating...' : 'Update'}
          </button>
        )}

        {app.changelog && hasUpdate && (
          <button onClick={handleShowChangelog}>What's New</button>
        )}

        {app.permissions && !app.installed && (
          <button onClick={handleGrantPermissions}>Grant Permissions</button>
        )}
      </div>
    </div>
  );
});

export default OptimizedApplicationItem;