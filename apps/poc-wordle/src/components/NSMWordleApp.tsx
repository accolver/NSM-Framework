/**
 * NSM-Integrated Wordle React Component
 * Task 5.3: NSM Client SDK Integration
 *
 * REFACTOR PHASE - Production-ready React integration with error handling
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createActor } from 'xstate';
import { wordleMachine } from '../wordle-machine';
import { WordGrid } from './WordGrid';
import { Keyboard } from './Keyboard';
import { GameStatus } from './GameStatus';
import { createWordleNSMDefinition, WordleNSMConnector } from '../nsm-integration';
import { NSMClient } from '../../../../packages/nsm-client/src/nsm-client';
import './styles.css';

interface NSMWordleAppProps {
  enableNSM?: boolean;
  relayUrls?: string[];
  privateKey?: string;
}

export const NSMWordleApp: React.FC<NSMWordleAppProps> = ({
  enableNSM = false,
  relayUrls = ['wss://relay.damus.io'],
  privateKey
}) => {
  // Create actor ref to persist across renders
  const actorRef = useRef<ReturnType<typeof createActor>>();
  const [state, setState] = useState(() => {
    if (!actorRef.current) {
      actorRef.current = createActor(wordleMachine);
    }
    return actorRef.current.getSnapshot();
  });

  const [nsmClient, setNSMClient] = useState<NSMClient | null>(null);
  const [nsmConnector, setNSMConnector] = useState<WordleNSMConnector | null>(null);
  const [nsmStatus, setNSMStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userPubkey, setUserPubkey] = useState<string | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  // Note: Debug logging can be enabled here for troubleshooting
  // console.log('🔄 NSMWordleApp render:', { currentGuess: state.context.currentGuess, state: state.value });

  // Initialize state machine
  useEffect(() => {
    if (!actorRef.current) {
      actorRef.current = createActor(wordleMachine);
    }

    const actor = actorRef.current;
    console.log('Initializing XState actor');

    // Only start if not already started
    if (actor.getSnapshot().status === 'stopped') {
      actor.start();
      console.log('Actor started');
    }

    const initialSnapshot = actor.getSnapshot();
    console.log('Initial state:', initialSnapshot);
    setState(initialSnapshot);

    const subscription = actor.subscribe((snapshot) => {
      console.log('State machine updated:', snapshot);
      setState(snapshot);
    });

    return () => {
      subscription.unsubscribe();
      // Don't stop the actor on cleanup in StrictMode - only when component truly unmounts
    };
  }, []); // Empty dependency array since we use useRef

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (actorRef.current) {
        actorRef.current.stop();
      }
    };
  }, []);

  // Check if NIP-07 is available on mount and focus main element
  useEffect(() => {
    if (enableNSM && NSMClient.isNip07Available()) {
      console.log('NIP-07 extension detected');
    }

    // Focus the main element to enable keyboard events
    if (mainRef.current) {
      mainRef.current.focus();
      console.log('Main element focused for keyboard input');
    }
  }, [enableNSM]);

  // Handle Nostr login
  const handleNostrLogin = async () => {
    if (!NSMClient.isNip07Available()) {
      setError('No Nostr extension found. Please install Alby, nos2x, or another NIP-07 extension.');
      return;
    }

    try {
      setNSMStatus('connecting');
      setError(null);

      // Create NSM client with NIP-07
      const client = new NSMClient({
        relayUrls: relayUrls || ['wss://relay.damus.io'],
        autoConnect: false,
        useNip07: true
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
        const definition = await createWordleNSMDefinition();
        console.log('Wordle NSM definition created:', definition);
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
  }, [state.context.guesses, state.context.currentGuess, state.value]);

  // Get status grid from state
  const statusGrid = React.useMemo(() => {
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
  }, [state.context.guesses]);

  // Get keyboard status
  const keyboardStatus = React.useMemo(() => {
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
  }, [state.context.guesses]);

  // Event handlers
  const handleKeyPress = useCallback((letter: string) => {
    if (!actorRef.current) return;

    console.log('handleKeyPress called with letter:', letter);
    console.log('Current state:', state.value);
    console.log('Current guess:', state.context.currentGuess);
    console.log('Actor state before send:', actorRef.current.getSnapshot());

    const event = { type: 'KEYPRESS', letter };
    console.log('Sending event to actor:', event);
    actorRef.current.send(event);

    console.log('Actor state after send:', actorRef.current.getSnapshot());
  }, [state.value, state.context.currentGuess]);

  const handleBackspace = useCallback(() => {
    if (!actorRef.current) return;

    console.log('handleBackspace called');
    console.log('Current guess:', state.context.currentGuess);
    actorRef.current.send({ type: 'BACKSPACE' });
  }, [state.context.currentGuess]);

  const handleEnter = useCallback(() => {
    if (!actorRef.current) return;

    console.log('handleEnter called');
    console.log('Current guess:', state.context.currentGuess);
    actorRef.current.send({ type: 'SUBMIT_GUESS' });
  }, [state.context.currentGuess]);

  const handleReset = useCallback(() => {
    if (!actorRef.current) return;

    actorRef.current.send({ type: 'RESET_GAME' });
  }, []);

  // Physical keyboard handling
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    console.log('handleKeyDown called with key:', event.key);
    const key = event.key.toUpperCase();

    if (key === 'ENTER') {
      console.log('Enter key detected');
      event.preventDefault();
      handleEnter();
    } else if (key === 'BACKSPACE') {
      console.log('Backspace key detected');
      event.preventDefault();
      handleBackspace();
    } else if (/^[A-Z]$/.test(key)) {
      console.log('Letter key detected:', key);
      event.preventDefault();
      handleKeyPress(key);
    }
  }, [handleEnter, handleBackspace, handleKeyPress]);

  // NSM status indicator with login
  const renderNSMStatus = () => {
    if (!enableNSM) return null;

    const statusColors = {
      disconnected: '#666',
      connecting: '#f39c12',
      connected: '#27ae60',
      error: '#e74c3c'
    };

    return (
      <div className="nsm-status" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginBottom: '16px',
        padding: '12px',
        backgroundColor: '#2a2a2a',
        borderRadius: '4px',
        fontSize: '14px',
        color: '#ffffff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: statusColors[nsmStatus]
            }}
          />
          <span style={{ color: '#ffffff' }}>NSM: {nsmStatus}</span>
          {error && <span style={{ color: '#ff6b6b' }}>({error})</span>}
        </div>

        {!isLoggedIn ? (
          <button
            onClick={handleNostrLogin}
            disabled={nsmStatus === 'connecting'}
            style={{
              padding: '8px 16px',
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              opacity: nsmStatus === 'connecting' ? 0.5 : 1
            }}
          >
            {nsmStatus === 'connecting' ? 'Connecting...' : 'Login with Nostr'}
          </button>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#aaa' }}>
              {userPubkey ? `Connected as: ${userPubkey.substring(0, 8)}...${userPubkey.substring(userPubkey.length - 8)}` : 'Connected'}
            </span>
            <button
              onClick={handleNostrLogout}
              style={{
                padding: '4px 8px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Logout
            </button>
          </div>
        )}

        {!NSMClient.isNip07Available() && !isLoggedIn && (
          <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>
            Install a Nostr browser extension like Alby or nos2x to enable multiplayer features
          </div>
        )}
      </div>
    );
  };

  return (
    <main
      ref={mainRef}
      className="app"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="main"
      aria-label="Wordle game with NSM integration"
      aria-describedby="game-instructions"
    >
      <h1>Wordle {enableNSM && <span style={{ fontSize: '0.6em', color: '#666' }}>NSM</span>}</h1>


      <div id="game-instructions" className="sr-only">
        Guess the 5-letter word in 6 attempts. Use your keyboard or click the virtual keyboard.
        Green letters are correct, yellow letters are in the word but wrong position,
        gray letters are not in the word.
        {enableNSM && ' This game is connected to the NSM network for distributed state management.'}
      </div>

      {renderNSMStatus()}

      <GameStatus
        gameState={state.value as 'playing' | 'won' | 'lost'}
        attemptNumber={state.context.attemptNumber}
        hiddenWord={state.context.hiddenWord}
        onReset={handleReset}
      />

      <WordGrid wordGrid={wordGrid} statusGrid={statusGrid} />

      <Keyboard
        keyboardStatus={keyboardStatus}
        onKeyPress={handleKeyPress}
        onBackspace={handleBackspace}
        onEnter={handleEnter}
      />
    </main>
  );
};