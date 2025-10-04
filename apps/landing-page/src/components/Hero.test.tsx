import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Hero } from './Hero';

describe('Hero', () => {
  it('renders the main headline', () => {
    render(<Hero />);
    expect(screen.getByText('Build Censorship-Resistant Apps on Nostr')).toBeDefined();
  });

  it('renders the subheading with framework benefits', () => {
    render(<Hero />);
    expect(screen.getByText(/deterministic state management/i)).toBeDefined();
  });

  it('renders primary CTA for GitHub', () => {
    render(<Hero />);
    const githubButton = screen.getByRole('link', { name: /star on github/i });
    expect(githubButton).toBeDefined();
    expect(githubButton.getAttribute('href')).toContain('github.com');
  });

  it('renders secondary CTA for demo', () => {
    render(<Hero />);
    const demoButton = screen.getByRole('button', { name: /try live demo/i });
    expect(demoButton).toBeDefined();
  });

  it('is accessible with proper heading hierarchy', () => {
    render(<Hero />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe('Build Censorship-Resistant Apps on Nostr');
  });
});
