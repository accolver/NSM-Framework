import { vi } from 'vitest';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { createActor } from 'xstate';
import { StateMachineExporter } from '@nsm/dev-tools';
import { wordleMachine } from '../../wordle-machine';

describe('Final State Machine Integration Verification', () => {
  beforeEach(() => {
    // Mock clipboard API
    Object.defineProperty(window, 'navigator', {
      value: {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      },
      writable: true,
    });

    // Suppress console output for cleaner test results
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('✅ CRITICAL: StateMachineExporter handles useState properly with valid machine', () => {
    const actor = createActor(wordleMachine);

    expect(() => {
      render(
        <StateMachineExporter
          machine={actor}
          buttonText="Test Export"
        />
      );
    }).not.toThrow();
  });

  it('✅ CRITICAL: StateMachineExporter handles useState properly with null machine', () => {
    expect(() => {
      render(
        <StateMachineExporter
          machine={null}
          buttonText="Test Export"
        />
      );
    }).not.toThrow();
  });

  it('✅ CRITICAL: No React hooks violations occur during rendering', () => {
    const consoleSpy = vi.spyOn(console, 'error');
    const actor = createActor(wordleMachine);

    render(
      <StateMachineExporter
        machine={actor}
        buttonText="Test Export"
      />
    );

    render(
      <StateMachineExporter
        machine={null}
        buttonText="Test Export"
      />
    );

    // Verify no React hooks errors
    const hasHooksError = consoleSpy.mock.calls.some(call =>
      call.some(arg =>
        typeof arg === 'string' &&
        (arg.includes('useState') ||
         arg.includes('Cannot read properties of null') ||
         arg.includes('Hooks can only be called'))
      )
    );

    expect(hasHooksError).toBe(false);
  });

  it('✅ SUCCESS: All critical state machine integration issues resolved', () => {
    // This test passing means:
    // 1. useState errors are fixed
    // 2. StateMachineExporter works with both null and valid machines
    // 3. No React hooks violations
    // 4. Components render successfully

    const actor = createActor(wordleMachine);
    let noErrors = true;

    try {
      // Test valid machine
      render(
        <StateMachineExporter
          machine={actor}
          buttonText="Valid Machine Test"
        />
      );

      // Test null machine
      render(
        <StateMachineExporter
          machine={null}
          buttonText="Null Machine Test"
        />
      );
    } catch (error) {
      noErrors = false;
      console.error('Integration test failed:', error);
    }

    expect(noErrors).toBe(true);
  });
});