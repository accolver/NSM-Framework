import { Window } from 'happy-dom';
import '@testing-library/jest-dom';

// Mock jest functions if not available
if (typeof jest === 'undefined') {
  global.jest = {
    fn: (implementation?: Function) => {
      const mockFn = implementation || (() => {});
      (mockFn as any).mockClear = () => mockFn;
      (mockFn as any).mockResolvedValue = (value: any) => {
        (mockFn as any).__resolvedValue = value;
        return mockFn;
      };
      (mockFn as any).mockRejectedValue = (value: any) => {
        (mockFn as any).__rejectedValue = value;
        return mockFn;
      };
      return mockFn as any;
    },
  } as any;
}

// Set up happy-dom as global DOM environment
const window = new Window({
  url: 'http://localhost',
  width: 1024,
  height: 768
});

// Set globals for testing
global.window = window as any;
global.document = window.document as any;
global.location = window.location as any;
global.HTMLElement = window.HTMLElement as any;
global.Element = window.Element as any;
global.Node = window.Node as any;
global.localStorage = window.localStorage as any;
global.sessionStorage = window.sessionStorage as any;

// Mock navigator with clipboard API and userAgent
const mockWriteText = () => Promise.resolve();
const mockReadText = () => Promise.resolve('');
const mockQuery = () => Promise.resolve({ state: 'granted' });

global.navigator = {
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  clipboard: {
    writeText: mockWriteText,
    readText: mockReadText,
  },
  permissions: {
    query: mockQuery,
  },
  language: 'en-US',
  languages: ['en-US', 'en'],
  platform: 'MacIntel',
  cookieEnabled: true,
  onLine: true,
} as any;

// Suppress console output during tests
global.console = {
  ...console,
  log: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  info: () => {},
};

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

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock getComputedStyle
global.getComputedStyle = () => ({
  getPropertyValue: () => '',
}) as any;