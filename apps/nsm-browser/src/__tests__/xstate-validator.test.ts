import { describe, it, expect } from 'vitest';
import { validateXStateJSON } from '../utils/xstate-validator';

describe('XState JSON Validator', () => {
  it('should validate correct XState machine JSON', () => {
    const validMachine = {
      id: 'toggle',
      initial: 'inactive',
      states: {
        inactive: {
          on: { TOGGLE: 'active' }
        },
        active: {
          on: { TOGGLE: 'inactive' }
        }
      }
    };

    const result = validateXStateJSON(JSON.stringify(validMachine));
    expect(result.isValid).toBe(true);
    expect(result.machine).toEqual(validMachine);
  });

  it('should reject invalid JSON', () => {
    const invalidJSON = '{ invalid json }';

    const result = validateXStateJSON(invalidJSON);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Invalid JSON');
  });

  it('should reject JSON without required XState properties', () => {
    const invalidMachine = JSON.stringify({
      name: 'test'
    });

    const result = validateXStateJSON(invalidMachine);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Missing required XState properties');
  });

  it('should reject JSON without states object', () => {
    const invalidMachine = JSON.stringify({
      id: 'test',
      initial: 'start'
    });

    const result = validateXStateJSON(invalidMachine);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Missing required XState properties');
  });
});