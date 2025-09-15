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
          relayUrls={['wss://relay.damus.io', 'wss://nos.lol']} // Use public relays
          privateKey={undefined} // Will use NIP-07 for authentication
        />
        <div style={{ textAlign: 'center', margin: '20px 0', fontSize: '14px', color: '#666' }}>
          This version demonstrates NSM (Nostr State Machine) with NIP-07 authentication.
          <br />
          Login with your Nostr extension to enable multiplayer synchronization.
          <br />
          The game works locally without login, or globally with Nostr authentication.
        </div>
      </div>
    ) : (
      <App />
    )}
  </React.StrictMode>
);

// Export for testing
export { App, NSMWordleApp };