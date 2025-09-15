/**
 * Integration tests for Nostr communication workflows
 * Tests end-to-end NSM state machine operations over Nostr protocol
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { NDKRelay, NDKEvent } from '@nostr-dev-kit/ndk';
import { NSMClient, type NSMApplication } from '../../packages/nsm-client/src/nsm-client';
import type { NostrEvent } from '@nostr-dev-kit/ndk';

// Test configuration
const TEST_RELAY = 'wss://relay.damus.io';

describe('Nostr Communication Integration Tests', () => {
  let client1: NSMClient;
  let client2: NSMClient;
  let testApplication: NSMApplication;

  beforeAll(async () => {
    // Initialize test clients with different private keys
    client1 = new NSMClient({
      privateKey: TEST_PRIVATE_KEY,
      relays: [TEST_RELAY]
    });

    // Generate a different private key for client2
    const testKey2 = '2'.repeat(64);
    client2 = new NSMClient({
      privateKey: testKey2,
      relays: [TEST_RELAY]
    });

    // Initialize both clients
    await client1.init();
    await client2.init();

    // Give connections time to establish
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    // Clean up connections
    if (client1) {
      await client1.disconnect();
    }
    if (client2) {
      await client2.disconnect();
    }
  });

  beforeEach(() => {
    // Create a test state machine definition
    testDefinition = {
      id: `test-machine-${Date.now()}`,
      name: 'Test State Machine',
      version: '1.0.0',
      states: {
        'init': { name: 'Initial State', type: 'initial' },
        'active': { name: 'Active State', type: 'normal' },
        'completed': { name: 'Completed State', type: 'final' }
      },
      transitions: {
        'start': {
          from: 'init',
          to: 'active',
          conditions: [],
          actions: []
        },
        'finish': {
          from: 'active',
          to: 'completed',
          conditions: [],
          actions: []
        }
      },
      initialState: 'init',
      context: {},
      events: {}
    };
  });

  describe('State Machine Definition Publishing', () => {
    it('should successfully publish and retrieve a state machine definition', async () => {
      // Publish definition from client1
      const definitionId = await client1.publishDefinition(testDefinition);
      expect(definitionId).toBeDefined();
      expect(typeof definitionId).toBe('string');

      // Wait for propagation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Retrieve definition from client2
      const retrievedDefinition = await client2.getDefinition(definitionId);
      expect(retrievedDefinition).toBeDefined();
      expect(retrievedDefinition!.id).toBe(testDefinition.id);
      expect(retrievedDefinition!.name).toBe(testDefinition.name);
      expect(retrievedDefinition!.version).toBe(testDefinition.version);
    }, 15000); // 15 second timeout for network operations

    it('should handle definition updates correctly', async () => {
      // Publish initial definition
      const definitionId = await client1.publishDefinition(testDefinition);

      // Update the definition
      const updatedDefinition = {
        ...testDefinition,
        version: '1.0.1',
        name: 'Updated Test State Machine'
      };

      const updatedId = await client1.publishDefinition(updatedDefinition);
      expect(updatedId).toBeDefined();

      // Wait for propagation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify update was received
      const retrievedDefinition = await client2.getDefinition(updatedId);
      expect(retrievedDefinition!.version).toBe('1.0.1');
      expect(retrievedDefinition!.name).toBe('Updated Test State Machine');
    }, 15000);
  });

  describe('State Machine Instance Operations', () => {
    let definitionId: string;

    beforeEach(async () => {
      // Publish definition for instance tests
      definitionId = await client1.publishDefinition(testDefinition);
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    it('should create and sync state machine instances across clients', async () => {
      // Create instance on client1
      const instanceId = await client1.createInstance(definitionId, { testData: 'value1' });
      expect(instanceId).toBeDefined();

      // Wait for propagation
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Get instance from client2
      const instance = await client2.getInstance(instanceId);
      expect(instance).toBeDefined();
      expect(instance!.definitionId).toBe(definitionId);
      expect(instance!.currentState).toBe('init');
      expect(instance!.context).toEqual({ testData: 'value1' });
    }, 20000);

    it('should handle state transitions across clients', async () => {
      // Create instance on client1
      const instanceId = await client1.createInstance(definitionId, { counter: 0 });

      // Wait for propagation
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Trigger transition from client2
      const transitionResult = await client2.transition(instanceId, 'start', { counter: 1 });
      expect(transitionResult).toBe(true);

      // Wait for state update propagation
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Verify state change on client1
      const updatedInstance = await client1.getInstance(instanceId);
      expect(updatedInstance!.currentState).toBe('active');
      expect(updatedInstance!.context.counter).toBe(1);
    }, 25000);

    it('should handle concurrent state transitions correctly', async () => {
      // Create instance
      const instanceId = await client1.createInstance(definitionId, { value: 0 });
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Trigger transition to 'active' state first
      await client1.transition(instanceId, 'start', { value: 1 });
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Attempt concurrent transitions from both clients
      const [result1, result2] = await Promise.all([
        client1.transition(instanceId, 'finish', { value: 2, source: 'client1' }),
        client2.transition(instanceId, 'finish', { value: 3, source: 'client2' })
      ]);

      // At least one should succeed
      expect(result1 || result2).toBe(true);

      // Wait for final state propagation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify final state is consistent across clients
      const [instance1, instance2] = await Promise.all([
        client1.getInstance(instanceId),
        client2.getInstance(instanceId)
      ]);

      expect(instance1!.currentState).toBe(instance2!.currentState);
      expect(instance1!.currentState).toBe('completed');
    }, 30000);
  });

  describe('Multi-User Collaboration', () => {
    let definitionId: string;

    beforeEach(async () => {
      definitionId = await client1.publishDefinition(testDefinition);
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    it('should handle multi-user workflow correctly', async () => {
      // User 1 creates instance
      const instanceId = await client1.createInstance(definitionId, {
        createdBy: client1.getPublicKey(),
        participants: [client1.getPublicKey(), client2.getPublicKey()],
        step: 1
      });

      await new Promise(resolve => setTimeout(resolve, 1500));

      // User 2 takes next action
      const startResult = await client2.transition(instanceId, 'start', {
        step: 2,
        processedBy: client2.getPublicKey()
      });
      expect(startResult).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 1500));

      // User 1 completes the workflow
      const finishResult = await client1.transition(instanceId, 'finish', {
        step: 3,
        completedBy: client1.getPublicKey()
      });
      expect(finishResult).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Verify final state on both clients
      const [finalInstance1, finalInstance2] = await Promise.all([
        client1.getInstance(instanceId),
        client2.getInstance(instanceId)
      ]);

      expect(finalInstance1!.currentState).toBe('completed');
      expect(finalInstance2!.currentState).toBe('completed');
      expect(finalInstance1!.context.step).toBe(3);
      expect(finalInstance2!.context.step).toBe(3);
    }, 35000);
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network disconnections gracefully', async () => {
      const definitionId = await client1.publishDefinition(testDefinition);
      const instanceId = await client1.createInstance(definitionId, { test: 'resilience' });

      // Simulate network disruption by disconnecting client2
      await client2.disconnect();

      // Client1 should still be able to operate
      const result = await client1.transition(instanceId, 'start', { step: 'offline' });
      expect(result).toBe(true);

      // Reconnect client2
      await client2.init();
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Client2 should catch up with the changes
      const instance = await client2.getInstance(instanceId);
      expect(instance!.currentState).toBe('active');
      expect(instance!.context.step).toBe('offline');
    }, 25000);

    it('should handle invalid transition attempts', async () => {
      const definitionId = await client1.publishDefinition(testDefinition);
      const instanceId = await client1.createInstance(definitionId, {});

      // Attempt invalid transition (finish from init state)
      const result = await client1.transition(instanceId, 'finish', {});
      expect(result).toBe(false);

      // Verify state didn't change
      const instance = await client1.getInstance(instanceId);
      expect(instance!.currentState).toBe('init');
    }, 15000);
  });
});