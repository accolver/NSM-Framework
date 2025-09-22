import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { App } from '../App';
import { WhiteboardExporter } from '../WhiteboardExporter';
import { StateMachineExporter } from '@nsm/dev-tools';

/**
 * TDD Tests for React Hooks Violations
 *
 * These tests verify that React hooks are called correctly and consistently
 * according to the Rules of Hooks:
 * 1. Only call hooks at the top level of React functions
 * 2. Don't call hooks inside loops, conditions, or nested functions
 * 3. Only call hooks from React function components or custom hooks
 */

describe('React Hooks Violations - TDD Tests', () => {
  let consoleErrorSpy: any;

  beforeEach(() => {
    // Spy on console.error to catch hook violations
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('App Component Hook Violations', () => {
    it('should not call hooks conditionally', () => {
      // This test should pass after fixing conditional hook calls
      const renderApp = () => render(<App />);

      expect(renderApp).not.toThrow();

      // Check that no "Invalid hook call" errors were logged
      const hookErrors = consoleErrorSpy.mock.calls.filter((call: any[]) =>
        call.some((arg: any) =>
          typeof arg === 'string' && arg.includes('Invalid hook call')
        )
      );

      expect(hookErrors).toHaveLength(0);
    });

    it('should initialize all state hooks at the top level', async () => {
      // All useState calls should be at the top level, not conditional
      let component;
      await act(async () => {
        component = render(<App />);
      });

      // App should render without hook call errors
      expect(component.container.textContent).toContain('NSM Collaborative Whiteboard');

      const hookErrors = consoleErrorSpy.mock.calls.filter((call: any[]) =>
        call.some((arg: any) =>
          typeof arg === 'string' && (
            arg.includes('Invalid hook call') ||
            arg.includes('Hooks can only be called inside of the body of a function component')
          )
        )
      );

      expect(hookErrors).toHaveLength(0);
    });

    it('should not have mismatched React versions', () => {
      // Test that React and React DOM versions are consistent
      render(<App />);

      const versionErrors = consoleErrorSpy.mock.calls.filter((call: any[]) =>
        call.some((arg: any) =>
          typeof arg === 'string' && (
            arg.includes('mismatching versions') ||
            arg.includes('more than one copy of React')
          )
        )
      );

      expect(versionErrors).toHaveLength(0);
    });
  });

  describe('WhiteboardExporter Hook Violations', () => {
    it('should not call hooks conditionally in WhiteboardExporter', () => {
      const mockActor = {
        getSnapshot: () => ({ value: 'idle', context: {} }),
        send: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        subscribe: vi.fn()
      };

      const renderComponent = () => render(
        <WhiteboardExporter
          actor={mockActor}
          showCodeViewer={false}
          enableCanvasShortcuts={true}
        />
      );

      expect(renderComponent).not.toThrow();

      const hookErrors = consoleErrorSpy.mock.calls.filter((call: any[]) =>
        call.some((arg: any) =>
          typeof arg === 'string' && arg.includes('Invalid hook call')
        )
      );

      expect(hookErrors).toHaveLength(0);
    });
  });

  describe('StateMachineExporter Hook Violations', () => {
    it('should handle null machine without hook violations', () => {
      // This tests the early return case in StateMachineExporter
      const renderComponent = () => render(
        <StateMachineExporter machine={null} />
      );

      expect(renderComponent).not.toThrow();

      const hookErrors = consoleErrorSpy.mock.calls.filter((call: any[]) =>
        call.some((arg: any) =>
          typeof arg === 'string' && arg.includes('Invalid hook call')
        )
      );

      expect(hookErrors).toHaveLength(0);
    });

    it('should call all hooks before any early returns', () => {
      // This test ensures hooks are called consistently regardless of conditions
      const mockMachine = {
        getSnapshot: () => ({ value: 'idle', context: {} }),
        send: vi.fn()
      };

      const renderWithMachine = () => render(
        <StateMachineExporter machine={mockMachine} />
      );

      const renderWithoutMachine = () => render(
        <StateMachineExporter machine={null} />
      );

      // Both renders should work without hook violations
      expect(renderWithMachine).not.toThrow();
      expect(renderWithoutMachine).not.toThrow();

      const hookErrors = consoleErrorSpy.mock.calls.filter((call: any[]) =>
        call.some((arg: any) =>
          typeof arg === 'string' && arg.includes('Invalid hook call')
        )
      );

      expect(hookErrors).toHaveLength(0);
    });
  });

  describe('Component Hierarchy Hook Violations', () => {
    it('should not have hook violations in nested component structure', () => {
      // Test the complete component hierarchy for hook violations
      const renderApp = () => render(<App />);

      expect(renderApp).not.toThrow();

      // Wait for any async effects to complete
      return new Promise(resolve => setTimeout(resolve, 100)).then(() => {
        const allErrors = consoleErrorSpy.mock.calls.filter((call: any[]) =>
          call.some((arg: any) =>
            typeof arg === 'string' && (
              arg.includes('Invalid hook call') ||
              arg.includes('Hooks can only be called') ||
              arg.includes('breaking the Rules of Hooks')
            )
          )
        );

        expect(allErrors).toHaveLength(0);
      });
    });
  });
});