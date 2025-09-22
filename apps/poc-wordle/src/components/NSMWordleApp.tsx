/**
 * NSM-Integrated Wordle React Component
 * Task 5.3: NSM Client SDK Integration
 *
 * REFACTOR PHASE - Production-ready React integration with error handling
 */

import { DeveloperDashboard } from '@nsm/dev-tools';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createActor } from 'xstate';
import { NSMClient } from '../../../../packages/nsm-client/src/nsm-client';
import { initializeLogging } from '../config/logging';
import { createWordleNSMDefinition, WordleNSMConnector } from '../nsm-integration';
import { getWordleDashboardServices } from '../services/wordleDashboardIntegration';
import { logStateTransition } from '../utils/gameLogger';
import { createWordleMachine } from '../wordle-machine';
import { DeveloperDashboardToggle } from './DeveloperDashboardToggle';
import { GameStatus } from './GameStatus';
import { Keyboard } from './Keyboard';
import './styles.css';
import { WordGrid } from './WordGrid';
import { WordleExporter } from './WordleExporter';

interface NSMWordleAppProps {
  enableNSM?: boolean;
  relayUrls?: string[];
  privateKey?: string;
}

export const NSMWordleApp: React.FC<NSMWordleAppProps> = ({
  enableNSM = false,
  relayUrls = ['wss://relay.damus.io'],
  privateKey,
}) => {
  // Create actor ref to persist across renders - initialize as null
  const actorRef = useRef<ReturnType<typeof createActor> | null>(null);
  const [state, setState] = useState<any>(null);

  const [nsmClient, setNSMClient] = useState<NSMClient | null>(null);
  const [nsmConnector, setNSMConnector] = useState<WordleNSMConnector | null>(null);
  const [nsmStatus, setNSMStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>(
    'disconnected'
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userPubkey, setUserPubkey] = useState<string | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const [isDashboardVisible, setIsDashboardVisible] = useState(true);
  const [dashboardServices] = useState(() =>
    getWordleDashboardServices({
      enableEventLogging: true,
      enableTimeTravel: true,
      enableInspector: true,
      enableAutoConnect: false,
    })
  );

  // Note: Debug logging can be enabled here for troubleshooting
  // console.log('🔄 NSMWordleApp render:', { currentGuess: state.context.currentGuess, state: state.value });

  // Initialize state machine - single effect for actor creation and management
  useEffect(() => {
    // Only create actor if it doesn't exist
    if (!actorRef.current) {
      actorRef.current = createActor(createWordleMachine());
      actorRef.current.start();
    }

    // Initialize logging configuration
    initializeLogging();

    const actor = actorRef.current;
    const initialSnapshot = actor.getSnapshot();
    setState(initialSnapshot);

    let previousState = initialSnapshot.value;

    const subscription = actor.subscribe(snapshot => {
      // Log state transitions once per change
      if (snapshot.value !== previousState) {
        logStateTransition(String(previousState), String(snapshot.value), snapshot.context);
        previousState = snapshot.value;
      }
      setState(snapshot);
    });

    // Connect dashboard services to actor
    dashboardServices.connectToActor(actor);

    return () => {
      subscription.unsubscribe();
      // Don't stop the actor here - let the unmount effect handle it
      dashboardServices.cleanup();
    };
  }, [dashboardServices]); // Empty-like deps aside from stable services

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (actorRef.current) {
        actorRef.current.stop();
        actorRef.current = null;
      }
    };
  }, []);

  // Check if NIP-07 is available on mount and focus main element
  useEffect(() => {
    // Focus the main element to enable keyboard events
    if (mainRef.current) {
      mainRef.current.focus();
    }
  }, [enableNSM]);

  // Handle Nostr login
  const handleNostrLogin = async () => {
    if (!NSMClient.isNip07Available()) {
      setError(
        'No Nostr extension found. Please install Alby, nos2x, or another NIP-07 extension.'
      );
      return;
    }

    try {
      setNSMStatus('connecting');
      setError(null);

      // Create NSM client with NIP-07
      const client = new NSMClient({
        relayUrls: relayUrls || ['wss://relay.damus.io'],
        autoConnect: false,
        useNip07: true,
      });

      // Request permission from extension
      const hasPermission = await client.requestNip07Permission();
      if (!hasPermission) {
        setError('Permission denied by Nostr extension');
        setNSMStatus('disconnected');
        return;
      }

      // Get user's public key
      const pubkey = await client.getUserPublicKey();
      if (pubkey) {
        setUserPubkey(pubkey);
        setIsLoggedIn(true);
      }

      // Create connector
      const connector = new WordleNSMConnector(client, actorRef.current!);

      // Initialize connection
      try {
        await connector.initialize();
        setNSMStatus('connected');
      } catch (connectionError) {
        console.warn('NSM connection failed:', connectionError);
        setNSMStatus('disconnected');
        setError('Failed to connect to relays');
      }

      setNSMClient(client);
      setNSMConnector(connector);

      // Publish application definition
      try {
        await createWordleNSMDefinition();
      } catch (defError) {
        console.warn('Could not publish NSM definition:', defError);
      }
    } catch (err) {
      console.error('Failed to login with Nostr:', err);
      setError(err instanceof Error ? err.message : 'Failed to login');
      setNSMStatus('error');
    }
  };

  // Handle logout
  const handleNostrLogout = () => {
    if (nsmConnector) {
      nsmConnector.disconnect();
    }
    setNSMClient(null);
    setNSMConnector(null);
    setIsLoggedIn(false);
    setUserPubkey(null);
    setNSMStatus('disconnected');
    setError(null);
  };

  // Get grid data from state
  const wordGrid = React.useMemo(() => {
    if (!state) return Array(6).fill([null, null, null, null, null]);

    const grid: (string | null)[][] = [];

    // Add completed guesses
    for (const guess of state.context.guesses) {
      grid.push(guess.word.split(''));
    }

    // Add current guess if game is still playing
    if (state.value === 'playing') {
      const currentRow: (string | null)[] = state.context.currentGuess.split('');
      while (currentRow.length < 5) {
        currentRow.push(null);
      }
      grid.push(currentRow);
    }

    // Add empty rows
    while (grid.length < 6) {
      grid.push([null, null, null, null, null]);
    }

    return grid;
  }, [state?.context?.guesses, state?.context?.currentGuess, state?.value]);

  // Get status grid from state
  const statusGrid = React.useMemo(() => {
    if (!state) return Array(6).fill([null, null, null, null, null]);

    const grid: (string | null)[][] = [];

    // Add completed guesses with status
    for (const guess of state.context.guesses) {
      grid.push(guess.letterStatus);
    }

    // Add empty rows
    while (grid.length < 6) {
      grid.push([null, null, null, null, null]);
    }

    return grid;
  }, [state?.context?.guesses]);

  // Get keyboard status
  const keyboardStatus = React.useMemo(() => {
    if (!state) return {};

    const keyStatus: Record<string, string> = {};

    // Process all guesses to determine letter status
    for (const guess of state.context.guesses) {
      for (let i = 0; i < guess.word.length; i++) {
        const letter = guess.word[i];
        const status = guess.letterStatus[i];

        // Priority: correct > present > absent
        if (keyStatus[letter] === 'correct') continue;
        if (keyStatus[letter] === 'present' && status === 'absent') continue;

        if (status) {
          keyStatus[letter] = status;
        }
      }
    }

    return keyStatus;
  }, [state?.context?.guesses]);

  // Event handlers
  const handleKeyPress = useCallback((letter: string) => {
    if (!actorRef.current) return;
    actorRef.current.send({ type: 'KEYPRESS', letter });
  }, []);

  const handleBackspace = useCallback(() => {
    if (!actorRef.current) return;
    actorRef.current.send({ type: 'BACKSPACE' });
  }, []);

  const handleEnter = useCallback(() => {
    if (!actorRef.current) return;
    actorRef.current.send({ type: 'SUBMIT_GUESS' });
  }, []);

  const handleReset = useCallback(() => {
    if (!actorRef.current) return;

    actorRef.current.send({ type: 'RESET_GAME' });
  }, []);

  // Physical keyboard handling
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const key = event.key.toUpperCase();

      if (key === 'ENTER') {
        event.preventDefault();
        handleEnter();
      } else if (key === 'BACKSPACE') {
        event.preventDefault();
        handleBackspace();
      } else if (/^[A-Z]$/.test(key)) {
        event.preventDefault();
        handleKeyPress(key);
      }
    },
    [handleEnter, handleBackspace, handleKeyPress]
  );

  // NSM status indicator with login - compact header version
  const renderNSMStatus = () => {
    if (!enableNSM) return null;

    const statusColors = {
      disconnected: '#666',
      connecting: '#f39c12',
      connected: '#27ae60',
      error: '#e74c3c',
    };

    return (
      <div
        className="nsm-status"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          padding: '8px',
          backgroundColor: '#2a2a2a',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#ffffff',
          minWidth: '200px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: statusColors[nsmStatus],
            }}
          />
          <span style={{ color: '#ffffff', fontSize: '11px' }}>NSM: {nsmStatus}</span>
          {error && <span style={{ color: '#ff6b6b', fontSize: '10px' }}>({error})</span>}
        </div>

        {!isLoggedIn ? (
          <button
            onClick={handleNostrLogin}
            disabled={nsmStatus === 'connecting'}
            style={{
              padding: '4px 8px',
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 'bold',
              opacity: nsmStatus === 'connecting' ? 0.5 : 1,
            }}
          >
            {nsmStatus === 'connecting' ? 'Connecting...' : 'Login with Nostr'}
          </button>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: '#aaa' }}>
              {userPubkey
                ? `${userPubkey.substring(0, 6)}...${userPubkey.substring(userPubkey.length - 6)}`
                : 'Connected'}
            </span>
            <button
              onClick={handleNostrLogout}
              style={{
                padding: '2px 6px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '10px',
              }}
            >
              Logout
            </button>
          </div>
        )}

        {!NSMClient.isNip07Available() && !isLoggedIn && (
          <div style={{ fontSize: '10px', color: '#aaa', marginTop: '2px' }}>
            Install Nostr extension for multiplayer
          </div>
        )}
      </div>
    );
  };

  const handleDashboardToggle = useCallback((isVisible: boolean) => {
    setIsDashboardVisible(isVisible);
  }, []);

  return (
    <main
      ref={mainRef}
      className="app app-compact"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="main"
      aria-label="Wordle game with NSM integration"
      aria-describedby="game-instructions"
    >
      <div className="app-header">
        <h1>Wordle {enableNSM && <span style={{ fontSize: '0.6em', color: '#666' }}>NSM</span>}</h1>
        {enableNSM && renderNSMStatus()}
      </div>

      <div id="game-instructions" className="sr-only">
        Guess the 5-letter word in 6 attempts. Use your keyboard or click the virtual keyboard.
        Green letters are correct, yellow letters are in the word but wrong position, gray letters
        are not in the word.
        {enableNSM &&
          ' This game is connected to the NSM network for distributed state management.'}
      </div>

      <GameStatus
        gameState={(state?.value as 'playing' | 'won' | 'lost') || 'playing'}
        attemptNumber={state?.context?.attemptNumber || 0}
        hiddenWord={state?.context?.hiddenWord || ''}
        onReset={handleReset}
      />

      <WordGrid wordGrid={wordGrid} statusGrid={statusGrid} />

      <Keyboard
        keyboardStatus={keyboardStatus}
        onKeyPress={handleKeyPress}
        onBackspace={handleBackspace}
        onEnter={handleEnter}
      />

      {/* Developer Dashboard Toggle */}
      <DeveloperDashboardToggle
        onToggle={handleDashboardToggle}
        initiallyVisible={isDashboardVisible}
      />

      {/* State Machine Exporter */}
      {actorRef.current && (
        <WordleExporter
          actor={actorRef.current}
          showCodeViewer={false}
          enableGameShortcuts={true}
        />
      )}

      {/* Developer Dashboard */}
      {isDashboardVisible && (
        <DeveloperDashboard
          eventLogService={dashboardServices.eventLogService}
          timeTravelService={dashboardServices.timeTravelService}
          inspectorService={dashboardServices.inspectorService}
          connectInspector={dashboardServices.connectInspector}
          openVisualizer={dashboardServices.openVisualizer}
          className="wordle-dashboard"
        />
      )}
    </main>
  );
};
