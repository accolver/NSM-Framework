#!/usr/bin/env node

/**
 * Debug script to test state machine integration issues
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

console.log('🔍 Testing State Machine Integration Issues...\n');

// Test 1: Check if dev-tools package builds correctly
console.log('📦 Checking nsm-dev-tools package...');
try {
  const { stdout, stderr } = await execAsync('cd packages/nsm-dev-tools && npm run type-check');
  console.log('✅ nsm-dev-tools types check passed');
} catch (error) {
  console.error('❌ nsm-dev-tools type check failed:');
  console.error(error.stderr);
}

// Test 2: Check if StateMachineExporter exports correctly
console.log('\n🔧 Checking StateMachineExporter export...');
try {
  const { stdout, stderr } = await execAsync('cd packages/nsm-dev-tools && node -e "const pkg = require(\'./dist/index.js\'); console.log(\'Exports:\', Object.keys(pkg)); console.log(\'StateMachineExporter:\', typeof pkg.StateMachineExporter);"');
  console.log('Export check result:', stdout);
} catch (error) {
  console.error('❌ Export check failed:');
  console.error(error.stderr || error.message);
}

// Test 3: Quick Wordle build test
console.log('\n🎯 Testing Wordle build...');
try {
  const { stdout, stderr } = await execAsync('cd apps/poc-wordle && npm run type-check');
  console.log('✅ Wordle type check passed');
} catch (error) {
  console.error('❌ Wordle type check failed:');
  console.error(error.stderr);
}

// Test 4: Quick Whiteboard build test
console.log('\n🎨 Testing Whiteboard build...');
try {
  const { stdout, stderr } = await execAsync('cd apps/poc-whiteboard && npm run type-check');
  console.log('✅ Whiteboard type check passed');
} catch (error) {
  console.error('❌ Whiteboard type check failed:');
  console.error(error.stderr);
}

console.log('\n✨ State machine integration test complete');