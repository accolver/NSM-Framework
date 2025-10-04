import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DemoSection } from '../src/components/sections/DemoSection';
import React from 'react';

describe('GitHub Pages Routing', () => {
  describe('DemoSection Navigation', () => {
    it('should render link to POC Wordle', () => {
      render(React.createElement(DemoSection));

      const wordleLink = screen.getByRole('link', { name: /try it/i });
      expect(wordleLink).toBeTruthy();
      expect(wordleLink.getAttribute('href')).toBe('/NSM-Framework/wordle/');
    });

    it('should open POC Wordle in new tab', () => {
      render(React.createElement(DemoSection));

      const wordleLink = screen.getByRole('link', { name: /try it/i });
      expect(wordleLink.getAttribute('target')).toBe('_blank');
      expect(wordleLink.getAttribute('rel')).toBe('noopener noreferrer');
    });

    it('should render GitHub source link', () => {
      render(React.createElement(DemoSection));

      const sourceLink = screen.getByRole('link', { name: /view source/i });
      expect(sourceLink).toBeTruthy();
      expect(sourceLink.getAttribute('href')).toBe('https://github.com/accolver/NSM-Framework/tree/main/apps/poc-wordle');
    });

    it('should render Get Started link to GitHub', () => {
      render(React.createElement(DemoSection));

      const getStartedLink = screen.getByRole('link', { name: /get started/i });
      expect(getStartedLink).toBeTruthy();
      expect(getStartedLink.getAttribute('href')).toBe('https://github.com/accolver/NSM-Framework');
    });
  });

  describe('Base Path Configuration', () => {
    it('should use absolute paths for GitHub Pages', () => {
      render(React.createElement(DemoSection));

      const wordleLink = screen.getByRole('link', { name: /try it/i });
      const href = wordleLink.getAttribute('href');

      // Should start with base path
      expect(href).toMatch(/^\/NSM-Framework\//);
    });

    it('should include trailing slash for SPA routing', () => {
      render(React.createElement(DemoSection));

      const wordleLink = screen.getByRole('link', { name: /try it/i });
      const href = wordleLink.getAttribute('href');

      // Should end with trailing slash
      expect(href).toMatch(/\/$/);
    });
  });
});
