// Bundled word list for Wordle game - NSM compliant
// This file now uses the bundled dictionary for instant availability and deterministic behavior

import { bundledDictionary, BUNDLED_WORDS } from './bundled-dictionary';

// Export bundled word list for backward compatibility
export const WORD_LIST = BUNDLED_WORDS.slice(); // Convert readonly array to mutable for compatibility

// NSM-compliant word validation - instant, offline, deterministic
export const isValidWord = (word: string): boolean => {
  return bundledDictionary.isValidWord(word);
};

// NSM-compliant random word selection - instant, offline
export const getRandomWord = (): string => {
  return bundledDictionary.getRandomWord();
};

// Deterministic word selection for NSM compliance
export const getWordForGame = (gameId: string): string => {
  return bundledDictionary.getWordForGame(gameId);
};

// Dictionary statistics for bundled implementation
export const getDictionaryStats = (): { wordCount: number; source: string } => {
  return {
    wordCount: bundledDictionary.getWordCount(),
    source: 'bundled-dictionary'
  };
};

// Get word count
export const getWordCount = (): number => {
  return bundledDictionary.getWordCount();
};

// No initialization needed for bundled dictionary - instant availability
export const initializeDictionary = (): void => {
  // No-op for bundled dictionary - always ready
};