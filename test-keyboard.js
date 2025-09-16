// Quick Keyboard Test Script
// Run this in browser console to test keyboard functionality

console.log('🧪 Starting Keyboard Test Script');

// Test 1: Check if main element exists and is properly configured
const main = document.querySelector('main');
console.log('✅ Main element found:', !!main);
console.log('✅ TabIndex set:', main?.tabIndex);
console.log('✅ Has onKeyDown handler:', typeof main?.onkeydown);

// Test 2: Check focus
if (main) {
  main.focus();
  console.log('✅ Focused main element');
  console.log('✅ Is focused:', document.activeElement === main);
}

// Test 3: Simulate keyboard events
function testKey(key) {
  console.log(`🧪 Testing key: ${key}`);
  const event = new KeyboardEvent('keydown', {
    key: key,
    bubbles: true,
    cancelable: true
  });
  main?.dispatchEvent(event);
}

// Test 4: Run automated tests
setTimeout(() => {
  console.log('🧪 Testing letter key...');
  testKey('a');
}, 1000);

setTimeout(() => {
  console.log('🧪 Testing backspace key...');
  testKey('Backspace');
}, 2000);

setTimeout(() => {
  console.log('🧪 Testing enter key...');
  testKey('Enter');
}, 3000);

console.log('🧪 Test script loaded. Automated tests will run in 1-3 seconds.');
console.log('🧪 You can also manually test by typing on your keyboard after clicking the game area.');