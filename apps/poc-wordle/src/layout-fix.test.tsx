/**
 * Layout Fix Tests - TDD for UI Spacing Issues
 *
 * Tests for fixing:
 * 1. Excessive vertical space between title and game
 * 2. NSM status component positioned in top-right corner
 * 3. Compact layout with proper spacing
 * 4. Responsive design maintained
 */

import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach } from 'bun:test';
import { NSMWordleApp } from './components/NSMWordleApp';

describe('Layout Fix Tests', () => {

  // Clean up after each test to ensure isolation
  afterEach(() => {
    cleanup();
  });

  test('should have app header with title and NSM status side by side', () => {
    render(<NSMWordleApp enableNSM={true} />);

    // Should have an app header container
    const header = document.querySelector('.app-header');
    expect(header).toBeInTheDocument();

    // Header should contain both title and NSM status
    const title = header?.querySelector('h1');
    const nsmStatus = header?.querySelector('.nsm-status');

    expect(title).toBeInTheDocument();
    expect(nsmStatus).toBeInTheDocument();
    expect(header).toContainElement(title!);
    expect(header).toContainElement(nsmStatus!);
  });

  test('should position NSM status in header when enabled', () => {
    render(<NSMWordleApp enableNSM={true} />);

    const nsmStatus = document.querySelector('.nsm-status');
    expect(nsmStatus).toBeInTheDocument();

    // NSM status should be inside the header
    const header = document.querySelector('.app-header');
    expect(header).toContainElement(nsmStatus);
  });

  test('should have compact spacing without NSM status', () => {
    render(<NSMWordleApp enableNSM={false} />);

    // Should still have app header (even without NSM)
    const header = document.querySelector('.app-header');
    expect(header).toBeInTheDocument();

    // Title should be present in header
    const title = header?.querySelector('h1');
    expect(title).toBeInTheDocument();

    // Should not have NSM status anywhere in document
    const nsmStatus = document.querySelector('.nsm-status');
    expect(nsmStatus).toBeNull();
  });

  test('should have compact main container layout', () => {
    render(<NSMWordleApp enableNSM={false} />);

    const mainElements = document.querySelectorAll('[role="main"]');
    const mainElement = mainElements[0]; // Get the first main element
    expect(mainElement).toHaveClass('app-compact');
  });

  test('should maintain proper header structure', () => {
    render(<NSMWordleApp enableNSM={true} />);

    const header = document.querySelector('.app-header');
    const mainElements = document.querySelectorAll('[role="main"]');
    const mainElement = mainElements[0]; // Get the first main element

    // Should have proper CSS classes
    expect(header).toBeInTheDocument();
    expect(mainElement).toHaveClass('app');
    expect(mainElement).toHaveClass('app-compact');

    // Header should be a direct child of main
    expect(mainElement).toContainElement(header!);
  });
});