import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from './Footer';

describe('Footer', () => {
  it('renders footer content', () => {
    render(<Footer />);
    expect(screen.getByRole('contentinfo')).toBeDefined();
  });

  it('renders social links', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: /github/i })).toBeDefined();
  });

  it('renders copyright or attribution text', () => {
    render(<Footer />);
    expect(screen.getByText(/NSM Framework/i)).toBeDefined();
  });
});
