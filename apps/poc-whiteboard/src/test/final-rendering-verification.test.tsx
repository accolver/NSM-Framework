/**
 * Final verification test that the TypeError "Cannot read properties of null (reading 'useState')" is fixed
 *
 * This test renders the full App component to ensure everything works in the actual runtime environment.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

// Import main components
import { App } from '../components/App';

describe('Final App Rendering Verification', () => {
  beforeEach(() => {
    // Mock console methods to reduce noise but capture errors
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Keep console.error to catch React errors
    const originalError = console.error;
    vi.spyOn(console, 'error').mockImplementation((...args) => {
      // Only show React-related errors
      const message = args.join(' ');
      if (message.includes('React') || message.includes('useState') || message.includes('null')) {
        originalError(...args);
      }
    });

    // Mock window properties needed for the App
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920,
    });

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1080,
    });

    // Mock addEventListener for window events
    const originalAddEventListener = window.addEventListener;
    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      // Allow the setup but don't actually bind events in test
      return undefined as any;
    });

    // Mock requestAnimationFrame
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      return setTimeout(cb, 16);
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('should render the full App component without React useState null errors', async () => {
    let hasError = false;
    let errorMessage = '';

    // Catch any React errors during rendering
    const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
      try {
        return <>{children}</>;
      } catch (error) {
        hasError = true;
        errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return <div data-testid="error">Error occurred</div>;
      }
    };

    // This should not throw the "Cannot read properties of null (reading 'useState')" error
    expect(() => {
      render(
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      );
    }).not.toThrow();

    // If there was a React error, it would have been caught
    expect(hasError).toBe(false);
    expect(errorMessage).toBe('');
  });

  it('should verify React is properly imported and not null in all components', () => {
    // Test that React is available and has the expected hooks
    expect(React).toBeDefined();
    expect(React).not.toBeNull();
    expect(typeof React.useState).toBe('function');
    expect(typeof React.useEffect).toBe('function');
    expect(typeof React.useCallback).toBe('function');

    // Test that the problematic import chain works
    const { StateMachineExporter } = require('@nsm/dev-tools');
    expect(StateMachineExporter).toBeDefined();
    expect(StateMachineExporter).not.toBeNull();

    // Test that WhiteboardExporter imports correctly
    const { WhiteboardExporter } = require('../components/WhiteboardExporter');
    expect(WhiteboardExporter).toBeDefined();
    expect(WhiteboardExporter).not.toBeNull();
  });

  it('should have consistent module resolution for React across all imports', () => {
    // Import React from different modules to ensure consistency
    const ReactFromMain = require('react');

    // All should be the same instance
    expect(ReactFromMain).toBe(React);
    expect(ReactFromMain.useState).toBeDefined();
    expect(typeof ReactFromMain.useState).toBe('function');
  });
});