import { describe, it, expect, vi } from 'vitest';
import { validateXStateJSON } from '../utils/xstate-validator';
import { createNSMEvent, parseNSMEvent } from '../utils/nostr-events';

describe('NSM Browser Integration Tests', () => {
  it('should validate and create NSM event workflow', () => {
    // Test the complete workflow from validation to event creation
    const machineJSON = JSON.stringify({
      id: 'integration-test',
      initial: 'start',
      states: {
        start: {
          on: { NEXT: 'end' }
        },
        end: {
          type: 'final'
        }
      }
    });

    // Step 1: Validate machine JSON
    const validation = validateXStateJSON(machineJSON);
    expect(validation.isValid).toBe(true);
    expect(validation.machine).toBeDefined();

    // Step 2: Create NSM event
    const event = createNSMEvent(validation.machine!, 'Integration Test App', 'Test description');
    expect(event.kind).toBe(30079);
    expect(event.tags.find(tag => tag[0] === 'name')?.[1]).toBe('Integration Test App');
    expect(event.tags.find(tag => tag[0] === 'description')?.[1]).toBe('Test description');

    // Step 3: Parse event back to application data
    const mockEvent = {
      kind: 30079,
      content: event.content,
      tags: event.tags,
      pubkey: 'test-pubkey',
      created_at: 1640995200
    };

    const app = parseNSMEvent(mockEvent);
    expect(app).toBeTruthy();
    expect(app!.name).toBe('Integration Test App');
    expect(app!.description).toBe('Test description');
  });

  it('should handle invalid data gracefully in workflow', () => {
    // Test error handling in the workflow

    // Invalid JSON should fail validation
    const invalidValidation = validateXStateJSON('invalid json');
    expect(invalidValidation.isValid).toBe(false);
    expect(invalidValidation.error).toContain('Invalid JSON');

    // Invalid NSM event should return null
    const invalidEvent = {
      kind: 1, // Wrong kind
      content: 'test',
      tags: [],
      pubkey: 'test',
      created_at: 123
    };

    const app = parseNSMEvent(invalidEvent);
    expect(app).toBeNull();
  });

  it('should validate required XState properties in workflow', () => {
    // Test that the workflow properly validates XState structure
    const missingStates = JSON.stringify({
      id: 'test',
      initial: 'start'
      // Missing states
    });

    const validation = validateXStateJSON(missingStates);
    expect(validation.isValid).toBe(false);
    expect(validation.error).toContain('Missing required XState properties');
  });

  it('should filter events correctly in BrowseTab', () => {
    // Test the filtering logic that excludes non-NSM events
    const mockEvents = [
      {
        kind: 30079,
        content: JSON.stringify({
          id: 'valid-machine',
          initial: 'idle',
          states: { idle: {}, active: {} }
        }),
        tags: [['name', 'Valid Machine']],
        pubkey: 'test',
        created_at: 123
      },
      {
        kind: 30079,
        content: JSON.stringify({ username: 'test', type: 'user-data' }),
        tags: [['name', 'youtube-channels']],
        pubkey: 'test',
        created_at: 124
      },
      {
        kind: 30079,
        content: JSON.stringify({ backup: 'data' }),
        tags: [['name', 'public-backup']],
        pubkey: 'test',
        created_at: 125
      },
      {
        kind: 30079,
        content: JSON.stringify({
          initialState: {
            id: 'nested-machine',
            initial: 'start',
            states: { start: {}, end: {} }
          }
        }),
        tags: [['name', 'Nested Valid Machine']],
        pubkey: 'test',
        created_at: 126
      }
    ];

    // Simulate the filtering logic from BrowseTab
    const validNSMEvents = mockEvents.filter(event => {
      const nameTag = event.tags.find(t => t[0] === 'name');
      const eventName = nameTag?.[1] || '';
      const nonNSMTypes = ['youtube-channels', 'public-backup', 'relays', 'check-in'];

      if (nonNSMTypes.some(type => eventName.toLowerCase().includes(type))) {
        return false;
      }

      try {
        const parsed = JSON.parse(event.content);

        if (parsed.states || parsed.initial) {
          return true;
        } else if (parsed.initialState && (parsed.initialState.states || parsed.initialState.initial)) {
          return true;
        } else if (typeof parsed === 'object' && parsed !== null) {
          const keys = Object.keys(parsed);
          return keys.some(key =>
            key === 'states' || key === 'initial' || key === 'context' || key === 'on'
          );
        }
      } catch (e) {
        return false;
      }

      return false;
    });

    // Should only include the valid NSM events
    expect(validNSMEvents).toHaveLength(2);
    expect(validNSMEvents[0].tags.find(t => t[0] === 'name')?.[1]).toBe('Valid Machine');
    expect(validNSMEvents[1].tags.find(t => t[0] === 'name')?.[1]).toBe('Nested Valid Machine');
  });
});