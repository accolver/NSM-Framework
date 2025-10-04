import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import { ThemeProvider } from './contexts/ThemeProvider';

describe('App', () => {
  it('renders the hero headline', () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    );
    expect(screen.getByText('Build Censorship-Resistant Apps on Nostr')).toBeDefined();
  });

  it('renders the navigation', () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    );
    expect(screen.getByRole('navigation')).toBeDefined();
    expect(screen.getByText('NSM Framework')).toBeDefined();
  });

  it('renders the three feature cards', () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    );
    expect(screen.getByText('Deterministic')).toBeDefined();
    expect(screen.getByText('Multi-User')).toBeDefined();
    expect(screen.getByText('Nostr-Native')).toBeDefined();
  });

  it('renders the footer', () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    );
    expect(screen.getByRole('contentinfo')).toBeDefined();
  });

  it('includes demo section with live showcase', () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    );
    expect(screen.getByText('See It In Action')).toBeDefined();
    expect(screen.getByText('NSM Wordle')).toBeDefined();
  });
});
