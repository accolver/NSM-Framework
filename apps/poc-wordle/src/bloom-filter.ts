/**
 * Bloom Filter Implementation
 * Probabilistic data structure for efficient set membership testing
 * Optimized for ~10,000 5-letter words with 0.1% false positive rate
 */

export class BloomFilter {
  private bitArray: Uint8Array;
  public readonly size: number;
  public readonly hashCount: number;

  constructor(size: number, hashCount: number) {
    if (size <= 0) {
      throw new Error('Size must be positive');
    }
    if (hashCount <= 0) {
      throw new Error('Hash count must be positive');
    }

    this.size = size;
    this.hashCount = hashCount;
    // Convert bit size to byte size (8 bits per byte)
    const byteSize = Math.ceil(size / 8);
    this.bitArray = new Uint8Array(byteSize);
  }

  /**
   * Create bloom filter with optimal parameters for given constraints
   */
  static createOptimal(expectedItems: number, falsePositiveRate: number): BloomFilter {
    // Calculate optimal bit array size: m = -n * ln(p) / (ln(2)^2)
    const optimalSize = Math.ceil(-expectedItems * Math.log(falsePositiveRate) / (Math.log(2) ** 2));

    // Calculate optimal number of hash functions: k = (m/n) * ln(2)
    const optimalHashCount = Math.ceil((optimalSize / expectedItems) * Math.log(2));

    return new BloomFilter(optimalSize, Math.max(1, optimalHashCount));
  }

  /**
   * Add a word to the bloom filter
   */
  add(word: string): void {
    const normalizedWord = word.toUpperCase();

    for (let i = 0; i < this.hashCount; i++) {
      const hash = this.hash(normalizedWord, i);
      const bitIndex = hash % this.size;
      this.setBit(bitIndex);
    }
  }

  /**
   * Test if a word might be in the set
   * Returns true if possibly in set, false if definitely not in set
   */
  mightContain(word: string): boolean {
    const normalizedWord = word.toUpperCase();

    for (let i = 0; i < this.hashCount; i++) {
      const hash = this.hash(normalizedWord, i);
      const bitIndex = hash % this.size;
      if (!this.getBit(bitIndex)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Multiple hash functions using djb2 and sdbm with different seeds
   */
  private hash(input: string, seed: number): number {
    if (seed % 2 === 0) {
      // djb2 hash
      let hash = 5381 + seed * 7919; // Large prime for seed differentiation
      for (let i = 0; i < input.length; i++) {
        hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
      }
      return hash;
    } else {
      // sdbm hash
      let hash = seed * 65599; // Different starting value
      for (let i = 0; i < input.length; i++) {
        hash = (input.charCodeAt(i) + (hash << 6) + (hash << 16) - hash) >>> 0;
      }
      return hash;
    }
  }

  /**
   * Set bit at given index
   */
  private setBit(index: number): void {
    const byteIndex = Math.floor(index / 8);
    const bitIndex = index % 8;
    this.bitArray[byteIndex] |= (1 << bitIndex);
  }

  /**
   * Get bit at given index
   */
  private getBit(index: number): boolean {
    const byteIndex = Math.floor(index / 8);
    const bitIndex = index % 8;
    return (this.bitArray[byteIndex] & (1 << bitIndex)) !== 0;
  }

  /**
   * Serialize bloom filter to compact binary format
   * Format: [size:4bytes][hashCount:4bytes][metadata:4bytes][bitArray:variable]
   */
  serialize(): Uint8Array {
    const headerSize = 12; // 3 * 4 bytes for size, hashCount, and metadata
    const result = new Uint8Array(headerSize + this.bitArray.length);

    // Write header information
    const view = new DataView(result.buffer);
    view.setUint32(0, this.size, false); // big-endian for consistency
    view.setUint32(4, this.hashCount, false);
    view.setUint32(8, this.bitArray.length, false); // metadata: bit array byte length

    // Copy bit array
    result.set(this.bitArray, headerSize);

    return result;
  }

  /**
   * Deserialize bloom filter from binary data
   */
  static deserialize(data: Uint8Array): BloomFilter {
    if (data.length < 12) {
      throw new Error('Invalid serialized data: too short');
    }

    const view = new DataView(data.buffer, data.byteOffset);

    try {
      const size = view.getUint32(0, false);
      const hashCount = view.getUint32(4, false);
      const bitArrayLength = view.getUint32(8, false);

      if (data.length !== 12 + bitArrayLength) {
        throw new Error('Invalid serialized data: length mismatch');
      }

      const filter = new BloomFilter(size, hashCount);
      filter.bitArray.set(data.subarray(12));

      return filter;
    } catch (error) {
      throw new Error('Invalid serialized data: corrupt header');
    }
  }
}