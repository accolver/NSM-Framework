// TDD Tests for Bundled Dictionary Implementation
// RED PHASE: Write failing tests for NSM-compliant bundled dictionary

import { describe, it, expect, beforeEach } from 'bun:test';

/**
 * Test suite for bundled dictionary that replaces API-based solution
 * Requirements: NSM compliance, deterministic behavior, instant availability
 */
describe('Bundled Dictionary Service', () => {
  describe('Core Functionality', () => {
    it('should validate 5-letter words instantly without network calls', async () => {
      // This will fail initially - no BundledDictionary yet
      const { BundledDictionary } = await import('./bundled-dictionary');
      const dictionary = new BundledDictionary();

      // Should work instantly without initialization
      expect(dictionary.isValidWord('HOUSE')).toBe(true);
      expect(dictionary.isValidWord('ABOUT')).toBe(true);
      expect(dictionary.isValidWord('WORLD')).toBe(true);
      expect(dictionary.isValidWord('STAIR')).toBe(true);

      // Should reject invalid words
      expect(dictionary.isValidWord('INVALID')).toBe(false); // 7 letters
      expect(dictionary.isValidWord('CAR')).toBe(false); // 3 letters
      expect(dictionary.isValidWord('ABCDE')).toBe(false); // Not a real word
    });

    it('should provide deterministic word selection based on game ID', async () => {
      const { BundledDictionary } = await import('./bundled-dictionary');
      const dictionary = new BundledDictionary();

      // Same game ID should always return same word
      const word1a = dictionary.getWordForGame('game-123');
      const word1b = dictionary.getWordForGame('game-123');
      expect(word1a).toBe(word1b);

      // Different game IDs should return different words (most of the time)
      const word2 = dictionary.getWordForGame('game-456');
      const word3 = dictionary.getWordForGame('game-789');

      // All should be valid 5-letter words
      expect(word1a).toMatch(/^[A-Z]{5}$/);
      expect(word2).toMatch(/^[A-Z]{5}$/);
      expect(word3).toMatch(/^[A-Z]{5}$/);

      // All should be valid dictionary words
      expect(dictionary.isValidWord(word1a)).toBe(true);
      expect(dictionary.isValidWord(word2)).toBe(true);
      expect(dictionary.isValidWord(word3)).toBe(true);
    });

    it('should handle case insensitivity for validation', async () => {
      const { BundledDictionary } = await import('./bundled-dictionary');
      const dictionary = new BundledDictionary();

      expect(dictionary.isValidWord('house')).toBe(true);
      expect(dictionary.isValidWord('HOUSE')).toBe(true);
      expect(dictionary.isValidWord('House')).toBe(true);
      expect(dictionary.isValidWord('HoUsE')).toBe(true);
    });
  });

  describe('Performance Requirements', () => {
    it('should initialize instantly (sub-100ms)', async () => {
      const startTime = performance.now();

      const { BundledDictionary } = await import('./bundled-dictionary');
      const dictionary = new BundledDictionary();

      // Should work immediately without async initialization
      const word = dictionary.getWordForGame('perf-test');
      expect(word).toMatch(/^[A-Z]{5}$/);

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // Sub-100ms
    });

    it('should provide fast word validation (sub-1ms per lookup)', async () => {
      const { BundledDictionary } = await import('./bundled-dictionary');
      const dictionary = new BundledDictionary();

      // Test multiple lookups to get average
      const testWords = ['HOUSE', 'ABOUT', 'WORLD', 'MUSIC', 'FRAME'];
      const iterations = 1000;

      const startTime = performance.now();
      for (let i = 0; i < iterations; i++) {
        for (const word of testWords) {
          dictionary.isValidWord(word);
        }
      }
      const endTime = performance.now();

      const avgTimePerLookup = (endTime - startTime) / (iterations * testWords.length);
      expect(avgTimePerLookup).toBeLessThan(1); // Sub-1ms per lookup
    });
  });

  describe('NSM Compliance', () => {
    it('should work completely offline without network dependencies', async () => {
      const { BundledDictionary } = await import('./bundled-dictionary');
      const dictionary = new BundledDictionary();

      // Should work even if fetch is unavailable
      const originalFetch = global.fetch;
      global.fetch = undefined as any;

      try {
        expect(dictionary.isValidWord('HOUSE')).toBe(true);
        const word = dictionary.getWordForGame('offline-test');
        expect(word).toMatch(/^[A-Z]{5}$/);
        expect(dictionary.isValidWord(word)).toBe(true);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('should ensure deterministic behavior for same inputs', async () => {
      const { BundledDictionary } = await import('./bundled-dictionary');

      // Create multiple instances to test consistency
      const dict1 = new BundledDictionary();
      const dict2 = new BundledDictionary();

      const gameIds = ['game-1', 'game-2', 'game-3', 'test-game', 'prod-game'];

      for (const gameId of gameIds) {
        const word1 = dict1.getWordForGame(gameId);
        const word2 = dict2.getWordForGame(gameId);
        expect(word1).toBe(word2); // Must be identical across instances
      }
    });

    it('should provide sufficient word variety (minimum 1000 words)', async () => {
      const { BundledDictionary } = await import('./bundled-dictionary');
      const dictionary = new BundledDictionary();

      const wordCount = dictionary.getWordCount();
      expect(wordCount).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain compatibility with existing word list', async () => {
      const { BundledDictionary } = await import('./bundled-dictionary');
      const { WORD_LIST } = await import('./word-list');
      const dictionary = new BundledDictionary();

      // All existing words should still be valid
      for (const word of WORD_LIST.slice(0, 50)) { // Test subset for performance
        expect(dictionary.isValidWord(word)).toBe(true);
      }
    });

    it('should provide compatible API for random word selection', async () => {
      const { BundledDictionary } = await import('./bundled-dictionary');
      const dictionary = new BundledDictionary();

      const randomWord = dictionary.getRandomWord();
      expect(randomWord).toMatch(/^[A-Z]{5}$/);
      expect(dictionary.isValidWord(randomWord)).toBe(true);
    });
  });

  describe('Bundle Size Optimization', () => {
    it('should keep bundled word list under reasonable size', async () => {
      const { BUNDLED_WORDS } = await import('./bundled-dictionary');

      // Estimate bundle size (rough calculation)
      const avgWordLength = 5; // All words are 5 letters
      const estimatedSize = BUNDLED_WORDS.length * avgWordLength;

      // Should be under 50KB for ~2500 words
      expect(estimatedSize).toBeLessThan(50000);
      expect(BUNDLED_WORDS.length).toBeGreaterThanOrEqual(1000);
      expect(BUNDLED_WORDS.length).toBeLessThan(5000); // Reasonable upper bound
    });
  });
});