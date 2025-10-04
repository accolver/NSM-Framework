# Quick Start - NSM Framework Landing Page Deployment

## ⚡ 5-Minute Deployment

### Step 1: GitHub Pages Setup (1 minute)
```bash
# 1. Go to GitHub repository Settings → Pages
# 2. Set Source to "GitHub Actions"
# Done! Workflow is already configured.
```

### Step 2: Add Analytics (Optional, 2 minutes)
```bash
# 1. Sign up at https://app.posthog.com
# 2. Get your Project API Key
# 3. In GitHub: Settings → Secrets → Actions → New secret
#    - Name: VITE_POSTHOG_KEY
#    - Value: phc_your_api_key_here
```

### Step 3: Deploy (1 minute)
```bash
git add .
git commit -m "feat: deploy landing page"
git push origin main

# Watch deployment: GitHub Actions tab
# Site live at: https://accolver.github.io/NSM-Framework/
```

## 🔧 Local Development

```bash
# Install
npm install

# Develop
npm run dev          # → http://localhost:5173

# Test
npm test             # All tests
npm run typecheck    # TypeScript

# Build
npm run build        # → dist/
npm run preview      # Test production build
```

## 📋 Pre-Deployment Checklist

- [ ] All tests passing (`npm test`)
- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] Production build works (`npm run build`)
- [ ] GitHub Pages enabled (Settings → Pages → GitHub Actions)
- [ ] PostHog secrets added (if using analytics)
- [ ] SEO meta tags updated (if custom domain)

## 🔗 Important URLs

- **Live Site**: https://accolver.github.io/NSM-Framework/
- **GitHub Actions**: [Repository Actions Tab]
- **PostHog Dashboard**: https://app.posthog.com

## 📚 Documentation

- [README.md](./README.md) - Full documentation
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed deployment guide
- [SECURITY.md](./SECURITY.md) - Security configuration

## 🐛 Troubleshooting

**Build fails?**
```bash
npm install
npm run typecheck
npm test
```

**Assets not loading?**
- Check `base` path in `vite.config.ts`
- Should be `/NSM-Framework/` for GitHub Pages
- Change to `/` for custom domain

**Analytics not working?**
- Verify `VITE_POSTHOG_KEY` in GitHub Secrets
- Check browser console for errors
- Disable "Do Not Track" in browser for testing

## 🚀 Next Steps

1. **Custom Domain**: Follow DEPLOYMENT.md for custom domain setup
2. **SEO**: Add `og-image.png` (1200x630px) to public/ folder
3. **Monitoring**: Set up PostHog dashboards and alerts
4. **Performance**: Monitor Core Web Vitals with Lighthouse
