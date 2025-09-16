# NSM Framework Documentation

This directory contains the documentation for the NSM (Nostr State Machine) Framework, built with [Mintlify](https://mintlify.com/).

## Development

### Prerequisites

- Node.js 18+ or Bun
- Mintlify CLI

### Local Development

Start the development server:

```bash
# From project root
npm run docs:dev

# Or from docs directory
npx mintlify dev
```

The documentation will be available at `http://localhost:3000`.

### Building

Build the documentation:

```bash
# From project root
npm run docs:build

# Or from docs directory
npx mintlify build
```

### Link Checking

Check for broken links:

```bash
# From project root
npm run docs:check

# Or from docs directory
npx mintlify broken-links
```

## Structure

```
docs/
├── mint.json           # Mintlify configuration
├── introduction.mdx    # Homepage
├── quickstart.mdx      # Quick start guide
├── installation.mdx    # Installation guide
├── guide/             # Detailed guides
│   ├── state-machines.mdx
│   ├── nostr-integration.mdx
│   ├── collaborative-state.mdx
│   └── event-sourcing.mdx
├── api/               # API reference
│   └── overview.mdx
├── examples/          # Example applications
│   └── chat-app.mdx
└── assets/           # Images, logos, etc.
    ├── logo/
    └── images/
```

## Configuration

The documentation is configured via `mint.json`:

- **Theme**: NSM brand colors (purple-based palette)
- **Navigation**: Organized into Getting Started, Guide, API, and Examples
- **Features**: Search, feedback, social links
- **Deployment**: Configured for Mintlify hosting

## Content Guidelines

### Writing Style

- **Clear and Concise**: Use simple, direct language
- **Code Examples**: Include practical, runnable examples
- **Progressive Disclosure**: Start simple, add complexity gradually
- **Consistent Terminology**: Use NSM-specific terms consistently

### Code Examples

- Always include TypeScript types when relevant
- Show complete, working examples
- Include error handling where appropriate
- Provide both simple and advanced versions

### Structure

- Use descriptive headings (H2, H3)
- Include overview sections
- Add "Next Steps" cards at the end
- Use callouts (Info, Warning, Tip) appropriately

## Deployment

The documentation is automatically deployed when changes are pushed to the main branch. Mintlify will:

1. Build the documentation
2. Deploy to the configured domain
3. Update the search index
4. Invalidate CDN cache

## Contributing

When adding new documentation:

1. Follow the existing file structure
2. Update `mint.json` navigation if adding new sections
3. Test locally with `npm run docs:dev`
4. Check for broken links with `npm run docs:check`
5. Ensure all examples are tested and working

## Troubleshooting

### Common Issues

**Dev server won't start:**
- Check Node.js version (18+ required)
- Clear `node_modules` and reinstall dependencies
- Ensure no other services are using port 3000

**Broken links:**
- Run `npm run docs:check` to identify issues
- Verify all internal links use correct paths
- Ensure referenced pages exist

**Build failures:**
- Check `mint.json` for syntax errors
- Verify all referenced assets exist
- Review console output for specific error messages

### Getting Help

- [Mintlify Documentation](https://mintlify.com/docs)
- [NSM Framework Issues](https://github.com/soveng/nsm/issues)
- [Discord Community](https://discord.gg/nsmframework)