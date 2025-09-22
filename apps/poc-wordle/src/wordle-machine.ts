import { createMachine, assign } from 'xstate';
import { getRandomWord, isValidWord } from './word-list';
import { WordValidator } from './word-validator';
import { logStateTransition, logGuessSubmitted, logGameEvent } from './utils/gameLogger';

// Types for Wordle game
export type LetterStatus = 'correct' | 'present' | 'absent';

export interface GuessData {
  word: string;
  letterStatus: LetterStatus[];
}

export interface WordleContext {
  hiddenWord: string;
  currentGuess: string;
  guesses: GuessData[];
  attemptNumber: number;
  gameOver: boolean;
  validationError?: string;
  validator?: WordValidator;
}

export type WordleEvent =
  | { type: 'KEYPRESS'; letter: string }
  | { type: 'BACKSPACE' }
  | { type: 'SUBMIT_GUESS' }
  | { type: 'RESET_GAME' };

// Helper function to calculate letter status for a guess
const calculateLetterStatus = (guess: string, hiddenWord: string): LetterStatus[] => {
  const result: LetterStatus[] = new Array(5);
  const hiddenWordArray = hiddenWord.split('');
  const guessArray = guess.split('');

  // First pass: mark correct letters
  for (let i = 0; i < 5; i++) {
    if (guessArray[i] === hiddenWordArray[i]) {
      result[i] = 'correct';
      hiddenWordArray[i] = '*'; // Mark as used
      guessArray[i] = '*'; // Mark as processed
    }
  }

  // Second pass: mark present letters
  for (let i = 0; i < 5; i++) {
    if (guessArray[i] !== '*') {
      const indexInHidden = hiddenWordArray.indexOf(guessArray[i]);
      if (indexInHidden !== -1) {
        result[i] = 'present';
        hiddenWordArray[indexInHidden] = '*'; // Mark as used
      } else {
        result[i] = 'absent';
      }
    }
  }

  return result;
};

// Actions
const setRandomWord = assign({
  hiddenWord: () => {
    const word = getRandomWord();
    logGameEvent('New game started', { hiddenWord: word });
    return word;
  }
});

const setSpecificWord = (word: string) => assign({
  hiddenWord: word
});

const addLetter = assign({
  currentGuess: ({ context, event }) => {
    if (event.type === 'KEYPRESS' && context.currentGuess.length < 5) {
      const newGuess = context.currentGuess + event.letter.toUpperCase();
      return newGuess;
    }
    return context.currentGuess;
  },
  validationError: undefined // Clear validation error on new input
});

const removeLetter = assign({
  currentGuess: ({ context }) => {
    const newGuess = context.currentGuess.slice(0, -1);
    return newGuess;
  },
  validationError: undefined // Clear validation error on input change
});

const submitGuess = assign({
  guesses: ({ context }) => {
    const guess: GuessData = {
      word: context.currentGuess,
      letterStatus: calculateLetterStatus(context.currentGuess, context.hiddenWord)
    };
    return [...context.guesses, guess];
  },
  currentGuess: '',
  attemptNumber: ({ context }) => context.attemptNumber + 1,
  validationError: undefined
});

const setValidationError = assign({
  validationError: ({ context }) => {
    logGuessSubmitted(context.currentGuess, 'invalid', { reason: 'Word not in dictionary' });
    return 'Word not in dictionary';
  }
});

const markGameWon = assign({
  gameOver: ({ context }) => {
    logGuessSubmitted(context.currentGuess, 'win', {
      attempts: context.attemptNumber + 1,
      hiddenWord: context.hiddenWord
    });
    return true;
  }
});

const markGameLost = assign({
  gameOver: ({ context }) => {
    logGuessSubmitted(context.currentGuess, 'lose', {
      attempts: context.attemptNumber + 1,
      hiddenWord: context.hiddenWord
    });
    return true;
  }
});

const resetGame = assign({
  hiddenWord: ({ context }) => {
    const word = context.hiddenWord || getRandomWord();
    logGameEvent('Game reset', { hiddenWord: word });
    return word;
  },
  currentGuess: '',
  guesses: [],
  attemptNumber: 0,
  gameOver: false,
  validationError: undefined
});

// Guards
const canAddLetter = ({ context }) => {
  return context.currentGuess.length < 5;
};

const canRemoveLetter = ({ context }) => {
  return context.currentGuess.length > 0;
};

const canSubmitGuess = ({ context }) => {
  return context.currentGuess.length === 5;
};

const isGuessValid = ({ context }) => {
  if (context.currentGuess.length !== 5) {
    return false;
  }

  // Use validator if available, otherwise fall back to word list
  if (context.validator) {
    return context.validator.isValid(context.currentGuess);
  }

  return isValidWord(context.currentGuess);
};

const isWinningGuess = ({ context }) => {
  return context.currentGuess === context.hiddenWord;
};

const isLastAttempt = ({ context }) => {
  return context.attemptNumber >= 5; // 6 attempts total (0-5)
};

const isGameOver = ({ context }) => {
  return context.gameOver;
};

// Create machine factory for testing with specific words
export const createWordleMachine = (hiddenWord?: string, validator?: WordValidator) => createMachine({
  id: 'wordleMachine',
  initial: 'playing',
  context: {
    hiddenWord: hiddenWord || '',
    currentGuess: '',
    guesses: [],
    attemptNumber: 0,
    gameOver: false,
    validator
  } as WordleContext,
  entry: hiddenWord ? undefined : setRandomWord,
  states: {
    playing: {
      on: {
        KEYPRESS: {
          guard: canAddLetter,
          actions: addLetter
        },
        BACKSPACE: {
          guard: canRemoveLetter,
          actions: removeLetter
        },
        SUBMIT_GUESS: [
          {
            guard: ({ context }) => isGuessValid({ context }) && isWinningGuess({ context }),
            target: 'won',
            actions: [submitGuess, markGameWon]
          },
          {
            guard: ({ context }) => isGuessValid({ context }) && isLastAttempt({ context }),
            target: 'lost',
            actions: [submitGuess, markGameLost]
          },
          {
            guard: ({ context }) => isGuessValid({ context }),
            actions: submitGuess
          },
          {
            guard: canSubmitGuess,
            actions: setValidationError
          }
        ],
        RESET_GAME: {
          target: 'playing',
          actions: resetGame
        }
      }
    },
    won: {
      on: {
        RESET_GAME: {
          target: 'playing',
          actions: resetGame
        }
      }
    },
    lost: {
      on: {
        RESET_GAME: {
          target: 'playing',
          actions: resetGame
        }
      }
    }
  }
});

// Default machine with random word
export const wordleMachine = createWordleMachine();