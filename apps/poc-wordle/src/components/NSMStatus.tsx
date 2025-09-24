import React, { useState, useEffect } from 'react';
import { NostrAuthService, type AuthState } from '../services/auth';
import { NostrLogin } from './NostrLogin';

interface NSMStatusProps {
  className?: string;
  authService: NostrAuthService;
}

export const NSMStatus: React.FC<NSMStatusProps> = ({ className = '', authService }) => {
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState());
  const [showLogin, setShowLogin] = useState(false);

  // Subscribe to auth state changes
  useEffect(() => {
    const handleAuthChange = (newState: AuthState) => {
      setAuthState(newState);
      if (newState.isAuthenticated) {
        setShowLogin(false); // Close login modal on successful login
      }
    };

    authService.addEventListener('login', handleAuthChange);
    authService.addEventListener('logout', handleAuthChange);

    return () => {
      authService.removeEventListener('login', handleAuthChange);
      authService.removeEventListener('logout', handleAuthChange);
    };
  }, [authService]);

  const handleLoginClick = () => {
    setShowLogin(true);
  };

  const handleCloseLogin = () => {
    setShowLogin(false);
  };

  return (
    <>
      <div className={`nsm-status ${className}`}>
        <span className="nsm-status-text">
          {authState.isAuthenticated ? (
            <>
              <span className="status-indicator connected"></span>
              NSM: Connected
            </>
          ) : (
            <>
              <span className="status-indicator disconnected"></span>
              NSM: Not Connected
            </>
          )}
        </span>

        {authState.isAuthenticated ? (
          <div className="user-info">
            <span className="user-npub" title={authState.npub || ''}>
              {authState.npub?.slice(0, 16)}...
            </span>
            <button
              className="nsm-logout-button"
              onClick={() => authService.logout()}
              aria-label="Logout from Nostr"
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            className="nsm-login-button"
            onClick={handleLoginClick}
            aria-label="Login to Nostr"
          >
            Login
          </button>
        )}
      </div>

      {showLogin && (
        <div className="login-modal">
          <div className="login-modal-backdrop" onClick={handleCloseLogin}></div>
          <div className="login-modal-content">
            <div className="login-modal-header">
              <h3>Connect to Nostr</h3>
              <button
                className="close-button"
                onClick={handleCloseLogin}
                aria-label="Close login modal"
              >
                ×
              </button>
            </div>
            <NostrLogin authService={authService} />
          </div>
        </div>
      )}

      <style jsx>{`
        .nsm-status {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem;
          font-size: 0.9rem;
        }

        .nsm-status-text {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-indicator.connected {
          background: #48bb78;
        }

        .status-indicator.disconnected {
          background: #e53e3e;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .user-npub {
          font-family: monospace;
          font-size: 0.8rem;
          color: #718096;
        }

        .nsm-login-button,
        .nsm-logout-button {
          padding: 0.4rem 0.8rem;
          border: 1px solid #cbd5e0;
          border-radius: 4px;
          background: #fff;
          color: #2d3748;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .nsm-login-button {
          border-color: #3182ce;
          color: #3182ce;
        }

        .nsm-login-button:hover {
          background: #3182ce;
          color: white;
        }

        .nsm-logout-button {
          border-color: #e53e3e;
          color: #e53e3e;
        }

        .nsm-logout-button:hover {
          background: #e53e3e;
          color: white;
        }

        .login-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .login-modal-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
        }

        .login-modal-content {
          position: relative;
          background: white;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .login-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .login-modal-header h3 {
          margin: 0;
          color: #1a202c;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #718096;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-button:hover {
          color: #2d3748;
        }
      `}</style>
    </>
  );
};