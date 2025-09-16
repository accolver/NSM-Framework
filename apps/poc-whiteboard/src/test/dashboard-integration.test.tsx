import '../test-setup';
import { describe, test, expect, beforeEach } from 'bun:test';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { App } from '../components/App';

// Mock performance memory API for tests
Object.defineProperty(global.performance, 'memory', {
  value: {
    usedJSHeapSize: 1024 * 1024 * 50, // 50MB mock
    totalJSHeapSize: 1024 * 1024 * 100,
    jsHeapSizeLimit: 1024 * 1024 * 1000
  },
  configurable: true
});

// Mock environment to enable development tools
const originalEnv = process.env.NODE_ENV;

describe('Dashboard Integration', () => {
  beforeEach(() => {
    // Set development mode to show dashboard
    process.env.NODE_ENV = 'development';
  });

  test('should render App with dashboard integration', () => {
    expect(() => {
      render(<App />);
    }).not.toThrow();
  });

  test('should show developer dashboard in development mode', () => {
    const { container } = render(<App />);

    // Check that the main app components are present
    expect(container.textContent).toContain('NSM Collaborative Whiteboard');
    expect(container.textContent).toContain('Developer Dashboard');
  });

  test('should integrate dashboard with developer tools services', () => {
    const { container } = render(<App />);

    // The dashboard should show the tabs for different tools
    expect(container.textContent).toContain('XState Inspector');
    expect(container.textContent).toContain('Event Log');
    expect(container.textContent).toContain('Time Travel');
    expect(container.textContent).toContain('App Discovery');
    expect(container.textContent).toContain('Performance');
  });
});