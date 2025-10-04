import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Layout } from './Layout';
import { ThemeProvider } from '../contexts/ThemeProvider';

describe('Layout', () => {
  it('renders children content', () => {
    render(
      <ThemeProvider>
        <Layout>
          <div data-testid="test-content">Test Content</div>
        </Layout>
      </ThemeProvider>
    );
    expect(screen.getByTestId('test-content')).toBeDefined();
  });

  it('includes navigation', () => {
    render(
      <ThemeProvider>
        <Layout><div>Content</div></Layout>
      </ThemeProvider>
    );
    expect(screen.getByRole('navigation')).toBeDefined();
  });

  it('includes footer', () => {
    render(
      <ThemeProvider>
        <Layout><div>Content</div></Layout>
      </ThemeProvider>
    );
    expect(screen.getByRole('contentinfo')).toBeDefined();
  });

  it('applies proper main landmark', () => {
    render(
      <ThemeProvider>
        <Layout><div>Content</div></Layout>
      </ThemeProvider>
    );
    expect(screen.getByRole('main')).toBeDefined();
  });
});
