/**
 * Authentication Service Tests - TDD RED Phase
 * Tests for Nostr authentication with nsec and NIP-07 support
 */

import { expect, test, describe, beforeEach, jest } from 'bun:test';
import { NostrAuthService, type AuthState } from './auth';

// Mock NDK classes
const mockNDKPrivateKeySigner = {
  user: jest.fn().mockResolvedValue({ npub: 'npub1test...' }),
  sign: jest.fn().mockResolvedValue({})
};

const mockNDKNip07Signer = {
  user: jest.fn().mockResolvedValue({ npub: 'npub1extension...' }),
  sign: jest.fn().mockResolvedValue({}),
  blockUntilReady: jest.fn().mockResolvedValue(true)
};

// Mock global window.nostr for NIP-07
global.window = {
  nostr: {
    getPublicKey: jest.fn().mockResolvedValue('test-pubkey'),
    signEvent: jest.fn().mockResolvedValue({}),
    enable: jest.fn().mockResolvedValue(true)
  }
} as any;

describe('NostrAuthService', () => {
  let authService: NostrAuthService;

  beforeEach(() => {
    authService = new NostrAuthService();
    jest.clearAllMocks();
  });

  describe('nsec authentication', () => {
    test('should validate valid nsec key format', () => {
      const validNsec = 'nsec1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      expect(authService.validateNsecKey(validNsec)).toBe(true);
    });

    test('should reject invalid nsec key format', () => {
      expect(authService.validateNsecKey('')).toBe(false);
      expect(authService.validateNsecKey('invalid')).toBe(false);
      expect(authService.validateNsecKey('npub123')).toBe(false);
      expect(authService.validateNsecKey('nsec123')).toBe(false); // Too short
    });

    test('should login with valid nsec key', async () => {
      const validNsec = 'nsec1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

      // Mock successful login
      jest.spyOn(authService as any, 'createPrivateKeySigner')
        .mockReturnValue(mockNDKPrivateKeySigner);

      const result = await authService.loginWithNsec(validNsec);

      expect(result.success).toBe(true);
      expect(result.npub).toBe('npub1test...');
      expect(result.method).toBe('nsec');
    });

    test('should fail login with invalid nsec key', async () => {
      const invalidNsec = 'invalid';

      const result = await authService.loginWithNsec(invalidNsec);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid nsec key format');
    });
  });

  describe('NIP-07 extension authentication', () => {
    test('should detect NIP-07 extension availability', () => {
      expect(authService.isNip07Available()).toBe(true);
    });

    test('should login with NIP-07 extension', async () => {
      jest.spyOn(authService as any, 'createNip07Signer')
        .mockReturnValue(mockNDKNip07Signer);

      const result = await authService.loginWithNip07();

      expect(result.success).toBe(true);
      expect(result.npub).toBe('npub1extension...');
      expect(result.method).toBe('nip07');
    });

    test('should fail login when extension not available', async () => {
      // Temporarily remove window.nostr
      const originalNostr = (global.window as any).nostr;
      delete (global.window as any).nostr;

      const result = await authService.loginWithNip07();

      expect(result.success).toBe(false);
      expect(result.error).toContain('NIP-07 extension not found');

      // Restore
      (global.window as any).nostr = originalNostr;
    });
  });

  describe('authentication state management', () => {
    test('should start with unauthenticated state', () => {
      const state = authService.getAuthState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.npub).toBeNull();
      expect(state.method).toBeNull();
    });

    test('should update state after successful login', async () => {
      const validNsec = 'nsec1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

      jest.spyOn(authService as any, 'createPrivateKeySigner')
        .mockReturnValue(mockNDKPrivateKeySigner);

      await authService.loginWithNsec(validNsec);

      const state = authService.getAuthState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.npub).toBe('npub1test...');
      expect(state.method).toBe('nsec');
    });

    test('should clear state on logout', async () => {
      // First login
      const validNsec = 'nsec1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      jest.spyOn(authService as any, 'createPrivateKeySigner')
        .mockReturnValue(mockNDKPrivateKeySigner);

      await authService.loginWithNsec(validNsec);

      // Then logout
      authService.logout();

      const state = authService.getAuthState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.npub).toBeNull();
      expect(state.method).toBeNull();
    });
  });

  describe('signer management', () => {
    test('should return null signer when not authenticated', () => {
      expect(authService.getSigner()).toBeNull();
    });

    test('should return signer after successful authentication', async () => {
      const validNsec = 'nsec1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

      jest.spyOn(authService as any, 'createPrivateKeySigner')
        .mockReturnValue(mockNDKPrivateKeySigner);

      await authService.loginWithNsec(validNsec);

      expect(authService.getSigner()).toBe(mockNDKPrivateKeySigner);
    });
  });

  describe('event listeners', () => {
    test('should notify listeners on login', async () => {
      const listener = jest.fn();
      authService.addEventListener('login', listener);

      const validNsec = 'nsec1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      jest.spyOn(authService as any, 'createPrivateKeySigner')
        .mockReturnValue(mockNDKPrivateKeySigner);

      await authService.loginWithNsec(validNsec);

      expect(listener).toHaveBeenCalledWith({
        isAuthenticated: true,
        npub: 'npub1test...',
        method: 'nsec',
        signer: mockNDKPrivateKeySigner
      });
    });

    test('should notify listeners on logout', async () => {
      const listener = jest.fn();

      // First login
      const validNsec = 'nsec1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      jest.spyOn(authService as any, 'createPrivateKeySigner')
        .mockReturnValue(mockNDKPrivateKeySigner);

      await authService.loginWithNsec(validNsec);

      // Add listener and logout
      authService.addEventListener('logout', listener);
      authService.logout();

      expect(listener).toHaveBeenCalledWith({
        isAuthenticated: false,
        npub: null,
        method: null,
        signer: null
      });
    });
  });
});