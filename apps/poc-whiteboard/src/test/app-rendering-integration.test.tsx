/**
 * Integration test to verify the Whiteboard app renders without React import errors
 *
 * This test specifically addresses the TypeError: "Cannot read properties of null (reading 'useState')"
 * by testing the actual component rendering chain that was failing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

// Import the failing components
import { WhiteboardExporter } from '../components/WhiteboardExporter';
import { createActor } from 'xstate';
import { whiteboardMachine } from '../whiteboard-machine';

describe('App Rendering Integration Test', () => {
  let actor: any;

  beforeEach(() => {
    // Mock console methods to reduce noise
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Create actor for tests
    actor = createActor(whiteboardMachine);
    actor.start();
  });

  afterEach(() => {
    if (actor) {
      actor.stop();
    }
    cleanup();
    vi.restoreAllMocks();
  });

  it('should render WhiteboardExporter without React null errors', async () => {
    // This was the specific failing component chain:
    // WhiteboardExporter → StateMachineExporter → useState (null error)
    const { container } = render(
      <WhiteboardExporter
        actor={actor}
        showCodeViewer={false}
        enableCanvasShortcuts={false}
        className="test-exporter"
      />
    );

    // Wait for component to fully render
    await waitFor(() => {
      expect(container).toBeDefined();
    });

    // Component should have rendered successfully
    expect(container.querySelector('.whiteboard-exporter')).toBeInTheDocument();
    expect(container.querySelector('.state-machine-exporter')).toBeInTheDocument();
  });

  it('should render StateMachineExporter directly without React errors', async () => {
    // Import StateMachineExporter directly to test it in isolation
    const { StateMachineExporter } = await import('@nsm/dev-tools');

    const { container } = render(
      <StateMachineExporter
        machine={actor}
        buttonText="Test Export Button"
        className="direct-test"
        showCodeViewer={false}
      />
    );

    await waitFor(() => {
      expect(container).toBeDefined();
    });

    // Should render the export button without React hook errors
    expect(container.querySelector('.export-button')).toBeInTheDocument();
    // Use container instead of screen to avoid document.body issues
    expect(container.textContent).toContain('Test Export Button');
  });

  it('should have working React hooks in StateMachineExporter', async () => {
    // This test verifies that React.useState and other hooks work correctly
    const { StateMachineExporter } = await import('@nsm/dev-tools');

    const { container } = render(
      <StateMachineExporter
        machine={actor}
        buttonText="Hook Test Button"
        showCodeViewer={true}  // This triggers more hooks
      />
    );

    await waitFor(() => {
      expect(container).toBeDefined();
    });

    // If hooks are working, these elements should exist
    expect(container.querySelector('.export-button')).toBeInTheDocument();
    expect(container.querySelector('.code-viewer-toggle')).toBeInTheDocument();

    // Button should be enabled (not disabled)
    const exportButton = container.querySelector('.export-button') as HTMLButtonElement;
    expect(exportButton?.disabled).toBe(false);
  });

  it('should maintain React instance consistency between imports', async () => {
    // This test ensures all modules are getting the same React instance
    const { StateMachineExporter } = await import('@nsm/dev-tools');

    // Render component - should not throw if React instances are consistent
    expect(() => {
      render(
        <StateMachineExporter
          machine={actor}
          buttonText="Consistency Test"
        />
      );
    }).not.toThrow();

    // React from direct import should be the same as our local React
    expect(React.useState).toBeDefined();
    expect(typeof React.useState).toBe('function');
  });

  it('should handle null machine gracefully', async () => {
    // Test edge case that might trigger React null issues
    const { StateMachineExporter } = await import('@nsm/dev-tools');

    const { container } = render(
      <StateMachineExporter
        machine={null}
        buttonText="Null Machine Test"
      />
    );

    await waitFor(() => {
      expect(container).toBeDefined();
    });

    // Should render disabled button for null machine
    const exportButton = container.querySelector('.export-button') as HTMLButtonElement;
    expect(exportButton).toBeInTheDocument();
    expect(exportButton?.disabled).toBe(true);
  });
});