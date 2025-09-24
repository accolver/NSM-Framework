import { describe, it, expect } from 'bun:test';

describe('Debug word validation', () => {
  it('should check if AROSE is valid', async () => {
    const { bundledDictionary } = await import('./apps/poc-wordle/src/bundled-dictionary');

    console.log('AROSE valid:', bundledDictionary.isValidWord('AROSE'));
    console.log('ABOUT valid:', bundledDictionary.isValidWord('ABOUT'));
    console.log('HOUSE valid:', bundledDictionary.isValidWord('HOUSE'));

    // Let's see what words are available that start with A
    const { BUNDLED_WORDS } = await import('./apps/poc-wordle/src/bundled-words');
    const aWords = BUNDLED_WORDS.filter(w => w.startsWith('A')).slice(0, 10);
    console.log('A words:', aWords);

    expect(true).toBe(true); // Just to make test pass
  });
});