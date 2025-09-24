/**
 * Wordle NSM Setup with Authentication
 * Integrates authentication with NSM publishing
 */

import { WordleNSMConnector } from '../nsm-integration';
import { NSMAuthIntegration } from './nsm-auth-integration';
import { NSMClient } from '@nsm/client';

export class WordleNSMSetup {
  private nsmConnector: WordleNSMConnector | null = null;

  constructor(
    private nsmAuthIntegration: NSMAuthIntegration,
    private actor: any
  ) {
    // Listen for auth changes to set up/tear down NSM connector
    const authService = this.nsmAuthIntegration['authService'];
    authService.addEventListener('login', this.handleAuthLogin.bind(this));
    authService.addEventListener('logout', this.handleAuthLogout.bind(this));
  }

  private async handleAuthLogin(): Promise<void> {
    const nsmClient = this.nsmAuthIntegration.getNSMClient();

    if (nsmClient && !this.nsmConnector) {
      try {
        console.log('Setting up NSM connector with authenticated client');
        this.nsmConnector = new WordleNSMConnector(nsmClient, this.actor);
        await this.nsmConnector.initialize();
        console.log('NSM connector initialized successfully');
      } catch (error) {
        console.error('Failed to initialize NSM connector:', error);
        this.nsmConnector = null;
      }
    }
  }

  private handleAuthLogout(): void {
    if (this.nsmConnector) {
      console.log('Disconnecting NSM connector due to logout');
      this.nsmConnector.disconnect();
      this.nsmConnector = null;
    }
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): {
    isAuthenticated: boolean;
    isNSMConnected: boolean;
    canPublish: boolean;
    error?: string;
  } {
    const authStatus = this.nsmAuthIntegration.getConnectionStatus();

    return {
      isAuthenticated: authStatus.isAuthenticated,
      isNSMConnected: this.nsmConnector?.isConnected || false,
      canPublish: authStatus.canPublish && (this.nsmConnector?.isConnected || false),
    };
  }

  /**
   * Force reconnection (useful for debugging)
   */
  async reconnect(): Promise<void> {
    if (this.nsmAuthIntegration.isReadyForPublishing()) {
      await this.handleAuthLogin();
    }
  }

  /**
   * Clean up connections
   */
  cleanup(): void {
    if (this.nsmConnector) {
      this.nsmConnector.disconnect();
      this.nsmConnector = null;
    }
  }
}