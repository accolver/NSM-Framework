import React, { createContext, useContext, useState, useEffect } from 'react';
import NDK, { NDKNip07Signer, NDKPrivateKeySigner } from '@nostr-dev-kit/ndk';

interface AuthContextType {
  isAuthenticated: boolean;
  pubkey: string | null;
  signer: any | null;
  login: (method: 'nsec' | 'nip07', nsec?: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pubkey, setPubkey] = useState<string | null>(null);
  const [signer, setSigner] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if user was previously authenticated (this is basic - in production you'd want more secure session management)
  useEffect(() => {
    const savedAuth = localStorage.getItem('nsm-auth');
    if (savedAuth) {
      try {
        const authData = JSON.parse(savedAuth);
        if (authData.pubkey && authData.method === 'nip07') {
          // Try to restore NIP-07 authentication
          restoreNip07Auth();
        }
      } catch (e) {
        localStorage.removeItem('nsm-auth');
      }
    }
  }, []);

  const restoreNip07Auth = async () => {
    try {
      if (window.nostr) {
        const user = await window.nostr.getPublicKey();
        const nip07Signer = new NDKNip07Signer();
        setSigner(nip07Signer);
        setPubkey(user);
        setIsAuthenticated(true);
        setError(null);
      }
    } catch (e) {
      localStorage.removeItem('nsm-auth');
    }
  };

  const login = async (method: 'nsec' | 'nip07', nsec?: string) => {
    setError(null);

    try {
      if (method === 'nip07') {
        if (!window.nostr) {
          throw new Error('No Nostr browser extension found');
        }

        const user = await window.nostr.getPublicKey();
        const nip07Signer = new NDKNip07Signer();

        setSigner(nip07Signer);
        setPubkey(user);
        setIsAuthenticated(true);

        // Save auth state
        localStorage.setItem('nsm-auth', JSON.stringify({
          method: 'nip07',
          pubkey: user
        }));

      } else if (method === 'nsec' && nsec) {
        let privateKey = nsec.trim();

        // Handle nsec format
        if (privateKey.startsWith('nsec1')) {
          try {
            // You'll need to implement nsec decoding - for now we'll throw an error
            throw new Error('nsec decoding not implemented yet. Please use hex private key for now.');
          } catch (e) {
            throw new Error('Invalid nsec format');
          }
        }

        // Validate hex private key
        if (!/^[a-fA-F0-9]{64}$/.test(privateKey)) {
          throw new Error('Invalid private key format. Expected 64-character hex string.');
        }

        const privateKeySigner = new NDKPrivateKeySigner(privateKey);
        const user = await privateKeySigner.user();
        const userPubkey = user.pubkey;

        setSigner(privateKeySigner);
        setPubkey(userPubkey);
        setIsAuthenticated(true);

        // Don't save private key in localStorage for security
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      throw err;
    }
  };

  const logout = () => {
    setSigner(null);
    setPubkey(null);
    setIsAuthenticated(false);
    setError(null);
    localStorage.removeItem('nsm-auth');
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      pubkey,
      signer,
      login,
      logout,
      error
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Extend window type for TypeScript
declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>;
      signEvent(event: any): Promise<any>;
      getRelays?(): Promise<{[key: string]: {read: boolean, write: boolean}}>;
      nip04?: {
        encrypt(pubkey: string, plaintext: string): Promise<string>;
        decrypt(pubkey: string, ciphertext: string): Promise<string>;
      };
      nip44?: {
        encrypt(pubkey: string, plaintext: string): Promise<string>;
        decrypt(pubkey: string, ciphertext: string): Promise<string>;
      };
    };
  }
}