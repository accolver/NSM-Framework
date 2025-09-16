// TDD Tests for Dynamic Dictionary Service

import { describe, it, expect, beforeEach } from 'bun:test';
import { mock } from 'bun:test';

/**
 * RED PHASE: Write failing tests that describe the desired behavior
 * These tests will fail initially since we haven't implemented the service yet
 */
describe('Dictionary Service', () => {
  beforeEach(() => {
    // Clear any localStorage/cache before each test
    localStorage.clear();
    // Note: bun:test doesn't require clearing mocks
  });

  describe('Core Word Validation', () => {
    it('should validate 5-letter words correctly', async () => {
      // This will fail initially - no DictionaryService yet
      const { DictionaryService } = await import('./dictionary-service');
      const service = new DictionaryService();

      await service.initialize();

      // Test valid 5-letter words
      expect(await service.isValidWord('HOUSE')).toBe(true);
      expect(await service.isValidWord('ABOUT')).toBe(true);
      expect(await service.isValidWord('STAIR')).toBe(true);

      // Test invalid words
      expect(await service.isValidWord('INVALID')).toBe(false); // 7 letters
      expect(await service.isValidWord('CAR')).toBe(false); // 3 letters
      expect(await service.isValidWord('ABCDE')).toBe(false); // Not a real word
    });

    it('should handle case insensitivity', async () => {
      const { DictionaryService } = await import('./dictionary-service');
      const service = new DictionaryService();

      await service.initialize();

      expect(await service.isValidWord('house')).toBe(true);
      expect(await service.isValidWord('HOUSE')).toBe(true);
      expect(await service.isValidWord('House')).toBe(true);
    });

    it('should get random valid words', async () => {
      const { DictionaryService } = await import('./dictionary-service');
      const service = new DictionaryService();

      await service.initialize();

      const word1 = await service.getRandomWord();
      const word2 = await service.getRandomWord();

      // Should return 5-letter words
      expect(word1).toMatch(/^[A-Z]{5}$/);
      expect(word2).toMatch(/^[A-Z]{5}$/);

      // Should be valid words
      expect(await service.isValidWord(word1)).toBe(true);
      expect(await service.isValidWord(word2)).toBe(true);
    });
  });

  describe('Caching & Performance', () => {
    it('should cache dictionary data in localStorage', async () => {
      const { DictionaryService } = await import('./dictionary-service');
      const service = new DictionaryService();

      await service.initialize();

      // Check that cache was created
      const cached = localStorage.getItem('wordle-dictionary-cache');
      expect(cached).toBeTruthy();

      const cacheData = JSON.parse(cached!);
      expect(cacheData.words).toBeInstanceOf(Array);
      expect(cacheData.timestamp).toBeTypeOf('number');
      expect(cacheData.version).toBeTypeOf('string');
    });

    it('should use cached data on subsequent initializations', async () => {
      const { DictionaryService } = await import('./dictionary-service');

      // Mock fetch to return word list
      const mockWords = 'HOUSE\nABOUT\nWORLD\nGREAT\nSTAIR\n';
      const fetchSpy = mock(() => Promise.resolve({
        ok: true,
        text: () => Promise.resolve(mockWords),
      } as Response));
      global.fetch = fetchSpy;

      // First initialization - should fetch
      const service1 = new DictionaryService();
      await service1.initialize();

      expect(fetchSpy).toHaveBeenCalled();
      fetchSpy.mockClear();

      // Second initialization - should use cache
      const service2 = new DictionaryService();
      await service2.initialize();

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should refresh cache when expired', async () => {
      const { DictionaryService } = await import('./dictionary-service');

      // Set old cache data
      const oldCache = {
        words: ['HOUSE', 'ABOUT'],
        timestamp: Date.now() - (8 * 24 * 60 * 60 * 1000), // 8 days old
        version: '1.0.0'
      };
      localStorage.setItem('wordle-dictionary-cache', JSON.stringify(oldCache));

      const fetchSpy = mock(() => Promise.resolve({
        ok: true,
        text: () => Promise.resolve('HOUSE\nABOUT\nWORLD\n'),
      } as Response));
      global.fetch = fetchSpy;

      const service = new DictionaryService();
      await service.initialize();

      // Should fetch new data since cache is expired
      expect(fetchSpy).toHaveBeenCalled();
    });
  });

  describe('Fallback Behavior', () => {
    it('should use fallback word list when dictionary API fails', async () => {
      const { DictionaryService } = await import('./dictionary-service');

      // Mock fetch to fail
      const fetchSpy = mock(() => Promise.reject(new Error('API unavailable')));
      global.fetch = fetchSpy;

      const service = new DictionaryService();
      await service.initialize();

      // Should still work with fallback words
      expect(await service.isValidWord('ABOUT')).toBe(true);
      expect(await service.isValidWord('HOUSE')).toBe(true);

      const randomWord = await service.getRandomWord();
      expect(randomWord).toMatch(/^[A-Z]{5}$/);
    });

    it('should maintain existing word compatibility', async () => {
      const { DictionaryService } = await import('./dictionary-service');
      const service = new DictionaryService();

      await service.initialize();

      // All words from the current hardcoded list should still be valid
      const currentWords = ['ABOUT', 'ABOVE', 'HOUSE', 'STAIR', 'WORLD'];

      for (const word of currentWords) {
        expect(await service.isValidWord(word)).toBe(true);
      }
    });
  });

  describe('Integration with Existing Code', () => {
    it('should provide backward compatible API', async () => {
      // Test that we can replace the current functions seamlessly
      const { DictionaryService } = await import('./dictionary-service');
      const service = new DictionaryService();

      await service.initialize();

      // Should have the same interface as current word-list.ts functions
      expect(typeof service.isValidWord).toBe('function');
      expect(typeof service.getRandomWord).toBe('function');

      // Should return same types
      const isValid = await service.isValidWord('HOUSE');
      expect(typeof isValid).toBe('boolean');

      const randomWord = await service.getRandomWord();
      expect(typeof randomWord).toBe('string');
    });
  });
});