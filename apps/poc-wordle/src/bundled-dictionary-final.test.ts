/**
 * Final comprehensive test to verify BundledDictionary browser compatibility fix
 */

import { describe, it, expect } from 'vitest';

describe('BundledDictionary - Final Verification', () => {
  it('should work with ES imports (no require() calls)', async () => {
    // Import using ES modules (browser-compatible)
    const {
      BundledDictionary,
      bundledDictionary,
      isValidWord,
      getRandomWord,
      getWordForGame,
      getWordCount
    } = await import('./bundled-dictionary');

    // Test class instantiation
    const dictionary = new BundledDictionary();
    expect(dictionary).toBeDefined();
    expect(dictionary.getWordCount()).toBeGreaterThan(3000);

    // Test singleton instance
    expect(bundledDictionary).toBeDefined();
    expect(bundledDictionary.getWordCount()).toBeGreaterThan(3000);

    // Test word validation
    expect(dictionary.isValidWord('ABOUT')).toBe(true);
    expect(dictionary.isValidWord('XYZZZ')).toBe(false);
    expect(dictionary.isValidWord('abc')).toBe(false); // too short
    expect(dictionary.isValidWord('toolong')).toBe(false); // too long

    // Test deterministic word selection
    const word1 = dictionary.getWordForGame('test');
    const word2 = dictionary.getWordForGame('test');
    expect(word1).toBe(word2);
    expect(word1.length).toBe(5);

    // Test random word selection
    const randomWord = dictionary.getRandomWord();
    expect(randomWord.length).toBe(5);
    expect(dictionary.isValidWord(randomWord)).toBe(true);

    // Test convenience functions
    expect(isValidWord('WORLD')).toBe(true);
    expect(getWordCount()).toBeGreaterThan(3000);

    const convenientRandomWord = getRandomWord();
    expect(convenientRandomWord.length).toBe(5);

    const convenientGameWord = getWordForGame('test-game');
    expect(convenientGameWord.length).toBe(5);
  });

  it('should have consistent behavior between class and convenience functions', async () => {
    const { BundledDictionary, isValidWord, getWordCount, getWordForGame } = await import('./bundled-dictionary');

    const dictionary = new BundledDictionary();

    // Test consistency
    expect(dictionary.isValidWord('WORLD')).toBe(isValidWord('WORLD'));
    expect(dictionary.getWordCount()).toBe(getWordCount());
    expect(dictionary.getWordForGame('test')).toBe(getWordForGame('test'));
  });

  it('should export BUNDLED_WORDS correctly', async () => {
    const { BUNDLED_WORDS } = await import('./bundled-dictionary');

    expect(BUNDLED_WORDS).toBeDefined();
    expect(Array.isArray(BUNDLED_WORDS)).toBe(true);
    expect(BUNDLED_WORDS.length).toBeGreaterThan(3000);
    expect(BUNDLED_WORDS[0]).toBe('ABOUT');
  });
});