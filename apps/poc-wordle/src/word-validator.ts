/**
 * Word Validator
 * High-level interface for word validation using bloom filter
 */

import { BloomFilter } from './bloom-filter';

export class WordValidator {
  private bloomFilter?: BloomFilter;
  private wordCount: number = 0;

  /**
   * Initialize validator with word list
   */
  async initialize(words: string[]): Promise<void> {
    // Create optimal bloom filter for word list with 0.1% false positive rate
    this.bloomFilter = BloomFilter.createOptimal(words.length || 1, 0.001);

    // Add all words to the filter
    words.forEach(word => {
      this.bloomFilter!.add(word);
    });

    this.wordCount = words.length;
  }

  /**
   * Import pre-built bloom filter from serialized data
   */
  async importFilter(data: Uint8Array): Promise<void> {
    this.bloomFilter = BloomFilter.deserialize(data);
    // We don't know the exact word count, but we can estimate
    // This is mainly used for display purposes
    this.wordCount = -1; // Unknown count
  }

  /**
   * Check if validator is ready for use
   */
  isInitialized(): boolean {
    return this.bloomFilter !== undefined;
  }

  /**
   * Get the number of words in the validator (if known)
   */
  getWordCount(): number {
    return this.wordCount;
  }

  /**
   * Validate if a word is in the dictionary
   * Returns true for valid words, false for invalid words
   */
  isValid(word: string): boolean {
    if (!this.bloomFilter) {
      throw new Error('Validator not initialized. Call initialize() or importFilter() first.');
    }

    // Validate word format
    if (!word || typeof word !== 'string') {
      return false;
    }

    // Must be exactly 5 letters
    if (word.length !== 5) {
      return false;
    }

    // Must contain only letters
    if (!/^[a-zA-Z]+$/.test(word)) {
      return false;
    }

    // Check against bloom filter
    return this.bloomFilter.mightContain(word);
  }

  /**
   * Export the bloom filter as serialized data
   */
  exportFilter(): Uint8Array {
    if (!this.bloomFilter) {
      throw new Error('Validator not initialized');
    }

    return this.bloomFilter.serialize();
  }

  /**
   * Get filter statistics
   */
  getStats(): { size: number; hashCount: number; estimatedSize: number } {
    if (!this.bloomFilter) {
      throw new Error('Validator not initialized');
    }

    const serialized = this.bloomFilter.serialize();
    return {
      size: this.bloomFilter.size,
      hashCount: this.bloomFilter.hashCount,
      estimatedSize: serialized.length
    };
  }
}