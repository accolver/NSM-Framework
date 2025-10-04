# GitHub Pages Deployment Fix - TS6305 Circular Dependency

## Issue
GitHub Pages deployment was failing with TypeScript TS6305 errors indicating circular dependencies between `@nsm/crypto` and `@nsm/core`.

## Root Cause
The root `tsconfig.json` had path mappings pointing to **source directories** instead of built declaration files:

```json
"paths": {
  "@nsm/core": ["./packages/nsm-core/src"],
  "@nsm/crypto": ["./packages/nsm-crypto/src"]
}
```

This caused TypeScript to create circular compilation dependencies when using composite projects with project references.

## Solution
Removed the problematic path mappings from `tsconfig.json`. TypeScript now correctly:
1. Uses workspace protocol for package resolution
2. Follows project references for build order
3. Finds built `.d.ts` files in `dist/` directories

## Changes

### Modified Files
- `/tsconfig.json` - Removed `baseUrl` and `paths` configuration

### New Files
- `/docs/CIRCULAR_DEPENDENCY_FIX.md` - Detailed documentation
- `/scripts/validate-build-order.sh` - Build validation script
- `/tests/build/circular-dependency.test.ts` - Automated tests
- `/DEPLOYMENT_FIX.md` - This summary

## Verification

### Local Testing
```bash
# Run validation script
./scripts/validate-build-order.sh

# Run tests
bun test tests/build/circular-dependency.test.ts

# Manual build test
bun run clean
bun run build --filter='@nsm/*'
```

### CI Testing
The GitHub Actions workflow will now succeed:
```bash
bun install --frozen-lockfile
bun run build --filter=@nsm/*
```

## Results
✅ No TS6305 errors
✅ Packages build in correct order
✅ Type-only imports work correctly
✅ Project references function properly
✅ Clean builds succeed
✅ CI deployment should work

## Quality Gates
- [x] TypeScript compilation succeeds
- [x] No circular dependency errors
- [x] Clean build works from scratch
- [x] Automated tests pass
- [x] Documentation complete
- [x] Validation script created

## Next Steps
1. Monitor GitHub Actions workflow
2. Verify deployment succeeds
3. Update contributing guidelines if needed
