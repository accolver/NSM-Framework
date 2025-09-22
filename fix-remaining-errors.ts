/**
 * TypeScript Error Fix Script - REFACTOR Phase
 *
 * This script applies targeted fixes for the remaining TypeScript errors
 * that are preventing full compilation success.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

console.log('🔧 Applying targeted TypeScript error fixes...\n');

// Function to apply a fix to a file
function applyFix(filePath: string, searchPattern: string, replacement: string, description: string) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    if (content.includes(searchPattern)) {
      const newContent = content.replace(new RegExp(searchPattern, 'g'), replacement);
      writeFileSync(filePath, newContent);
      console.log(`✅ Fixed: ${description} in ${filePath}`);
      return true;
    }
  } catch (error) {
    console.log(`⚠️  Could not fix ${description} in ${filePath}: file not found`);
  }
  return false;
}

// Common type assertion fixes for testing files
const testFixes = [
  {
    pattern: 'mockCollabService\\._callbackSet',
    replacement: '(mockCollabService as any)._callbackSet',
    description: 'Mock service private property access'
  },
  {
    pattern: 'jest\\.fn\\(\\)',
    replacement: 'vi.fn()',
    description: 'Jest to Vitest function mocking'
  },
  {
    pattern: 'jest\\.spyOn',
    replacement: 'vi.spyOn',
    description: 'Jest to Vitest spy functions'
  },
  {
    pattern: 'jest\\.mock',
    replacement: 'vi.mock',
    description: 'Jest to Vitest module mocking'
  },
  {
    pattern: 'expect\\.any\\(Function\\)',
    replacement: 'expect.any(Function)',
    description: 'Function type expectation'
  },
  {
    pattern: '\\.toBeInTheDocument\\(\\)',
    replacement: '.toBeInTheDocument()',
    description: 'Testing library matcher'
  }
];

// Apply fixes to test files
const testFiles = [
  '/Users/alancolver/dev/soveng/nsm/apps/poc-whiteboard/src/test/event-flood-fix.test.ts',
  '/Users/alancolver/dev/soveng/nsm/apps/poc-whiteboard/src/test/drawing-integration-no-flood.test.ts',
  '/Users/alancolver/dev/soveng/nsm/apps/poc-whiteboard/src/test/timestamp-fix-verification.test.ts',
  '/Users/alancolver/dev/soveng/nsm/apps/poc-whiteboard/src/test/xstate-inspector-integration-debug.test.ts',
  '/Users/alancolver/dev/soveng/nsm/apps/poc-whiteboard/src/test/flood-fix-verification.test.ts',
  '/Users/alancolver/dev/soveng/nsm/apps/poc-whiteboard/src/test/drawing-event-flood-fix.test.ts',
  '/Users/alancolver/dev/soveng/nsm/apps/poc-wordle/src/components/__tests__/DashboardIntegration.test.tsx',
  '/Users/alancolver/dev/soveng/nsm/apps/poc-wordle/src/components/__tests__/FinalIntegrationVerification.test.tsx'
];

for (const filePath of testFiles) {
  for (const fix of testFixes) {
    applyFix(filePath, fix.pattern, fix.replacement, fix.description);
  }
}

// Add vitest import where jest is used
const vitestImportFix = `import { vi } from 'vitest';`;

for (const filePath of testFiles) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    if (content.includes('vi.') && !content.includes(`import { vi } from 'vitest'`)) {
      const lines = content.split('\n');
      const firstImportIndex = lines.findIndex(line => line.trim().startsWith('import'));
      if (firstImportIndex >= 0) {
        lines.splice(firstImportIndex, 0, vitestImportFix);
        writeFileSync(filePath, lines.join('\n'));
        console.log(`✅ Added vitest import to ${filePath}`);
      }
    }
  } catch (error) {
    // File doesn't exist, skip
  }
}

// Apply type fixes for common issues
const typeFixes = [
  {
    file: '/Users/alancolver/dev/soveng/nsm/apps/poc-wordle/src/services/event-service.ts',
    pattern: 'stopError\\)',
    replacement: 'stopError as Error)',
    description: 'Unknown type assertion'
  },
  {
    file: '/Users/alancolver/dev/soveng/nsm/apps/poc-whiteboard/src/services/real-time-collaboration-service.ts',
    pattern: 'error\\)',
    replacement: 'error as Error)',
    description: 'Error type assertion'
  }
];

for (const fix of typeFixes) {
  applyFix(fix.file, fix.pattern, fix.replacement, fix.description);
}

console.log('\n🧪 Running validation check...');

try {
  // Try a quick compilation check on a single package
  execSync('cd /Users/alancolver/dev/soveng/nsm/packages/nsm-core && npx tsc --noEmit', { stdio: 'pipe' });
  console.log('✅ Core package still compiles correctly');
} catch (error) {
  console.log('⚠️  Core package compilation check failed - fixes may need adjustment');
}

console.log('\n🎯 Targeted fixes complete! Re-run the test to see improvement.');
console.log('Note: Some errors may remain in test files and can be addressed individually.');