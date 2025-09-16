// Test setup for React component testing
import { Window } from 'happy-dom';

// Create a virtual DOM window
const window = new Window();

// Set up global DOM objects
Object.assign(global, {
  window: window,
  document: window.document,
  navigator: window.navigator,
  HTMLElement: window.HTMLElement,
  HTMLCanvasElement: window.HTMLCanvasElement,
  Element: window.Element,
  Node: window.Node,
  Event: window.Event,
  MouseEvent: window.MouseEvent,
  KeyboardEvent: window.KeyboardEvent
});

// Set up localStorage and sessionStorage
(global as any).localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {}
};

(global as any).sessionStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {}
};

// Mock performance API
(global as any).performance = {
  ...global.performance,
  memory: {
    usedJSHeapSize: 1024 * 1024 * 50 // 50MB mock
  }
};

// Make sure global is available for test utilities
(global as any).global = global;

// Console log for debugging
console.log('Test environment initialized with happy-dom');