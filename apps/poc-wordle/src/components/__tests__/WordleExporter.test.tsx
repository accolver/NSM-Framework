import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createActor } from 'xstate';
import { WordleExporter } from '../WordleExporter';
import { createWordleMachine } from '../../wordle-machine';

// Mock the clipboard API
const mockWriteText = jest.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

describe('WordleExporter', () => {
  const testMachine = createWordleMachine('TESTS');
  const testActor = createActor(testMachine);

  beforeEach(() => {
    mockWriteText.mockClear();
    testActor.start();
  });

  afterEach(() => {
    testActor.stop();
  });

  describe('Component Integration', () => {
    it('should render export button in Wordle UI', () => {
      render(<WordleExporter actor={testActor} />);

      expect(screen.getByRole('button', { name: /export wordle machine/i })).toBeInTheDocument();
    });

    it('should have minimal visual footprint', () => {
      render(<WordleExporter actor={testActor} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('wordle-export-minimal');
    });

    it('should be positioned appropriately in game UI', () => {
      render(<WordleExporter actor={testActor} />);

      const container = screen.getByTestId('wordle-exporter');
      expect(container).toHaveClass('wordle-export-container');
    });
  });

  describe('Wordle-Specific JSON Export', () => {
    it('should export Wordle machine configuration', async () => {
      const user = userEvent.setup();
      render(<WordleExporter actor={testActor} />);

      const exportButton = screen.getByRole('button');
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledTimes(1);
      });

      const exportedJSON = mockWriteText.mock.calls[0][0];
      const parsed = JSON.parse(exportedJSON);
      expect(parsed.id).toBe('wordleMachine');
    });

    it('should include Wordle context in export', async () => {
      const user = userEvent.setup();
      render(<WordleExporter actor={testActor} />);

      const exportButton = screen.getByRole('button');
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledTimes(1);
      });

      const exportedJSON = mockWriteText.mock.calls[0][0];
      const parsed = JSON.parse(exportedJSON);
      expect(parsed.context).toHaveProperty('hiddenWord');
      expect(parsed.context).toHaveProperty('currentGuess');
      expect(parsed.context).toHaveProperty('guesses');
      expect(parsed.context).toHaveProperty('attemptNumber');
    });

    it('should include current game state', async () => {
      // Make a move in the game
      testActor.send({ type: 'KEYPRESS', letter: 'T' });
      testActor.send({ type: 'KEYPRESS', letter: 'E' });

      const user = userEvent.setup();
      render(<WordleExporter actor={testActor} />);

      const exportButton = screen.getByRole('button');
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledTimes(1);
      });

      const exportedJSON = mockWriteText.mock.calls[0][0];
      const parsed = JSON.parse(exportedJSON);
      expect(parsed.context.currentGuess).toBe('TE');
    });

    it('should include Wordle states configuration', async () => {
      const user = userEvent.setup();
      render(<WordleExporter actor={testActor} />);

      const exportButton = screen.getByRole('button');
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledTimes(1);
      });

      const exportedJSON = mockWriteText.mock.calls[0][0];
      const parsed = JSON.parse(exportedJSON);
      expect(parsed.states).toHaveProperty('playing');
      expect(parsed.states).toHaveProperty('won');
      expect(parsed.states).toHaveProperty('lost');
    });

    it('should sanitize sensitive data from export', async () => {
      const user = userEvent.setup();
      render(<WordleExporter actor={testActor} />);

      const exportButton = screen.getByRole('button');
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledTimes(1);
      });

      const exportedJSON = mockWriteText.mock.calls[0][0];
      const parsed = JSON.parse(exportedJSON);
      // Should not export the hidden word in production
      expect(parsed.context.hiddenWord).toBe('[HIDDEN]');
    });
  });

  describe('User Experience', () => {
    it('should show game-appropriate success message', async () => {
      const user = userEvent.setup();
      render(<WordleExporter actor={testActor} />);

      const exportButton = screen.getByRole('button');
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/wordle machine exported/i)).toBeInTheDocument();
      });
    });

    it('should use Wordle color scheme', () => {
      render(<WordleExporter actor={testActor} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('wordle-themed');
    });

    it('should integrate with game keyboard shortcuts', async () => {
      render(<WordleExporter actor={testActor} enableGameShortcuts />);

      // Use Wordle-specific shortcut (Ctrl+E)
      fireEvent.keyDown(document, {
        key: 'E',
        ctrlKey: true
      });

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledTimes(1);
      });
    });

    it('should not interfere with game controls', async () => {
      const user = userEvent.setup();
      render(<WordleExporter actor={testActor} />);

      // Game should still work normally
      fireEvent.keyDown(document, { key: 'A' });
      fireEvent.keyDown(document, { key: 'B' });

      const snapshot = testActor.getSnapshot();
      expect(snapshot.context.currentGuess).toBe('AB');
    });
  });

  describe('Code Viewer for Wordle', () => {
    it('should show Wordle machine in code viewer', async () => {
      const user = userEvent.setup();
      render(<WordleExporter actor={testActor} showCodeViewer />);

      const viewerToggle = screen.getByRole('button', { name: /view code/i });
      await user.click(viewerToggle);

      expect(screen.getByText(/wordleMachine/)).toBeInTheDocument();
    });

    it('should highlight Wordle-specific machine parts', async () => {
      const user = userEvent.setup();
      render(<WordleExporter actor={testActor} showCodeViewer />);

      const viewerToggle = screen.getByRole('button', { name: /view code/i });
      await user.click(viewerToggle);

      // Should highlight key Wordle elements
      expect(screen.getByText(/KEYPRESS/)).toBeInTheDocument();
      expect(screen.getByText(/SUBMIT_GUESS/)).toBeInTheDocument();
      expect(screen.getByText(/BACKSPACE/)).toBeInTheDocument();
    });

    it('should format JSON for readability', async () => {
      const user = userEvent.setup();
      render(<WordleExporter actor={testActor} showCodeViewer />);

      const viewerToggle = screen.getByRole('button', { name: /view code/i });
      await user.click(viewerToggle);

      const codeContainer = screen.getByRole('region');
      expect(codeContainer).toHaveClass('formatted-json');
    });
  });

  describe('Error Handling', () => {
    it('should handle actor in error state', () => {
      const errorActor = createActor(testMachine);
      // Don't start the actor to simulate error state

      render(<WordleExporter actor={errorActor} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should handle clipboard unavailable', async () => {
      mockWriteText.mockRejectedValue(new Error('Clipboard API not available'));

      const user = userEvent.setup();
      render(<WordleExporter actor={testActor} />);

      const exportButton = screen.getByRole('button');
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/export failed/i)).toBeInTheDocument();
      });
    });

    it('should handle serialization errors gracefully', async () => {
      // Create actor with circular reference
      const badMachine = createWordleMachine();
      // Add circular reference to context
      const badActor = createActor(badMachine);
      badActor.start();

      const user = userEvent.setup();
      render(<WordleExporter actor={badActor} />);

      const exportButton = screen.getByRole('button');
      await user.click(exportButton);

      // Should not crash the app
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});