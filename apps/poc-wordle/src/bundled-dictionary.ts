// Bundled Dictionary for NSM-Compliant Wordle
// Option B: Bundle Dictionary with Source Code
// Replaces API-based dictionary with deterministic, offline-ready solution

// Import the filtered and validated word list
import { BUNDLED_WORDS } from './filtered-words';
export { BUNDLED_WORDS } from './filtered-words';

/**
 * Simple hash function for deterministic word selection
 * Uses djb2 algorithm for good distribution
 */
function simpleHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * NSM-Compliant Bundled Dictionary Service
 *
 * Features:
 * - Instant initialization (no async operations)
 * - Deterministic word selection based on game ID
 * - Offline functionality (no network dependencies)
 * - Fast O(1) word validation using Set
 * - Sub-100ms initialization, sub-1ms lookups
 * - Bundle size optimized (~15KB for ~3000 words)
 */
export class BundledDictionary {
  private readonly wordSet: Set<string>;
  private readonly wordArray: readonly string[];

  constructor() {
    // Use imported words directly - no need for require() in browser
    // Convert to Set for O(1) lookups
    this.wordSet = new Set(BUNDLED_WORDS);
    this.wordArray = BUNDLED_WORDS;
  }

  /**
   * Validate if a word is in the dictionary
   * O(1) performance using Set lookup
   */
  isValidWord(word: string): boolean {
    if (!word || typeof word !== 'string') {
      return false;
    }

    const normalizedWord = word.toUpperCase().trim();

    // Must be exactly 5 letters
    if (normalizedWord.length !== 5) {
      return false;
    }

    // Must contain only letters
    if (!/^[A-Z]{5}$/.test(normalizedWord)) {
      return false;
    }

    return this.wordSet.has(normalizedWord);
  }

  /**
   * Get a word for a specific game ID (deterministic)
   * Same game ID always returns the same word
   */
  getWordForGame(gameId: string): string {
    if (!gameId || typeof gameId !== 'string') {
      throw new Error('Game ID is required for deterministic word selection');
    }

    const hash = simpleHash(gameId);
    const index = hash % this.wordArray.length;
    const word = this.wordArray[index];
    if (!word) {
      throw new Error('No word found at calculated index');
    }
    return word;
  }

  /**
   * Get a random word (non-deterministic)
   * Uses Math.random() for backward compatibility
   */
  getRandomWord(): string {
    const randomIndex = Math.floor(Math.random() * this.wordArray.length);
    const word = this.wordArray[randomIndex];
    if (!word) {
      throw new Error('No word found at random index');
    }
    return word;
  }

  /**
   * Get the total number of words in the dictionary
   */
  getWordCount(): number {
    return this.wordArray.length;
  }

  /**
   * Get all words (for testing or advanced usage)
   */
  getAllWords(): readonly string[] {
    return this.wordArray;
  }
}

// Export singleton instance for convenience
export const bundledDictionary = new BundledDictionary();

// Backward compatibility exports
export const isValidWord = (word: string): boolean => {
  return bundledDictionary.isValidWord(word);
};

export const getRandomWord = (): string => {
  return bundledDictionary.getRandomWord();
};

export const getWordForGame = (gameId: string): string => {
  return bundledDictionary.getWordForGame(gameId);
};

export const getWordCount = (): number => {
  return bundledDictionary.getWordCount();
};