import { useState, useEffect } from 'react';
import NDK from '@nostr-dev-kit/ndk';

export type ConnectionStatus = 'connecting' | 'connected' | 'error';

export interface RelayStatus {
  url: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
}

// Mock NSMClient using NDK directly for now
class MockNSMClient {
  ndk: NDK;
  relayUrls: string[];

  constructor(options: any) {
    this.relayUrls = options.relayUrls;
    this.ndk = new NDK({
      explicitRelayUrls: options.relayUrls,
      signer: options.signer // Pass signer if provided
    });
  }

  async connect() {
    await this.ndk.connect();
  }

  disconnect() {
    // NDK doesn't have disconnect method
  }

  getRelayStatuses(): RelayStatus[] {
    // Since NDK doesn't expose individual relay connection status reliably,
    // we'll return a simplified status based on whether the NDK pool exists
    // The actual connection status is handled by the functional validation
    return this.relayUrls.map(url => {
      // If we have a relay pool, assume relays are at least attempting to connect
      const status: RelayStatus['status'] = this.ndk.pool ? 'connected' : 'disconnected';
      return { url, status };
    });
  }

  static isNip07Available() {
    return typeof window !== 'undefined' && window.nostr !== undefined;
  }
}

interface UseNSMClientOptions {
  signer?: any;
}

export function useNSMClient(options?: UseNSMClientOptions) {
  const [client, setClient] = useState<MockNSMClient | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [relayStatuses, setRelayStatuses] = useState<RelayStatus[]>([]);

  useEffect(() => {
    initializeClient();

    return () => {
      if (client) {
        client.disconnect();
      }
    };
  }, [options?.signer]); // Re-initialize when signer changes

  // Update relay statuses periodically with improved status detection
  useEffect(() => {
    if (!client) return;

    let statusCheckDelay = 0;
    let gracePeriodActive = true;

    const updateRelayStatuses = async () => {
      const statuses = client.getRelayStatuses();
      setRelayStatuses(statuses);

      // Update overall connection status based on relay statuses
      const connectedCount = statuses.filter(s => s.status === 'connected').length;
      const connectingCount = statuses.filter(s => s.status === 'connecting').length;

      // Functional validation - try to fetch events to verify connection
      let canFetchEvents = false;
      try {
        const testFilter = { kinds: [30079], limit: 1 };
        const events = await client.ndk.fetchEvents(testFilter);
        canFetchEvents = true;
      } catch (error) {
        canFetchEvents = false;
      }

      // Status detection with grace period and functional validation
      if (connectedCount > 0 || canFetchEvents) {
        setStatus('connected');
        gracePeriodActive = false;
      } else if (connectingCount > 0 || gracePeriodActive) {
        setStatus('connecting');
      } else {
        setStatus('error');
      }

      statusCheckDelay++;
      // Grace period ends after 3 status checks (6 seconds total)
      if (statusCheckDelay >= 3) {
        gracePeriodActive = false;
      }
    };

    // Initial update with delay to allow connections to stabilize
    setTimeout(updateRelayStatuses, 2000);

    // Update every 2 seconds after initial delay
    const interval = setInterval(updateRelayStatuses, 2000);

    return () => clearInterval(interval);
  }, [client]);

  const initializeClient = async () => {
    try {
      setStatus('connecting');

      const relayUrls = [
        'wss://relay.damus.io',
        'wss://nos.lol',
        'wss://relay.nostr.band'
      ];

      // Initialize relay statuses
      setRelayStatuses(relayUrls.map(url => ({ url, status: 'connecting' })));

      const nsmClient = new MockNSMClient({
        relayUrls,
        autoConnect: true,
        useNip07: MockNSMClient.isNip07Available(),
        signer: options?.signer
      });

      await nsmClient.connect();

      setClient(nsmClient);
    } catch (error) {
      console.error('Failed to initialize NSM client:', error);
      setStatus('error');
      setRelayStatuses(prev => prev.map(relay => ({ ...relay, status: 'error' })));
    }
  };

  const reconnect = () => {
    if (client) {
      client.disconnect();
    }
    setClient(null);
    setRelayStatuses([]);
    initializeClient();
  };

  return {
    client,
    status,
    relayStatuses,
    reconnect,
    isConnected: status === 'connected' && client !== null
  };
}