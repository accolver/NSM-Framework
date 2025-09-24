/**
 * Nostr Login Component
 * Provides UI for nsec and NIP-07 extension authentication
 */

import React, { useState, useEffect } from 'react';
import { NostrAuthService, type AuthState } from '../services/auth';

interface NostrLoginProps {
  authService: NostrAuthService;
  className?: string;
}

export const NostrLogin: React.FC<NostrLoginProps> = ({
  authService,
  className = ''
}) => {
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState());
  const [nsecInput, setNsecInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Subscribe to auth state changes
  useEffect(() => {
    const handleAuthChange = (newState: AuthState) => {
      setAuthState(newState);
      setIsLoading(false);
      setError(null);

      if (newState.isAuthenticated) {
        setSuccess(`Logged in as ${newState.npub}`);
        setNsecInput(''); // Clear nsec input for security
      }
    };

    authService.addEventListener('login', handleAuthChange);
    authService.addEventListener('logout', handleAuthChange);
    authService.addEventListener('error', handleAuthChange);

    return () => {
      authService.removeEventListener('login', handleAuthChange);
      authService.removeEventListener('logout', handleAuthChange);
      authService.removeEventListener('error', handleAuthChange);
    };
  }, [authService]);

  const handleNsecLogin = async () => {
    if (!nsecInput.trim()) {
      setError('Please enter your private key');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await authService.loginWithNsec(nsecInput.trim());

      if (!result.success) {
        setError(result.error || 'Login failed');
        setIsLoading(false);
      }
    } catch (err) {
      setError('Unexpected error during login');
      setIsLoading(false);
    }
  };

  const handleExtensionLogin = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await authService.loginWithNip07();

      if (!result.success) {
        setError(result.error || 'Extension login failed');
        setIsLoading(false);
      }
    } catch (err) {
      setError('Unexpected error during extension login');
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    setSuccess(null);
    setError(null);
  };

  const handleNsecInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNsecInput(e.target.value);
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  // Render authenticated state
  if (authState.isAuthenticated) {
    return (
      <div className={`nostr-login authenticated ${className}`}>
        <div className="user-info">
          <p className="connection-status">
            <span className="status-indicator connected"></span>
            Connected as:
          </p>
          <p className="npub" title={authState.npub || ''}>
            {authState.npub}
          </p>
          <p className="method">
            Method: {authState.method === 'nsec' ? 'Private Key' : 'Browser Extension'}
          </p>
        </div>
        <button
          className="logout-button"
          onClick={handleLogout}
          disabled={isLoading}
        >
          Logout
        </button>
      </div>
    );
  }

  // Render login form
  return (
    <div className={`nostr-login unauthenticated ${className}`}>
      <h3>Login to Nostr</h3>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="success-message" role="status">
          {success}
        </div>
      )}

      {/* Private Key Login */}
      <div className="login-method nsec-login">
        <h4>Private Key (nsec)</h4>
        <div className="security-warning">
          ⚠️ Warning: Never share your private key with anyone!
        </div>

        <input
          type="password"
          placeholder="nsec1..."
          value={nsecInput}
          onChange={handleNsecInputChange}
          className="nsec-input"
          disabled={isLoading}
          aria-label="Enter your Nostr private key"
        />

        <button
          onClick={handleNsecLogin}
          disabled={isLoading || !nsecInput.trim()}
          className="login-button nsec-button"
        >
          {isLoading ? 'Logging in...' : 'Login with nsec'}
        </button>
      </div>

      {/* Extension Login */}
      <div className="login-method extension-login">
        <h4>Extension Login</h4>

        {authService.isNip07Available() ? (
          <button
            onClick={handleExtensionLogin}
            disabled={isLoading}
            className="login-button extension-button"
          >
            {isLoading ? 'Connecting...' : 'Login with Extension'}
          </button>
        ) : (
          <div className="extension-unavailable">
            <p>No Nostr extension found</p>
            <p className="help-text">
              Install a Nostr extension like{' '}
              <a href="https://getalby.com" target="_blank" rel="noopener noreferrer">
                Alby
              </a>
              {' or '}
              <a href="https://github.com/fiatjaf/nos2x" target="_blank" rel="noopener noreferrer">
                nos2x
              </a>
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        .nostr-login {
          padding: 1rem;
          border: 1px solid #e1e5e9;
          border-radius: 8px;
          background: #fff;
          margin: 1rem 0;
        }

        .nostr-login h3 {
          margin-top: 0;
          color: #1a202c;
        }

        .error-message {
          background: #fed7d7;
          color: #c53030;
          padding: 0.75rem;
          border-radius: 4px;
          margin: 0.5rem 0;
        }

        .success-message {
          background: #c6f6d5;
          color: #22543d;
          padding: 0.75rem;
          border-radius: 4px;
          margin: 0.5rem 0;
        }

        .login-method {
          margin: 1.5rem 0;
          padding: 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: #f7fafc;
        }

        .login-method h4 {
          margin-top: 0;
          color: #2d3748;
        }

        .security-warning {
          background: #fed7d7;
          color: #744210;
          padding: 0.5rem;
          border-radius: 4px;
          font-size: 0.9rem;
          margin: 0.5rem 0;
        }

        .nsec-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #cbd5e0;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.9rem;
          margin: 0.5rem 0;
        }

        .nsec-input:focus {
          outline: none;
          border-color: #3182ce;
          box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
        }

        .login-button {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          background: #3182ce;
          color: white;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .login-button:hover:not(:disabled) {
          background: #2c5282;
        }

        .login-button:disabled {
          background: #a0aec0;
          cursor: not-allowed;
        }

        .extension-unavailable {
          color: #718096;
        }

        .help-text {
          font-size: 0.9rem;
          margin-top: 0.5rem;
        }

        .help-text a {
          color: #3182ce;
          text-decoration: underline;
        }

        .authenticated .user-info {
          margin-bottom: 1rem;
        }

        .connection-status {
          display: flex;
          align-items: center;
          margin: 0 0 0.5rem 0;
          font-weight: 500;
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 0.5rem;
        }

        .status-indicator.connected {
          background: #48bb78;
        }

        .npub {
          font-family: monospace;
          background: #edf2f7;
          padding: 0.5rem;
          border-radius: 4px;
          word-break: break-all;
          margin: 0.5rem 0;
        }

        .method {
          color: #718096;
          font-size: 0.9rem;
          margin: 0;
        }

        .logout-button {
          background: #e53e3e;
        }

        .logout-button:hover:not(:disabled) {
          background: #c53030;
        }
      `}</style>
    </div>
  );
};