// Dynamic Dictionary Service for Wordle
// Provides dictionary-based word validation with caching and fallback

import { WORD_LIST } from './word-list';

// Cache interface
interface DictionaryCache {
  words: string[];
  timestamp: number;
  version: string;
}

// Dictionary sources configuration
interface DictionarySource {
  name: string;
  url: string;
  transform: (data: any) => string[];
  priority: number;
}

export class DictionaryService {
  private words: Set<string> = new Set();
  private isInitialized = false;
  private readonly CACHE_KEY = 'wordle-dictionary-cache';
  private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly CURRENT_VERSION = '1.0.0';

  // Dictionary sources (in priority order)
  private readonly dictionarySources: DictionarySource[] = [
    {
      name: 'Free Dictionary API',
      url: 'https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-usa-no-swears.txt',
      transform: (text: string) => this.filterFiveLetterWords(text.split('\n')),
      priority: 1
    },
    {
      name: 'SOWPODS Dictionary',
      url: 'https://raw.githubusercontent.com/redbo/scrabble/master/dictionary.txt',
      transform: (text: string) => this.filterFiveLetterWords(text.split('\n')),
      priority: 2
    }
  ];

  /**
   * Initialize the dictionary service
   * Loads from cache if available, otherwise fetches from dictionary sources
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Try to load from cache first
      const cached = this.loadFromCache();
      if (cached && this.isCacheValid(cached)) {
        this.words = new Set(cached.words);
        this.isInitialized = true;
        return;
      }

      // Cache is invalid or doesn't exist, fetch from sources
      await this.fetchFromSources();

    } catch (error) {
      console.warn('Dictionary service initialization failed, using fallback:', error);
      this.loadFallbackWords();
    }

    this.isInitialized = true;
  }

  /**
   * Check if a word is valid (5 letters and in dictionary)
   */
  async isValidWord(word: string): Promise<boolean> {
    await this.initialize();

    const normalizedWord = word.toUpperCase().trim();

    // Must be exactly 5 letters
    if (normalizedWord.length !== 5) {
      return false;
    }

    // Must contain only letters
    if (!/^[A-Z]{5}$/.test(normalizedWord)) {
      return false;
    }

    return this.words.has(normalizedWord);
  }

  /**
   * Get a random valid word from the dictionary
   */
  async getRandomWord(): Promise<string> {
    await this.initialize();

    const wordsArray = Array.from(this.words);
    if (wordsArray.length === 0) {
      throw new Error('No words available in dictionary');
    }

    const randomIndex = Math.floor(Math.random() * wordsArray.length);
    return wordsArray[randomIndex];
  }

  /**
   * Get the current word count
   */
  async getWordCount(): Promise<number> {
    await this.initialize();
    return this.words.size;
  }

  /**
   * Force refresh the dictionary cache
   */
  async refreshCache(): Promise<void> {
    this.clearCache();
    this.isInitialized = false;
    await this.initialize();
  }

  // Private methods

  private loadFromCache(): DictionaryCache | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) {
        return null;
      }

      return JSON.parse(cached) as DictionaryCache;
    } catch (error) {
      console.warn('Failed to load dictionary cache:', error);
      return null;
    }
  }

  private isCacheValid(cache: DictionaryCache): boolean {
    // Check version
    if (cache.version !== this.CURRENT_VERSION) {
      return false;
    }

    // Check timestamp
    const age = Date.now() - cache.timestamp;
    if (age > this.CACHE_DURATION) {
      return false;
    }

    // Check if we have words
    if (!cache.words || cache.words.length === 0) {
      return false;
    }

    return true;
  }

  private saveToCache(words: string[]): void {
    try {
      const cache: DictionaryCache = {
        words,
        timestamp: Date.now(),
        version: this.CURRENT_VERSION
      };

      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.warn('Failed to save dictionary cache:', error);
    }
  }

  private clearCache(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
    } catch (error) {
      console.warn('Failed to clear dictionary cache:', error);
    }
  }

  private async fetchFromSources(): Promise<void> {
    let allWords: string[] = [];

    // Try each source in priority order
    for (const source of this.dictionarySources) {
      try {
        console.log(`Fetching words from ${source.name}...`);

        const response = await fetch(source.url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const text = await response.text();
        const words = source.transform(text);

        if (words.length > 0) {
          allWords = [...allWords, ...words];
          console.log(`Successfully loaded ${words.length} words from ${source.name}`);
          break; // Use first successful source
        }
      } catch (error) {
        console.warn(`Failed to fetch from ${source.name}:`, error);
        continue; // Try next source
      }
    }

    // If we got words from any source, use them
    if (allWords.length > 0) {
      // Combine with fallback words to ensure compatibility
      const combinedWords = new Set([...allWords, ...WORD_LIST]);
      const finalWords = Array.from(combinedWords);

      this.words = new Set(finalWords);
      this.saveToCache(finalWords);

      console.log(`Dictionary initialized with ${finalWords.length} words`);
    } else {
      // No sources worked, use fallback
      throw new Error('All dictionary sources failed');
    }
  }

  private filterFiveLetterWords(words: string[]): string[] {
    return words
      .map(word => word.toUpperCase().trim())
      .filter(word => {
        // Must be exactly 5 letters and contain only letters
        return /^[A-Z]{5}$/.test(word);
      })
      .filter((word, index, array) => {
        // Remove duplicates
        return array.indexOf(word) === index;
      });
  }

  private loadFallbackWords(): void {
    // Use the existing hardcoded word list as fallback
    this.words = new Set(WORD_LIST);
    console.log(`Using fallback word list with ${WORD_LIST.length} words`);
  }
}

// Create a singleton instance for the application
export const dictionaryService = new DictionaryService();

// Backward compatibility functions that match the existing API
export const isValidWord = async (word: string): Promise<boolean> => {
  return dictionaryService.isValidWord(word);
};

export const getRandomWord = async (): Promise<string> => {
  return dictionaryService.getRandomWord();
};

// Synchronous versions for immediate backward compatibility
// These will use the current hardcoded list until the async service is initialized
export const isValidWordSync = (word: string): boolean => {
  return WORD_LIST.includes(word.toUpperCase());
};

export const getRandomWordSync = (): string => {
  const randomIndex = Math.floor(Math.random() * WORD_LIST.length);
  return WORD_LIST[randomIndex];
};