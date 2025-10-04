# Security Configuration for NSM Framework Landing Page

## Content Security Policy (CSP)

For production deployment, configure the following CSP headers in your hosting environment:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://app.posthog.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https://app.posthog.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

## GitHub Pages Configuration

GitHub Pages doesn't support custom headers. For enhanced security:

1. **Custom Domain**: Use a custom domain with Cloudflare or similar CDN
2. **Configure CSP headers** through your CDN
3. **Enable HSTS** for HTTPS enforcement

## Additional Security Headers

Configure these headers in your hosting environment:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## Cache Control

Configure cache headers for optimal performance:

```
# HTML files - no cache
Cache-Control: no-cache, no-store, must-revalidate

# Assets (JS, CSS, images) - long cache with hash-based versioning
Cache-Control: public, max-age=31536000, immutable
```

## Analytics Privacy

PostHog analytics is configured with privacy-first settings:

- **Do Not Track Respect**: Analytics disabled when DNT is set
- **No Auto-capture**: Only manual event tracking
- **No Session Recording**: Session recordings disabled
- **GDPR Compliance**: Opt-in/opt-out support
- **Local Storage Only**: No third-party cookies

## Environment Variables

Never commit these to version control:

```bash
VITE_POSTHOG_KEY=phc_xxxxx
VITE_POSTHOG_HOST=https://app.posthog.com
```

Use GitHub Secrets for deployment:
1. Go to Settings → Secrets → Actions
2. Add `VITE_POSTHOG_KEY` and `VITE_POSTHOG_HOST`
3. Secrets are automatically injected during deployment

## External Links

All external links use `rel="noopener noreferrer"` to prevent:
- **Tabnapping attacks**: Prevents malicious sites from accessing window.opener
- **Referrer leakage**: Prevents sending referrer information

## Dependency Security

Run security audits regularly:

```bash
npm audit
npm audit fix
```

## Reporting Security Issues

If you discover a security vulnerability, please email security@nsm-framework.org instead of using the issue tracker.
