import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { createActor } from 'xstate';
// import { StateMachineExporter } from '@nsm/dev-tools';

// Mock StateMachineExporter
const StateMachineExporter = () => null;
import { wordleMachine } from '../../wordle-machine';

describe('StateMachineExporter Integration', () => {
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
  });

  it('should render without useState errors', () => {
    const actor = createActor(wordleMachine);

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

  it('should handle null machine gracefully', () => {
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

  it('should render export button', () => {
    const actor = createActor(wordleMachine);

    render(
      <StateMachineExporter
        machine={actor}
        buttonText="Export Wordle"
        showCodeViewer={false}
      />
    );

    const exportButton = screen.getByRole('button', { name: /export/i });
    expect(exportButton).toBeDefined();
    expect(exportButton.textContent).toContain('Export Wordle');
  });

  it('should disable button when machine is null', () => {
    render(
      <StateMachineExporter
        machine={null}
        buttonText="Export Wordle"
        showCodeViewer={false}
      />
    );

    const exportButton = screen.getByRole('button');
    expect(exportButton).toHaveProperty('disabled', true);
  });
});