import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMachine } from 'xstate';
import { StateMachineExporter } from '../StateMachineExporter';

// Mock the clipboard API
const mockWriteText = jest.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

// Mock notification API
const mockNotify = jest.fn();
global.alert = mockNotify;

// Test machine for use in tests
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
        START: 'running',
        INCREMENT: {
          actions: 'increment'
        }
      }
    },
    running: {
      on: {
        STOP: 'idle',
        PAUSE: 'paused'
      }
    },
    paused: {
      on: {
        RESUME: 'running',
        STOP: 'idle'
      }
    }
  }
});

describe('StateMachineExporter', () => {
  beforeEach(() => {
    mockWriteText.mockClear();
    mockNotify.mockClear();
  });

  describe('Component Rendering', () => {
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
  });

  describe('JSON Serialization', () => {
    it('should export machine configuration as valid JSON', async () => {
      const user = userEvent.setup();
      render(<StateMachineExporter machine={testMachine} />);

      const exportButton = screen.getByRole('button');
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledTimes(1);
      });

      const exportedJSON = mockWriteText.mock.calls[0][0];
      expect(() => JSON.parse(exportedJSON)).not.toThrow();
    });

    it('should include machine id in exported JSON', async () => {
      const user = userEvent.setup();
      render(<StateMachineExporter machine={testMachine} />);

      const exportButton = screen.getByRole('button');
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledTimes(1);
      });

      const exportedJSON = mockWriteText.mock.calls[0][0];
      const parsed = JSON.parse(exportedJSON);
      expect(parsed.id).toBe('testMachine');
    });

    it('should include initial state in exported JSON', async () => {
      const user = userEvent.setup();
      render(<StateMachineExporter machine={testMachine} />);

      const exportButton = screen.getByRole('button');
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledTimes(1);
      });

      const exportedJSON = mockWriteText.mock.calls[0][0];
      const parsed = JSON.parse(exportedJSON);
      expect(parsed.initial).toBe('idle');
    });

    it('should include context in exported JSON', async () => {
      const user = userEvent.setup();
      render(<StateMachineExporter machine={testMachine} />);

      const exportButton = screen.getByRole('button');
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledTimes(1);
      });

      const exportedJSON = mockWriteText.mock.calls[0][0];
      const parsed = JSON.parse(exportedJSON);
      expect(parsed.context).toEqual({
        count: 0,
        message: 'Hello World'
      });
    });

    it('should include states configuration in exported JSON', async () => {
      const user = userEvent.setup();
      render(<StateMachineExporter machine={testMachine} />);

      const exportButton = screen.getByRole('button');
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledTimes(1);
      });

      const exportedJSON = mockWriteText.mock.calls[0][0];
      const parsed = JSON.parse(exportedJSON);
      expect(parsed.states).toHaveProperty('idle');
      expect(parsed.states).toHaveProperty('running');
      expect(parsed.states).toHaveProperty('paused');
    });

    it('should format JSON with proper indentation', async () => {
      const user = userEvent.setup();
      render(<StateMachineExporter machine={testMachine} />);

      const exportButton = screen.getByRole('button');
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledTimes(1);
      });

      const exportedJSON = mockWriteText.mock.calls[0][0];
      expect(exportedJSON).toContain('  '); // Should have indentation
      expect(exportedJSON).toContain('\n'); // Should have line breaks
    });
  });

  describe('Clipboard Integration', () => {
    it('should copy JSON to clipboard when button is clicked', async () => {
      const user = userEvent.setup();
      render(<StateMachineExporter machine={testMachine} />);

      const exportButton = screen.getByRole('button');
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledTimes(1);
      });
      expect(mockWriteText).toHaveBeenCalledWith(expect.any(String));
    });

    it('should handle clipboard API errors gracefully', async () => {
      mockWriteText.mockRejectedValue(new Error('Clipboard not available'));

      const user = userEvent.setup();
      render(<StateMachineExporter machine={testMachine} />);

      const exportButton = screen.getByRole('button');
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledTimes(1);
      });

      // Should not throw error, component should handle gracefully
    });

    it('should show success feedback after successful copy', async () => {
      const user = userEvent.setup();
      render(<StateMachineExporter machine={testMachine} />);

      const exportButton = screen.getByRole('button');
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/copied to clipboard/i)).toBeInTheDocument();
      });
    });

    it('should show error feedback when clipboard fails', async () => {
      mockWriteText.mockRejectedValue(new Error('Clipboard not available'));

      const user = userEvent.setup();
      render(<StateMachineExporter machine={testMachine} />);

      const exportButton = screen.getByRole('button');
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to copy/i)).toBeInTheDocument();
      });
    });
  });

  describe('Code Viewer Integration', () => {
    it('should show JSON in code viewer when expanded', async () => {
      const user = userEvent.setup();
      render(<StateMachineExporter machine={testMachine} showCodeViewer />);

      const toggleButton = screen.getByRole('button', { name: /toggle code viewer/i });
      await user.click(toggleButton);

      expect(screen.getByText(/testMachine/)).toBeInTheDocument();
      expect(screen.getByText(/"initial": "idle"/)).toBeInTheDocument();
    });

    it('should hide code viewer by default', () => {
      render(<StateMachineExporter machine={testMachine} showCodeViewer />);

      // Code viewer should be collapsed initially
      expect(screen.queryByText(/"initial": "idle"/)).not.toBeInTheDocument();
    });

    it('should apply syntax highlighting to JSON in code viewer', async () => {
      const user = userEvent.setup();
      render(<StateMachineExporter machine={testMachine} showCodeViewer />);

      const toggleButton = screen.getByRole('button', { name: /toggle code viewer/i });
      await user.click(toggleButton);

      const codeContainer = screen.getByRole('region', { name: /json code viewer/i });
      expect(codeContainer).toHaveClass('syntax-highlighted');
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should support Ctrl+Shift+E shortcut for export', async () => {
      render(<StateMachineExporter machine={testMachine} enableKeyboardShortcut />);

      fireEvent.keyDown(document, {
        key: 'E',
        ctrlKey: true,
        shiftKey: true
      });

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledTimes(1);
      });
    });

    it('should not trigger export without proper key combination', async () => {
      render(<StateMachineExporter machine={testMachine} enableKeyboardShortcut />);

      fireEvent.keyDown(document, { key: 'E' });
      fireEvent.keyDown(document, { key: 'E', ctrlKey: true });
      fireEvent.keyDown(document, { key: 'E', shiftKey: true });

      await waitFor(() => {
        expect(mockWriteText).not.toHaveBeenCalled();
      });
    });
  });

  describe('Props and Configuration', () => {
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
      expect(button).toHaveClass('custom-export-button');
    });

    it('should handle null/undefined machine gracefully', () => {
      render(<StateMachineExporter machine={null as any} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle machine with circular references', async () => {
      const circularMachine = createMachine({
        id: 'circular',
        initial: 'state1',
        states: {
          state1: {
            on: {
              TO_SELF: 'state1'
            }
          }
        }
      });

      const user = userEvent.setup();
      render(<StateMachineExporter machine={circularMachine} />);

      const exportButton = screen.getByRole('button');
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledTimes(1);
      });

      // Should not throw JSON serialization error
      const exportedJSON = mockWriteText.mock.calls[0][0];
      expect(() => JSON.parse(exportedJSON)).not.toThrow();
    });

    it('should handle machine with complex context objects', async () => {
      const complexMachine = createMachine({
        id: 'complex',
        initial: 'idle',
        context: {
          nested: {
            array: [1, 2, 3],
            object: { key: 'value' },
            date: new Date('2023-01-01'),
            function: () => console.log('test')
          }
        },
        states: {
          idle: {}
        }
      });

      const user = userEvent.setup();
      render(<StateMachineExporter machine={complexMachine} />);

      const exportButton = screen.getByRole('button');
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledTimes(1);
      });

      // Should serialize complex objects properly
      const exportedJSON = mockWriteText.mock.calls[0][0];
      const parsed = JSON.parse(exportedJSON);
      expect(parsed.context.nested.array).toEqual([1, 2, 3]);
      expect(parsed.context.nested.object).toEqual({ key: 'value' });
    });
  });
});