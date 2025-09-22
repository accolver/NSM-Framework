/**
 * Bloom Filter Manager
 * Manages bloom filter storage and retrieval through Blossom protocol
 */

import { BlossomClient, BlossomConfig, BlossomUploadResponse } from '../../../packages/nsm-client-sdk/src/blossom/BlossomClient';
import { BloomFilter } from './bloom-filter';
import { WordValidator } from './word-validator';

export interface NostrEvent {
  kind: number;
  content: string;
  tags: string[][];
  created_at: number;
  sig?: string;
  id?: string;
  pubkey?: string;
}

export interface BloomFilterUploadOptions {
  targetFalsePositiveRate?: number;
  maxSizeBytes?: number;
}

export class BloomFilterManager {
  private blossomClient: BlossomClient;
  private cache: Map<string, Uint8Array> = new Map();

  constructor(config: BlossomConfig) {
    this.blossomClient = new BlossomClient(config);
  }

  /**
   * Upload word list as optimized bloom filter to Blossom
   */
  async uploadWordList(
    words: string[],
    options: BloomFilterUploadOptions = {}
  ): Promise<BlossomUploadResponse> {
    const {
      targetFalsePositiveRate = 0.001, // 0.1%
      maxSizeBytes = 15000 // 15KB target
    } = options;

    // Create optimal bloom filter
    const bloomFilter = BloomFilter.createOptimal(words.length || 1, targetFalsePositiveRate);

    // Add all words
    words.forEach(word => bloomFilter.add(word));

    // Serialize filter
    const serializedFilter = bloomFilter.serialize();

    // Check size constraint
    if (serializedFilter.length > maxSizeBytes) {
      console.warn(
        `Bloom filter size (${serializedFilter.length} bytes) exceeds target (${maxSizeBytes} bytes)`
      );
    }

    // Upload with verification
    return await this.blossomClient.uploadWithVerification(serializedFilter);
  }

  /**
   * Download bloom filter by hash with local caching
   */
  async downloadBloomFilter(hash: string): Promise<Uint8Array> {
    // Check cache first
    if (this.cache.has(hash)) {
      return this.cache.get(hash)!;
    }

    // Download and verify from Blossom
    const base64Data = await this.blossomClient.downloadAndVerify(hash);

    // Decode from base64
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Cache for future use
    this.cache.set(hash, binaryData);

    return binaryData;
  }

  /**
   * Create NSM Definition Event with bloom filter reference
   */
  createDefinitionEvent(bloomFilterHash: string): NostrEvent {
    const event: NostrEvent = {
      kind: 1, // NSM Definition Event kind (using kind 1 for now)
      content: JSON.stringify({
        description: 'Wordle dictionary validation using bloom filter',
        version: '1.0.0',
        bloomFilter: {
          hash: bloomFilterHash,
          type: 'word-validation',
          falsePositiveRate: 0.001
        }
      }),
      tags: [
        ['blossom', bloomFilterHash],
        ['type', 'bloom-filter'],
        ['application', 'nsm-wordle'],
        ['size', '12500'], // Approximate size - would be filled in by upload response
        ['fp-rate', '0.001']
      ],
      created_at: Math.floor(Date.now() / 1000)
    };

    return event;
  }

  /**
   * Initialize word validator from Blossom hash
   */
  async createValidator(bloomFilterHash: string): Promise<WordValidator> {
    const filterData = await this.downloadBloomFilter(bloomFilterHash);
    const validator = new WordValidator();
    await validator.importFilter(filterData);
    return validator;
  }

  /**
   * Initialize word validator from word list and optionally upload
   */
  async createValidatorFromWords(
    words: string[],
    uploadToBlossom = false
  ): Promise<{ validator: WordValidator; hash?: string }> {
    const validator = new WordValidator();
    await validator.initialize(words);

    if (uploadToBlossom) {
      const uploadResult = await this.uploadWordList(words);
      return {
        validator,
        hash: uploadResult.hash
      };
    }

    return { validator };
  }

  /**
   * Clear local cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Calculate SHA-256 hash of data (helper method)
   */
  private async calculateSHA256(data: Uint8Array): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      // Browser environment
      const hashBuffer = await crypto.subtle.digest('SHA-256', data as BufferSource);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // Node.js environment - would need crypto module
      // For testing, return a mock hash
      return 'mock-sha256-hash';
    }
  }
}