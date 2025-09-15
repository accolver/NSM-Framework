import { createMachine, assign } from 'xstate';
import { getRandomWord, isValidWord } from './word-list';

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
    console.log('XState setRandomWord action called, selected word:', word);
    return word;
  }
});

const setSpecificWord = (word: string) => assign({
  hiddenWord: word
});

const addLetter = assign({
  currentGuess: ({ context, event }) => {
    console.log('XState addLetter action called:', { event, currentGuess: context.currentGuess });
    if (event.type === 'KEYPRESS' && context.currentGuess.length < 5) {
      const newGuess = context.currentGuess + event.letter.toUpperCase();
      console.log('Adding letter, new guess:', newGuess);
      return newGuess;
    }
    console.log('Letter not added, current guess unchanged');
    return context.currentGuess;
  }
});

const removeLetter = assign({
  currentGuess: ({ context }) => {
    console.log('XState removeLetter action called, current guess:', context.currentGuess);
    const newGuess = context.currentGuess.slice(0, -1);
    console.log('Removed letter, new guess:', newGuess);
    return newGuess;
  }
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
  attemptNumber: ({ context }) => context.attemptNumber + 1
});

const markGameWon = assign({
  gameOver: true
});

const markGameLost = assign({
  gameOver: true
});

const resetGame = assign({
  hiddenWord: ({ context }) => context.hiddenWord || getRandomWord(),
  currentGuess: '',
  guesses: [],
  attemptNumber: 0,
  gameOver: false
});

// Guards
const canAddLetter = ({ context }) => {
  const result = context.currentGuess.length < 5;
  console.log('canAddLetter guard:', { currentGuessLength: context.currentGuess.length, result });
  return result;
};

const canRemoveLetter = ({ context }) => {
  return context.currentGuess.length > 0;
};

const canSubmitGuess = ({ context }) => {
  return context.currentGuess.length === 5;
  // Note: For this demo, we'll allow any 5-letter word
  // In production, you might want: && isValidWord(context.currentGuess);
};

const isGuessValid = ({ context }) => {
  return context.currentGuess.length === 5;
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
export const createWordleMachine = (hiddenWord?: string) => createMachine({
  id: 'wordleMachine',
  initial: 'playing',
  context: {
    hiddenWord: hiddenWord || '',
    currentGuess: '',
    guesses: [],
    attemptNumber: 0,
    gameOver: false
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
            guard: canSubmitGuess,
            actions: submitGuess
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