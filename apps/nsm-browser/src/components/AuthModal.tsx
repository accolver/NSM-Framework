import React, { useState } from 'react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (method: 'nsec' | 'nip07', nsec?: string) => Promise<void>;
  onLogout: () => void;
  isAuthenticated: boolean;
  pubkey?: string;
}

export default function AuthModal({ isOpen, onClose, onLogin, onLogout, isAuthenticated, pubkey }: AuthModalProps) {
  const [nsec, setNsec] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleNsecLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!nsec.trim()) {
        throw new Error('Please enter your private key');
      }
      await onLogin('nsec', nsec);
      setNsec('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleNip07Login = async () => {
    setLoading(true);
    setError('');

    try {
      await onLogin('nip07');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Browser extension login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    onLogout();
    onClose();
  };

  const isNip07Available = typeof window !== 'undefined' && window.nostr;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nostr Authentication</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {isAuthenticated ? (
            <div className="auth-status">
              <div className="auth-success">
                <span className="status-icon">✅</span>
                <div>
                  <p><strong>Authenticated</strong></p>
                  {pubkey && (
                    <p className="pubkey">
                      {pubkey.slice(0, 8)}...{pubkey.slice(-8)}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="logout-button"
                disabled={loading}
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="auth-options">
              <p>To publish state machines, you need to authenticate with Nostr:</p>

              {/* NIP-07 Browser Extension Login */}
              <div className="auth-method">
                <h3>🔐 Browser Extension (Recommended)</h3>
                <p>Use a Nostr browser extension like nos2x, Alby, or Flamingo.</p>
                <button
                  onClick={handleNip07Login}
                  disabled={!isNip07Available || loading}
                  className="auth-button primary"
                >
                  {loading ? 'Connecting...' : 'Connect Extension'}
                </button>
                {!isNip07Available && (
                  <p className="auth-warning">
                    No Nostr extension detected. Install a Nostr extension to use this option.
                  </p>
                )}
              </div>

              <div className="auth-divider">OR</div>

              {/* Private Key Login */}
              <div className="auth-method">
                <h3>🔑 Private Key (nsec)</h3>
                <div className="security-warning">
                  ⚠️ <strong>Security Warning:</strong> Only paste your private key on sites you trust.
                  Your key is not stored and only used for signing.
                </div>
                <form onSubmit={handleNsecLogin}>
                  <input
                    type="password"
                    value={nsec}
                    onChange={(e) => setNsec(e.target.value)}
                    placeholder="nsec1... or hex private key"
                    className="nsec-input"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    className="auth-button secondary"
                    disabled={loading || !nsec.trim()}
                  >
                    {loading ? 'Connecting...' : 'Login with nsec'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}