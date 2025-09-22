import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { App } from '../App';

/**
 * Final Integration Tests - Complete Hook Fix Verification
 *
 * This test suite verifies that the entire React component hierarchy
 * renders without any hook violations, specifically targeting:
 *
 * 1. App.tsx - Main component with complex state management
 * 2. WhiteboardExporter.tsx - Component using StateMachineExporter
 * 3. StateMachineExporter.tsx - Fixed component with hooks before conditionals
 * 4. Complete component tree integration
 */

describe('Final Integration - Complete Hook Fix Verification', () => {
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;

  beforeAll(() => {
    // Mock additional APIs that might be used in the app
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  beforeEach(() => {
    // Capture all console output to check for hook violations
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('Complete App Integration', () => {
    it('should render the complete app without hook violations', async () => {
      let component: any;

      // Render the complete App component
      await act(async () => {
        component = render(<App />);
      });

      // Allow time for all async operations and effects to complete
      await waitFor(() => {
        expect(component.container.textContent).toContain('NSM Collaborative Whiteboard');
      }, { timeout: 2000 });

      // Specifically check for hook violations
      const hookViolations = [...consoleErrorSpy.mock.calls, ...consoleWarnSpy.mock.calls]
        .filter((call: any[]) =>
          call.some((arg: any) => {
            if (typeof arg === 'string') {
              return (
                arg.includes('Invalid hook call') ||
                arg.includes('Hooks can only be called inside of the body of a function component') ||
                arg.includes('breaking the Rules of Hooks') ||
                arg.includes('mismatching versions of React and the renderer') ||
                arg.includes('more than one copy of React in the same app')
              );
            }
            return false;
          })
        );

      // Should have no hook violations
      expect(hookViolations).toHaveLength(0);
    });

    it('should handle component lifecycle without hook errors', async () => {
      let component: any;

      // Test mounting
      await act(async () => {
        component = render(<App />);
      });

      // Allow effects to complete
      await waitFor(() => {
        expect(component.container).toBeDefined();
      }, { timeout: 1000 });

      // Check for hook violations during lifecycle
      const lifecycleErrors = [...consoleErrorSpy.mock.calls, ...consoleWarnSpy.mock.calls]
        .filter((call: any[]) =>
          call.some((arg: any) =>
            typeof arg === 'string' && (
              arg.includes('Invalid hook call') ||
              arg.includes('Hooks can only be called') ||
              arg.includes('breaking the Rules of Hooks')
            )
          )
        );

      expect(lifecycleErrors).toHaveLength(0);
    });
  });
});