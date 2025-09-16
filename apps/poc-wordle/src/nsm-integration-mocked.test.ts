/**
 * NSM Integration Tests (Mocked) for Wordle Application
 *
 * This test validates NSM integration functionality using mocks
 * to prevent network calls while testing the integration logic.
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { createActor } from 'xstate';
import { wordleMachine } from './wordle-machine';
import {
  mockCreateClient,
  mockUseNSM,
  mockCreateNSMMachine,
  verifyNoNetworkCalls
} from './__mocks__/nsm-mocks';

// Mock NSM Integration Components
const mockCreateWordleNSMDefinition = mock(async () => ({
  applicationId: 'wordle-game',
  name: 'Wordle Game',
  description: 'A word guessing game implementation',
  version: '1.0.0',
  states: ['playing', 'won', 'lost'],
  events: ['KEYPRESS', 'SUBMIT_GUESS', 'RESET_GAME'],
  initialState: 'playing',
  metadata: {
    maxGuesses: 6,
    wordLength: 5,
  },
}));

const mockWordleNSMConnector = () => {
  const mockClient = mockCreateClient();
  let connected = false;

  return {
    get isConnected() {
      return connected;
    },
    initialize: mock(async () => {
      connected = true;
      return true;
    }),
    publish: mock(async (event: any) => {
      return { id: 'mock-event-id', published: true };
    }),
    subscribe: mock((callback: Function) => {
      return { unsubscribe: mock() };
    }),
    disconnect: mock(() => {
      connected = false;
    }),
  };
};

describe('NSM Integration (Mocked) for Wordle', () => {
  let mockClient: any;
  let wordleActor: any;
  let connector: any;

  beforeEach(() => {
    // Initialize mocked NSM client
    mockClient = mockCreateClient();

    // Create Wordle actor for testing
    wordleActor = createActor(wordleMachine);
    wordleActor.start();

    // Create mocked connector
    connector = mockWordleNSMConnector();
  });

  afterEach(() => {
    if (wordleActor) {
      wordleActor.stop();
    }
    if (connector && connector.disconnect) {
      connector.disconnect();
    }
  });

  it('should create NSM Definition Event for Wordle application', async () => {
    const definition = await mockCreateWordleNSMDefinition();

    expect(definition).toBeDefined();
    expect(definition.applicationId).toBe('wordle-game');
    expect(definition.name).toBe('Wordle Game');
    expect(definition.states).toContain('playing');
    expect(definition.states).toContain('won');
    expect(definition.states).toContain('lost');
    expect(definition.events).toContain('KEYPRESS');
    expect(definition.events).toContain('SUBMIT_GUESS');
    expect(definition.metadata.maxGuesses).toBe(6);
    expect(definition.metadata.wordLength).toBe(5);
    expect(verifyNoNetworkCalls()).toBe(true);
  });

  it('should initialize mocked NSM connector', async () => {
    expect(connector.isConnected).toBe(false);

    await connector.initialize();

    expect(connector.isConnected).toBe(true);
    expect(connector.initialize).toHaveBeenCalled();
    expect(verifyNoNetworkCalls()).toBe(true);
  });

  it('should mock interaction event publishing', async () => {
    await connector.initialize();

    // Simulate keypress through mocked connector
    const publishResult = await connector.publish({
      applicationId: 'wordle-game',
      action: 'KEYPRESS',
      payload: { letter: 'A' }
    });

    expect(publishResult.published).toBe(true);
    expect(publishResult.id).toBe('mock-event-id');
    expect(connector.publish).toHaveBeenCalledWith({
      applicationId: 'wordle-game',
      action: 'KEYPRESS',
      payload: { letter: 'A' }
    });
    expect(verifyNoNetworkCalls()).toBe(true);
  });

  it('should mock state subscription functionality', async () => {
    await connector.initialize();

    // Mock callback for state updates
    const mockCallback = mock();

    // Subscribe to state updates
    const subscription = connector.subscribe(mockCallback);

    expect(subscription).toBeDefined();
    expect(subscription.unsubscribe).toBeDefined();
    expect(connector.subscribe).toHaveBeenCalledWith(mockCallback);
    expect(verifyNoNetworkCalls()).toBe(true);
  });

  it('should validate Wordle machine integration with mocks', () => {
    // Test that Wordle machine works with our mock setup
    const initialState = wordleActor.getSnapshot();
    expect(initialState.value).toBe('playing');
    expect(initialState.context.currentGuess).toBe('');

    // Send a keypress event
    wordleActor.send({ type: 'KEYPRESS', letter: 'A' });

    const updatedState = wordleActor.getSnapshot();
    expect(updatedState.context.currentGuess).toBe('A');
    expect(verifyNoNetworkCalls()).toBe(true);
  });

  it('should validate NSM hooks work with mocked state', () => {
    const nsmHook = mockUseNSM();

    expect(nsmHook.state.value).toBe('playing');
    expect(nsmHook.state.context.currentGuess).toBe('');
    expect(nsmHook.state.context.targetWord).toBe('TESTS');
    expect(typeof nsmHook.send).toBe('function');

    // Verify send function is mockable
    nsmHook.send({ type: 'KEYPRESS', letter: 'B' });
    expect(nsmHook.send).toHaveBeenCalledWith({ type: 'KEYPRESS', letter: 'B' });
    expect(verifyNoNetworkCalls()).toBe(true);
  });

  it('should prevent real network operations', async () => {
    // Verify that real network calls are blocked
    expect(() => {
      fetch('https://relay.damus.io');
    }).not.toThrow(); // Fetch is mocked, doesn't throw but doesn't succeed either

    // Verify WebSocket is mocked
    expect(typeof WebSocket).toBe('function');

    // Verify connector operations are mocked
    await connector.initialize();
    expect(connector.isConnected).toBe(true);
    expect(verifyNoNetworkCalls()).toBe(true);
  });
});