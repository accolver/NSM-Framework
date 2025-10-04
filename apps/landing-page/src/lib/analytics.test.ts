import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock PostHog
vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    opt_in_capturing: vi.fn(),
    opt_out_capturing: vi.fn()
  }
}));

describe('Analytics', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    // Reset environment variables
    import.meta.env.VITE_POSTHOG_KEY = 'test-key';
    import.meta.env.VITE_POSTHOG_HOST = 'https://app.posthog.com';
  });

  it('should initialize PostHog with correct API key', async () => {
    // This test will fail until we implement analytics
    const { initAnalytics } = await import('./analytics');
    expect(initAnalytics).toBeDefined();
  });

  it('should respect Do Not Track setting', async () => {
    // Mock DNT setting
    Object.defineProperty(navigator, 'doNotTrack', {
      value: '1',
      configurable: true
    });

    const { initAnalytics } = await import('./analytics');
    const result = initAnalytics();
    expect(result).toBe(false); // Should not initialize when DNT is set
  });

  it('should track page views', async () => {
    const { trackPageView } = await import('./analytics');
    expect(trackPageView).toBeDefined();
  });

  it('should track CTA clicks', async () => {
    const { trackCTAClick } = await import('./analytics');
    expect(trackCTAClick).toBeDefined();
  });

  it('should track external link clicks', async () => {
    const { trackExternalLink } = await import('./analytics');
    expect(trackExternalLink).toBeDefined();
  });
});
