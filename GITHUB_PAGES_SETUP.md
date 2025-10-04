# GitHub Pages Setup - NSM Framework

This document provides instructions for setting up and maintaining the GitHub Pages deployment for the NSM Framework project.

## Quick Start

The project is configured for automatic deployment to GitHub Pages. Every push to `main` that affects the landing page or POC Wordle will trigger a deployment.

**Live URLs:**
- Landing Page: https://accolver.github.io/NSM-Framework/
- POC Wordle: https://accolver.github.io/NSM-Framework/wordle/

## Architecture

### Multi-App Deployment Structure

```
GitHub Pages Root (https://accolver.github.io/NSM-Framework/)
├── index.html              # Landing page
├── assets/                 # Landing page assets
├── robots.txt
├── sitemap.xml
└── wordle/                 # POC Wordle subdirectory
    ├── index.html
    └── assets/
```

### Base Path Configuration

Both apps use environment-configurable base paths:

**Landing Page** (`apps/landing-page/vite.config.ts`):
```ts
base: process.env.VITE_BASE_PATH || '/NSM-Framework/'
```

**POC Wordle** (`apps/poc-wordle/vite.config.js`):
```ts
base: process.env.VITE_BASE_PATH || '/NSM-Framework/wordle/'
```

## GitHub Actions Workflow

### File: `.github/workflows/deploy.yml`

The workflow consists of two jobs:

#### 1. Build Job
- **Triggers**: Push to `main`, changes to apps/packages, manual dispatch
- **Steps**:
  1. Checkout repository
  2. Setup Bun runtime
  3. Install dependencies with `bun install --frozen-lockfile`
  4. Build workspace packages
  5. Build landing page with `VITE_BASE_PATH=/NSM-Framework/`
  6. Build POC Wordle with `VITE_BASE_PATH=/NSM-Framework/wordle/`
  7. Prepare deployment directory structure
  8. Upload as GitHub Pages artifact

#### 2. Deploy Job
- **Depends on**: Build job
- **Environment**: `github-pages`
- **Action**: Deploy artifact to GitHub Pages

### Required Permissions

```yaml
permissions:
  contents: read      # Read repository content
  pages: write        # Write to GitHub Pages
  id-token: write     # Authentication for deployment
```

### Environment Variables

**Landing Page**:
- `VITE_POSTHOG_KEY`: PostHog analytics key (optional)
- `VITE_POSTHOG_HOST`: PostHog host URL (optional)
- `VITE_BASE_PATH`: Deployment base path (set by workflow)

**POC Wordle**:
- `VITE_BASE_PATH`: Deployment base path (set by workflow)

## Testing Deployment Configuration

### Run All Tests
```bash
cd apps/landing-page
bun test
```

### Test Categories

1. **Deployment Configuration** (`tests/deployment.test.ts`):
   - Vite base path settings
   - Asset output configuration
   - Browser compatibility targets

2. **Navigation** (`tests/routing.test.ts`):
   - Links to POC Wordle
   - External GitHub links
   - Base path routing

3. **Workflow Validation** (`tests/workflow-validation.test.ts`):
   - YAML syntax validation
   - Job configuration
   - Base path settings
   - Trigger conditions

### Running Specific Tests
```bash
# Deployment tests
bun test -- deployment.test.ts

# Routing tests
bun test -- routing.test.ts

# Workflow validation
bun test -- workflow-validation.test.ts
```

## Local Development

### Landing Page
```bash
cd apps/landing-page
bun dev  # http://localhost:5170
```

### POC Wordle
```bash
cd apps/poc-wordle
bun dev  # http://localhost:5174
```

### Testing Production Build Locally

1. **Build both apps**:
   ```bash
   bun run build --filter=nsm-landing-page
   cd apps/poc-wordle && bun run build
   ```

2. **Create deployment structure**:
   ```bash
   mkdir -p _site
   cp -r apps/landing-page/dist/* _site/
   mkdir -p _site/wordle
   cp -r apps/poc-wordle/dist/* _site/wordle/
   ```

3. **Serve locally**:
   ```bash
   npx serve _site -p 8080
   # Visit http://localhost:8080
   ```

## Manual Deployment

To manually trigger a deployment:

1. Go to [GitHub Actions](https://github.com/accolver/NSM-Framework/actions)
2. Select "Deploy to GitHub Pages" workflow
3. Click "Run workflow"
4. Select `main` branch
5. Click "Run workflow" button

## Adding New Apps

To add a new application to the deployment:

### 1. Configure Vite Base Path

```ts
// apps/new-app/vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/NSM-Framework/new-app/',
  // ... rest of config
});
```

### 2. Update Deployment Workflow

Edit `.github/workflows/deploy.yml`:

```yaml
- name: Build new app
  working-directory: apps/new-app
  env:
    VITE_BASE_PATH: '/NSM-Framework/new-app/'
  run: bun run build

- name: Prepare deployment directory
  run: |
    mkdir -p _site
    cp -r apps/landing-page/dist/* _site/
    mkdir -p _site/wordle
    cp -r apps/poc-wordle/dist/* _site/wordle/
    mkdir -p _site/new-app  # Add this
    cp -r apps/new-app/dist/* _site/new-app/  # Add this
```

### 3. Add Navigation from Landing Page

Edit `apps/landing-page/src/components/sections/DemoSection.tsx`:

```tsx
<a href="/NSM-Framework/new-app/">
  <Button>Try New App</Button>
</a>
```

### 4. Update Tests

Create deployment tests for the new app in `apps/landing-page/tests/deployment.test.ts`.

## Troubleshooting

### Assets Not Loading (404 Errors)

**Symptom**: CSS, JS, or images return 404 errors

**Solution**:
1. Check `base` path in `vite.config.ts` matches deployment path
2. Verify HTML uses correct asset paths (inspect with browser dev tools)
3. Ensure deployment structure is correct

### Routing Issues Between Apps

**Symptom**: Links between landing page and POC Wordle don't work

**Solution**:
1. Use absolute paths: `/NSM-Framework/wordle/`
2. Ensure trailing slash for SPA routing
3. Test locally with production build

### Build Failures in GitHub Actions

**Symptom**: Workflow fails during build step

**Solution**:
1. Review GitHub Actions logs for specific error
2. Verify all workspace packages build successfully locally
3. Check that dependencies are correctly specified
4. Ensure Bun version compatibility

### Navigation to Subdirectory Shows 404

**Symptom**: `/NSM-Framework/wordle/` returns 404

**Solution**:
1. Verify subdirectory exists in deployment artifact
2. Check workflow creates correct directory structure
3. Ensure `index.html` exists in subdirectory

## Monitoring

### Deployment Status
Monitor deployments at: https://github.com/accolver/NSM-Framework/deployments

### Analytics
Landing page includes PostHog analytics (if configured):
- Set `VITE_POSTHOG_KEY` secret in GitHub repository settings
- Analytics automatically track page views and interactions

## Security

### Permissions
The workflow uses minimal required permissions:
- `contents: read` - Only reads repository content
- `pages: write` - Only writes to GitHub Pages
- `id-token: write` - Only for deployment authentication

### Secrets
Store sensitive data in GitHub repository secrets:
- `VITE_POSTHOG_KEY` - PostHog analytics key (optional)
- `VITE_POSTHOG_HOST` - PostHog host URL (optional)

## Documentation

- **Deployment Guide**: See `docs/DEPLOYMENT.md`
- **Workflow File**: `.github/workflows/deploy.yml`
- **Tests**: `apps/landing-page/tests/`

## Support

For issues or questions:
1. Check this document and `docs/DEPLOYMENT.md`
2. Review GitHub Actions logs
3. Run local tests to validate configuration
4. Open an issue on GitHub
