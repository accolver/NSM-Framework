// Wordle Proof of Concept - NSM Framework
import { NSMClient } from '@nsm/client-sdk';
import { WordleGame } from './wordle-game';
import { wordleMachine, createWordleMachine } from './wordle-machine';
import { getRandomWord, isValidWord } from './word-list';

console.log('🎮 Wordle POC - NSM Framework');
console.log('✅ XState v5 Wordle state machine implementation');

// Initialize NSM client
const client = new NSMClient();

// Example: Create a Wordle game instance
const game = new WordleGame();
game.start();

console.log('🎯 Game started! Current state:', game.getState().gameState);
console.log('📝 Word grid:', game.getWordGrid());

// Demo: Play a few moves
console.log('\n📝 Demo: Playing some letters...');
game.pressKey('S');
game.pressKey('T');
game.pressKey('A');
game.pressKey('R');
game.pressKey('T');

console.log('Current guess:', game.getState().currentGuess);
console.log('Word grid:', game.getWordGrid());

// Submit the guess
game.submitGuess();
console.log('After submit - Guesses:', game.getState().guesses.length);
console.log('Game state:', game.getState().gameState);

// Show letter status
if (game.getState().guesses.length > 0) {
  const lastGuess = game.getState().guesses[0];
  console.log('Letter status:', lastGuess.letterStatus);
  console.log('Keyboard status:', game.getKeyboardStatus());
}

// Export for use by other modules
export {
  client,
  WordleGame,
  wordleMachine,
  createWordleMachine,
  getRandomWord,
  isValidWord
};