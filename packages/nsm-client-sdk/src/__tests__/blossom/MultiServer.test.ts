/**
 * Test suite for Blossom Multi-Server Redundancy (Task 4.3)
 * Testing failover, redundancy, and server selection
 */

import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { BlossomClient, BlossomConfig } from '../../blossom/BlossomClient';
import { calculateSHA256 } from '../../blossom/utils';

describe('Blossom Multi-Server Redundancy', () => {
  let client: BlossomClient;
  let mockFetch: any;

  const multiServerConfig: BlossomConfig = {
    servers: [
      'https://primary.blossom.com',
      'https://backup1.blossom.com',
      'https://backup2.blossom.com'
    ],
    privateKey: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    redundancy: {
      replicationCount: 2,
      failoverTimeout: 5000,
      retryAttempts: 3
    }
  };

  beforeEach(() => {
    client = new BlossomClient(multiServerConfig);
    mockFetch = mock();
    global.fetch = mockFetch;
  });

  describe('Server Selection and Load Balancing', () => {
    test('should distribute uploads across multiple servers', async () => {
      const content1 = 'content for server 1';
      const content2 = 'content for server 2';
      const content3 = 'content for server 3';

      // Mock successful responses from different servers
      mockFetch
        .mockResolvedValueOnce(new Response(JSON.stringify({
          hash: await calculateSHA256(content1),
          url: 'https://primary.blossom.com/hash1',
          size: content1.length
        }), { status: 201 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({
          hash: await calculateSHA256(content2),
          url: 'https://backup1.blossom.com/hash2',
          size: content2.length
        }), { status: 201 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({
          hash: await calculateSHA256(content3),
          url: 'https://backup2.blossom.com/hash3',
          size: content3.length
        }), { status: 201 }));

      await client.upload(content1);
      await client.upload(content2);
      await client.upload(content3);

      // Verify different servers were used
      const calls = mockFetch.mock.calls;
      const serverUrls = calls.map(call => call[0]);

      expect(serverUrls).toContain('https://primary.blossom.com/upload');
      expect(serverUrls).toContain('https://backup1.blossom.com/upload');
      expect(serverUrls).toContain('https://backup2.blossom.com/upload');
    });

    test('should track server health and avoid unhealthy servers', async () => {
      const content = 'test content for health check';

      // Primary server fails, should try backup
      mockFetch
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockResolvedValueOnce(new Response(JSON.stringify({
          hash: await calculateSHA256(content),
          url: 'https://backup1.blossom.com/hash',
          size: content.length
        }), { status: 201 }));

      const result = await client.upload(content);

      expect(result.url).toContain('backup1.blossom.com');
      expect(client.getServerHealth('https://primary.blossom.com')).toBe('unhealthy');
      expect(client.getServerHealth('https://backup1.blossom.com')).toBe('healthy');
    });
  });

  describe('Automatic Failover', () => {
    test('should failover to backup server on primary failure', async () => {
      const content = 'failover test content';
      const hash = await calculateSHA256(content);

      // Primary server fails
      mockFetch
        .mockRejectedValueOnce(new Error('Server unavailable'))
        .mockResolvedValueOnce(new Response(JSON.stringify({
          hash,
          url: `https://backup1.blossom.com/${hash}`,
          size: content.length
        }), { status: 201 }));

      const result = await client.upload(content);

      expect(result.url).toContain('backup1.blossom.com');
      expect(mockFetch).toHaveBeenCalledTimes(2); // One failure, one success
    });

    test('should try all servers before giving up', async () => {
      const content = 'exhaustive failover test';

      // All servers fail
      mockFetch
        .mockRejectedValueOnce(new Error('Primary failed'))
        .mockRejectedValueOnce(new Error('Backup1 failed'))
        .mockRejectedValueOnce(new Error('Backup2 failed'));

      await expect(client.upload(content))
        .rejects.toThrow('All Blossom servers failed');

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    test('should respect failover timeout configuration', async () => {
      const content = 'timeout test content';
      const fastConfig = {
        ...multiServerConfig,
        redundancy: { ...multiServerConfig.redundancy!, failoverTimeout: 100 }
      };

      const fastClient = new BlossomClient(fastConfig);

      // Mock fetch that respects AbortController
      mockFetch.mockImplementationOnce((_url, options) => {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            resolve(new Response('Success', { status: 201 }));
          }, 200);

          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              clearTimeout(timeoutId);
              const error = new Error('Request aborted');
              error.name = 'AbortError';
              reject(error);
            });
          }
        });
      });

      const startTime = Date.now();
      await expect(fastClient.upload(content)).rejects.toThrow();
      const duration = Date.now() - startTime;

      // Should timeout much faster than the mock 200ms delay
      expect(duration).toBeLessThan(150);
    });
  });

  describe('Content Replication', () => {
    test('should replicate content to multiple servers', async () => {
      const content = 'content for replication';
      const hash = await calculateSHA256(content);

      // Mock successful uploads to multiple servers
      mockFetch
        .mockResolvedValueOnce(new Response(JSON.stringify({
          hash, url: `https://primary.blossom.com/${hash}`, size: content.length
        }), { status: 201 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({
          hash, url: `https://backup1.blossom.com/${hash}`, size: content.length
        }), { status: 201 }));

      const result = await client.uploadWithReplication(content);

      expect(result.replicas).toHaveLength(2);
      expect(result.replicas.map(r => r.url)).toEqual([
        `https://primary.blossom.com/${hash}`,
        `https://backup1.blossom.com/${hash}`
      ]);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    test('should handle partial replication failures gracefully', async () => {
      const content = 'partial replication test';
      const hash = await calculateSHA256(content);

      // First server succeeds, second fails
      mockFetch
        .mockResolvedValueOnce(new Response(JSON.stringify({
          hash, url: `https://primary.blossom.com/${hash}`, size: content.length
        }), { status: 201 }))
        .mockRejectedValueOnce(new Error('Backup server failed'));

      const result = await client.uploadWithReplication(content);

      expect(result.replicas).toHaveLength(1);
      expect(result.replicas[0].url).toBe(`https://primary.blossom.com/${hash}`);
      expect(result.partialReplication).toBe(true);
    });
  });

  describe('Download with Failover', () => {
    test('should download from available server on failure', async () => {
      const hash = 'test-hash-for-download';
      const content = 'downloaded content from backup';

      // Primary fails, backup succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Primary server down'))
        .mockResolvedValueOnce(new Response(content, { status: 200 }));

      const result = await client.download(hash);

      expect(result).toBe(content);
      expect(mockFetch).toHaveBeenCalledWith(`https://primary.blossom.com/${hash}`);
      expect(mockFetch).toHaveBeenCalledWith(`https://backup1.blossom.com/${hash}`);
    });

    test('should prefer fastest responding server for downloads', async () => {
      const hash = 'speed-test-hash';
      const content = 'fast server content';

      // Configure client to track server response times
      const speedConfig = {
        ...multiServerConfig,
        redundancy: {
          ...multiServerConfig.redundancy!,
          preferFastestServer: true
        }
      };

      const speedClient = new BlossomClient(speedConfig);

      // First download: primary fails, backup1 succeeds quickly
      mockFetch
        .mockRejectedValueOnce(new Error('Primary slow'))
        .mockResolvedValueOnce(new Response(content, { status: 200 }));

      // First download to establish that backup1 is fast and primary is slow
      await speedClient.download(hash);

      // Second download: should prefer backup1 (which succeeded quickly last time)
      mockFetch.mockResolvedValueOnce(new Response(content, { status: 200 }));

      await speedClient.download(hash + '2');

      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      expect(lastCall[0]).toContain('backup1.blossom.com'); // Should prefer faster server
    });
  });

  describe('Server Health Monitoring', () => {
    test('should mark servers as unhealthy after consecutive failures', async () => {
      const content = 'health monitoring test';

      // Server fails multiple times
      for (let i = 0; i < 3; i++) {
        mockFetch.mockRejectedValueOnce(new Error('Server error'));
      }

      try {
        await client.upload(content);
      } catch (error) {
        // Expected to fail
      }

      expect(client.getServerHealth('https://primary.blossom.com')).toBe('unhealthy');
    });

    test('should recover unhealthy servers after successful operations', async () => {
      const content = 'recovery test';
      const hash = await calculateSHA256(content);

      // Mark server as unhealthy first
      client.markServerUnhealthy('https://primary.blossom.com');
      expect(client.getServerHealth('https://primary.blossom.com')).toBe('unhealthy');

      // Successful operation should recover it
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        hash, url: `https://primary.blossom.com/${hash}`, size: content.length
      }), { status: 201 }));

      await client.checkServerHealth('https://primary.blossom.com');

      expect(client.getServerHealth('https://primary.blossom.com')).toBe('healthy');
    });

    test('should expose server statistics', () => {
      const stats = client.getServerStats();

      expect(Object.keys(stats)).toContain('https://primary.blossom.com');
      expect(stats['https://primary.blossom.com']).toEqual(
        expect.objectContaining({
          health: expect.any(String),
          responseTime: expect.any(Number),
          successRate: expect.any(Number),
          totalRequests: expect.any(Number)
        })
      );
    });
  });
});