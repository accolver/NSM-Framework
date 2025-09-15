import React, { useCallback, useEffect, useState } from 'react';
import { createActor } from 'xstate';
import { wordleMachine } from '../wordle-machine';
import { WordGrid } from './WordGrid';
import { Keyboard } from './Keyboard';
import { GameStatus } from './GameStatus';
import { StatisticsModal } from './StatisticsModal';
import { GameHistoryModal } from './GameHistoryModal';
import { GamePersistence, GameReplayManager, AutoRecorder } from '../persistence';
import type { GameStatistics, SavedGame, GameReplay } from '../persistence/types';
import './styles.css';

export const EnhancedApp: React.FC = () => {
  const [actor] = useState(() => createActor(wordleMachine));
  const [state, setState] = useState(() => actor.getSnapshot());

  // Persistence state
  const [persistence] = useState(() => new GamePersistence());
  const [replayManager] = useState(() => new GameReplayManager(persistence));
  const [statistics, setStatistics] = useState<GameStatistics | null>(null);
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [autoRecorder, setAutoRecorder] = useState<AutoRecorder | null>(null);

  // Modal state
  const [showStatistics, setShowStatistics] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Game tracking
  const [gameStartTime, setGameStartTime] = useState<Date | null>(null);
  const [currentGameNumber, setCurrentGameNumber] = useState(1);

  // Initialize persistence
  useEffect(() => {
    const initPersistence = async () => {
      await persistence.init();
      const stats = await persistence.getStatistics();
      const games = await persistence.getAllGames();
      setStatistics(stats);
      setSavedGames(games);
      setCurrentGameNumber(stats.currentGameNumber);
    };

    initPersistence();
  }, [persistence]);

  // Start the machine on mount and subscribe to state changes
  useEffect(() => {
    actor.start();
    setGameStartTime(new Date());

    const subscription = actor.subscribe(async (snapshot) => {
      setState(snapshot);

      // Handle game completion
      if ((snapshot.value === 'won' || snapshot.value === 'lost') && gameStartTime) {
        const endTime = new Date();
        const timeToComplete = endTime.getTime() - gameStartTime.getTime();

        // Stop auto-recording
        if (autoRecorder) {
          autoRecorder.stop();
          setAutoRecorder(null);
        }

        // Save the completed game
        const savedGame: SavedGame = {
          id: `game-${Date.now()}`,
          hiddenWord: snapshot.context.hiddenWord,
          guesses: snapshot.context.guesses,
          outcome: snapshot.value === 'won' ? 'won' : 'lost',
          startTime: gameStartTime,
          endTime,
          timeToComplete,
          attemptCount: snapshot.context.attemptNumber,
          gameNumber: currentGameNumber
        };

        await persistence.saveGame(savedGame);

        // Save replay if recording was active
        const replay = replayManager.getCompletedReplay();
        if (replay) {
          await persistence.saveReplay(replay);
        }

        // Update statistics and games list
        const updatedStats = await persistence.getStatistics();
        const updatedGames = await persistence.getAllGames();
        setStatistics(updatedStats);
        setSavedGames(updatedGames);
        setCurrentGameNumber(updatedStats.currentGameNumber);
      }
    });

    return () => {
      subscription.unsubscribe();
      actor.stop();
      if (autoRecorder) {
        autoRecorder.stop();
      }
    };
  }, [actor, gameStartTime, autoRecorder, persistence, replayManager, currentGameNumber]);

  // Start recording when game starts
  useEffect(() => {
    if (state.value === 'playing' && gameStartTime && !autoRecorder) {
      // Start replay recording
      const gameId = `game-${gameStartTime.getTime()}`;
      replayManager.startRecording(gameId, state.context.hiddenWord);

      // TODO: Implement auto-recorder integration when WordleGame wrapper is available
      // For now, we'll manually record actions
    }
  }, [state.value, gameStartTime, autoRecorder, replayManager]);

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
    // Record action for replay
    if (replayManager.getCurrentReplay()) {
      replayManager.recordAction('keypress', { letter });
    }
  }, [actor, replayManager]);

  const handleBackspace = useCallback(() => {
    actor.send({ type: 'BACKSPACE' });
    // Record action for replay
    if (replayManager.getCurrentReplay()) {
      replayManager.recordAction('backspace');
    }
  }, [actor, replayManager]);

  const handleEnter = useCallback(() => {
    const currentState = actor.getSnapshot();
    actor.send({ type: 'SUBMIT_GUESS' });

    // Record action for replay (need to get the guess after submission)
    setTimeout(() => {
      const newState = actor.getSnapshot();
      if (newState.context.guesses.length > currentState.context.guesses.length) {
        const latestGuess = newState.context.guesses[newState.context.guesses.length - 1];
        if (replayManager.getCurrentReplay()) {
          replayManager.recordAction('submit', { guess: latestGuess });
        }
      }
    }, 0);
  }, [actor, replayManager]);

  const handleReset = useCallback(() => {
    actor.send({ type: 'RESET_GAME' });
    setGameStartTime(new Date());
    setAutoRecorder(null);

    // Start new recording
    setTimeout(() => {
      const newState = actor.getSnapshot();
      const gameId = `game-${Date.now()}`;
      replayManager.startRecording(gameId, newState.context.hiddenWord);
    }, 0);
  }, [actor, replayManager]);

  // Load replay data
  const handleLoadReplay = useCallback(async (gameId: string): Promise<GameReplay | null> => {
    return await persistence.getReplay(gameId);
  }, [persistence]);

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

  return (
    <main
      className="app"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="main"
      aria-label="Wordle game"
      aria-describedby="game-instructions"
    >
      <div className="app-header">
        <h1>Wordle</h1>
        <div className="header-buttons">
          <button
            onClick={() => setShowHistory(true)}
            className="icon-button"
            title="Game History"
            aria-label="View game history"
          >
            📚
          </button>
          <button
            onClick={() => setShowStatistics(true)}
            className="icon-button"
            title="Statistics"
            aria-label="View statistics"
          >
            📊
          </button>
        </div>
      </div>

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

      {/* Game info footer */}
      {statistics && (
        <div className="game-info">
          <div className="info-item">
            Games Played: {statistics.totalGames}
          </div>
          <div className="info-item">
            Win Rate: {statistics.winPercentage}%
          </div>
          <div className="info-item">
            Current Streak: {statistics.currentStreak}
          </div>
        </div>
      )}

      {/* Modals */}
      <StatisticsModal
        isOpen={showStatistics}
        onClose={() => setShowStatistics(false)}
        statistics={statistics}
      />

      <GameHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        savedGames={savedGames}
        onLoadReplay={handleLoadReplay}
      />
    </main>
  );
};