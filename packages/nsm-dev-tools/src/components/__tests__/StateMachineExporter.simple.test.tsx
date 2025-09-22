import React from 'react';
import { render, screen } from '@testing-library/react';
import { createMachine } from 'xstate';
import { StateMachineExporter } from '../StateMachineExporter';

// Simple test machine
const testMachine = createMachine({
  id: 'testMachine',
  initial: 'idle',
  context: {
    count: 0,
    message: 'Hello World'
  },
  states: {
    idle: {
      on: {
        START: 'running'
      }
    },
    running: {
      on: {
        STOP: 'idle'
      }
    }
  }
});

describe('StateMachineExporter', () => {
  it('should render export button with correct text', () => {
    render(<StateMachineExporter machine={testMachine} />);

    expect(screen.getByRole('button', { name: /export machine json/i })).toBeInTheDocument();
  });

  it('should render with copy icon', () => {
    render(<StateMachineExporter machine={testMachine} />);

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('📋');
  });

  it('should have accessible label', () => {
    render(<StateMachineExporter machine={testMachine} />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Export state machine definition as JSON');
  });

  it('should accept custom button text', () => {
    render(
      <StateMachineExporter
        machine={testMachine}
        buttonText="Export My Machine"
      />
    );

    expect(screen.getByRole('button', { name: /export my machine/i })).toBeInTheDocument();
  });

  it('should accept custom styling classes', () => {
    render(
      <StateMachineExporter
        machine={testMachine}
        className="custom-export-button"
      />
    );

    const button = screen.getByRole('button');
    expect(button.closest('.state-machine-exporter')).toHaveClass('custom-export-button');
  });

  it('should handle null/undefined machine gracefully', () => {
    render(<StateMachineExporter machine={null as any} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should show code viewer toggle when enabled', () => {
    render(<StateMachineExporter machine={testMachine} showCodeViewer />);

    expect(screen.getByRole('button', { name: /toggle code viewer/i })).toBeInTheDocument();
  });
});