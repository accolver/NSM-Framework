// TDD Tests for NSM Integration with Bundled Dictionary
// Tests deterministic word selection for NSM compliance

import { describe, it, expect, beforeEach } from 'bun:test';

/**
 * Test suite for NSM integration with bundled dictionary
 * Ensures deterministic behavior for network state machine compliance
 */
describe('NSM Bundled Dictionary Integration', () => {
  describe('Deterministic Word Selection for NSM', () => {
    it('should generate deterministic hidden words for NSM initial state', async () => {
      const { BundledDictionary } = await import('./bundled-dictionary');
      const { createWordleNSMDefinition } = await import('./nsm-integration');

      const dictionary = new BundledDictionary();

      // Test that different applications get different words but consistently
      const gameId1 = 'nsm-app-1';
      const gameId2 = 'nsm-app-2';

      const word1a = dictionary.getWordForGame(gameId1);
      const word1b = dictionary.getWordForGame(gameId1);
      expect(word1a).toBe(word1b); // Same game ID = same word

      const word2a = dictionary.getWordForGame(gameId2);
      const word2b = dictionary.getWordForGame(gameId2);
      expect(word2a).toBe(word2b); // Same game ID = same word

      // Different game IDs should likely produce different words
      // (could be same due to hash collision, but unlikely)
      expect(word1a === word2a).toBe(false); // Different game IDs typically produce different words
    });

    it('should create NSM definition with deterministic hidden word', async () => {
      const { createWordleNSMDefinitionWithGameId } = await import('./nsm-integration');

      // This function should be created to accept a game ID
      const definition1a = await createWordleNSMDefinitionWithGameId('test-game-1');
      const definition1b = await createWordleNSMDefinitionWithGameId('test-game-1');

      // Same game ID should produce same initial state
      expect(definition1a.initialState.context.hiddenWord).toBe(definition1b.initialState.context.hiddenWord);

      const definition2 = await createWordleNSMDefinitionWithGameId('test-game-2');

      // Different game IDs should produce different words (most of the time)
      expect(definition1a.initialState.context.hiddenWord).not.toBe(definition2.initialState.context.hiddenWord);
    });

    it('should validate all deterministic words are in bundled dictionary', async () => {
      const { BundledDictionary } = await import('./bundled-dictionary');
      const dictionary = new BundledDictionary();

      // Test a range of game IDs to ensure all generated words are valid
      const gameIds = [
        'game-1', 'game-2', 'game-3', 'test-app', 'prod-app',
        'nsm-wordle-123', 'user-session-456', 'multiplayer-789'
      ];

      for (const gameId of gameIds) {
        const word = dictionary.getWordForGame(gameId);
        expect(dictionary.isValidWord(word)).toBe(true);
        expect(word).toMatch(/^[A-Z]{5}$/);
      }
    });

    it('should handle edge cases in game ID generation', async () => {
      const { BundledDictionary } = await import('./bundled-dictionary');
      const dictionary = new BundledDictionary();

      // Test edge cases
      const edgeCases = [
        'a', // Short ID
        'very-long-game-id-with-many-characters-that-should-still-work',
        '12345', // Numeric
        'special-chars-!@#$%',
        'unicode-chars-café-naïve',
        ''
      ];

      for (const gameId of edgeCases) {
        if (gameId === '') {
          // Empty string should throw error
          expect(() => dictionary.getWordForGame(gameId)).toThrow();
        } else {
          const word = dictionary.getWordForGame(gameId);
          expect(dictionary.isValidWord(word)).toBe(true);
          expect(word).toMatch(/^[A-Z]{5}$/);
        }
      }
    });
  });

  describe('Performance Requirements for NSM', () => {
    it('should provide sub-100ms initialization for NSM compliance', async () => {
      const startTime = performance.now();

      const { BundledDictionary } = await import('./bundled-dictionary');
      const { createWordleNSMDefinitionWithGameId } = await import('./nsm-integration');

      const dictionary = new BundledDictionary();
      const definition = await createWordleNSMDefinitionWithGameId('perf-test');

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // Sub-100ms requirement

      // Verify the result is valid
      expect(definition.initialState.context.hiddenWord).toMatch(/^[A-Z]{5}$/);
      expect(dictionary.isValidWord(definition.initialState.context.hiddenWord)).toBe(true);
    });

    it('should provide fast word selection for real-time NSM updates', async () => {
      const { BundledDictionary } = await import('./bundled-dictionary');
      const dictionary = new BundledDictionary();

      // Test multiple rapid selections (simulating real-time NSM updates)
      const startTime = performance.now();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const word = dictionary.getWordForGame(`game-${i}`);
        expect(word).toMatch(/^[A-Z]{5}$/);
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;
      expect(avgTime).toBeLessThan(1); // Sub-1ms per selection
    });
  });

  describe('Backward Compatibility with Existing NSM', () => {
    it('should maintain compatibility with existing NSM definition function', async () => {
      const { createWordleNSMDefinition } = await import('./nsm-integration');

      // Original function should still work (using fallback)
      const definition = await createWordleNSMDefinition();

      expect(definition).toBeDefined();
      expect(definition.identifier).toBe('wordle-game');
      expect(definition.initialState.context.hiddenWord).toMatch(/^[A-Z]{5}$/);
    });

    it('should work with existing wordle machine integration', async () => {
      const { BundledDictionary } = await import('./bundled-dictionary');
      const { createWordleMachine } = await import('./wordle-machine');
      const { createActor } = await import('xstate');

      const dictionary = new BundledDictionary();
      const hiddenWord = dictionary.getWordForGame('integration-test');

      // Create machine with bundled dictionary word
      const machine = createWordleMachine(hiddenWord);

      const actor = createActor(machine);
      actor.start();

      const snapshot = actor.getSnapshot();
      expect(snapshot.context.hiddenWord).toBe(hiddenWord);
      expect(dictionary.isValidWord(snapshot.context.hiddenWord)).toBe(true);
    });
  });

  describe('NSM Network Compliance', () => {
    it('should ensure consistent state across different NSM nodes', async () => {
      const { BundledDictionary } = await import('./bundled-dictionary');

      // Simulate multiple NSM nodes using same game ID
      const gameId = 'nsm-network-test';

      // Create multiple dictionary instances (simulating different nodes)
      const node1 = new BundledDictionary();
      const node2 = new BundledDictionary();
      const node3 = new BundledDictionary();

      const word1 = node1.getWordForGame(gameId);
      const word2 = node2.getWordForGame(gameId);
      const word3 = node3.getWordForGame(gameId);

      // All nodes must produce identical results for NSM compliance
      expect(word1).toBe(word2);
      expect(word2).toBe(word3);
      expect(word1).toBe(word3);
    });

    it('should work offline without network dependencies', async () => {
      // Simulate offline environment
      const originalFetch = global.fetch;
      const originalNavigator = global.navigator;

      global.fetch = undefined as any;
      (global as any).navigator = { onLine: false };

      try {
        const { BundledDictionary } = await import('./bundled-dictionary');
        const { createWordleNSMDefinitionWithGameId } = await import('./nsm-integration');

        const dictionary = new BundledDictionary();
        const definition = await createWordleNSMDefinitionWithGameId('offline-test');

        // Should work completely offline
        expect(dictionary.isValidWord('HOUSE')).toBe(true);
        expect(definition.initialState.context.hiddenWord).toMatch(/^[A-Z]{5}$/);
        expect(dictionary.isValidWord(definition.initialState.context.hiddenWord)).toBe(true);

      } finally {
        global.fetch = originalFetch;
        global.navigator = originalNavigator;
      }
    });
  });
});