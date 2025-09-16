// Integration tests for updated word-list.ts with dynamic dictionary service

import { describe, it, expect, beforeEach } from 'bun:test';

describe('Updated Word List Integration', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('Backward Compatibility', () => {
    it('should maintain the same synchronous API', async () => {
      const { isValidWord, getRandomWord, WORD_LIST } = await import('./word-list');

      // Should work exactly like before
      expect(typeof isValidWord).toBe('function');
      expect(typeof getRandomWord).toBe('function');

      // Should still validate existing words
      expect(isValidWord('HOUSE')).toBe(true);
      expect(isValidWord('STAIR')).toBe(true);
      expect(isValidWord('INVALID')).toBe(false);

      // Should still return valid random words
      const randomWord = getRandomWord();
      expect(randomWord).toMatch(/^[A-Z]{5}$/);
      expect(WORD_LIST.includes(randomWord)).toBe(true);
    });

    it('should still export the WORD_LIST array', async () => {
      const { WORD_LIST } = await import('./word-list');

      expect(Array.isArray(WORD_LIST)).toBe(true);
      expect(WORD_LIST.length).toBeGreaterThan(500);
      expect(WORD_LIST.includes('STAIR')).toBe(true);
      expect(WORD_LIST.includes('HOUSE')).toBe(true);
    });

    it('should work with existing Wordle machine validation', async () => {
      const { isValidWord } = await import('./word-list');

      // Test words that the Wordle machine currently uses
      const testWords = ['ABOUT', 'HOUSE', 'WORLD', 'STAIR', 'GREAT'];

      for (const word of testWords) {
        expect(isValidWord(word)).toBe(true);
      }

      // Test invalid words
      expect(isValidWord('ABCDE')).toBe(false);
      expect(isValidWord('CAR')).toBe(false);
      expect(isValidWord('TOOLONG')).toBe(false);
    });
  });

  describe('Enhanced Functionality', () => {
    it('should provide async word validation', async () => {
      const { isValidWordAsync } = await import('./word-list');

      // Should validate existing words
      expect(await isValidWordAsync('HOUSE')).toBe(true);
      expect(await isValidWordAsync('STAIR')).toBe(true);
      expect(await isValidWordAsync('INVALID')).toBe(false);
    });

    it('should provide async random word selection', async () => {
      const { getRandomWordAsync } = await import('./word-list');

      const randomWord = await getRandomWordAsync();
      expect(randomWord).toMatch(/^[A-Z]{5}$/);

      // Should be a valid word
      const { isValidWordAsync } = await import('./word-list');
      expect(await isValidWordAsync(randomWord)).toBe(true);
    });

    it('should provide dictionary statistics', async () => {
      const { getDictionaryStats } = await import('./word-list');

      const stats = await getDictionaryStats();

      expect(stats).toHaveProperty('wordCount');
      expect(stats).toHaveProperty('source');
      expect(typeof stats.wordCount).toBe('number');
      expect(stats.wordCount).toBeGreaterThan(500);
      expect(['dictionary-api', 'fallback']).toContain(stats.source);
    });
  });

  describe('Performance & Caching', () => {
    it('should cache dictionary data for better performance', async () => {
      const { getDictionaryStats } = await import('./word-list');

      // First call should initialize and potentially cache
      const stats1 = await getDictionaryStats();

      // Second call should use cache if available
      const stats2 = await getDictionaryStats();

      expect(stats1.wordCount).toBe(stats2.wordCount);
      expect(stats1.source).toBe(stats2.source);
    });

    it('should work immediately without async initialization', async () => {
      const { isValidWord, getRandomWord } = await import('./word-list');

      // Should work synchronously even before async initialization
      expect(isValidWord('HOUSE')).toBe(true);

      const randomWord = getRandomWord();
      expect(randomWord).toMatch(/^[A-Z]{5}$/);
    });
  });

  describe('Error Handling', () => {
    it('should gracefully fallback when dictionary service fails', async () => {
      // Dictionary service is mocked to fail in test environment for some cases
      const { isValidWord, getRandomWord, WORD_LIST } = await import('./word-list');

      // Should still work with fallback words
      expect(isValidWord('HOUSE')).toBe(true);
      expect(isValidWord('STAIR')).toBe(true);

      const randomWord = getRandomWord();
      expect(WORD_LIST.includes(randomWord)).toBe(true);
    });
  });

  describe('Case Sensitivity', () => {
    it('should handle case insensitivity correctly', async () => {
      const { isValidWord, isValidWordAsync } = await import('./word-list');

      // Sync version
      expect(isValidWord('house')).toBe(true);
      expect(isValidWord('HOUSE')).toBe(true);
      expect(isValidWord('House')).toBe(true);

      // Async version
      expect(await isValidWordAsync('house')).toBe(true);
      expect(await isValidWordAsync('HOUSE')).toBe(true);
      expect(await isValidWordAsync('House')).toBe(true);
    });

    it('should always return uppercase words', async () => {
      const { getRandomWord, getRandomWordAsync } = await import('./word-list');

      // Sync version
      const syncWord = getRandomWord();
      expect(syncWord).toMatch(/^[A-Z]{5}$/);

      // Async version
      const asyncWord = await getRandomWordAsync();
      expect(asyncWord).toMatch(/^[A-Z]{5}$/);
    });
  });
});