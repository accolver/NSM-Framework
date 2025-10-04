import posthog from 'posthog-js';

let isInitialized = false;

/**
 * Initialize PostHog analytics with privacy-first configuration
 * Respects Do Not Track (DNT) setting
 * @returns {boolean} Whether analytics was successfully initialized
 */
export function initAnalytics(): boolean {
  // Respect Do Not Track setting
  const dnt = navigator.doNotTrack || (window as any).doNotTrack || (navigator as any).msDoNotTrack;
  if (dnt === '1' || dnt === 'yes') {
    console.log('Analytics disabled: Do Not Track is enabled');
    return false;
  }

  // Check for required environment variables
  const apiKey = import.meta.env.VITE_POSTHOG_KEY;
  const apiHost = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';

  if (!apiKey) {
    console.warn('Analytics not initialized: VITE_POSTHOG_KEY not configured');
    return false;
  }

  if (isInitialized) {
    return true;
  }

  try {
    posthog.init(apiKey, {
      api_host: apiHost,
      // Privacy-focused configuration
      respect_dnt: true,
      autocapture: false, // Manual tracking only for better privacy
      capture_pageview: false, // Manual page view tracking
      capture_pageleave: true,
      disable_session_recording: true, // No session recordings
      persistence: 'localStorage',
      persistence_name: 'nsm_analytics',
      // GDPR compliance
      opt_out_capturing_by_default: false,
      loaded: (ph) => {
        // Enable if user has previously opted in
        if (localStorage.getItem('nsm_analytics_consent') === 'true') {
          ph.opt_in_capturing();
        }
      }
    });

    isInitialized = true;
    return true;
  } catch (error) {
    console.error('Failed to initialize analytics:', error);
    return false;
  }
}

/**
 * Track page view event
 * @param {string} path - Page path to track
 */
export function trackPageView(path?: string): void {
  if (!isInitialized) return;

  posthog.capture('$pageview', {
    $current_url: path || window.location.href
  });
}

/**
 * Track CTA button clicks
 * @param {string} ctaName - Name of the CTA button
 * @param {string} ctaType - Type of CTA (primary, secondary, etc.)
 */
export function trackCTAClick(ctaName: string, ctaType: string = 'primary'): void {
  if (!isInitialized) return;

  posthog.capture('cta_click', {
    cta_name: ctaName,
    cta_type: ctaType,
    page_section: document.activeElement?.closest('section')?.id || 'unknown'
  });
}

/**
 * Track external link clicks
 * @param {string} url - External URL being clicked
 * @param {string} linkText - Text of the link
 */
export function trackExternalLink(url: string, linkText: string): void {
  if (!isInitialized) return;

  posthog.capture('external_link_click', {
    url,
    link_text: linkText,
    page_section: document.activeElement?.closest('section')?.id || 'unknown'
  });
}

/**
 * Opt user into analytics tracking
 */
export function optInAnalytics(): void {
  localStorage.setItem('nsm_analytics_consent', 'true');
  if (isInitialized) {
    posthog.opt_in_capturing();
  }
}

/**
 * Opt user out of analytics tracking
 */
export function optOutAnalytics(): void {
  localStorage.removeItem('nsm_analytics_consent');
  if (isInitialized) {
    posthog.opt_out_capturing();
  }
}
