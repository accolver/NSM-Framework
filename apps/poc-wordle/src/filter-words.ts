// Script to filter and validate the bundled word list
// Ensures all words are exactly 5 letters and contain only letters

import { BUNDLED_WORDS } from './bundled-dictionary';

const validWords = BUNDLED_WORDS.filter(word => {
  // Must be exactly 5 letters
  if (word.length !== 5) {
    console.log(`Invalid length: "${word}" (${word.length} letters)`);
    return false;
  }

  // Must contain only letters
  if (!/^[A-Z]{5}$/.test(word)) {
    console.log(`Invalid format: "${word}"`);
    return false;
  }

  return true;
});

console.log(`Original words: ${BUNDLED_WORDS.length}`);
console.log(`Valid words: ${validWords.length}`);
console.log(`Filtered out: ${BUNDLED_WORDS.length - validWords.length}`);

// Export the filtered list
export const FILTERED_WORDS = validWords;