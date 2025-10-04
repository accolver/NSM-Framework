import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('SEO Configuration', () => {
  const indexHtml = readFileSync(join(__dirname, '../..', 'index.html'), 'utf-8');

  it('should have meta description', () => {
    expect(indexHtml).toContain('name="description"');
    expect(indexHtml).toContain('NSM Framework');
  });

  it('should have Open Graph tags', () => {
    expect(indexHtml).toContain('property="og:title"');
    expect(indexHtml).toContain('property="og:description"');
    expect(indexHtml).toContain('property="og:image"');
    expect(indexHtml).toContain('property="og:url"');
  });

  it('should have Twitter Card tags', () => {
    expect(indexHtml).toContain('name="twitter:card"');
    expect(indexHtml).toContain('name="twitter:title"');
  });

  it('should have canonical URL', () => {
    expect(indexHtml).toContain('rel="canonical"');
  });

  it('should have proper favicon', () => {
    expect(indexHtml).toContain('rel="icon"');
  });
});
