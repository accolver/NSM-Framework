/**
 * TypeScript Compilation Test Suite
 *
 * This test validates that all packages in the NSM monorepo compile successfully
 * without TypeScript errors. This follows TDD approach - the test should fail first,
 * then we fix the configuration to make it pass.
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

interface CompilationResult {
  package: string;
  success: boolean;
  errors: string[];
  output: string;
}

interface TestResults {
  allPackagesPass: boolean;
  results: CompilationResult[];
  totalErrors: number;
}

/**
 * Test: TypeScript compilation should succeed for all packages
 */
export function testTypeScriptCompilation(): TestResults {
  const packages = [
    'packages/nsm-core',
    'packages/nsm-dev-tools',
    'packages/nsm-client-sdk',
    'packages/nsm-client',
    'packages/nsm-crypto',
    'apps/poc-wordle',
    'apps/poc-whiteboard',
    'apps/dev-tools',
    'apps/docs'
  ];

  const results: CompilationResult[] = [];
  let totalErrors = 0;

  console.log('🧪 Running TypeScript Compilation Tests...\n');

  for (const packagePath of packages) {
    const fullPath = join(process.cwd(), packagePath);

    if (!existsSync(fullPath)) {
      console.log(`⚠️  Package ${packagePath} does not exist, skipping...`);
      continue;
    }

    const tsconfigPath = join(fullPath, 'tsconfig.json');
    if (!existsSync(tsconfigPath)) {
      console.log(`⚠️  No tsconfig.json found for ${packagePath}, skipping...`);
      continue;
    }

    console.log(`🔍 Testing compilation for ${packagePath}...`);

    try {
      // Run TypeScript compilation for this package
      const output = execSync(`cd ${fullPath} && npx tsc --noEmit`, {
        encoding: 'utf-8',
        timeout: 30000
      });

      results.push({
        package: packagePath,
        success: true,
        errors: [],
        output: output
      });

      console.log(`✅ ${packagePath} - Compilation successful`);

    } catch (error: any) {
      const errorOutput = error.stdout || error.message || 'Unknown error';
      const errors = parseTypeScriptErrors(errorOutput);

      results.push({
        package: packagePath,
        success: false,
        errors: errors,
        output: errorOutput
      });

      totalErrors += errors.length;
      console.log(`❌ ${packagePath} - ${errors.length} compilation errors`);

      // Show first few errors for debugging
      errors.slice(0, 3).forEach(error => {
        console.log(`   📋 ${error}`);
      });

      if (errors.length > 3) {
        console.log(`   ... and ${errors.length - 3} more errors`);
      }
    }
  }

  const allPackagesPass = results.every(r => r.success);

  console.log('\n📊 Test Results Summary:');
  console.log(`   Packages tested: ${results.length}`);
  console.log(`   Packages passing: ${results.filter(r => r.success).length}`);
  console.log(`   Packages failing: ${results.filter(r => !r.success).length}`);
  console.log(`   Total errors: ${totalErrors}`);

  if (allPackagesPass) {
    console.log('\n🎉 All TypeScript compilation tests PASSED!');
  } else {
    console.log('\n💥 TypeScript compilation tests FAILED!');
    console.log('\nFailing packages:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   • ${r.package} (${r.errors.length} errors)`);
    });
  }

  return {
    allPackagesPass,
    results,
    totalErrors
  };
}

/**
 * Parse TypeScript error messages from compiler output
 */
function parseTypeScriptErrors(output: string): string[] {
  const lines = output.split('\n');
  const errors: string[] = [];

  for (const line of lines) {
    if (line.includes('error TS')) {
      errors.push(line.trim());
    }
  }

  return errors;
}

/**
 * Test: Cross-package references should work correctly
 */
export function testCrossPackageReferences(): boolean {
  console.log('\n🔗 Testing cross-package references...');

  try {
    // Test that root TypeScript compilation works with project references
    execSync('npx tsc --build --dry', {
      encoding: 'utf-8',
      timeout: 15000
    });

    console.log('✅ Cross-package references working correctly');
    return true;
  } catch (error: any) {
    console.log('❌ Cross-package reference errors detected');
    console.log('   📋', error.message);
    return false;
  }
}

/**
 * Test: Path mapping should resolve correctly
 */
export function testPathMapping(): boolean {
  console.log('\n🗺️ Testing path mapping resolution...');

  const pathMappingTests = [
    '@nsm/core',
    '@nsm/client-sdk',
    '@nsm/dev-tools'
  ];

  for (const mapping of pathMappingTests) {
    try {
      // This will verify the path mapping exists in root tsconfig
      const tsconfig = require('./tsconfig.json');
      const paths = tsconfig.compilerOptions?.paths || {};

      if (!paths[mapping]) {
        console.log(`❌ Path mapping missing for ${mapping}`);
        return false;
      }

      console.log(`✅ Path mapping found for ${mapping}`);
    } catch (error) {
      console.log(`❌ Error checking path mapping for ${mapping}`);
      return false;
    }
  }

  return true;
}

// Main test runner
if (require.main === module) {
  console.log('🚀 Starting TypeScript Build Validation Tests\n');
  console.log('This test suite validates that all TypeScript configurations');
  console.log('are properly set up for the NSM monorepo.\n');

  const compilationResults = testTypeScriptCompilation();
  const crossPackageResults = testCrossPackageReferences();
  const pathMappingResults = testPathMapping();

  console.log('\n🏁 Final Test Results:');
  console.log(`   TypeScript Compilation: ${compilationResults.allPackagesPass ? 'PASS' : 'FAIL'}`);
  console.log(`   Cross-package References: ${crossPackageResults ? 'PASS' : 'FAIL'}`);
  console.log(`   Path Mapping: ${pathMappingResults ? 'PASS' : 'FAIL'}`);

  const allTestsPass = compilationResults.allPackagesPass && crossPackageResults && pathMappingResults;

  if (allTestsPass) {
    console.log('\n🎊 ALL TESTS PASSED! TypeScript configuration is working correctly.');
    process.exit(0);
  } else {
    console.log('\n💣 TESTS FAILED! TypeScript configuration needs fixes.');
    process.exit(1);
  }
}