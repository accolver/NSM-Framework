// Test setup for React component testing
import { Window } from 'happy-dom';
import { vi } from 'bun:test';
import { cleanup, configure } from '@testing-library/react';
// Note: test-types.d.ts provides type definitions, no runtime import needed

// Mock Jest matchers utilities for @testing-library/jest-dom
const mockJestUtils = {
  EXPECTED_COLOR: (text: string) => `\x1b[32m${text}\x1b[39m`, // Green
  RECEIVED_COLOR: (text: string) => `\x1b[31m${text}\x1b[39m`, // Red
  matcherHint: (name: string) => name,
  printExpected: (value: any) => String(value),
  printReceived: (value: any) => String(value),
  printWithType: (name: string, value: any) => `${name}: ${typeof value}`,
  stringify: (value: any) => JSON.stringify(value)
};

// Create a virtual DOM window with a proper URL
const window = new Window({
  url: 'http://localhost:3000',
  settings: {
    disableCSSFileLoading: true,
    disableJavaScriptFileLoading: true,
    disableJavaScriptEvaluation: true
  }
});

// Make sure document exists and has proper structure
const document = window.document;
if (!document.body) {
  document.body = document.createElement('body');
  if (!document.documentElement) {
    const html = document.createElement('html');
    document.appendChild(html);
    document.documentElement = html;
  }
  document.documentElement.appendChild(document.body);
}

// Add a root div for React to mount to
if (!document.getElementById('root')) {
  const root = document.createElement('div');
  root.id = 'root';
  document.body.appendChild(root);
}

// Ensure the DOM globals are set on all possible global objects
const domGlobals = {
  window,
  document,
  navigator: window.navigator,
  HTMLElement: window.HTMLElement,
  HTMLCanvasElement: window.HTMLCanvasElement,
  Element: window.Element,
  Node: window.Node,
  Event: window.Event,
  MouseEvent: window.MouseEvent,
  KeyboardEvent: window.KeyboardEvent,
  FocusEvent: window.FocusEvent,
  InputEvent: window.InputEvent,
  CustomEvent: window.CustomEvent,
  location: window.location,
  history: window.history,
  crypto: window.crypto || {
    getRandomValues: (arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }
  }
};

// Apply to all global scopes
Object.assign(global, domGlobals);
Object.assign(globalThis, domGlobals);

// Specifically ensure document.body is available
Object.defineProperty(global, 'document', {
  value: document,
  writable: false,
  configurable: false
});

Object.defineProperty(globalThis, 'document', {
  value: document,
  writable: false,
  configurable: false
});

// Set up Storage interface first
const createStorage = () => ({
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(() => null)
});

// Set up localStorage and sessionStorage
const localStorage = createStorage();
const sessionStorage = createStorage();

(global as any).localStorage = localStorage;
(global as any).sessionStorage = sessionStorage;
(global as any).Storage = class Storage {
  getItem = vi.fn(() => null);
  setItem = vi.fn();
  removeItem = vi.fn();
  clear = vi.fn();
  length = 0;
  key = vi.fn(() => null);
};

// Also set on globalThis
globalThis.localStorage = localStorage;
globalThis.sessionStorage = sessionStorage;
globalThis.Storage = (global as any).Storage;

// Mock performance API
(global as any).performance = {
  ...global.performance,
  memory: {
    usedJSHeapSize: 1024 * 1024 * 50 // 50MB mock
  }
};

// Make sure global is available for test utilities
(global as any).global = global;

// Mock HTMLCanvasElement and related canvas APIs
const mockCanvasContext = {
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({
    data: new Array(4).fill(0),
    width: 800,
    height: 600
  })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => []),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
  canvas: null as any
};

const mockCanvas = {
  getContext: vi.fn(() => mockCanvasContext),
  toDataURL: vi.fn(() => 'data:image/png;base64,'),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  width: 800,
  height: 600,
  style: {},
  // This is critical for Konva - it expects _canvas property
  _canvas: {
    getContext: vi.fn(() => mockCanvasContext),
    toDataURL: vi.fn(() => 'data:image/png;base64,'),
    width: 800,
    height: 600,
    style: {}
  }
};

// Set canvas reference for context
mockCanvasContext.canvas = mockCanvas;

// Mock ResizeObserver
(global as any).ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
(global as any).IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Override HTMLCanvasElement constructor and prototype
(global as any).HTMLCanvasElement = function HTMLCanvasElement() {
  const canvas = { ...mockCanvas };
  // Make sure _canvas property is set for Konva
  canvas._canvas = canvas;
  return canvas;
};
(global as any).HTMLCanvasElement.prototype = {
  getContext: vi.fn(() => mockCanvasContext),
  toDataURL: vi.fn(() => 'data:image/png;base64,'),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  width: 800,
  height: 600,
  style: {}
};

// Also set on globalThis
globalThis.HTMLCanvasElement = (global as any).HTMLCanvasElement;

// Mock createCanvas for server-side rendering
(global as any).createCanvas = (width = 800, height = 600) => {
  const canvas = { ...mockCanvas, width, height };
  canvas._canvas = canvas;
  return canvas;
};

// Mock document.createElement to return proper canvas
const originalCreateElement = document.createElement.bind(document);
document.createElement = function(tagName: string) {
  if (tagName.toLowerCase() === 'canvas') {
    const canvas = { ...mockCanvas };
    canvas._canvas = canvas;
    return canvas as any;
  }
  return originalCreateElement(tagName);
};

// Also set on global document
if (global.document) {
  global.document.createElement = document.createElement;
}
if (globalThis.document) {
  globalThis.document.createElement = document.createElement;
}

// Mock WebGL context
(global as any).WebGLRenderingContext = {};
(global as any).WebGL2RenderingContext = {};

// Mock XState inspector adapter to fix inspector service issues
(global as any).mockInspectorAdapter = {
  send: vi.fn(),
  subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
  disconnect: vi.fn(),
  isConnected: vi.fn(() => false)
};

// Inspector service mocking is handled per-test as needed

// Mock window.open for XState Inspector compatibility
if (window && !window.open) {
  window.open = vi.fn((url?: string, target?: string, features?: string) => {
    // Return a minimal mock window object that the inspector expects
    const mockWindow = {
      close: vi.fn(),
      closed: false,
      location: { href: url || 'about:blank' },
      document: {
        write: vi.fn(),
        close: vi.fn()
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      postMessage: vi.fn()
    };

    // Make window.open available on all global objects
    (global as any).window.open = window.open;
    (globalThis as any).window.open = window.open;

    return mockWindow as any;
  });
}

// Mock WebSocket to prevent connection attempts
(global as any).WebSocket = class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = 3; // CLOSED
  url = '';
  protocol = '';

  constructor(url: string) {
    this.url = url;
    // Immediately fail connection
    setTimeout(() => {
      if (this.onerror) this.onerror(new Event('error'));
      if (this.onclose) this.onclose(new CloseEvent('close'));
    }, 0);
  }

  close = vi.fn();
  send = vi.fn();

  onerror: ((event: Event) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn();
};

// Also set WebSocket on globalThis
globalThis.WebSocket = (global as any).WebSocket;

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log;
console.log = (...args: any[]) => {
  // Only log important test messages, skip debug noise
  const message = args.join(' ');
  if (message.includes('Test environment') || message.includes('FAIL') || message.includes('PASS')) {
    originalConsoleLog(...args);
  }
};

// Add cleanup utilities for tests
(global as any).cleanupDOM = () => {
  cleanup(); // React Testing Library cleanup
  if (global.document && global.document.body) {
    global.document.body.innerHTML = '';
  }
};

// Auto cleanup after each test
(global as any).afterEach = (global as any).afterEach || (() => {});
const originalAfterEach = (global as any).afterEach;
(global as any).afterEach = () => {
  cleanup();
  originalAfterEach();
};

// Configure testing library to use our DOM
configure({
  // Use the document we set up
  getElementError: (message, container) => {
    const error = new Error([
      message,
      'This test runs in a mocked DOM environment.',
      'If you need to debug, ensure your test setup is correct.'
    ].join('\n\n'));
    error.name = 'TestingLibraryElementError';
    return error;
  }
});

// Fix Testing Library Screen object by ensuring proper DOM setup
// We need to initialize screen after DOM globals are set
import { screen as originalScreen } from '@testing-library/dom';

// Create a new screen object that uses our DOM setup
const fixedScreen = (() => {
  try {
    // Import screen after DOM is set up
    const { screen } = require('@testing-library/dom');
    return screen;
  } catch (e) {
    // If that fails, create a minimal mock screen
    return {
      getByText: (text: string) => document.querySelector(`[data-testid*="${text}"], :contains("${text}")`) || document.createElement('div'),
      getByTestId: (id: string) => document.querySelector(`[data-testid="${id}"]`) || document.createElement('div'),
      queryByText: (text: string) => document.querySelector(`[data-testid*="${text}"], :contains("${text}")`),
      queryByTestId: (id: string) => document.querySelector(`[data-testid="${id}"]`),
      findByText: async (text: string) => document.querySelector(`[data-testid*="${text}"], :contains("${text}")`) || document.createElement('div'),
      findByTestId: async (id: string) => document.querySelector(`[data-testid="${id}"]`) || document.createElement('div'),
      getAllByText: (text: string) => Array.from(document.querySelectorAll(`[data-testid*="${text}"], :contains("${text}")`)),
      debug: () => console.log(document.body.innerHTML)
    };
  }
})();

// Override the problematic screen import
(global as any).screen = fixedScreen;
(globalThis as any).screen = fixedScreen;

// Jest-DOM matchers setup is handled in test-utils.ts

// Console log for debugging
console.log('Test environment initialized with happy-dom');
console.log('Document body available:', !!global.document?.body);
console.log('Document location:', global.document?.location?.href);