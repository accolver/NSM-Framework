/**
 * Generate Word Filter
 * Creates a bloom filter from the word list for the Wordle game
 */

import { BloomFilter } from './bloom-filter';
import { WordValidator } from './word-validator';
import { WORD_LIST } from './word-list';

// Extended word list with more 5-letter words for better testing
const EXTENDED_WORD_LIST = [
  ...WORD_LIST,
  // Common 5-letter words to improve the dictionary
  'HELLO', 'WORLD', 'SPELL', 'CRANE', 'SLATE', 'ADIEU', 'FRIED', 'TEARS', 'RAISE', 'PROSE',
  'HOUSE', 'MOUSE', 'TOUGH', 'LIGHT', 'MIGHT', 'SIGHT', 'TIGHT', 'RIGHT', 'FIGHT', 'NIGHT',
  'PHONE', 'STONE', 'ALONE', 'CLONE', 'DRONE', 'PRONE', 'HORSE', 'NURSE', 'CURSE', 'PURSE',
  'BREAD', 'DREAM', 'STEAM', 'CREAM', 'SCREAM', 'BEACH', 'REACH', 'TEACH', 'PEACH', 'SPEAK',
  'BREAK', 'STEAK', 'SNEAK', 'CREAK', 'WREAK', 'SPEAR', 'SMEAR', 'CLEAR', 'SWEAR', 'YEARS',
  'TEARS', 'FEARS', 'GEARS', 'HEARS', 'BEARS', 'WEARS', 'PEARS', 'DEARS', 'NEARS', 'SEARS',
  'CLIMB', 'THUMB', 'PLUMB', 'CRUMB', 'DUMB', 'NUMB', 'COMB', 'TOMB', 'WOMB', 'BOMB',
  'FLAME', 'BLAME', 'SHAME', 'FRAME', 'GAME', 'NAME', 'SAME', 'FAME', 'CAME', 'TAME',
  'SMILE', 'WHILE', 'STYLE', 'TITLE', 'ABLE', 'TABLE', 'CABLE', 'STABLE', 'FABLE', 'MAPLE',
  'APPLE', 'AMPLE', 'SIMPLE', 'TEMPLE', 'SAMPLE', 'RUMPLE', 'PURPLE', 'CIRCLE', 'MIDDLE', 'LITTLE'
].filter(word => word.length === 5); // Ensure all words are 5 letters

export async function generateWordFilter(): Promise<{
  validator: WordValidator;
  serializedFilter: Uint8Array;
  stats: { size: number; hashCount: number; estimatedSize: number; wordCount: number };
}> {
  console.log(`Generating bloom filter for ${EXTENDED_WORD_LIST.length} words...`);

  // Create validator with extended word list
  const validator = new WordValidator();
  await validator.initialize(EXTENDED_WORD_LIST);

  // Export the filter
  const serializedFilter = validator.exportFilter();
  const stats = {
    ...validator.getStats(),
    wordCount: EXTENDED_WORD_LIST.length
  };

  console.log('Bloom filter generated:');
  console.log(`- Word count: ${stats.wordCount}`);
  console.log(`- Filter size: ${stats.size} bits`);
  console.log(`- Hash count: ${stats.hashCount}`);
  console.log(`- Serialized size: ${stats.estimatedSize} bytes (~${Math.round(stats.estimatedSize / 1024)}KB)`);

  return {
    validator,
    serializedFilter,
    stats
  };
}

export async function testWordFilter(): Promise<void> {
  const { validator, serializedFilter, stats } = await generateWordFilter();

  console.log('\nTesting word validation:');

  // Test valid words
  const validWords = ['ABOUT', 'HELLO', 'WORLD', 'SPELL', 'CRANE'];
  console.log('Valid words:');
  validWords.forEach(word => {
    const isValid = validator.isValid(word);
    console.log(`  ${word}: ${isValid ? '✅' : '❌'}`);
  });

  // Test invalid words
  const invalidWords = ['XQZPT', 'AAAAA', 'ZZZZZ', 'QWXYZ'];
  console.log('Invalid words:');
  invalidWords.forEach(word => {
    const isValid = validator.isValid(word);
    console.log(`  ${word}: ${isValid ? '❌' : '✅'}`);
  });

  // Test filter import/export
  console.log('\nTesting serialization:');
  const newValidator = new WordValidator();
  await newValidator.importFilter(serializedFilter);

  const allValid = validWords.every(word => newValidator.isValid(word));
  const allInvalid = invalidWords.every(word => !newValidator.isValid(word));

  console.log(`  Import/export: ${allValid && allInvalid ? '✅' : '❌'}`);

  console.log('\nBloom filter generation complete!');
}

// Run if this file is executed directly
if (import.meta.main) {
  testWordFilter().catch(console.error);
}