import React, { useCallback, useEffect, useState } from 'react';
import { createActor } from 'xstate';
import { DeveloperDashboard } from '@nsm/dev-tools';
import { wordleMachine } from '../wordle-machine';
import { WordGrid } from './WordGrid';
import { Keyboard } from './Keyboard';
import { GameStatus } from './GameStatus';
import { NSMStatus } from './NSMStatus';
import { DeveloperDashboardToggle } from './DeveloperDashboardToggle';
import { WordleExporter } from './WordleExporter';
import { getWordleDashboardServices } from '../services/wordleDashboardIntegration';
import { logStateTransition, logGameEvent } from '../utils/gameLogger';
import { initializeLogging } from '../config/logging';
import { NostrAuthService } from '../services/auth';
import { NSMAuthIntegration } from '../services/nsm-auth-integration';
import { WordleNSMSetup } from '../services/wordle-nsm-setup';
import './styles.css';

export const App: React.FC = () => {
  const [actor] = useState(() => createActor(wordleMachine));
  const [state, setState] = useState(() => actor.getSnapshot());

  // DASHBOARD FIX: Start with dashboard visible by default for better UX
  const [isDashboardVisible, setIsDashboardVisible] = useState(true);
  const [dashboardServices] = useState(() => getWordleDashboardServices({
    enableEventLogging: true,
    enableTimeTravel: true,
    enableInspector: true,
    enableAutoConnect: false // We'll connect manually after actor starts
  }));

  // Authentication services
  const [authService] = useState(() => new NostrAuthService());
  const [nsmAuthIntegration] = useState(() => new NSMAuthIntegration(authService));
  const [wordleNSMSetup] = useState(() => new WordleNSMSetup(nsmAuthIntegration, actor));

  // Start the machine on mount and subscribe to state changes
  useEffect(() => {
    // Initialize logging system
    initializeLogging();

    actor.start();

    let previousState = actor.getSnapshot().value;
    let previousContext = actor.getSnapshot().context;

    const subscription = actor.subscribe((snapshot) => {
      // Log actual state value transitions
      if (snapshot.value !== previousState) {
        logStateTransition(
          String(previousState),
          String(snapshot.value),
          snapshot.context
        );
        previousState = snapshot.value;
      }

      // LOGGING FIX: Also log context changes (like keypress updates)
      if (snapshot.context.currentGuess !== previousContext.currentGuess) {
        logGameEvent(`Typed: "${snapshot.context.currentGuess}"`, {
          currentGuess: snapshot.context.currentGuess,
          letterCount: snapshot.context.currentGuess.length,
          attemptNumber: snapshot.context.attemptNumber
        });
      }

      previousContext = snapshot.context;
      setState(snapshot);
    });

    // Connect dashboard services to the actor
    dashboardServices.connectToActor(actor);

    return () => {
      subscription.unsubscribe();
      actor.stop();
      dashboardServices.cleanup();
      wordleNSMSetup.cleanup();
    };
  }, [actor, dashboardServices, wordleNSMSetup]);

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

  // Dashboard toggle handler
  const handleDashboardToggle = useCallback((isVisible: boolean) => {
    setIsDashboardVisible(isVisible);
  }, []);

  return (
    <main
      className="app app-compact"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="main"
      aria-label="Wordle game"
      aria-describedby="game-instructions"
    >
      <header className="app-header">
        <h1>Wordle</h1>
        <NSMStatus authService={authService} />
      </header>

      <div id="game-instructions" className="sr-only">
        Guess the 5-letter word in 6 attempts. Use your keyboard or click the virtual keyboard.
        Green letters are correct, yellow letters are in the word but wrong position,
        gray letters are not in the word.
      </div>

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

      {/* Developer Dashboard Toggle */}
      <DeveloperDashboardToggle
        onToggle={handleDashboardToggle}
        initiallyVisible={isDashboardVisible}
      />

      {/* State Machine Exporter */}
      <WordleExporter
        actor={actor}
        showCodeViewer={false}
        enableGameShortcuts={true}
      />

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