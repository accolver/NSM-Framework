/**
 * Nostr Login Component Tests - TDD RED Phase
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { expect, test, describe, beforeEach, afterEach, jest } from 'bun:test';
import { NostrLogin } from './NostrLogin';

// Mock auth service
const mockAuthService = {
  isNip07Available: jest.fn().mockReturnValue(true),
  loginWithNsec: jest.fn(),
  loginWithNip07: jest.fn(),
  logout: jest.fn(),
  getAuthState: jest.fn().mockReturnValue({
    isAuthenticated: false,
    npub: null,
    method: null
  }),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

describe('NostrLogin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test('should render login form when not authenticated', () => {
    render(<NostrLogin authService={mockAuthService as any} />);

    expect(screen.getByText('Login to Nostr')).toBeTruthy();
    expect(screen.getByText('Private Key (nsec)')).toBeTruthy();
    expect(screen.getByText('Extension Login')).toBeTruthy();
  });

  test('should render user info when authenticated', () => {
    const authenticatedService = {
      ...mockAuthService,
      getAuthState: jest.fn().mockReturnValue({
        isAuthenticated: true,
        npub: 'npub1test123...',
        method: 'nsec'
      })
    };

    render(<NostrLogin authService={authenticatedService as any} />);

    expect(screen.getByText('Connected as:')).toBeTruthy();
    expect(screen.getByText('npub1test123...')).toBeTruthy();
    expect(screen.getByText('Logout')).toBeTruthy();
  });

  test('should handle nsec login', async () => {
    mockAuthService.loginWithNsec.mockResolvedValue({
      success: true,
      npub: 'npub1test...',
      method: 'nsec'
    });

    render(<NostrLogin authService={mockAuthService as any} />);

    const nsecInput = screen.getByPlaceholderText('nsec1...');
    const loginButton = screen.getByText('Login with nsec');

    fireEvent.change(nsecInput, {
      target: { value: 'nsec1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' }
    });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(mockAuthService.loginWithNsec).toHaveBeenCalledWith(
        'nsec1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      );
    });
  });

  test('should handle NIP-07 extension login', async () => {
    mockAuthService.loginWithNip07.mockResolvedValue({
      success: true,
      npub: 'npub1extension...',
      method: 'nip07'
    });

    render(<NostrLogin authService={mockAuthService as any} />);

    const extensionButton = screen.getByText('Login with Extension');

    fireEvent.click(extensionButton);

    await waitFor(() => {
      expect(mockAuthService.loginWithNip07).toHaveBeenCalled();
    });
  });

  test('should show error message on failed login', async () => {
    mockAuthService.loginWithNsec.mockResolvedValue({
      success: false,
      error: 'Invalid nsec key'
    });

    render(<NostrLogin authService={mockAuthService as any} />);

    const nsecInput = screen.getByPlaceholderText('nsec1...');
    const loginButton = screen.getByText('Login with nsec');

    fireEvent.change(nsecInput, { target: { value: 'invalid' } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid nsec key')).toBeTruthy();
    });
  });

  test('should hide extension button when NIP-07 not available', () => {
    const noExtensionService = {
      ...mockAuthService,
      isNip07Available: jest.fn().mockReturnValue(false)
    };

    render(<NostrLogin authService={noExtensionService as any} />);

    expect(screen.queryByText('Login with Extension')).toBeNull();
    expect(screen.getByText('No Nostr extension found')).toBeTruthy();
  });

  test('should handle logout', async () => {
    const authenticatedService = {
      ...mockAuthService,
      getAuthState: jest.fn().mockReturnValue({
        isAuthenticated: true,
        npub: 'npub1test123...',
        method: 'nsec'
      })
    };

    render(<NostrLogin authService={authenticatedService as any} />);

    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);

    expect(mockAuthService.logout).toHaveBeenCalled();
  });

  test('should show security warning for nsec input', () => {
    render(<NostrLogin authService={mockAuthService as any} />);

    expect(screen.getByText(/Warning: Never share your private key/)).toBeTruthy();
  });

  test('should switch to authenticated view after successful login', async () => {
    let loginCallback: any;

    // Capture the login callback
    const mockAddEventListener = jest.fn((event, callback) => {
      if (event === 'login') {
        loginCallback = callback;
      }
    });

    const testAuthService = {
      ...mockAuthService,
      addEventListener: mockAddEventListener,
      loginWithNsec: jest.fn().mockImplementation(async () => {
        // Simulate successful login by calling the listener
        setTimeout(() => {
          if (loginCallback) {
            loginCallback({
              isAuthenticated: true,
              npub: 'npub1test...',
              method: 'nsec',
              signer: null
            });
          }
        }, 0);

        return {
          success: true,
          npub: 'npub1test...',
          method: 'nsec'
        };
      })
    };

    render(<NostrLogin authService={testAuthService as any} />);

    const nsecInput = screen.getByPlaceholderText('nsec1...');

    fireEvent.change(nsecInput, {
      target: { value: 'nsec1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' }
    });

    fireEvent.click(screen.getByText('Login with nsec'));

    // Should switch to authenticated view
    await waitFor(() => {
      expect(screen.getByText('Connected as:')).toBeTruthy();
      expect(screen.getByText('npub1test...')).toBeTruthy();
      expect(screen.queryByPlaceholderText('nsec1...')).toBeNull();
    });
  });
});