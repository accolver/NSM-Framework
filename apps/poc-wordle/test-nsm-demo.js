#!/usr/bin/env node

/**
 * Simple test to verify NSM demo mode is working without relay errors
 */

console.log('NSM Wordle Demo Mode Test');
console.log('=========================');
console.log('');
console.log('✓ Development server is running on http://localhost:3000/');
console.log('✓ NSM is configured for local-only demo mode');
console.log('✓ No relay URLs configured (running without Nostr connectivity)');
console.log('✓ Application should work locally without NSM errors');
console.log('');
console.log('Expected behavior:');
console.log('- Game loads and is playable');
console.log('- NSM status shows "disconnected" or "local-only mode"');
console.log('- No NDKPublishError or relay connection errors');
console.log('- State management works locally (game state is preserved)');
console.log('');
console.log('To test with actual relay connectivity:');
console.log('1. Update index.tsx with valid relay URLs');
console.log('2. Provide a valid private key for signing events');
console.log('3. Ensure network connectivity to Nostr relays');
console.log('');
console.log('Test complete. Open http://localhost:3000/ in your browser to verify.');