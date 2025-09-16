import React, { useCallback, useEffect, useState } from 'react';
import { createActor } from 'xstate';
import { wordleMachine } from '../wordle-machine';
import { WordGrid } from './WordGrid';
import { Keyboard } from './Keyboard';
import { GameStatus } from './GameStatus';
import { NSMStatus } from './NSMStatus';
import './styles.css';

export const App: React.FC = () => {
  const [actor] = useState(() => createActor(wordleMachine));
  const [state, setState] = useState(() => actor.getSnapshot());

  // Start the machine on mount and subscribe to state changes
  useEffect(() => {
    console.log('🎮 App component mounted - starting state machine');
    actor.start();
    const subscription = actor.subscribe((snapshot) => {
      console.log('🔄 State machine update:', snapshot.value, snapshot.context);
      setState(snapshot);
    });

    return () => {
      console.log('🎮 App component unmounting - stopping state machine');
      subscription.unsubscribe();
      actor.stop();
    };
  }, [actor]);

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
    console.log('📤 handleKeyPress called with letter:', letter);
    console.log('📤 Sending KEYPRESS event to state machine');
    actor.send({ type: 'KEYPRESS', letter });
  }, [actor]);

  const handleBackspace = useCallback(() => {
    console.log('📤 handleBackspace called');
    console.log('📤 Sending BACKSPACE event to state machine');
    actor.send({ type: 'BACKSPACE' });
  }, [actor]);

  const handleEnter = useCallback(() => {
    console.log('📤 handleEnter called');
    console.log('📤 Sending SUBMIT_GUESS event to state machine');
    actor.send({ type: 'SUBMIT_GUESS' });
  }, [actor]);

  const handleReset = useCallback(() => {
    actor.send({ type: 'RESET_GAME' });
  }, [actor]);

  // Physical keyboard handling
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    console.log('🎹 Physical keyboard event detected:', {
      key: event.key,
      keyCode: event.keyCode,
      code: event.code,
      target: event.target,
      type: event.type
    });

    const key = event.key.toUpperCase();
    console.log('🔤 Processed key:', key);

    if (key === 'ENTER') {
      console.log('✅ Enter key detected - calling handleEnter');
      event.preventDefault();
      handleEnter();
    } else if (key === 'BACKSPACE') {
      console.log('⬅️ Backspace key detected - calling handleBackspace');
      event.preventDefault();
      handleBackspace();
    } else if (/^[A-Z]$/.test(key)) {
      console.log('🔤 Letter key detected - calling handleKeyPress with:', key);
      event.preventDefault();
      handleKeyPress(key);
    } else {
      console.log('❌ Key not recognized for game input:', key);
    }
  }, [handleEnter, handleBackspace, handleKeyPress]);

  return (
    <main
      className="app app-compact"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onFocus={() => console.log('🎯 Main element gained focus')}
      onBlur={() => console.log('🎯 Main element lost focus')}
      onKeyUp={(e) => console.log('⬆️ Key up event:', e.key)}
      onKeyPress={(e) => console.log('👇 Key press event:', e.key)}
      role="main"
      aria-label="Wordle game"
      aria-describedby="game-instructions"
    >
      <header className="app-header">
        <h1>Wordle</h1>
        <NSMStatus />
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
    </main>
  );
};