import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ThemeToggle } from './ThemeToggle';
import { ThemeProvider } from '../contexts/ThemeProvider';

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark', 'light');
  });

  it('should render toggle button', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    expect(screen.getByRole('button', { name: /toggle theme/i })).toBeDefined();
  });

  it('should show sun icon when dark mode is active', () => {
    localStorage.setItem('nsm-theme', 'dark');

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole('button', { name: /toggle theme/i });
    expect(button.getAttribute('aria-label')).toBe('Toggle theme (currently dark)');
  });

  it('should show moon icon when light mode is active', () => {
    localStorage.setItem('nsm-theme', 'light');

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole('button', { name: /toggle theme/i });
    expect(button.getAttribute('aria-label')).toBe('Toggle theme (currently light)');
  });

  it('should toggle theme from light to dark when clicked', async () => {
    const user = userEvent.setup();
    localStorage.setItem('nsm-theme', 'light');

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole('button', { name: /toggle theme/i });
    await user.click(button);

    expect(localStorage.getItem('nsm-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should toggle theme from dark to light when clicked', async () => {
    const user = userEvent.setup();
    localStorage.setItem('nsm-theme', 'dark');

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole('button', { name: /toggle theme/i });
    await user.click(button);

    expect(localStorage.getItem('nsm-theme')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('should toggle from system to explicit theme on first click', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole('button', { name: /toggle theme/i });
    await user.click(button);

    // Should set explicit theme based on current system preference
    const theme = localStorage.getItem('nsm-theme');
    expect(['light', 'dark']).toContain(theme);
  });

  it('should be keyboard accessible', async () => {
    const user = userEvent.setup();
    localStorage.setItem('nsm-theme', 'light');

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole('button', { name: /toggle theme/i });
    button.focus();

    expect(document.activeElement).toBe(button);

    await user.keyboard('{Enter}');
    expect(localStorage.getItem('nsm-theme')).toBe('dark');
  });

  it('should have proper ARIA attributes', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole('button', { name: /toggle theme/i });
    expect(button.getAttribute('aria-label')).toBeTruthy();
    expect(button.getAttribute('type')).toBe('button');
  });
});
