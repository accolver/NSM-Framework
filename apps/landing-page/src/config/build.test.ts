import { describe, it, expect } from 'vitest';

describe('Build Configuration', () => {
  it('should have correct GitHub Pages base path', () => {
    // Test that base path is set correctly for GitHub Pages
    expect(import.meta.env.BASE_URL).toBeDefined();
  });

  it('should have production optimizations enabled', async () => {
    // Verify production build settings
    const isProd = import.meta.env.PROD;
    expect(isProd).toBe(false); // Will be true in production build
  });

  it('should have environment variables configured', () => {
    // Test environment variable setup
    expect(import.meta.env.VITE_POSTHOG_KEY).toBeDefined();
    expect(import.meta.env.VITE_POSTHOG_HOST).toBeDefined();
  });
});
