import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StateMachineExporter } from '@nsm/dev-tools';

/**
 * Verification Tests for React Hook Fixes
 *
 * These tests specifically target the hook violations that were fixed:
 * 1. StateMachineExporter calling hooks after conditional returns
 * 2. Consistent hook call order regardless of component props
 * 3. No "Invalid hook call" errors in component lifecycle
 */

describe('Hook Fix Verification - Integration Tests', () => {
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    // Capture both errors and warnings to detect hook violations
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('StateMachineExporter Hook Consistency', () => {
    it('should call hooks consistently when machine is null', async () => {
      let component: any;

      // Test with null machine (early return case)
      await act(async () => {
        component = render(<StateMachineExporter machine={null} />);
      });

      expect(component.container).toBeDefined();

      // Check for hook violations
      const hookErrors = [...consoleErrorSpy.mock.calls, ...consoleWarnSpy.mock.calls]
        .filter((call: any[]) =>
          call.some((arg: any) =>
            typeof arg === 'string' && (
              arg.includes('Invalid hook call') ||
              arg.includes('Hooks can only be called') ||
              arg.includes('breaking the Rules of Hooks')
            )
          )
        );

      expect(hookErrors).toHaveLength(0);
    });

    it('should call hooks consistently when machine is provided', async () => {
      const mockMachine = {
        id: 'test-machine',
        getSnapshot: vi.fn(() => ({ value: 'idle', context: {} })),
        send: vi.fn(),
        start: vi.fn(),
        stop: vi.fn()
      };

      let component: any;

      // Test with valid machine
      await act(async () => {
        component = render(<StateMachineExporter machine={mockMachine} />);
      });

      expect(component.container).toBeDefined();

      // Check for hook violations
      const hookErrors = [...consoleErrorSpy.mock.calls, ...consoleWarnSpy.mock.calls]
        .filter((call: any[]) =>
          call.some((arg: any) =>
            typeof arg === 'string' && (
              arg.includes('Invalid hook call') ||
              arg.includes('Hooks can only be called') ||
              arg.includes('breaking the Rules of Hooks')
            )
          )
        );

      expect(hookErrors).toHaveLength(0);
    });

    it('should maintain hook consistency when switching between null and valid machine', async () => {
      const mockMachine = {
        id: 'test-machine',
        getSnapshot: vi.fn(() => ({ value: 'idle', context: {} })),
        send: vi.fn(),
        start: vi.fn(),
        stop: vi.fn()
      };

      let component: any;

      // First render with null
      await act(async () => {
        component = render(<StateMachineExporter machine={null} />);
      });

      // Re-render with machine
      await act(async () => {
        component.rerender(<StateMachineExporter machine={mockMachine} />);
      });

      // Re-render back to null
      await act(async () => {
        component.rerender(<StateMachineExporter machine={null} />);
      });

      // Check that no hook violations occurred during re-renders
      const hookErrors = [...consoleErrorSpy.mock.calls, ...consoleWarnSpy.mock.calls]
        .filter((call: any[]) =>
          call.some((arg: any) =>
            typeof arg === 'string' && (
              arg.includes('Invalid hook call') ||
              arg.includes('Hooks can only be called') ||
              arg.includes('breaking the Rules of Hooks')
            )
          )
        );

      expect(hookErrors).toHaveLength(0);
    });

    it('should handle all hook-dependent features without violations', async () => {
      const mockMachine = {
        id: 'test-machine',
        getSnapshot: vi.fn(() => ({ value: 'idle', context: {} })),
        send: vi.fn(),
        start: vi.fn(),
        stop: vi.fn()
      };

      let component: any;

      // Test with all features enabled
      await act(async () => {
        component = render(
          <StateMachineExporter
            machine={mockMachine}
            showCodeViewer={true}
            enableKeyboardShortcut={true}
            buttonText="Test Export"
            className="test-class"
            onExportSuccess={() => {}}
            onExportError={() => {}}
          />
        );
      });

      // Let effects and async operations complete
      await waitFor(() => {
        expect(component.container.textContent).toContain('Test Export');
      }, { timeout: 1000 });

      // Check that no hook violations occurred
      const hookErrors = [...consoleErrorSpy.mock.calls, ...consoleWarnSpy.mock.calls]
        .filter((call: any[]) =>
          call.some((arg: any) =>
            typeof arg === 'string' && (
              arg.includes('Invalid hook call') ||
              arg.includes('Hooks can only be called') ||
              arg.includes('breaking the Rules of Hooks')
            )
          )
        );

      expect(hookErrors).toHaveLength(0);
    });
  });

  describe('Hook Call Order Verification', () => {
    it('should call the same number of hooks regardless of machine state', () => {
      // This test ensures hook consistency by checking that no hook violations occur
      const mockMachine = {
        id: 'test-machine',
        getSnapshot: vi.fn(() => ({ value: 'idle', context: {} })),
        send: vi.fn()
      };

      // Clear any previous calls
      consoleErrorSpy.mockClear();
      consoleWarnSpy.mockClear();

      // First render with machine
      const { unmount: unmount1 } = render(<StateMachineExporter machine={mockMachine} />);

      // Check for hook violations in first render
      const hookErrorsWithMachine = [...consoleErrorSpy.mock.calls, ...consoleWarnSpy.mock.calls]
        .filter((call: any[]) =>
          call.some((arg: any) =>
            typeof arg === 'string' && (
              arg.includes('Invalid hook call') ||
              arg.includes('Hooks can only be called') ||
              arg.includes('breaking the Rules of Hooks')
            )
          )
        );

      // Clean up
      unmount1();
      consoleErrorSpy.mockClear();
      consoleWarnSpy.mockClear();

      // Second render without machine
      const { unmount: unmount2 } = render(<StateMachineExporter machine={null} />);

      // Check for hook violations in second render
      const hookErrorsWithoutMachine = [...consoleErrorSpy.mock.calls, ...consoleWarnSpy.mock.calls]
        .filter((call: any[]) =>
          call.some((arg: any) =>
            typeof arg === 'string' && (
              arg.includes('Invalid hook call') ||
              arg.includes('Hooks can only be called') ||
              arg.includes('breaking the Rules of Hooks')
            )
          )
        );

      // Clean up
      unmount2();

      // Both renders should have zero hook violations
      expect(hookErrorsWithMachine).toHaveLength(0);
      expect(hookErrorsWithoutMachine).toHaveLength(0);
    });
  });

  describe('React Version Consistency Check', () => {
    it('should not report React version mismatches', async () => {
      const mockMachine = {
        id: 'test-machine',
        getSnapshot: vi.fn(() => ({ value: 'idle', context: {} })),
        send: vi.fn()
      };

      await act(async () => {
        render(<StateMachineExporter machine={mockMachine} />);
      });

      // Check specifically for React version mismatch errors
      const versionErrors = [...consoleErrorSpy.mock.calls, ...consoleWarnSpy.mock.calls]
        .filter((call: any[]) =>
          call.some((arg: any) =>
            typeof arg === 'string' && (
              arg.includes('mismatching versions') ||
              arg.includes('more than one copy of React') ||
              arg.includes('different versions of React')
            )
          )
        );

      expect(versionErrors).toHaveLength(0);
    });
  });
});