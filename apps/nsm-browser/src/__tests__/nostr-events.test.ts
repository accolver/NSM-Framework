import { describe, it, expect } from 'vitest';
import { createNSMEvent, parseNSMEvent } from '../utils/nostr-events';

describe('Nostr Event Creation and Parsing', () => {
  it('should create valid NSM event from XState machine', () => {
    const machine = {
      id: 'toggle',
      initial: 'inactive',
      states: {
        inactive: { on: { TOGGLE: 'active' } },
        active: { on: { TOGGLE: 'inactive' } }
      }
    };

    const appName = 'Toggle App';
    const description = 'Simple toggle state machine';

    const event = createNSMEvent(machine, appName, description);

    expect(event.kind).toBe(30079);
    expect(event.tags.find(tag => tag[0] === 'name')?.[1]).toBe(appName);
    expect(event.tags.find(tag => tag[0] === 'description')?.[1]).toBe(description);
    expect(event.tags.find(tag => tag[0] === 'engine')?.[1]).toBe('xstate');

    const content = JSON.parse(event.content);
    expect(content.initialState).toEqual(machine);
  });

  it('should parse NSM event back to application data', () => {
    const mockEvent = {
      kind: 30079,
      content: JSON.stringify({
        initialState: {
          id: 'toggle',
          initial: 'inactive',
          states: {
            inactive: { on: { TOGGLE: 'active' } },
            active: { on: { TOGGLE: 'inactive' } }
          }
        }
      }),
      tags: [
        ['d', 'test-app-123'],
        ['name', 'Toggle App'],
        ['description', 'Simple toggle'],
        ['engine', 'xstate']
      ],
      pubkey: 'author-pubkey-123',
      created_at: 1640995200
    };

    const app = parseNSMEvent(mockEvent);

    expect(app).toBeTruthy();
    expect(app!.name).toBe('Toggle App');
    expect(app!.description).toBe('Simple toggle');
    expect(app!.author).toBe('author-pubkey-123');
    expect(app!.machine).toEqual(mockEvent.content);
  });

  it('should return null for invalid NSM event', () => {
    const invalidEvent = {
      kind: 1,
      content: 'hello world',
      tags: [],
      pubkey: 'author',
      created_at: 1640995200
    };

    const app = parseNSMEvent(invalidEvent);
    expect(app).toBeNull();
  });
});