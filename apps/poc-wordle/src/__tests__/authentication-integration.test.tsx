/**
 * Authentication Integration Test - End-to-End Verification
 * Tests the complete authentication flow with NSM integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { expect, test, describe, beforeEach, afterEach, jest } from 'bun:test';
import { App } from '../components/App';

// Mock window.nostr for NIP-07 testing
const mockNostr = {
  getPublicKey: jest.fn().mockResolvedValue('test-pubkey'),
  signEvent: jest.fn().mockResolvedValue({}),
  enable: jest.fn().mockResolvedValue(true)
};

describe('Authentication Integration E2E', () => {
  beforeEach(() => {
    // Set up window.nostr mock
    global.window = {
      ...global.window,
      nostr: mockNostr
    } as any;

    // Clear mocks
    Object.values(mockNostr).forEach(mock => mock.mockClear());
  });

  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
  });

  test('should show login button when not authenticated', async () => {
    render(<App />);

    // Should show "Not Connected" status
    expect(screen.getByText('NSM: Not Connected')).toBeTruthy();

    // Should have login button
    expect(screen.getByText('Login')).toBeTruthy();
  });

  test('should open login modal when login button clicked', async () => {
    render(<App />);

    const loginButton = screen.getByText('Login');
    fireEvent.click(loginButton);

    // Should show login modal
    await waitFor(() => {
      expect(screen.getByText('Connect to Nostr')).toBeTruthy();
      expect(screen.getByText('Login to Nostr')).toBeTruthy();
      expect(screen.getByText('Private Key (nsec)')).toBeTruthy();
      expect(screen.getByText('Extension Login')).toBeTruthy();
    });
  });

  test('should show security warning in login modal', async () => {
    render(<App />);

    const loginButton = screen.getByText('Login');
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/Warning: Never share your private key/)).toBeTruthy();
    });
  });

  test('should close login modal when close button clicked', async () => {
    render(<App />);

    const loginButton = screen.getByText('Login');
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText('Connect to Nostr')).toBeTruthy();
    });

    const closeButton = screen.getByLabelText('Close login modal');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Connect to Nostr')).toBeNull();
    });
  });

  test('should close login modal when backdrop clicked', async () => {
    render(<App />);

    const loginButton = screen.getByText('Login');
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText('Connect to Nostr')).toBeTruthy();
    });

    const backdrop = screen.getByText('Connect to Nostr').closest('.login-modal')?.querySelector('.login-modal-backdrop');
    expect(backdrop).toBeTruthy();

    fireEvent.click(backdrop!);

    await waitFor(() => {
      expect(screen.queryByText('Connect to Nostr')).toBeNull();
    });
  });

  test('should validate nsec input format', async () => {
    render(<App />);

    const loginButton = screen.getByText('Login');
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('nsec1...')).toBeTruthy();
    });

    const nsecInput = screen.getByPlaceholderText('nsec1...');
    const nsecLoginButton = screen.getByText('Login with nsec');

    // Try invalid nsec
    fireEvent.change(nsecInput, { target: { value: 'invalid' } });
    fireEvent.click(nsecLoginButton);

    await waitFor(() => {
      expect(screen.getByText(/Invalid nsec key format/)).toBeTruthy();
    });
  });

  test('should show NIP-07 extension availability', async () => {
    render(<App />);

    const loginButton = screen.getByText('Login');
    fireEvent.click(loginButton);

    await waitFor(() => {
      // Should show extension login button when window.nostr is available
      expect(screen.getByText('Login with Extension')).toBeTruthy();
    });
  });

  test('should show extension not available when window.nostr missing', async () => {
    // Remove window.nostr
    delete (global.window as any).nostr;

    render(<App />);

    const loginButton = screen.getByText('Login');
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText('No Nostr extension found')).toBeTruthy();
      expect(screen.queryByText('Login with Extension')).toBeNull();
    });

    // Restore for other tests
    (global.window as any).nostr = mockNostr;
  });

  test('should maintain game functionality while login modal is open', async () => {
    render(<App />);

    // Open login modal
    const loginButton = screen.getByText('Login');
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText('Connect to Nostr')).toBeTruthy();
    });

    // Game should still be functional
    expect(screen.getByText('Wordle')).toBeTruthy();
    expect(screen.getByRole('main', { name: 'Wordle game' })).toBeTruthy();

    // Wordle grid should be present
    const gridCells = screen.getAllByRole('gridcell');
    expect(gridCells.length).toBeGreaterThan(0);

    // Game functionality available while modal open
    expect(screen.getByText('Wordle')).toBeTruthy();
  });

  test('should prevent nsec login with empty input', async () => {
    render(<App />);

    const loginButton = screen.getByText('Login');
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('nsec1...')).toBeTruthy();
    });

    const nsecLoginButton = screen.getByText('Login with nsec');

    // Button should be disabled with empty input
    expect(nsecLoginButton.hasAttribute('disabled')).toBe(true);

    fireEvent.click(nsecLoginButton);

    // Should not show any success or error messages
    await waitFor(() => {
      expect(screen.queryByText(/Connected as/)).toBeNull();
      expect(screen.queryByText(/Invalid nsec/)).toBeNull();
    }, { timeout: 500 });
  });

  test('should show connection status in header', async () => {
    render(<App />);

    // Should show disconnected status with red indicator
    const statusText = screen.getByText('NSM: Not Connected');
    expect(statusText).toBeTruthy();

    // Status indicator should have disconnected styling
    const statusElement = statusText.closest('.nsm-status');
    expect(statusElement).toBeTruthy();

    const indicator = statusElement?.querySelector('.status-indicator.disconnected');
    expect(indicator).toBeTruthy();
  });

  test('should render all main app components', async () => {
    render(<App />);

    // Header components
    expect(screen.getByText('Wordle')).toBeTruthy();
    expect(screen.getByText('NSM: Not Connected')).toBeTruthy();

    // Game components
    expect(screen.getByRole('main', { name: 'Wordle game' })).toBeTruthy();

    // Word grid (cells should exist)
    const gridCells = screen.getAllByRole('gridcell');
    expect(gridCells.length).toBe(30); // 6 rows × 5 columns

    // Authentication functionality is integrated
    expect(screen.getByText('Login')).toBeTruthy();
  });
});