import { useState } from 'react';
import BrowseTab from './components/BrowseTab';
import PublishForm from './components/PublishForm';
import AuthModal from './components/AuthModal';
import { createNSMEvent } from './utils/nostr-events';
import { validateXStateJSON } from './utils/xstate-validator';
import { useNSMClient } from './hooks/useNSMClient';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './styles.css';

type Tab = 'browse' | 'publish';

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>('browse');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { isAuthenticated, pubkey, signer, login, logout } = useAuth();
  const { client: nsmClient, status: connectionStatus, relayStatuses, reconnect } = useNSMClient({ signer });

  const handlePublish = async (data: { name: string; description: string; machine: string }) => {
    if (!isAuthenticated) {
      alert('Please authenticate first to publish state machines.');
      setShowAuthModal(true);
      return;
    }

    if (!nsmClient) {
      console.error('Publish failed: NSM client not connected');
      alert('Client not connected. Please try again.');
      return;
    }

    console.log('Publishing NSM event:', { name: data.name, machineLength: data.machine.length });

    try {
      // Validate the machine JSON
      const validation = validateXStateJSON(data.machine);
      if (!validation.isValid) {
        console.error('Validation failed:', validation.error);
        alert(`Invalid machine JSON: ${validation.error}`);
        return;
      }

      console.log('Machine validation passed');

      // Create NSM event
      const event = createNSMEvent(validation.machine, data.name, data.description);
      console.log('NSM event created:', { kind: event.kind, tags: event.tags.length });

      // Create NDKEvent and publish it to Nostr relays
      const { NDKEvent } = await import('@nostr-dev-kit/ndk');
      const ndkEvent = new NDKEvent(nsmClient.ndk, event);

      console.log('Publishing to relays...');
      await ndkEvent.publish();

      console.log('Successfully published event:', {
        id: event.tags.find(t => t[0] === 'd')?.[1],
        name: data.name
      });

      alert(`Successfully published NSM event for "${data.name}" to Nostr relays!`);

      // Switch to browse tab
      setActiveTab('browse');
    } catch (error) {
      console.error('Failed to publish:', error);

      // Provide more specific error messages
      let errorMessage = 'Failed to publish state machine. Please try again.';

      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = 'Publishing timeout. Please check your connection and try again.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('Machine is required')) {
          errorMessage = 'Invalid machine data. Please check your machine configuration.';
        }
      }

      alert(errorMessage);
    }
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <header className="app-header">
        <div className="header-top">
          <div className="header-title">
            <h1 className="app-title">NSM Browser</h1>
            <p className="app-subtitle">Browse and Publish Nostr State Machines</p>
          </div>

          <div className="auth-section">
            {isAuthenticated ? (
              <div className="auth-status">
                <span className="auth-indicator">🔐</span>
                <span className="pubkey-display">
                  {pubkey?.slice(0, 8)}...{pubkey?.slice(-8)}
                </span>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="auth-button small"
                >
                  Manage
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="auth-button"
              >
                🔑 Login to Publish
              </button>
            )}
          </div>
        </div>

        <div className="connection-status">
          <div className="overall-status">
            Status: <span className={`status-${connectionStatus}`}>
              {connectionStatus === 'connecting' ? 'Connecting to relays...' :
               connectionStatus === 'connected' ? 'Connected to Nostr relays' :
               'Connection error'}
            </span>
            {connectionStatus === 'error' && (
              <button
                onClick={reconnect}
                style={{
                  marginLeft: '10px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  backgroundColor: 'var(--primary-color)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
            )}
          </div>

          {relayStatuses.length > 0 && (
            <div className="relay-statuses">
              <span className="relay-label">Relays:</span>
              {relayStatuses.map((relay, index) => (
                <div key={relay.url} className="relay-status">
                  <span className={`relay-indicator status-${relay.status}`}></span>
                  <span className="relay-url">{relay.url.replace('wss://', '')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="tab-container">
        <div className="tab-list" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'browse'}
            onClick={() => setActiveTab('browse')}
            className="tab-button"
          >
            Browse
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'publish'}
            onClick={() => setActiveTab('publish')}
            className="tab-button"
          >
            Publish
          </button>
        </div>

        <div role="tabpanel">
          {activeTab === 'browse' && nsmClient && (
            <BrowseTab nsmClient={nsmClient} />
          )}

          {activeTab === 'publish' && (
            <PublishForm onPublish={handlePublish} />
          )}

          {activeTab === 'browse' && !nsmClient && (
            <div className="loading-state">
              {connectionStatus === 'connecting' && 'Connecting to Nostr relays...'}
              {connectionStatus === 'error' && 'Failed to connect to Nostr relays. Please refresh the page.'}
            </div>
          )}
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={login}
        onLogout={logout}
        isAuthenticated={isAuthenticated}
        pubkey={pubkey || undefined}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}