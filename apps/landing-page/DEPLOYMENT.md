# Deployment Guide - NSM Framework Landing Page

## Prerequisites

- GitHub repository with main branch
- GitHub Pages enabled in repository settings
- PostHog account (optional, for analytics)

## Quick Start Deployment

### 1. GitHub Pages Setup

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Pages**
3. Under "Build and deployment":
   - Set **Source** to "GitHub Actions"
4. The workflow will automatically deploy on the next push to main

### 2. Configure Analytics (Optional)

1. Create a PostHog account at https://app.posthog.com
2. Get your Project API Key from PostHog settings
3. In GitHub, go to **Settings** → **Secrets and variables** → **Actions**
4. Add the following secrets:
   - `VITE_POSTHOG_KEY`: Your PostHog project API key
   - `VITE_POSTHOG_HOST`: `https://app.posthog.com` (or your custom instance)

### 3. Deploy

Push to the main branch:

```bash
git add .
git commit -m "Deploy landing page"
git push origin main
```

The GitHub Action will automatically:
1. Build the landing page
2. Deploy to GitHub Pages
3. Site will be available at: `https://<username>.github.io/<repository>/`

## Local Development

### Setup

```bash
# Install dependencies
npm install

# Create .env file for local analytics testing
cp .env.example .env
# Edit .env and add your PostHog key
```

### Development Server

```bash
npm run dev
```

Opens at http://localhost:5173

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Run Tests

```bash
npm test              # Run once
npm run test:watch    # Watch mode
```

### Type Checking

```bash
npm run typecheck
```

## Custom Domain Setup

### Using GitHub Pages with Custom Domain

1. Add a `CNAME` file to `public/` folder:
   ```
   your-domain.com
   ```

2. Update the base path in `.github/workflows/deploy-landing-page.yml`:
   ```yaml
   env:
     VITE_BASE_PATH: '/'  # Change from '/NSM-Framework/'
   ```

3. Update URLs in `index.html`:
   - Change canonical URL
   - Update Open Graph URLs
   - Update Twitter Card URLs

4. Configure DNS:
   - Add A records pointing to GitHub Pages IPs:
     - 185.199.108.153
     - 185.199.109.153
     - 185.199.110.153
     - 185.199.111.153
   - Or add CNAME record pointing to `<username>.github.io`

5. Enable HTTPS in GitHub Pages settings

### Using Cloudflare (Recommended for Enhanced Security)

1. Add your domain to Cloudflare
2. Update DNS to point to GitHub Pages
3. In Cloudflare, configure:
   - **SSL/TLS**: Full (strict)
   - **Security Headers** (see SECURITY.md):
     ```
     Content-Security-Policy
     X-Content-Type-Options
     X-Frame-Options
     Referrer-Policy
     ```
   - **Page Rules** for caching:
     ```
     /*/*.js → Cache Level: Cache Everything, Edge TTL: 1 year
     /*/*.css → Cache Level: Cache Everything, Edge TTL: 1 year
     /*.html → Cache Level: Bypass
     ```

## Manual Deployment

### Deploy to Netlify

```bash
npm run build

# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

Configure build settings in Netlify:
- Build command: `npm run build`
- Publish directory: `dist`
- Environment variables: Add `VITE_POSTHOG_KEY` and `VITE_POSTHOG_HOST`

### Deploy to Vercel

```bash
npm run build

# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

Configure in Vercel dashboard:
- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables: Add `VITE_POSTHOG_KEY` and `VITE_POSTHOG_HOST`

### Deploy to AWS S3 + CloudFront

```bash
npm run build

# Install AWS CLI
# Configure AWS credentials

# Sync to S3
aws s3 sync dist/ s3://your-bucket-name/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

## Monitoring & Analytics

### PostHog Dashboard

After deployment with analytics enabled:

1. Go to https://app.posthog.com
2. View tracked events:
   - Page views
   - CTA clicks (Star on GitHub, Try Demo)
   - External link clicks
3. Create insights and dashboards
4. Set up alerts for conversion goals

### Performance Monitoring

Monitor Core Web Vitals:
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

Use tools:
- Google PageSpeed Insights
- Lighthouse CI (integrated in GitHub Actions)
- WebPageTest

## Troubleshooting

### Build Fails

**Issue**: "Module not found"
- Solution: Run `npm install` to ensure all dependencies are installed

**Issue**: TypeScript errors
- Solution: Run `npm run typecheck` locally to catch errors before deployment

### Deployment Succeeds but Site is Broken

**Issue**: Assets not loading (404 errors)
- Solution: Check `base` path in `vite.config.ts` matches your deployment URL

**Issue**: White screen
- Solution: Check browser console for errors, verify base path is correct

### Analytics Not Working

**Issue**: No events in PostHog
- Solution: Verify `VITE_POSTHOG_KEY` is set in GitHub Secrets
- Check browser console for initialization errors
- Ensure Do Not Track is disabled in browser

## CI/CD Workflow

The GitHub Actions workflow (`.github/workflows/deploy-landing-page.yml`):

1. **Triggers**:
   - Push to main branch with changes in `apps/landing-page/`
   - Manual workflow dispatch

2. **Build Process**:
   - Checkout code
   - Setup Node.js 20
   - Install dependencies
   - Build landing page with environment variables
   - Upload build artifact

3. **Deploy Process**:
   - Deploy artifact to GitHub Pages
   - Available at repository URL

## Security Considerations

See [SECURITY.md](./SECURITY.md) for:
- Content Security Policy configuration
- Security headers setup
- Analytics privacy settings
- Dependency security audits

## Performance Optimization

Current bundle sizes:
- **Initial Bundle**: ~88KB (gzipped: ~19KB)
- **Vendor Bundle**: ~314KB (gzipped: ~97KB)
- **Analytics Bundle**: ~182KB (gzipped: ~60KB)
- **CSS**: ~15KB (gzipped: ~4KB)

Total gzipped size: ~180KB

Optimizations applied:
- Code splitting (vendor, analytics separate chunks)
- Asset hashing for optimal caching
- Minification with esbuild
- Tree shaking for unused code removal
- Preconnect for analytics

## Updating the Site

1. Make changes to source files
2. Test locally: `npm run dev`
3. Run tests: `npm test`
4. Type check: `npm run typecheck`
5. Build: `npm run build`
6. Preview: `npm run preview`
7. Commit and push to main
8. Automatic deployment triggers

## Rollback

To rollback a deployment:

1. Go to **Actions** tab in GitHub
2. Find the last successful deployment
3. Click "Re-run jobs" → "Re-run all jobs"

Or revert the commit:

```bash
git revert HEAD
git push origin main
```

## Support

For deployment issues:
- Check GitHub Actions logs
- Review browser console errors
- Verify environment variables are set
- Ensure GitHub Pages is enabled

For analytics issues:
- Verify PostHog API key is correct
- Check browser allows PostHog domain
- Review Do Not Track settings
