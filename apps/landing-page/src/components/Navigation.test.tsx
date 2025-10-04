import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Navigation } from './Navigation';
import { ThemeProvider } from '../contexts/ThemeProvider';

describe('Navigation', () => {
  it('renders NSM branding', () => {
    render(
      <ThemeProvider>
        <Navigation />
      </ThemeProvider>
    );
    expect(screen.getByText(/NSM Framework/i)).toBeDefined();
  });

  it('has proper navigation landmark', () => {
    render(
      <ThemeProvider>
        <Navigation />
      </ThemeProvider>
    );
    expect(screen.getByRole('navigation')).toBeDefined();
  });

  it('renders GitHub link', () => {
    render(
      <ThemeProvider>
        <Navigation />
      </ThemeProvider>
    );
    const githubLink = screen.getByRole('link', { name: /github/i });
    expect(githubLink).toBeDefined();
    expect(githubLink.getAttribute('href')).toContain('github.com');
  });
});
