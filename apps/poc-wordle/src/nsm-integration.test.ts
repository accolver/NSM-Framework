/**
 * NSM Integration Tests for Wordle Application
 * Task 5.3: NSM Client SDK Integration
 *
 * TDD RED PHASE - Write failing tests for essential NSM functionality:
 * 1. NSM Definition Event creation
 * 2. React app NSM client initialization
 * 3. Interaction event publishing
 * 4. State update subscription
 * 5. Multi-instance state synchronization
 */

import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { wordleMachine } from './wordle-machine';
import { createActor } from 'xstate';
import { createWordleNSMDefinition, WordleNSMConnector } from './nsm-integration';
import { MockNSMClient } from './__mocks__/nsm-mocks';

describe('NSM Integration for Wordle', () => {
  let nsmClient: MockNSMClient;
  let wordleActor: any;

  beforeEach(() => {
    // Initialize test NSM client with mock implementation
    nsmClient = new MockNSMClient({
      relayUrls: ['wss://relay.damus.io'],
      autoConnect: false,
      privateKey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    });

    // Create Wordle actor for testing
    wordleActor = createActor(wordleMachine);
    wordleActor.start();
  });

  afterEach(() => {
    if (nsmClient && typeof nsmClient.disconnect === 'function') {
      nsmClient.disconnect();
    }
    if (wordleActor) {
      wordleActor.stop();
    }
  });

  // TEST 1: NSM Definition Event Creation
  it('should create NSM Definition Event for Wordle application', async () => {
    // This test will fail until we implement createWordleNSMDefinition
    const definition = await createWordleNSMDefinition();

    expect(definition).toBeDefined();
    expect(definition.identifier).toBe('wordle-game');
    expect(definition.name).toBe('Wordle Game');
    expect(definition.engine).toBe('xstate');
    expect(definition.initialState).toBeDefined();
    expect(definition.stateSchema).toBeDefined();
    expect(definition.interactionSchema).toBeDefined();
  });

  // TEST 2: React App NSM Client Initialization
  it('should initialize NSM client and connect to Wordle application', async () => {
    // This test will fail until we implement WordleNSMConnector
    const connector = new WordleNSMConnector(nsmClient as any, wordleActor);

    await connector.initialize();

    expect(connector.isConnected).toBe(true);
    expect(connector.applicationId).toBe('wordle-game');
  });

  // TEST 3: Interaction Event Publishing
  it('should publish interaction events when user makes moves', async () => {
    // This test will fail until we implement interaction publishing
    const connector = new WordleNSMConnector(nsmClient as any, wordleActor);

    await connector.initialize();

    // Simulate keypress
    wordleActor.send({ type: 'KEYPRESS', letter: 'A' });

    // Check that the mock was called
    const publishMock = nsmClient.getPublishInteractionMock();
    expect(publishMock).toHaveBeenCalledWith({
      applicationId: 'wordle-game',
      action: 'KEYPRESS',
      payload: { letter: 'A' }
    });
  });

  // TEST 4: State Update Subscription
  it('should subscribe to state updates and synchronize game state', async () => {
    // This test will fail until we implement state subscription
    const connector = new WordleNSMConnector(nsmClient as any, wordleActor);

    await connector.initialize();

    // Test that we can set the current guess via state update
    const mockStateUpdate = {
      currentGuess: 'HELLO'
    };

    connector.onStateUpdate(mockStateUpdate);

    // Check that the current guess was updated
    expect(wordleActor.getSnapshot().context.currentGuess).toBe('HELLO');

    // For a more comprehensive test, verify the connector can handle state updates
    expect(connector.isConnected).toBe(true);
  });

  // TEST 5: Multi-instance State Synchronization
  it('should synchronize state between multiple Wordle instances', async () => {
    // This test will fail until we implement multi-instance sync
    const client1 = new MockNSMClient({ relayUrls: ['wss://relay.damus.io'], autoConnect: false });
    const client2 = new MockNSMClient({ relayUrls: ['wss://relay.damus.io'], autoConnect: false });

    const actor1 = createActor(wordleMachine);
    const actor2 = createActor(wordleMachine);

    const connector1 = new WordleNSMConnector(client1 as any, actor1);
    const connector2 = new WordleNSMConnector(client2 as any, actor2);

    await Promise.all([
      connector1.initialize(),
      connector2.initialize()
    ]);

    // Make move in instance 1
    actor1.send({ type: 'KEYPRESS', letter: 'T' });
    actor1.send({ type: 'KEYPRESS', letter: 'E' });
    actor1.send({ type: 'KEYPRESS', letter: 'S' });
    actor1.send({ type: 'KEYPRESS', letter: 'T' });
    actor1.send({ type: 'KEYPRESS', letter: 'S' });
    actor1.send({ type: 'SUBMIT_GUESS' });

    // Wait for synchronization
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify instance 2 received the state
    const state1 = actor1.getSnapshot();
    const state2 = actor2.getSnapshot();

    expect(state2.context.guesses).toEqual(state1.context.guesses);
    expect(state2.context.attemptNumber).toBe(state1.context.attemptNumber);
  });
});

// Implementation moved to nsm-integration.ts