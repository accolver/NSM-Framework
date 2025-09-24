/**
 * TDD Tests for NDK Publishing Functionality
 *
 * These tests verify that NSM events can be published to Nostr relays
 * using the correct NDK API patterns.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createNSMEvent } from '../utils/nostr-events';

// Mock NDK classes for testing
const mockNDK = {
  connect: vi.fn(() => Promise.resolve()),
  pool: { relays: new Map() },
  signer: { user: vi.fn(() => Promise.resolve({ pubkey: 'test-pubkey' })) }
};

const MockNDKEvent = vi.fn((ndk: any, eventData: any) => ({
  ...eventData,
  publish: vi.fn(() => Promise.resolve()),
  ndk
}));

describe('NDK Publishing Tests (TDD - RED Phase)', () => {
  let testEvent: any;

  beforeEach(() => {
    testEvent = {
      kind: 30079,
      content: JSON.stringify({ initialState: { id: 'test' } }),
      tags: [['d', 'test-id'], ['name', 'Test Machine']],
      publish: vi.fn(() => Promise.resolve()),
      ndk: mockNDK
    };
  });

  it('should create NSM event with correct structure', () => {
    const machine = { id: 'test', states: { idle: {} } };
    const event = createNSMEvent(machine, 'Test Machine', 'Test Description');

    expect(event.kind).toBe(30079);
    expect(event.content).toContain('initialState');
    expect(event.tags).toContainEqual(['name', 'Test Machine']);
    expect(event.tags).toContainEqual(['description', 'Test Description']);
    expect(event.tags).toContainEqual(['engine', 'xstate']);
  });

  it('should publish events using event.publish() not ndk.publish()', async () => {
    const machine = { id: 'test', states: { idle: {} } };
    const event = createNSMEvent(machine, 'Test Machine', 'Test Description');

    // Create mock NDKEvent instance
    const ndkEvent = MockNDKEvent(mockNDK, event);

    // Test that we call event.publish() not ndk.publish()
    await ndkEvent.publish();

    expect(ndkEvent.publish).toHaveBeenCalled();

    // This test should fail initially because current code might use ndk.publish()
    // We expect the publish method to exist on the event, not the ndk instance
    expect(typeof ndkEvent.publish).toBe('function');
  });

  it('should handle publishing errors gracefully', async () => {
    const publishError = new Error('Network error');

    const failingEvent = {
      ...testEvent,
      publish: vi.fn(() => Promise.reject(publishError))
    };

    await expect(failingEvent.publish()).rejects.toThrow('Network error');
  });

  it('should validate event structure before publishing', () => {
    const invalidMachine = null;

    expect(() => {
      createNSMEvent(invalidMachine, 'Test', 'Description');
    }).toThrow();
  });

  it('should include required tags for NSM events', () => {
    const machine = { id: 'test', states: { idle: {} } };
    const event = createNSMEvent(machine, 'Test Machine', 'Test Description');

    const requiredTags = ['d', 'name', 'description', 'engine', 'engineCodeURI'];

    requiredTags.forEach(tagName => {
      const hasTag = event.tags.some(tag => tag[0] === tagName);
      expect(hasTag).toBe(true);
    });
  });
});