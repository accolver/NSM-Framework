# NSM Framework Landing Page

Static marketing site for the Nostr State Machine Framework.

## Tech Stack

- **Build Tool**: Vite
- **Runtime**: Bun
- **Framework**: React 18+ with TypeScript
- **Styling**: TailwindCSS with Ocean Breeze theme
- **UI Components**: ShadCN/UI (to be added)

## Getting Started

### Install Dependencies

```bash
bun install
```

### Development Server

```bash
bun run dev
```

Opens at http://localhost:5170

### Build for Production

```bash
bun run build
```

Outputs to `dist/` directory, optimized for GitHub Pages.

### Preview Production Build

```bash
bun run preview
```

### Run Tests

```bash
bun run test
```

### Type Checking

```bash
bun run typecheck
```

## Project Structure

```
apps/landing-page/
├── src/
│   ├── components/      # React components
│   │   └── ui/         # ShadCN UI components
│   ├── lib/            # Utility functions
│   ├── App.tsx         # Main app component
│   ├── main.tsx        # Entry point
│   ├── index.css       # Global styles + theme
│   └── test-setup.ts   # Test configuration
├── index.html          # HTML template
├── vite.config.ts      # Vite configuration
├── tailwind.config.js  # Tailwind configuration
└── package.json        # Dependencies
```

## Theme

Uses Ocean Breeze theme with semantic color tokens:
- `success` - For success states
- `danger` - For error/destructive actions
- `warning` - For warning states
- `info` - For informational content

No hardcoded colors like `blue-500` - use semantic tokens instead.

## Analytics

The landing page includes PostHog analytics integration with privacy-first configuration:

- **Do Not Track Support**: Automatically respects DNT browser settings
- **Manual Tracking Only**: No automatic event capture for better privacy
- **GDPR Compliance**: Opt-in/opt-out support with localStorage consent
- **No Session Recording**: Session recording is disabled

### Setup Analytics

1. Create a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

2. Add your PostHog API key:

```env
VITE_POSTHOG_KEY=phc_your_api_key_here
VITE_POSTHOG_HOST=https://app.posthog.com
```

3. For production deployment, add secrets to GitHub:
   - Go to repository Settings → Secrets → Actions
   - Add `VITE_POSTHOG_KEY` with your PostHog API key
   - Add `VITE_POSTHOG_HOST` (optional, defaults to https://app.posthog.com)

### Tracked Events

- **Page Views**: Initial page load
- **CTA Clicks**: "Star on GitHub" and "Try Live Demo" buttons
- **External Links**: Clicks to external resources

## Deployment

The landing page is configured for automatic deployment to GitHub Pages.

### Automatic Deployment (GitHub Actions)

The site automatically deploys when changes are pushed to the `main` branch:

1. **Triggers**:
   - Push to `main` branch with changes in `apps/landing-page/`
   - Manual workflow dispatch

2. **Build Process**:
   - Installs dependencies
   - Builds the landing page with production optimizations
   - Deploys to GitHub Pages

3. **Environment Variables**:
   - `VITE_POSTHOG_KEY`: PostHog analytics key (from GitHub Secrets)
   - `VITE_POSTHOG_HOST`: PostHog host URL (from GitHub Secrets, optional)
   - `VITE_BASE_PATH`: Base path for GitHub Pages (set to `/NSM-Framework/`)

### GitHub Pages Setup

To enable GitHub Pages deployment:

1. Go to repository Settings → Pages
2. Set Source to "GitHub Actions"
3. The workflow will automatically deploy on the next push to main

### Manual Deployment

To deploy manually to any static hosting:

```bash
# Build the site
npm run build

# The dist/ folder contains the static site
# Upload contents to your hosting provider
```

### Custom Domain

To use a custom domain:

1. Update the canonical URL in `index.html`
2. Update Open Graph and Twitter Card URLs
3. Set `VITE_BASE_PATH` to `/` in the workflow
4. Configure your domain in GitHub Pages settings

## SEO Configuration

The landing page includes comprehensive SEO optimization:

### Meta Tags
- Primary meta tags (title, description, keywords)
- Open Graph tags for Facebook/LinkedIn sharing
- Twitter Card tags for Twitter sharing
- Canonical URL for search engines
- Theme color for mobile browsers

### Social Sharing
- **Image**: Add an `og-image.png` (1200x630px) to the `public/` folder
- **Title**: "NSM Framework - Nostr State Machine Framework"
- **Description**: Optimized for social media previews

### Performance
- Preconnect to PostHog for faster analytics loading
- Asset hashing for optimal caching
- Code splitting for faster initial load
- Optimized bundle size with separate vendor and analytics chunks

## Security

- `.env` files are gitignored to prevent secret leaks
- External links use `rel="noopener noreferrer"` for security
- Analytics respects user privacy with DNT support
- No inline scripts (Content Security Policy friendly)

## Performance Budgets

- **Initial Bundle**: < 500KB
- **Total Assets**: < 2MB
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1

Build warnings will appear if bundles exceed 1000KB.
