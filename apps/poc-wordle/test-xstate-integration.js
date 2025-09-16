/**
 * Quick integration test for XState machine functionality
 */

import { createActor } from 'xstate';
import { wordleMachine } from './src/wordle-machine.js';

const testXStateIntegration = () => {
  console.log('🧪 Testing XState machine integration...');

  try {
    // Create and start actor
    const actor = createActor(wordleMachine);
    actor.start();

    console.log('✅ Actor created and started');
    console.log('Initial state:', actor.getSnapshot().value);
    console.log('Initial context:', actor.getSnapshot().context);

    // Test letter input
    console.log('\n📝 Testing letter input...');
    actor.send({ type: 'KEYPRESS', letter: 'H' });

    const afterH = actor.getSnapshot();
    console.log('After "H":', afterH.context.currentGuess);

    actor.send({ type: 'KEYPRESS', letter: 'E' });
    const afterE = actor.getSnapshot();
    console.log('After "E":', afterE.context.currentGuess);

    actor.send({ type: 'KEYPRESS', letter: 'L' });
    const afterL = actor.getSnapshot();
    console.log('After "L":', afterL.context.currentGuess);

    // Test backspace
    console.log('\n⌫ Testing backspace...');
    actor.send({ type: 'BACKSPACE' });
    const afterBackspace = actor.getSnapshot();
    console.log('After backspace:', afterBackspace.context.currentGuess);

    // Verify state changes
    if (afterH.context.currentGuess === 'H' &&
        afterE.context.currentGuess === 'HE' &&
        afterL.context.currentGuess === 'HEL' &&
        afterBackspace.context.currentGuess === 'HE') {
      console.log('\n✅ XState machine working correctly!');
      console.log('✅ Letter input and backspace functionality verified');
    } else {
      console.log('\n❌ XState machine state updates failed');
    }

    actor.stop();
    console.log('✅ Actor stopped cleanly');

  } catch (error) {
    console.log('❌ Error testing XState integration:', error.message);
  }
};

testXStateIntegration();