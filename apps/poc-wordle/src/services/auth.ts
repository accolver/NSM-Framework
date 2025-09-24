/**
 * Nostr Authentication Service
 * Handles nsec and NIP-07 extension authentication for NSM applications
 */

import { NDKPrivateKeySigner, NDKNip07Signer } from '@nostr-dev-kit/ndk';

export interface AuthState {
  isAuthenticated: boolean;
  npub: string | null;
  method: 'nsec' | 'nip07' | null;
  signer?: NDKPrivateKeySigner | NDKNip07Signer | null;
}

export interface LoginResult {
  success: boolean;
  npub?: string;
  method?: 'nsec' | 'nip07';
  error?: string;
}

export type AuthEventType = 'login' | 'logout' | 'error';

export class NostrAuthService {
  private authState: AuthState = {
    isAuthenticated: false,
    npub: null,
    method: null,
    signer: null
  };

  private listeners: Map<AuthEventType, Set<(state: AuthState) => void>> = new Map();

  constructor() {
    // Initialize listeners map
    this.listeners.set('login', new Set());
    this.listeners.set('logout', new Set());
    this.listeners.set('error', new Set());
  }

  /**
   * Validate nsec key format
   */
  validateNsecKey(nsecKey: string): boolean {
    if (!nsecKey || typeof nsecKey !== 'string') {
      return false;
    }

    // Basic format check: should start with 'nsec1' and be ~63 characters
    if (!nsecKey.startsWith('nsec1') || nsecKey.length < 60) {
      return false;
    }

    // Additional validation could include bech32 decoding
    return true;
  }

  /**
   * Check if NIP-07 extension is available
   */
  isNip07Available(): boolean {
    return typeof window !== 'undefined' &&
           typeof window.nostr !== 'undefined' &&
           typeof window.nostr.getPublicKey === 'function';
  }

  /**
   * Login with nsec private key
   */
  async loginWithNsec(nsecKey: string): Promise<LoginResult> {
    try {
      if (!this.validateNsecKey(nsecKey)) {
        return {
          success: false,
          error: 'Invalid nsec key format'
        };
      }

      const signer = this.createPrivateKeySigner(nsecKey);
      const user = await signer.user();
      const npub = user.npub;

      this.authState = {
        isAuthenticated: true,
        npub,
        method: 'nsec',
        signer
      };

      this.notifyListeners('login', this.authState);

      return {
        success: true,
        npub,
        method: 'nsec'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to login with nsec: ${errorMessage}`
      };
    }
  }

  /**
   * Login with NIP-07 browser extension
   */
  async loginWithNip07(): Promise<LoginResult> {
    try {
      if (!this.isNip07Available()) {
        return {
          success: false,
          error: 'NIP-07 extension not found. Please install a Nostr extension like Alby or nos2x.'
        };
      }

      const signer = this.createNip07Signer();
      await signer.blockUntilReady();

      const user = await signer.user();
      const npub = user.npub;

      this.authState = {
        isAuthenticated: true,
        npub,
        method: 'nip07',
        signer
      };

      this.notifyListeners('login', this.authState);

      return {
        success: true,
        npub,
        method: 'nip07'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to login with extension: ${errorMessage}`
      };
    }
  }

  /**
   * Logout and clear authentication state
   */
  logout(): void {
    this.authState = {
      isAuthenticated: false,
      npub: null,
      method: null,
      signer: null
    };

    this.notifyListeners('logout', this.authState);
  }

  /**
   * Get current authentication state
   */
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  /**
   * Get current signer for NDK
   */
  getSigner(): NDKPrivateKeySigner | NDKNip07Signer | null {
    return this.authState.signer || null;
  }

  /**
   * Add event listener for auth state changes
   */
  addEventListener(event: AuthEventType, listener: (state: AuthState) => void): void {
    this.listeners.get(event)?.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(event: AuthEventType, listener: (state: AuthState) => void): void {
    this.listeners.get(event)?.delete(listener);
  }

  /**
   * Private helper to create NDK private key signer
   */
  private createPrivateKeySigner(nsecKey: string): NDKPrivateKeySigner {
    return new NDKPrivateKeySigner(nsecKey);
  }

  /**
   * Private helper to create NDK NIP-07 signer
   */
  private createNip07Signer(): NDKNip07Signer {
    return new NDKNip07Signer();
  }

  /**
   * Private helper to notify listeners
   */
  private notifyListeners(event: AuthEventType, state: AuthState): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(state);
        } catch (error) {
          console.error(`Error in auth listener for ${event}:`, error);
        }
      });
    }
  }
}