/**
 * NSM Authentication Integration
 * Integrates NostrAuthService with NSMClient to fix signer requirements
 */

import { NSMClient } from '@nsm/client';
import { NostrAuthService } from './auth';

export class NSMAuthIntegration {
  private nsmClient: NSMClient | null = null;

  constructor(private authService: NostrAuthService) {
    // Listen for auth state changes to update NSM client
    this.authService.addEventListener('login', this.handleLogin.bind(this));
    this.authService.addEventListener('logout', this.handleLogout.bind(this));
  }

  /**
   * Create or recreate NSM client with current signer
   */
  private async updateNSMClient(): Promise<void> {
    const signer = this.authService.getSigner();

    if (signer) {
      // Create new NSM client with signer
      this.nsmClient = new NSMClient({
        autoConnect: true,
        ndk: undefined, // Let NSMClient create NDK instance with signer
        privateKey: undefined,
        useNip07: undefined
      });

      // Manually set the signer on NDK
      this.nsmClient['ndk'].signer = signer;

      try {
        await this.nsmClient.connect();
        console.log('NSM client connected with authenticated signer');
      } catch (error) {
        console.warn('Failed to connect NSM client:', error);
      }
    } else {
      this.nsmClient = null;
    }
  }

  private async handleLogin(): Promise<void> {
    await this.updateNSMClient();
  }

  private handleLogout(): void {
    this.nsmClient = null;
  }

  /**
   * Get the current NSM client instance
   */
  getNSMClient(): NSMClient | null {
    return this.nsmClient;
  }

  /**
   * Check if NSM is ready for publishing (authenticated + connected)
   */
  isReadyForPublishing(): boolean {
    return this.authService.getAuthState().isAuthenticated &&
           this.nsmClient !== null;
  }

  /**
   * Get connection status for display
   */
  getConnectionStatus(): {
    isAuthenticated: boolean;
    isConnected: boolean;
    canPublish: boolean;
    npub: string | null;
  } {
    const authState = this.authService.getAuthState();

    return {
      isAuthenticated: authState.isAuthenticated,
      isConnected: this.nsmClient !== null,
      canPublish: this.isReadyForPublishing(),
      npub: authState.npub
    };
  }
}