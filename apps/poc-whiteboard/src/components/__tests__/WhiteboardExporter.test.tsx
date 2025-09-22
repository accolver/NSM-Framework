import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createActor } from 'xstate';
import { vi } from 'vitest';
import { WhiteboardExporter } from '../WhiteboardExporter';
import { createWhiteboardMachine } from '../../whiteboard-machine';

// Mock the clipboard API
const mockWriteText = vi.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

describe('WhiteboardExporter', () => {
  const testMachine = createWhiteboardMachine({
    userId: 'test-user',
    userName: 'Test User'
  });
  const testActor = createActor(testMachine);

  beforeEach(() => {
    mockWriteText.mockClear();
    testActor.start();
  });

  afterEach(() => {
    testActor.stop();
  });

  describe('Component Integration', () => {
    it('should render export button in whiteboard UI', () => {
      render(<WhiteboardExporter actor={testActor} />);

      expect(screen.getByRole('button', { name: /export whiteboard machine/i })).toBeInTheDocument();
    });

    it('should integrate with toolbar without disrupting layout', () => {
      render(<WhiteboardExporter actor={testActor} />);

      const container = screen.getByTestId('whiteboard-exporter');
      expect(container).toHaveClass('toolbar-integrated');
    });

    it('should have minimal visual impact on canvas area', () => {
      render(<WhiteboardExporter actor={testActor} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('minimal-overlay');
    });
  });

  describe('Whiteboard-Specific JSON Export', () => {
    it('should export whiteboard machine configuration', async () => {
      const user = userEvent.setup();
      render(<WhiteboardExporter actor={testActor} />);

      const exportButton = screen.getByRole('button');
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledTimes(1);
      });

      const exportedJSON = mockWriteText.mock.calls[0][0];
      const parsed = JSON.parse(exportedJSON);
      expect(parsed.id).toBe('whiteboardMachine');
    });

    it('should include whiteboard context in export', async () => {
      const user = userEvent.setup();
      render(<WhiteboardExporter actor={testActor} />);

      const exportButton = screen.getByRole('button');
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledTimes(1);
      });

      const exportedJSON = mockWriteText.mock.calls[0][0];
      const parsed = JSON.parse(exportedJSON);
      expect(parsed.context).toHaveProperty('currentTool');
      expect(parsed.context).toHaveProperty('paths');
      expect(parsed.context).toHaveProperty('shapes');
      expect(parsed.context).toHaveProperty('collaborators');
    });

    it('should include current drawing state', async () => {
      // Start drawing
      testActor.send({
        type: 'START_DRAWING',
        point: { x: 10, y: 10, timestamp: Date.now() }
      });

      const user = userEvent.setup();
      render(<WhiteboardExporter actor={testActor} />);

      const exportButton = screen.getByRole('button');
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledTimes(1);
      });

      const exportedJSON = mockWriteText.mock.calls[0][0];
      const parsed = JSON.parse(exportedJSON);
      expect(parsed.context.isDrawing).toBe(true);
    });

    it('should include whiteboard states configuration', async () => {
      const user = userEvent.setup();
      render(<WhiteboardExporter actor={testActor} />);

      const exportButton = screen.getByRole('button');
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledTimes(1);
      });

      const exportedJSON = mockWriteText.mock.calls[0][0];
      const parsed = JSON.parse(exportedJSON);
      expect(parsed.states).toHaveProperty('idle');
      expect(parsed.states).toHaveProperty('drawing');
      expect(parsed.states).toHaveProperty('shaping');
    });

    it('should sanitize user data from export', async () => {
      const user = userEvent.setup();
      render(<WhiteboardExporter actor={testActor} />);

      const exportButton = screen.getByRole('button');
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledTimes(1);
      });

      const exportedJSON = mockWriteText.mock.calls[0][0];
      const parsed = JSON.parse(exportedJSON);
      // Should sanitize collaboration data
      expect(parsed.context.collaborationService).toBeNull();
      expect(parsed.context.realTimeCollaborationService).toBeNull();
    });

    it('should include drawing paths and shapes', async () => {
      // Add some drawing data
      testActor.send({
        type: 'START_DRAWING',
        point: { x: 0, y: 0, timestamp: Date.now() }
      });
      testActor.send({
        type: 'CONTINUE_DRAWING',
        point: { x: 10, y: 10, timestamp: Date.now() }
      });
      testActor.send({ type: 'END_DRAWING' });

      const user = userEvent.setup();
      render(<WhiteboardExporter actor={testActor} />);

      const exportButton = screen.getByRole('button');
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledTimes(1);
      });

      const exportedJSON = mockWriteText.mock.calls[0][0];
      const parsed = JSON.parse(exportedJSON);
      expect(parsed.context.paths).toHaveLength(1);
      expect(parsed.context.paths[0]).toHaveProperty('points');
    });
  });

  describe('User Experience', () => {
    it('should show whiteboard-appropriate success message', async () => {
      const user = userEvent.setup();
      render(<WhiteboardExporter actor={testActor} />);

      const exportButton = screen.getByRole('button');
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/whiteboard machine exported/i)).toBeInTheDocument();
      });
    });

    it('should use whiteboard visual theme', () => {
      render(<WhiteboardExporter actor={testActor} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('whiteboard-themed');
    });

    it('should integrate with canvas keyboard shortcuts', async () => {
      render(<WhiteboardExporter actor={testActor} enableCanvasShortcuts />);

      // Use whiteboard-specific shortcut (Ctrl+Shift+E)
      fireEvent.keyDown(document, {
        key: 'E',
        ctrlKey: true,
        shiftKey: true
      });

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledTimes(1);
      });
    });

    it('should not interfere with drawing operations', async () => {
      const user = userEvent.setup();
      render(<WhiteboardExporter actor={testActor} />);

      // Drawing should still work normally
      testActor.send({
        type: 'START_DRAWING',
        point: { x: 5, y: 5, timestamp: Date.now() }
      });

      const snapshot = testActor.getSnapshot();
      expect(snapshot.context.isDrawing).toBe(true);
    });

    it('should not block canvas interactions', async () => {
      const user = userEvent.setup();
      render(<WhiteboardExporter actor={testActor} />);

      // Should be able to click through to canvas
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ pointerEvents: 'auto' });
    });
  });

  describe('Code Viewer for Whiteboard', () => {
    it('should show whiteboard machine in code viewer', async () => {
      const user = userEvent.setup();
      render(<WhiteboardExporter actor={testActor} showCodeViewer />);

      const viewerToggle = screen.getByRole('button', { name: /view code/i });
      await user.click(viewerToggle);

      expect(screen.getByText(/whiteboardMachine/)).toBeInTheDocument();
    });

    it('should highlight whiteboard-specific machine parts', async () => {
      const user = userEvent.setup();
      render(<WhiteboardExporter actor={testActor} showCodeViewer />);

      const viewerToggle = screen.getByRole('button', { name: /view code/i });
      await user.click(viewerToggle);

      // Should highlight key whiteboard elements
      expect(screen.getByText(/START_DRAWING/)).toBeInTheDocument();
      expect(screen.getByText(/CONTINUE_DRAWING/)).toBeInTheDocument();
      expect(screen.getByText(/END_DRAWING/)).toBeInTheDocument();
    });

    it('should format complex drawing data properly', async () => {
      const user = userEvent.setup();
      render(<WhiteboardExporter actor={testActor} showCodeViewer />);

      const viewerToggle = screen.getByRole('button', { name: /view code/i });
      await user.click(viewerToggle);

      const codeContainer = screen.getByRole('region');
      expect(codeContainer).toHaveClass('formatted-drawing-json');
    });

    it('should handle large canvas data gracefully', async () => {
      // Simulate large canvas with many paths
      for (let i = 0; i < 10; i++) {
        testActor.send({
          type: 'START_DRAWING',
          point: { x: i * 10, y: i * 10, timestamp: Date.now() }
        });
        testActor.send({ type: 'END_DRAWING' });
      }

      const user = userEvent.setup();
      render(<WhiteboardExporter actor={testActor} showCodeViewer />);

      const viewerToggle = screen.getByRole('button', { name: /view code/i });
      await user.click(viewerToggle);

      // Should not crash with large data
      expect(screen.getByRole('region')).toBeInTheDocument();
    });
  });

  describe('Collaboration Integration', () => {
    it('should handle multi-user state in export', async () => {
      // Add collaborator
      testActor.send({
        type: 'JOIN_SESSION',
        userId: 'other-user',
        userName: 'Other User'
      });

      const user = userEvent.setup();
      render(<WhiteboardExporter actor={testActor} />);

      const exportButton = screen.getByRole('button');
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledTimes(1);
      });

      const exportedJSON = mockWriteText.mock.calls[0][0];
      const parsed = JSON.parse(exportedJSON);
      expect(parsed.context.collaborators).toHaveLength(0); // Should be sanitized
    });

    it('should export clean machine definition without active sessions', async () => {
      const user = userEvent.setup();
      render(<WhiteboardExporter actor={testActor} />);

      const exportButton = screen.getByRole('button');
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledTimes(1);
      });

      const exportedJSON = mockWriteText.mock.calls[0][0];
      const parsed = JSON.parse(exportedJSON);
      // Should export a clean template without active sessions
      expect(parsed.context.userId).toBe('');
      expect(parsed.context.userName).toBe('');
    });
  });

  describe('Error Handling', () => {
    it('should handle actor in error state', () => {
      const errorActor = createActor(testMachine);
      // Don't start the actor to simulate error state

      render(<WhiteboardExporter actor={errorActor} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should handle large canvas data serialization', async () => {
      // Create very large canvas data
      const largeMachine = createWhiteboardMachine({
        paths: new Array(1000).fill(null).map((_, i) => ({
          id: `path-${i}`,
          tool: 'pen' as const,
          points: new Array(100).fill({ x: i, y: i, timestamp: Date.now() }),
          style: { color: '#000', width: 2, opacity: 1 },
          timestamp: Date.now(),
          userId: 'test'
        }))
      });

      const largeActor = createActor(largeMachine);
      largeActor.start();

      const user = userEvent.setup();
      render(<WhiteboardExporter actor={largeActor} />);

      const exportButton = screen.getByRole('button');
      await user.click(exportButton);

      // Should handle large data without crashing
      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledTimes(1);
      });

      largeActor.stop();
    });
  });
});