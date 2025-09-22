import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { createActor } from 'xstate';
import { StateMachineExporter } from '@nsm/dev-tools';
import { whiteboardMachine } from '../../whiteboard-machine';

describe('Whiteboard StateMachineExporter Integration', () => {
  beforeEach(() => {
    // Mock window.navigator.clipboard
    Object.defineProperty(window, 'navigator', {
      value: {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      },
      writable: true,
    });

    // Mock console to prevent noise
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should render without useState errors', () => {
    const actor = createActor(whiteboardMachine);

    expect(() => {
      render(
        <StateMachineExporter
          machine={actor}
          buttonText="Test Export"
          showCodeViewer={false}
        />
      );
    }).not.toThrow();
  });

  it('should handle null machine without crashing', () => {
    expect(() => {
      render(
        <StateMachineExporter
          machine={null}
          buttonText="Test Export"
          showCodeViewer={false}
        />
      );
    }).not.toThrow();
  });

  it('should render export button for whiteboard machine', () => {
    const actor = createActor(whiteboardMachine);

    render(
      <StateMachineExporter
        machine={actor}
        buttonText="Export Whiteboard"
        showCodeViewer={false}
      />
    );

    const exportButton = screen.getByRole('button', { name: /export/i });
    expect(exportButton).toBeDefined();
    expect(exportButton.textContent).toContain('Export Whiteboard');
  });

  it('should not cause React hooks violations', () => {
    const consoleSpy = vi.spyOn(console, 'error');
    const actor = createActor(whiteboardMachine);

    render(
      <StateMachineExporter
        machine={actor}
        buttonText="Export Test"
        showCodeViewer={false}
      />
    );

    // Check that no React hooks errors were logged
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
});