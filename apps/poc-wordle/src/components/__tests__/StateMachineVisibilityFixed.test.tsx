import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App } from '../App';

describe('State Machine Visibility - Fixed Issues', () => {
  beforeEach(() => {
    // Mock window.navigator.clipboard
    Object.defineProperty(window, 'navigator', {
      value: {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      },
      writable: true,
    });

    // Mock console methods to reduce noise
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should render without useState errors in StateMachineExporter', () => {
    expect(() => {
      render(<App />);
    }).not.toThrow();
  });

  it('should display developer dashboard toggle button', () => {
    render(<App />);

    // Should have a toggle button visible
    const toggleElement = screen.getByText(/dashboard/i) ||
                         screen.getByRole('button', { name: /dashboard/i }) ||
                         screen.getByText(/show|hide/i);

    expect(toggleElement).toBeDefined();
  });

  it('should display state machine exporter button', () => {
    render(<App />);

    // Should have an export button or wordle exporter
    const exportButtons = screen.getAllByRole('button').filter(button =>
      button.textContent?.toLowerCase().includes('export') ||
      button.getAttribute('aria-label')?.toLowerCase().includes('export')
    );

    expect(exportButtons.length).toBeGreaterThan(0);
  });

  it('should have accessible state machine components', () => {
    render(<App />);

    // Should have basic game elements that indicate state machine is working
    const gameElements = [
      screen.queryByText(/wordle/i),
      screen.queryByRole('main'),
      screen.queryByText(/nsm/i)
    ].filter(Boolean);

    expect(gameElements.length).toBeGreaterThan(0);
  });

  it('should not have React hooks violations', () => {
    const consoleSpy = vi.spyOn(console, 'error');

    render(<App />);

    // Check that no React hooks errors were logged
    const hasHooksError = consoleSpy.mock.calls.some(call =>
      call.some(arg =>
        typeof arg === 'string' &&
        (arg.includes('useState') ||
         arg.includes('Cannot read properties of null') ||
         arg.includes('Hooks can only be called'))
      )
    );

    expect(hasHooksError).toBe(false);
  });
});