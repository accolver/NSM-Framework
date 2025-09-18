/**
 * AppDiscoveryPanel Component
 *
 * NSM Application discovery and connection management
 */

import React from 'react';
import type { AppDiscoveryPanelProps } from '../types';
import { ErrorBoundary } from '../ErrorBoundary';

export const AppDiscoveryPanel: React.FC<AppDiscoveryPanelProps> = ({
  discoveredApps,
  isScanning,
  onAppConnect,
  className = ''
}) => {
  const handleAppConnect = (appId: string) => {
    if (onAppConnect) {
      onAppConnect(appId);
    }
  };

  return (
    <ErrorBoundary toolName="App Discovery">
      <div className={`app-discovery-panel ${className}`}>
        <h3>NSM Application Discovery</h3>
        <p>Discover and connect to NSM applications on the network</p>

        {isScanning ? (
          <div className="scanning-state">
            <p>Scanning for NSM applications...</p>
            <div className="loading-spinner" />
          </div>
        ) : (
          <div className="discovered-apps">
            <h4>Found Applications</h4>
            {discoveredApps.length === 0 ? (
              <p>No NSM applications discovered</p>
            ) : (
              <div className="app-list">
                {discoveredApps.map(app => (
                  <div key={app.id} className="app-item">
                    <div className="app-info">
                      <h5>{app.name}</h5>
                      <p>Type: {app.type}</p>
                      <p>Status: {app.status}</p>
                      {app.url && <p>URL: {app.url}</p>}
                    </div>
                    <button
                      className={`connect-btn ${app.status === 'connected' ? 'connected' : ''}`}
                      onClick={() => handleAppConnect(app.id)}
                    >
                      {app.status === 'connected' ? 'Connected' : 'Connect'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};