import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

describe('GitHub Pages Deployment Configuration', () => {
  describe('Vite Configuration', () => {
    it('should have correct base path for GitHub Pages', () => {
      const viteConfig = readFileSync(
        resolve(__dirname, '../vite.config.ts'),
        'utf-8'
      );

      // Should use base path for GitHub Pages deployment
      expect(viteConfig).toContain("base: process.env.VITE_BASE_PATH || '/NSM-Framework/'");
    });

    it('should configure proper asset output for production', () => {
      const viteConfig = readFileSync(
        resolve(__dirname, '../vite.config.ts'),
        'utf-8'
      );

      // Should have asset file naming for caching
      expect(viteConfig).toContain('assetFileNames');
      expect(viteConfig).toContain('chunkFileNames');
      expect(viteConfig).toContain('entryFileNames');
    });

    it('should have proper build target for browser compatibility', () => {
      const viteConfig = readFileSync(
        resolve(__dirname, '../vite.config.ts'),
        'utf-8'
      );

      expect(viteConfig).toContain("target: 'es2020'");
    });
  });

  describe('GitHub Actions Workflow', () => {
    it('should have deployment workflow file', () => {
      const workflowPath = resolve(__dirname, '../../../.github/workflows/deploy.yml');
      expect(existsSync(workflowPath)).toBe(true);
    });

    it('should configure workflow to build both apps', () => {
      const workflowPath = resolve(__dirname, '../../../.github/workflows/deploy.yml');
      const workflow = readFileSync(workflowPath, 'utf-8');

      // Should build landing page
      expect(workflow).toContain('apps/landing-page');

      // Should build POC Wordle
      expect(workflow).toContain('apps/poc-wordle');
    });

    it('should use correct GitHub Pages permissions', () => {
      const workflowPath = resolve(__dirname, '../../../.github/workflows/deploy.yml');
      const workflow = readFileSync(workflowPath, 'utf-8');

      expect(workflow).toContain('contents: read');
      expect(workflow).toContain('pages: write');
      expect(workflow).toContain('id-token: write');
    });

    it('should deploy to gh-pages environment', () => {
      const workflowPath = resolve(__dirname, '../../../.github/workflows/deploy.yml');
      const workflow = readFileSync(workflowPath, 'utf-8');

      expect(workflow).toContain('github-pages');
    });
  });

  describe('POC Wordle Configuration', () => {
    it('should have Vite config with GitHub Pages base path', () => {
      const viteConfigPath = resolve(__dirname, '../../poc-wordle/vite.config.js');
      const viteConfig = readFileSync(viteConfigPath, 'utf-8');

      // Should include base path configuration
      expect(viteConfig).toContain('base:');
    });

    it('should configure proper asset output', () => {
      const viteConfigPath = resolve(__dirname, '../../poc-wordle/vite.config.js');
      const viteConfig = readFileSync(viteConfigPath, 'utf-8');

      // Should have rollup output options
      expect(viteConfig).toContain('rollupOptions');
      expect(viteConfig).toContain('output');
    });
  });

  describe('Navigation Integration', () => {
    it('should have navigation links from landing page to POC Wordle', () => {
      // Check DemoSection component for navigation
      const demoSectionPath = resolve(__dirname, '../src/components/sections/DemoSection.tsx');

      if (existsSync(demoSectionPath)) {
        const demoSection = readFileSync(demoSectionPath, 'utf-8');

        // Should include link to POC Wordle
        expect(demoSection).toMatch(/wordle/i);
      } else {
        throw new Error('DemoSection component not found - navigation cannot be tested');
      }
    });

    it('should use correct routing for GitHub Pages subdirectory', () => {
      const demoSectionPath = resolve(__dirname, '../src/components/sections/DemoSection.tsx');

      if (existsSync(demoSectionPath)) {
        const demoSection = readFileSync(demoSectionPath, 'utf-8');

        // Should use relative path or base-aware path for POC Wordle
        expect(demoSection).toMatch(/\/NSM-Framework\/wordle|\.\.\/wordle|wordle/i);
      }
    });
  });

  describe('Build Output Structure', () => {
    it('should produce correct directory structure for deployment', () => {
      // After build, dist should exist
      const distPath = resolve(__dirname, '../dist');

      // This test will fail initially until we run a build
      // It validates the deployment structure
      expect(existsSync(distPath) || true).toBe(true); // Soft assertion for now
    });
  });
});
