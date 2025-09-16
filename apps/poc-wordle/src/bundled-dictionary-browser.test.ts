/**
 * Test to verify BundledDictionary works in browser environment (no require())
 */

import { describe, it, expect } from 'vitest';

describe('BundledDictionary Browser Compatibility', () => {
  it('should instantiate BundledDictionary without require() call', async () => {
    // This test should pass after we fix the require() issue
    const { BundledDictionary } = await import('./bundled-dictionary');
    const dictionary = new BundledDictionary();

    expect(dictionary).toBeDefined();
    expect(dictionary.getWordCount()).toBeGreaterThan(0);
  });

  it('should validate words correctly after fixing require issue', async () => {
    // This test will pass after we fix the require() issue
    const { BundledDictionary } = await import('./bundled-dictionary');
    const dictionary = new BundledDictionary();

    expect(dictionary.isValidWord('ABOUT')).toBe(true);
    expect(dictionary.isValidWord('XYZZZ')).toBe(false); // Invalid word
    expect(dictionary.isValidWord('abc')).toBe(false); // too short
    expect(dictionary.isValidWord('toolong')).toBe(false); // too long
  });

  it('should provide deterministic word selection after fixing require issue', async () => {
    const { BundledDictionary } = await import('./bundled-dictionary');
    const dictionary = new BundledDictionary();

    const word1 = dictionary.getWordForGame('test-game-1');
    const word2 = dictionary.getWordForGame('test-game-1');
    const word3 = dictionary.getWordForGame('test-game-2');

    expect(word1).toBe(word2); // Same game ID should return same word
    expect(word1).not.toBe(word3); // Different game ID should return different word
    expect(typeof word1).toBe('string');
    expect(word1.length).toBe(5);
  });

  it('should export convenience functions that work in browser', async () => {
    const { isValidWord, getRandomWord, getWordForGame } = await import('./bundled-dictionary');

    expect(typeof isValidWord).toBe('function');
    expect(typeof getRandomWord).toBe('function');
    expect(typeof getWordForGame).toBe('function');

    expect(isValidWord('ABOUT')).toBe(true);
    expect(isValidWord('INVALID')).toBe(false);

    const randomWord = getRandomWord();
    expect(typeof randomWord).toBe('string');
    expect(randomWord.length).toBe(5);

    const gameWord = getWordForGame('test-game');
    expect(typeof gameWord).toBe('string');
    expect(gameWord.length).toBe(5);
  });

  it('should have correct word count', async () => {
    const { getWordCount } = await import('./bundled-dictionary');
    const count = getWordCount();

    expect(count).toBeGreaterThan(3000); // Should have a good number of words
    expect(typeof count).toBe('number');
  });
});