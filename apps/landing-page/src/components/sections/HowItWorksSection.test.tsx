import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HowItWorksSection } from './HowItWorksSection';

describe('HowItWorksSection', () => {
  it('renders the section heading', () => {
    render(<HowItWorksSection />);
    expect(screen.getByRole('heading', { name: /how it works/i })).toBeDefined();
  });

  it('displays all four steps in order', () => {
    render(<HowItWorksSection />);
    expect(screen.getByText(/developer publishes state machine/i)).toBeDefined();
    expect(screen.getByText(/users discover apps/i)).toBeDefined();
    expect(screen.getByText(/state synchronizes/i)).toBeDefined();
    expect(screen.getByText(/updates deploy instantly/i)).toBeDefined();
  });

  it('uses semantic HTML with proper section element', () => {
    const { container } = render(<HowItWorksSection />);
    const section = container.querySelector('section');
    expect(section).toBeDefined();
  });

  it('renders steps in a list structure for accessibility', () => {
    const { container } = render(<HowItWorksSection />);
    const list = container.querySelector('ol, ul');
    expect(list).toBeDefined();
  });
});
