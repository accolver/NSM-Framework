/**
 * Bloom Filter Tests
 * Testing bloom filter implementation for word validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BloomFilter } from '../bloom-filter';

describe('BloomFilter', () => {
  let bloomFilter: BloomFilter;
  const testWords = ['ABOUT', 'ABOVE', 'ACTOR', 'ACUTE', 'ADMIT'];

  beforeEach(() => {
    bloomFilter = new BloomFilter(1000, 3); // Small size for testing
  });

  describe('Construction and Configuration', () => {
    it('should create a bloom filter with specified size and hash count', () => {
      expect(bloomFilter.size).toBe(1000);
      expect(bloomFilter.hashCount).toBe(3);
    });

    it('should throw error for invalid parameters', () => {
      expect(() => new BloomFilter(0, 3)).toThrow('Size must be positive');
      expect(() => new BloomFilter(100, 0)).toThrow('Hash count must be positive');
    });

    it('should calculate optimal parameters for target false positive rate', () => {
      const filter = BloomFilter.createOptimal(10000, 0.001);
      expect(filter.size).toBeGreaterThan(0);
      expect(filter.hashCount).toBeGreaterThan(0);
      // For 10k items with 0.1% false positive rate, should be ~144k bits (~18KB)
      expect(filter.size).toBeGreaterThan(100000);
      expect(filter.size).toBeLessThan(200000);
    });
  });

  describe('Word Addition and Testing', () => {
    it('should add words and test membership correctly', () => {
      bloomFilter.add('HELLO');
      expect(bloomFilter.mightContain('HELLO')).toBe(true);
      expect(bloomFilter.mightContain('WORLD')).toBe(false);
    });

    it('should handle multiple words', () => {
      testWords.forEach(word => bloomFilter.add(word));
      testWords.forEach(word => {
        expect(bloomFilter.mightContain(word)).toBe(true);
      });
    });

    it('should be case insensitive', () => {
      bloomFilter.add('HELLO');
      expect(bloomFilter.mightContain('hello')).toBe(true);
      expect(bloomFilter.mightContain('Hello')).toBe(true);
      expect(bloomFilter.mightContain('HELLO')).toBe(true);
    });

    it('should handle empty string', () => {
      bloomFilter.add('');
      expect(bloomFilter.mightContain('')).toBe(true);
    });
  });

  describe('Serialization and Deserialization', () => {
    beforeEach(() => {
      testWords.forEach(word => bloomFilter.add(word));
    });

    it('should serialize to compact binary format', () => {
      const serialized = bloomFilter.serialize();
      expect(serialized).toBeInstanceOf(Uint8Array);
      // Should include metadata + bit array
      expect(serialized.length).toBeGreaterThan(12); // metadata + some data
    });

    it('should deserialize correctly and maintain functionality', () => {
      const serialized = bloomFilter.serialize();
      const deserialized = BloomFilter.deserialize(serialized);

      expect(deserialized.size).toBe(bloomFilter.size);
      expect(deserialized.hashCount).toBe(bloomFilter.hashCount);

      testWords.forEach(word => {
        expect(deserialized.mightContain(word)).toBe(true);
      });
    });

    it('should handle empty bloom filter serialization', () => {
      const emptyFilter = new BloomFilter(100, 2);
      const serialized = emptyFilter.serialize();
      const deserialized = BloomFilter.deserialize(serialized);

      expect(deserialized.size).toBe(100);
      expect(deserialized.hashCount).toBe(2);
      expect(deserialized.mightContain('HELLO')).toBe(false);
    });

    it('should throw error on invalid serialized data', () => {
      const invalidData = new Uint8Array([1, 2, 3]);
      expect(() => BloomFilter.deserialize(invalidData)).toThrow('Invalid serialized data');
    });
  });

  describe('Hash Functions', () => {
    it('should generate consistent hashes for same input', () => {
      const hash1 = (bloomFilter as any).hash('HELLO', 0);
      const hash2 = (bloomFilter as any).hash('HELLO', 0);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different seeds', () => {
      const hash1 = (bloomFilter as any).hash('HELLO', 0);
      const hash2 = (bloomFilter as any).hash('HELLO', 1);
      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = (bloomFilter as any).hash('HELLO', 0);
      const hash2 = (bloomFilter as any).hash('WORLD', 0);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('False Positive Rate', () => {
    it('should achieve target false positive rate for optimal configuration', () => {
      const wordCount = 1000;
      const targetFpRate = 0.01; // 1%
      const filter = BloomFilter.createOptimal(wordCount, targetFpRate);

      // Add test words
      const words: string[] = [];
      for (let i = 0; i < wordCount; i++) {
        const word = `WORD${i.toString().padStart(3, '0')}`;
        words.push(word);
        filter.add(word);
      }

      // Test false positives with different words
      let falsePositives = 0;
      const testCount = 1000;
      for (let i = 0; i < testCount; i++) {
        const testWord = `TEST${i.toString().padStart(3, '0')}`;
        if (filter.mightContain(testWord)) {
          falsePositives++;
        }
      }

      const actualFpRate = falsePositives / testCount;
      // Allow some margin due to randomness
      expect(actualFpRate).toBeLessThan(targetFpRate * 3);
    });
  });
});