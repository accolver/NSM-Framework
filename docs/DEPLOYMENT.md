# GitHub Pages Deployment Guide

This document describes the GitHub Pages deployment setup for the NSM Framework project.

## Overview

The NSM Framework project uses GitHub Pages to host:
1. **Landing Page** - Marketing site at the root (`/NSM-Framework/`)
2. **POC Wordle** - Demo application at subdirectory (`/NSM-Framework/wordle/`)

## Deployment Architecture

### URL Structure
```
https://accolver.github.io/NSM-Framework/         # Landing page
https://accolver.github.io/NSM-Framework/wordle/  # POC Wordle app
```

### Build Configuration

#### Package Dependencies
The deployment requires these packages to be built first:
1. **@nsm/core** - Core types and interfaces
2. **@nsm/crypto** - Cryptographic utilities
3. **@nsm/client-sdk** - Client SDK (depends on core and crypto)
4. **@nsm/client** - Browser client (depends on all above)

**Important**: All packages use simplified TypeScript configuration:
- No `extends` or project references
- Simple `tsc` build command (no bundlers)
- Standalone configuration for GitHub Actions compatibility

#### Landing Page
- **Location**: `apps/landing-page`
- **Base Path**: `/NSM-Framework/`
- **Build Output**: `apps/landing-page/dist`
- **Vite Config**: Configured with `base: process.env.VITE_BASE_PATH || '/NSM-Framework/'`

#### POC Wordle
- **Location**: `apps/poc-wordle`
- **Base Path**: `/NSM-Framework/wordle/`
- **Build Output**: `apps/poc-wordle/dist`
- **Vite Config**: Configured with `base: process.env.VITE_BASE_PATH || '/NSM-Framework/wordle/'`

## GitHub Actions Workflow

### File: `.github/workflows/deploy.yml`

The deployment workflow:
1. **Triggers on**:
   - Push to `main` branch
   - Changes to `apps/landing-page/**`, `apps/poc-wordle/**`, or `packages/**`
   - Manual workflow dispatch

2. **Build Process**:
   ```bash
   # Install dependencies
   bun install --frozen-lockfile

   # Build workspace packages
   bun run build --filter=@nsm/*

   # Build landing page
   cd apps/landing-page && bun run build

   # Build POC Wordle
   cd apps/poc-wordle && bun run build
   ```

3. **Deployment Structure**:
   ```
   _site/
   ├── index.html              # Landing page
   ├── assets/                 # Landing page assets
   ├── robots.txt
   ├── sitemap.xml
   └── wordle/                 # POC Wordle subdirectory
       ├── index.html
       └── assets/
   ```

4. **GitHub Pages Deployment**:
   - Uses `actions/upload-pages-artifact@v3`
   - Deploys to `github-pages` environment
   - Uses `actions/deploy-pages@v4`

## Navigation Between Apps

The landing page includes navigation to POC Wordle:

```tsx
// apps/landing-page/src/components/sections/DemoSection.tsx
<a href="/NSM-Framework/wordle/">
  <Button>Try It</Button>
</a>
```

## Environment Variables

### Landing Page
- `VITE_POSTHOG_KEY` (optional): PostHog analytics key
- `VITE_POSTHOG_HOST` (optional): PostHog host URL
- `VITE_BASE_PATH`: Base path for deployment (set by workflow)

### POC Wordle
- `VITE_BASE_PATH`: Base path for deployment (set by workflow)

## Local Development

### Landing Page
```bash
cd apps/landing-page
bun dev  # Runs on http://localhost:5170
```

### POC Wordle
```bash
cd apps/poc-wordle
bun dev  # Runs on http://localhost:5174
```

## Testing Deployment Configuration

Run deployment configuration tests:
```bash
cd apps/landing-page
bun test -- deployment.test.ts
```

Tests validate:
- ✅ Vite base path configuration
- ✅ Asset output configuration
- ✅ GitHub Actions workflow structure
- ✅ Navigation links
- ✅ Build output structure

## Manual Deployment

To manually trigger deployment:
1. Go to GitHub Actions tab
2. Select "Deploy to GitHub Pages" workflow
3. Click "Run workflow"
4. Select `main` branch
5. Click "Run workflow"

## Adding New Apps

To add a new app to GitHub Pages:

1. **Configure Vite base path**:
   ```ts
   // apps/new-app/vite.config.ts
   export default defineConfig({
     base: process.env.VITE_BASE_PATH || '/NSM-Framework/new-app/',
     // ... rest of config
   });
   ```

2. **Update deployment workflow**:
   ```yml
   # .github/workflows/deploy.yml
   - name: Build new app
     working-directory: apps/new-app
     env:
       VITE_BASE_PATH: '/NSM-Framework/new-app/'
     run: bun run build

   - name: Copy to deployment directory
     run: |
       mkdir -p _site/new-app
       cp -r apps/new-app/dist/* _site/new-app/
   ```

3. **Add navigation from landing page**:
   ```tsx
   // apps/landing-page/src/components/sections/DemoSection.tsx
   <a href="/NSM-Framework/new-app/">
     <Button>Try New App</Button>
   </a>
   ```

## Troubleshooting

### Assets not loading
- Verify base path is set correctly in vite.config
- Check that HTML references use correct absolute paths
- Inspect browser network tab for 404 errors

### Navigation not working
- Ensure links use full paths: `/NSM-Framework/app-name/`
- Check that subdirectory structure matches deployment

### Build failures
- Verify all workspace packages build successfully
- Check that dependencies are correctly installed
- Review GitHub Actions logs for specific errors

## Permissions

The workflow requires these GitHub permissions:
- `contents: read` - Read repository content
- `pages: write` - Write to GitHub Pages
- `id-token: write` - Authentication for deployment

These are configured in `.github/workflows/deploy.yml`.

## Build Configuration Details

### TypeScript Configuration Pattern

All packages use a simplified, standalone TypeScript configuration for GitHub Actions compatibility:

```json
{
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": false,
    "allowImportingTsExtensions": false,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2022",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "**/*.test.ts"]
}
```

**Key Features**:
- No `extends` - Standalone configuration
- No `composite` - Avoids project reference issues
- No `references` - Each package is independent
- `moduleResolution: "bundler"` - Modern module resolution
- `skipLibCheck: true` - Faster builds in CI

### Package Build Scripts

All packages use a simple build script:

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch --pretty false"
  }
}
```

**Why this works**:
- TypeScript handles the compilation
- No complex bundling needed for workspace packages
- Vite handles bundling for final applications
- Turborepo manages dependency order

### Verified Build Sequence

The correct build sequence for deployment:

```bash
# 1. Clean previous builds
bun run clean

# 2. Build workspace packages (Turbo handles order)
bun run build --filter='@nsm/core' --filter='@nsm/crypto' --filter='@nsm/client-sdk' --filter='@nsm/client'

# 3. Build landing page
cd apps/landing-page && bun run build

# 4. Build POC Wordle
cd apps/poc-wordle && bun run build
```

### Common Import Issues

**Problem**: Incorrect import paths causing build failures

❌ **Wrong**:
```typescript
import type { VerificationResult } from '@nsm/crypto/src/types';
```

✅ **Correct**:
```typescript
import type { VerificationResult } from '@nsm/crypto';
```

**Solution**: Always import from package root, not internal paths. The package's `index.ts` exports all public APIs.

### Package Exclusions

The following packages are **NOT** required for deployment:
- `@nsm/dev-tools` - Development utilities only
- `nsm-dev-tools-app` - Developer tools application
- `nsm-browser` - Alternative browser implementation

These can be skipped in deployment builds to avoid unnecessary complexity.
