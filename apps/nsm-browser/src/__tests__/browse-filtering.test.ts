import { describe, it, expect } from 'vitest';

// Helper function to simulate the filtering logic from BrowseTab
function isValidNSMEvent(eventContent: string, eventName: string = ''): boolean {
  // Filter out known non-NSM events
  const nonNSMTypes = ['youtube-channels', 'public-backup', 'relays', 'check-in'];
  if (nonNSMTypes.some(type => eventName.toLowerCase().includes(type))) {
    return false;
  }

  try {
    const parsed = JSON.parse(eventContent);

    // Check for XState machine structure
    if (parsed.states || parsed.initial) {
      return true;
    } else if (parsed.initialState && (parsed.initialState.states || parsed.initialState.initial)) {
      return true;
    } else if (typeof parsed === 'object' && parsed !== null) {
      const keys = Object.keys(parsed);
      const hasStateLikeStructure = keys.some(key =>
        key === 'states' ||
        key === 'initial' ||
        key === 'context' ||
        key === 'on'
      );
      return hasStateLikeStructure;
    }
  } catch (e) {
    return false;
  }

  return false;
}

describe('NSM Event Filtering', () => {
  describe('Valid XState machines', () => {
    it('should accept direct XState machine with states', () => {
      const machine = JSON.stringify({
        id: 'test',
        states: {
          idle: { on: { START: 'running' } },
          running: { on: { STOP: 'idle' } }
        }
      });

      expect(isValidNSMEvent(machine)).toBe(true);
    });

    it('should accept direct XState machine with initial state', () => {
      const machine = JSON.stringify({
        id: 'test',
        initial: 'idle',
        states: {
          idle: {},
          running: {}
        }
      });

      expect(isValidNSMEvent(machine)).toBe(true);
    });

    it('should accept NSM event format with nested initialState', () => {
      const nsmEvent = JSON.stringify({
        initialState: {
          id: 'test',
          initial: 'idle',
          states: {
            idle: { on: { START: 'running' } },
            running: { on: { STOP: 'idle' } }
          }
        }
      });

      expect(isValidNSMEvent(nsmEvent)).toBe(true);
    });

    it('should accept machine with context property', () => {
      const machine = JSON.stringify({
        id: 'counter',
        context: { count: 0 },
        initial: 'active',
        states: {
          active: {}
        }
      });

      expect(isValidNSMEvent(machine)).toBe(true);
    });

    it('should accept machine with global transitions', () => {
      const machine = JSON.stringify({
        id: 'test',
        on: {
          RESET: { target: 'idle' }
        },
        states: {
          idle: {},
          running: {}
        }
      });

      expect(isValidNSMEvent(machine)).toBe(true);
    });
  });

  describe('Invalid or non-NSM events', () => {
    it('should reject malformed JSON', () => {
      const invalid = '{ invalid json';
      expect(isValidNSMEvent(invalid)).toBe(false);
    });

    it('should reject empty objects', () => {
      const empty = JSON.stringify({});
      expect(isValidNSMEvent(empty)).toBe(false);
    });

    it('should reject random data objects', () => {
      const randomData = JSON.stringify({
        username: 'test',
        email: 'test@example.com',
        settings: {
          theme: 'dark'
        }
      });

      expect(isValidNSMEvent(randomData)).toBe(false);
    });

    it('should reject youtube-channels events by name', () => {
      const machine = JSON.stringify({
        states: { idle: {} }
      });

      expect(isValidNSMEvent(machine, 'youtube-channels')).toBe(false);
    });

    it('should reject public-backup events by name', () => {
      const machine = JSON.stringify({
        initial: 'start',
        states: { start: {} }
      });

      expect(isValidNSMEvent(machine, 'public-backup')).toBe(false);
    });

    it('should reject relays events by name', () => {
      const machine = JSON.stringify({
        states: { connected: {} }
      });

      expect(isValidNSMEvent(machine, 'relays')).toBe(false);
    });

    it('should reject check-in events by name', () => {
      const machine = JSON.stringify({
        states: { present: {} }
      });

      expect(isValidNSMEvent(machine, 'check-in')).toBe(false);
    });

    it('should reject arrays', () => {
      const array = JSON.stringify([1, 2, 3]);
      expect(isValidNSMEvent(array)).toBe(false);
    });

    it('should reject strings', () => {
      const string = JSON.stringify('hello world');
      expect(isValidNSMEvent(string)).toBe(false);
    });

    it('should reject numbers', () => {
      const number = JSON.stringify(42);
      expect(isValidNSMEvent(number)).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle case-insensitive filtering for non-NSM types', () => {
      const machine = JSON.stringify({
        states: { idle: {} }
      });

      expect(isValidNSMEvent(machine, 'YouTube-Channels')).toBe(false);
      expect(isValidNSMEvent(machine, 'PUBLIC-BACKUP')).toBe(false);
      expect(isValidNSMEvent(machine, 'Check-In')).toBe(false);
    });

    it('should accept partial matches for state-like structures', () => {
      const partialMachine = JSON.stringify({
        on: { EVENT: 'nextState' },
        context: { value: 0 }
      });

      expect(isValidNSMEvent(partialMachine)).toBe(true);
    });

    it('should handle nested objects correctly', () => {
      const complexObject = JSON.stringify({
        data: {
          nested: {
            on: { EVENT: 'action' }
          }
        }
      });

      // This should actually return false since it doesn't have a proper state machine structure
      expect(isValidNSMEvent(complexObject)).toBe(false);
    });
  });
});