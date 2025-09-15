import { Window } from 'happy-dom';
import '@testing-library/jest-dom';

// Set up happy-dom as global DOM environment
const window = new Window({
  url: 'http://localhost',
  width: 1024,
  height: 768
});

// Set globals for testing
global.window = window as any;
global.document = window.document as any;
global.navigator = window.navigator as any;
global.location = window.location as any;
global.HTMLElement = window.HTMLElement as any;
global.Element = window.Element as any;
global.Node = window.Node as any;

// Mock additional browser APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};