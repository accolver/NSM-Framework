/**
 * NSM-Integrated Wordle React Component
 * Task 5.3: NSM Client SDK Integration
 *
 * REFACTOR PHASE - Production-ready React integration with error handling
 */

import React, { useEffect, useState, useCallback } from 'react';
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
  const [actor] = useState(() => createActor(wordleMachine));
  const [state, setState] = useState(() => actor.getSnapshot());
  const [nsmClient, setNSMClient] = useState<NSMClient | null>(null);
  const [nsmConnector, setNSMConnector] = useState<WordleNSMConnector | null>(null);
  const [nsmStatus, setNSMStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);

  // Initialize state machine
  useEffect(() => {
    actor.start();
    const subscription = actor.subscribe((snapshot) => {
      setState(snapshot);
    });

    return () => {
      subscription.unsubscribe();
      actor.stop();
    };
  }, [actor]);

  // Initialize NSM integration
  useEffect(() => {
    if (!enableNSM) return;

    const initializeNSM = async () => {
      try {
        setNSMStatus('connecting');
        setError(null);

        // Create NSM client
        const client = new NSMClient({
          relayUrls,
          autoConnect: false,
          privateKey
        });

        // Create connector
        const connector = new WordleNSMConnector(client, actor);

        // Initialize connection
        await connector.initialize();

        setNSMClient(client);
        setNSMConnector(connector);
        setNSMStatus('connected');

        // Publish application definition
        const definition = await createWordleNSMDefinition();
        console.log('Wordle NSM definition created:', definition);

      } catch (err) {
        console.error('Failed to initialize NSM:', err);
        setError(err instanceof Error ? err.message : 'Unknown NSM error');
        setNSMStatus('error');
      }
    };

    initializeNSM();

    return () => {
      if (nsmConnector) {
        nsmConnector.disconnect();
      }
    };
  }, [enableNSM, relayUrls, privateKey, actor]);

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
    actor.send({ type: 'KEYPRESS', letter });
  }, [actor]);

  const handleBackspace = useCallback(() => {
    actor.send({ type: 'BACKSPACE' });
  }, [actor]);

  const handleEnter = useCallback(() => {
    actor.send({ type: 'SUBMIT_GUESS' });
  }, [actor]);

  const handleReset = useCallback(() => {
    actor.send({ type: 'RESET_GAME' });
  }, [actor]);

  // Physical keyboard handling
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
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
  }, [handleEnter, handleBackspace, handleKeyPress]);

  // NSM status indicator
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
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px',
        padding: '8px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        fontSize: '14px'
      }}>
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: statusColors[nsmStatus]
          }}
        />
        <span>NSM: {nsmStatus}</span>
        {error && <span style={{ color: '#e74c3c' }}>({error})</span>}
      </div>
    );
  };

  return (
    <main
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