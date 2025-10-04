import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserSection } from './UserSection';

describe('UserSection', () => {
  it('renders the section heading', () => {
    render(<UserSection />);
    expect(screen.getByRole('heading', { name: /your data, your control/i })).toBeDefined();
  });

  it('displays all four key benefits', () => {
    render(<UserSection />);
    expect(screen.getByText(/censorship resistant/i)).toBeDefined();
    expect(screen.getByText(/data sovereignty/i)).toBeDefined();
    expect(screen.getByText(/true portability/i)).toBeDefined();
    expect(screen.getByText(/privacy first/i)).toBeDefined();
  });

  it('renders a CTA to try an application', () => {
    render(<UserSection />);
    const ctaButton = screen.getByRole('button', { name: /try an application/i });
    expect(ctaButton).toBeDefined();
  });

  it('uses semantic HTML with proper section element', () => {
    const { container } = render(<UserSection />);
    const section = container.querySelector('section');
    expect(section).toBeDefined();
  });
});
