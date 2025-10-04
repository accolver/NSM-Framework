import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DemoSection } from './DemoSection';

describe('DemoSection', () => {
  it('renders section header correctly', () => {
    render(<DemoSection />);

    expect(screen.getByText('See It In Action')).toBeDefined();
    expect(screen.getByText(/Try our Wordle proof-of-concept/i)).toBeDefined();
  });

  it('renders application showcase card', () => {
    render(<DemoSection />);

    expect(screen.getByText('NSM Wordle')).toBeDefined();
    expect(screen.getByText(/Decentralized word game/i)).toBeDefined();
  });

  it('displays tech stack badges', () => {
    render(<DemoSection />);

    expect(screen.getByText('React')).toBeDefined();
    expect(screen.getByText('XState')).toBeDefined();
    expect(screen.getByText('Nostr')).toBeDefined();
    expect(screen.getByText('Blossom')).toBeDefined();
  });

  it('has accessible launch demo button', () => {
    render(<DemoSection />);

    const launchButton = screen.getByRole('link', { name: /Try It/i });
    expect(launchButton).toBeDefined();
    expect(launchButton.getAttribute('target')).toBe('_blank');
    expect(launchButton.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('includes GitHub repository link', () => {
    render(<DemoSection />);

    const githubLink = screen.getByRole('link', { name: /View Source/i });
    expect(githubLink).toBeDefined();
    expect(githubLink.getAttribute('href')).toContain('github.com');
    expect(githubLink.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('renders with proper section structure', () => {
    const { container } = render(<DemoSection />);

    const section = container.querySelector('section');
    expect(section).toBeDefined();
  });

  it('displays future apps placeholder', () => {
    render(<DemoSection />);

    expect(screen.getByText(/More apps coming soon/i)).toBeDefined();
  });

  it('includes call-to-action for developers', () => {
    render(<DemoSection />);

    expect(screen.getByText(/Build the next NSM app/i)).toBeDefined();
  });
});
