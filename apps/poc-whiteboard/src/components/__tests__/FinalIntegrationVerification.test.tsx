import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { createActor } from 'xstate';
import { StateMachineExporter } from '@nsm/dev-tools';
import { whiteboardMachine } from '../../whiteboard-machine';

describe('Whiteboard Final State Machine Integration Verification', () => {
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

  it('✅ CRITICAL: Whiteboard StateMachineExporter no useState crash with valid machine', () => {
    const actor = createActor(whiteboardMachine);

    expect(() => {
      render(
        <StateMachineExporter
          machine={actor}
          buttonText="Whiteboard Export Test"
        />
      );
    }).not.toThrow();
  });

  it('✅ CRITICAL: Whiteboard StateMachineExporter no useState crash with null machine', () => {
    expect(() => {
      render(
        <StateMachineExporter
          machine={null}
          buttonText="Null Machine Test"
        />
      );
    }).not.toThrow();
  });

  it('✅ CRITICAL: No useState errors in Whiteboard context', () => {
    const consoleSpy = vi.spyOn(console, 'error');
    const actor = createActor(whiteboardMachine);

    // Render both scenarios
    render(
      <StateMachineExporter
        machine={actor}
        buttonText="Valid Test"
      />
    );

    render(
      <StateMachineExporter
        machine={null}
        buttonText="Null Test"
      />
    );

    // Check for the specific error that was reported
    const hasStateError = consoleSpy.mock.calls.some(call =>
      call.some(arg =>
        typeof arg === 'string' &&
        (arg.includes('Cannot read properties of null') ||
         arg.includes('useState') ||
         arg.includes('Hooks can only be called'))
      )
    );

    expect(hasStateError).toBe(false);
  });

  it('✅ SUCCESS: Whiteboard state machine integration issues completely resolved', () => {
    // This test confirms the original crash is fixed
    const actor = createActor(whiteboardMachine);
    let integrationSuccessful = true;

    try {
      // This would have crashed before with:
      // "Cannot read properties of null (reading 'useState')"

      render(
        <StateMachineExporter
          machine={actor}
          buttonText="Integration Success Test"
        />
      );

      render(
        <StateMachineExporter
          machine={null}
          buttonText="Null Handling Test"
        />
      );

    } catch (error) {
      integrationSuccessful = false;
      console.error('Whiteboard integration still has issues:', error);
    }

    expect(integrationSuccessful).toBe(true);
  });
});