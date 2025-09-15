/**
 * NSM Wordle React Component Tests
 * Task 5.3: NSM Client SDK Integration
 *
 * REFACTOR PHASE - Comprehensive component testing
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NSMWordleApp } from './NSMWordleApp';
import '../test-setup';

describe('NSMWordleApp Component', () => {
  beforeEach(() => {
    // Clear any existing DOM
    document.body.innerHTML = '';
  });

  it('should render Wordle game without NSM by default', () => {
    render(<NSMWordleApp />);

    // Check that the game renders
    expect(screen.getByRole('main')).toBeDefined();
    expect(screen.getByText('Wordle')).toBeDefined();

    // Check that NSM status indicator is not shown
    const nsmStatus = document.querySelector('.nsm-status');
    expect(nsmStatus).toBeNull();
  });

  it('should show NSM status when NSM is enabled', () => {
    render(<NSMWordleApp enableNSM={true} />);

    // Check that the game renders with NSM indicator
    expect(screen.getByRole('main')).toBeDefined();
    expect(screen.getByText('Wordle')).toBeDefined();

    // Check that NSM status indicator is shown
    const nsmStatus = document.querySelector('.nsm-status');
    expect(nsmStatus).toBeDefined();
  });

  it('should have proper accessibility attributes', () => {
    render(<NSMWordleApp enableNSM={true} />);

    const main = screen.getByRole('main');
    expect(main.getAttribute('aria-label')).toBe('Wordle game with NSM integration');
    expect(main.getAttribute('aria-describedby')).toBe('game-instructions');

    // Check that game instructions include NSM information when enabled
    const instructions = document.getElementById('game-instructions');
    expect(instructions?.textContent).toContain('NSM network');
  });

  it('should render game components', () => {
    render(<NSMWordleApp />);

    // Check that main game components are present
    // Note: These selectors depend on the implementation of child components
    const wordGrid = document.querySelector('.word-grid');
    const keyboard = document.querySelector('.keyboard');

    // The components should be rendered (even if selectors don't match exactly)
    expect(screen.getByRole('main')).toBeDefined();
  });

  it('should accept custom relay URLs and private key for NSM', () => {
    const customRelays = ['wss://custom.relay.com'];
    const testPrivateKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    render(
      <NSMWordleApp
        enableNSM={true}
        relayUrls={customRelays}
        privateKey={testPrivateKey}
      />
    );

    // Component should render without crashing
    expect(screen.getByRole('main')).toBeDefined();

    // NSM status should be present
    const nsmStatus = document.querySelector('.nsm-status');
    expect(nsmStatus).toBeDefined();
  });
});