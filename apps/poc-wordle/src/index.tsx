import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App';
import { NSMWordleApp } from './components/NSMWordleApp';

// Create the root element
const container = document.getElementById('root');
if (!container) {
  // Create root element if it doesn't exist
  const rootDiv = document.createElement('div');
  rootDiv.id = 'root';
  document.body.appendChild(rootDiv);
}

const root = createRoot(container || document.getElementById('root')!);

// Demo: Choose between regular Wordle and NSM-enabled Wordle
const enableNSMDemo = process.env.NODE_ENV === 'development';

// Render the app
root.render(
  <React.StrictMode>
    {enableNSMDemo ? (
      <div>
        <h2 style={{ textAlign: 'center', margin: '20px 0' }}>NSM Wordle Demo</h2>
        <NSMWordleApp
          enableNSM={true}
          relayUrls={['wss://relay.damus.io']}
          privateKey="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
        />
        <div style={{ textAlign: 'center', margin: '20px 0', fontSize: '14px', color: '#666' }}>
          This version demonstrates NSM (Nostr State Machine) distributed state management.
          <br />
          State changes are published to Nostr relays for multi-user synchronization.
        </div>
      </div>
    ) : (
      <App />
    )}
  </React.StrictMode>
);

// Export for testing
export { App, NSMWordleApp };