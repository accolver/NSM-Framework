import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeveloperSection } from './DeveloperSection';

describe('DeveloperSection', () => {
  it('renders the section heading', () => {
    render(<DeveloperSection />);
    expect(screen.getByRole('heading', { name: /build without boundaries/i })).toBeDefined();
  });

  it('displays all four key benefits', () => {
    render(<DeveloperSection />);
    expect(screen.getByText(/zero platform fees/i)).toBeDefined();
    expect(screen.getByText(/deterministic state machines/i)).toBeDefined();
    expect(screen.getByText(/multi-user by default/i)).toBeDefined();
    expect(screen.getByText(/platform agnostic/i)).toBeDefined();
  });

  it('renders a CTA link to developer docs', () => {
    render(<DeveloperSection />);
    const ctaLink = screen.getByRole('link', { name: /read developer docs/i });
    expect(ctaLink).toBeDefined();
    expect(ctaLink.getAttribute('href')).toContain('github.com');
  });

  it('uses semantic HTML with proper section element', () => {
    const { container } = render(<DeveloperSection />);
    const section = container.querySelector('section');
    expect(section).toBeDefined();
  });
});
