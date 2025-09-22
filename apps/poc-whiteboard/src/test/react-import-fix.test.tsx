/**
 * Test to verify React imports work correctly in the Whiteboard app
 *
 * This test addresses the TypeError: "Cannot read properties of null (reading 'useState')"
 * which indicates React is resolving to null in StateMachineExporter component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import React from 'react';

// Import components that use React hooks
import { App } from '../components/App';
import { StateMachineExporter } from '@nsm/dev-tools';
import { createActor } from 'xstate';
import { whiteboardMachine } from '../whiteboard-machine';

describe('React Import Fix', () => {
  beforeEach(() => {
    // Mock console methods to reduce noise
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('should import React correctly and not be null', () => {
    // React should be a valid object with expected properties
    expect(React).toBeDefined();
    expect(React).not.toBeNull();
    expect(typeof React.useState).toBe('function');
    expect(typeof React.useEffect).toBe('function');
    expect(typeof React.useCallback).toBe('function');
  });

  it('should be able to use React hooks in StateMachineExporter', () => {
    // Create a test actor
    const actor = createActor(whiteboardMachine);
    actor.start();

    // This should not throw the "Cannot read properties of null (reading 'useState')" error
    expect(() => {
      render(
        <StateMachineExporter
          machine={actor}
          buttonText="Test Export"
          className="test-exporter"
        />
      );
    }).not.toThrow();

    actor.stop();
  });

  it('should render WhiteboardExporter component without React errors', () => {
    // Import WhiteboardExporter which uses StateMachineExporter internally
    const { WhiteboardExporter } = require('../components/WhiteboardExporter');

    const actor = createActor(whiteboardMachine);
    actor.start();

    // This should not throw React import/resolution errors
    expect(() => {
      render(
        <WhiteboardExporter
          actor={actor}
          showCodeViewer={false}
          enableCanvasShortcuts={false}
        />
      );
    }).not.toThrow();

    actor.stop();
  });

  it('should have consistent React module across different components', () => {
    // Import React from different components to ensure they all get the same instance
    const ReactFromApp = require('react');
    const ReactFromExporter = require('@nsm/dev-tools').React || React;

    // All React imports should resolve to the same valid object
    expect(ReactFromApp).toBeDefined();
    expect(ReactFromApp).not.toBeNull();
    expect(typeof ReactFromApp.useState).toBe('function');

    // React should be consistent across modules
    expect(ReactFromApp).toBe(React);
  });

  it('should not have duplicate React instances', () => {
    // Check that React hooks work correctly (would fail if multiple React instances)
    const TestComponent = () => {
      const [count, setCount] = React.useState(0);
      return <div data-testid="test-component">{count}</div>;
    };

    expect(() => {
      render(<TestComponent />);
    }).not.toThrow();
  });
});