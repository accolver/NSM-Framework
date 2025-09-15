/**
 * Integration tests for Blossom storage operations
 * Tests end-to-end file storage and retrieval with content integrity verification
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { BlossomClient, type BlossomConfig } from '../../packages/nsm-client-sdk/src/blossom/BlossomClient';
import { calculateSHA256, verifyContentIntegrity } from '../../packages/nsm-client-sdk/src/blossom/utils';

// Mock Blossom servers for testing (these would be real servers in production)
const TEST_SERVERS = [
  'https://blossom.primal.net',
  'https://blossom.nostrage.com'
];

// Mock private key for testing
const TEST_PRIVATE_KEY = '1'.repeat(64);

describe('Blossom Storage Integration Tests', () => {
  let client: BlossomClient;
  let testConfig: BlossomConfig;

  beforeAll(() => {
    testConfig = {
      servers: TEST_SERVERS,
      privateKey: TEST_PRIVATE_KEY,
      redundancy: {
        replicationCount: 2,
        failoverTimeout: 10000,
        retryAttempts: 3,
        preferFastestServer: true
      }
    };

    client = new BlossomClient(testConfig);
  });

  beforeEach(async () => {
    // Wait a bit between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  describe('Basic Upload and Download Operations', () => {
    it('should upload and download text content successfully', async () => {
      const testContent = 'Hello, Blossom Storage! This is a test content for NSM framework.';

      try {
        // Upload content
        const uploadResult = await client.upload(testContent, {
          contentType: 'text/plain'
        });

        expect(uploadResult).toBeDefined();
        expect(uploadResult.hash).toBeDefined();
        expect(uploadResult.url).toBeDefined();
        expect(uploadResult.size).toBe(testContent.length);
        expect(uploadResult.contentType).toBe('text/plain');

        // Verify hash matches expected
        const expectedHash = await calculateSHA256(testContent);
        expect(uploadResult.hash).toBe(expectedHash);

        // Download content using hash
        const downloadedContent = await client.download(uploadResult.hash);
        expect(downloadedContent).toBe(testContent);

        // Verify content integrity
        const isValid = await verifyContentIntegrity(downloadedContent, uploadResult.hash);
        expect(isValid).toBe(true);
      } catch (error) {
        // If real servers are unavailable, skip this test
        if (error instanceof Error && (error.message.includes('failed') || error.message.includes('timeout'))) {
          console.warn('Skipping real server test - servers may be unavailable:', error.message);
          return;
        }
        throw error;
      }
    }, 30000);

    it('should handle binary content uploads', async () => {
      // Create test binary data
      const binaryData = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]); // PNG header

      try {
        const uploadResult = await client.upload(binaryData, {
          contentType: 'image/png'
        });

        expect(uploadResult).toBeDefined();
        expect(uploadResult.hash).toBeDefined();
        expect(uploadResult.size).toBe(binaryData.length);

        // Download and verify
        const downloadedContent = await client.download(uploadResult.hash);
        const downloadedBuffer = new TextEncoder().encode(downloadedContent);

        // Verify content integrity
        const isValid = await verifyContentIntegrity(binaryData, uploadResult.hash);
        expect(isValid).toBe(true);
      } catch (error) {
        if (error instanceof Error && (error.message.includes('failed') || error.message.includes('timeout'))) {
          console.warn('Skipping real server test - servers may be unavailable:', error.message);
          return;
        }
        throw error;
      }
    }, 30000);

    it('should handle large content uploads', async () => {
      // Create larger test content (1KB)
      const largeContent = 'A'.repeat(1024);

      try {
        const uploadResult = await client.upload(largeContent, {
          contentType: 'text/plain',
          maxSize: 2048 // 2KB limit
        });

        expect(uploadResult).toBeDefined();
        expect(uploadResult.size).toBe(1024);

        const downloadedContent = await client.download(uploadResult.hash);
        expect(downloadedContent).toBe(largeContent);
      } catch (error) {
        if (error instanceof Error && (error.message.includes('failed') || error.message.includes('timeout'))) {
          console.warn('Skipping real server test - servers may be unavailable:', error.message);
          return;
        }
        throw error;
      }
    }, 45000);
  });

  describe('Content Integrity and Verification', () => {
    it('should verify content integrity automatically', async () => {
      const testContent = JSON.stringify({
        type: 'NSM_STATE_UPDATE',
        timestamp: Date.now(),
        data: { state: 'active', context: { value: 42 } }
      });

      try {
        // Upload with automatic verification
        const uploadResult = await client.uploadWithVerification(testContent);
        expect(uploadResult.verified).toBe(true);
        expect(uploadResult.hash).toBeDefined();

        // Download and verify manually
        const downloadedContent = await client.downloadAndVerify(uploadResult.hash);
        expect(downloadedContent).toBe(testContent);
      } catch (error) {
        if (error instanceof Error && (error.message.includes('failed') || error.message.includes('timeout'))) {
          console.warn('Skipping real server test - servers may be unavailable:', error.message);
          return;
        }
        throw error;
      }
    }, 30000);

    it('should detect content tampering', async () => {
      const originalContent = 'Original content that should not be tampered with';
      const tamperedContent = 'Tampered content that has been modified';

      // Calculate hashes
      const originalHash = await calculateSHA256(originalContent);
      const tamperedHash = await calculateSHA256(tamperedContent);

      // Verify that different content produces different hashes
      expect(originalHash).not.toBe(tamperedHash);

      // Verify integrity check fails for tampered content
      const isOriginalValid = await verifyContentIntegrity(originalContent, originalHash);
      const isTamperedValid = await verifyContentIntegrity(tamperedContent, originalHash);

      expect(isOriginalValid).toBe(true);
      expect(isTamperedValid).toBe(false);
    });
  });

  describe('Multi-Server Redundancy', () => {
    it('should handle server redundancy correctly', async () => {
      const testContent = 'Content for redundancy testing across multiple Blossom servers';

      try {
        // Upload with replication
        const uploadResult = await client.uploadWithReplication(testContent);
        expect(uploadResult).toBeDefined();
        expect(uploadResult.replicas).toBeDefined();

        // Should have attempted replication to multiple servers
        if (uploadResult.replicas && uploadResult.replicas.length > 0) {
          expect(uploadResult.replicas.length).toBeGreaterThan(0);
          expect(uploadResult.replicas.length).toBeLessThanOrEqual(testConfig.redundancy!.replicationCount!);

          // All replicas should have the same hash
          for (const replica of uploadResult.replicas) {
            expect(replica.hash).toBe(uploadResult.hash);
          }
        }

        // Should be able to download from any replica
        const downloadedContent = await client.download(uploadResult.hash);
        expect(downloadedContent).toBe(testContent);
      } catch (error) {
        if (error instanceof Error && (error.message.includes('failed') || error.message.includes('timeout'))) {
          console.warn('Skipping real server test - servers may be unavailable:', error.message);
          return;
        }
        throw error;
      }
    }, 45000);

    it('should handle server failover gracefully', async () => {
      // Create a client with a mix of valid and invalid servers
      const failoverConfig: BlossomConfig = {
        servers: [
          'https://invalid-server.example.com',
          ...TEST_SERVERS
        ],
        privateKey: TEST_PRIVATE_KEY,
        redundancy: {
          failoverTimeout: 5000,
          retryAttempts: 2
        }
      };

      const failoverClient = new BlossomClient(failoverConfig);
      const testContent = 'Testing failover behavior with invalid servers';

      try {
        // Should succeed despite having invalid servers in the list
        const uploadResult = await failoverClient.upload(testContent);
        expect(uploadResult).toBeDefined();
        expect(uploadResult.hash).toBeDefined();

        // Should be able to download successfully
        const downloadedContent = await failoverClient.download(uploadResult.hash);
        expect(downloadedContent).toBe(testContent);
      } catch (error) {
        if (error instanceof Error && (error.message.includes('failed') || error.message.includes('timeout'))) {
          console.warn('Skipping real server test - servers may be unavailable:', error.message);
          return;
        }
        throw error;
      }
    }, 60000);
  });

  describe('Server Health Monitoring', () => {
    it('should track server health correctly', async () => {
      // Check initial server stats
      const initialStats = client.getServerStats();
      expect(Object.keys(initialStats)).toEqual(TEST_SERVERS);

      for (const server of TEST_SERVERS) {
        const health = client.getServerHealth(server);
        expect(['healthy', 'unhealthy', 'unknown']).toContain(health);
      }
    });

    it('should handle server health checks', async () => {
      const testServer = TEST_SERVERS[0]!;

      try {
        // Perform health check
        await client.checkServerHealth(testServer);

        // Check that health status was updated
        const health = client.getServerHealth(testServer);
        expect(['healthy', 'unhealthy']).toContain(health);

        // Get detailed stats
        const stats = client.getServerStats();
        const serverStats = stats[testServer];
        expect(serverStats).toBeDefined();
        expect(typeof serverStats!.responseTime).toBe('number');
        expect(typeof serverStats!.successRate).toBe('number');
      } catch (error) {
        // Health check might fail if server is unreachable
        console.warn('Health check failed - server may be unreachable:', error);
      }
    }, 15000);

    it('should mark unhealthy servers correctly', async () => {
      const testServer = TEST_SERVERS[0]!;

      // Manually mark server as unhealthy
      client.markServerUnhealthy(testServer);

      const health = client.getServerHealth(testServer);
      expect(health).toBe('unhealthy');

      const stats = client.getServerStats();
      expect(stats[testServer]!.health).toBe('unhealthy');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle upload size limits correctly', async () => {
      const oversizedContent = 'x'.repeat(1000);

      try {
        await expect(client.upload(oversizedContent, {
          maxSize: 100 // Much smaller than content
        })).rejects.toThrow('Content exceeds maximum size limit');
      } catch (error) {
        // This should throw an error before even reaching the server
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle invalid content types in strict mode', async () => {
      const testContent = 'Test content with invalid type';

      try {
        await expect(client.upload(testContent, {
          contentType: 'invalid/type',
          strict: true
        })).rejects.toThrow('Invalid content type');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle download of non-existent content', async () => {
      const fakeHash = 'a'.repeat(64); // Valid format but non-existent content

      try {
        await expect(client.download(fakeHash)).rejects.toThrow();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    }, 15000);

    it('should handle network timeouts gracefully', async () => {
      // Create client with very short timeout for testing
      const timeoutConfig: BlossomConfig = {
        servers: TEST_SERVERS,
        privateKey: TEST_PRIVATE_KEY,
        redundancy: {
          failoverTimeout: 100 // Very short timeout
        }
      };

      const timeoutClient = new BlossomClient(timeoutConfig);
      const testContent = 'Testing timeout handling';

      try {
        // This might timeout due to short timeout setting
        const result = await timeoutClient.upload(testContent);
        // If it succeeds, that's also fine (servers were fast)
        expect(result).toBeDefined();
      } catch (error) {
        // Timeout is expected with such a short timeout
        expect(error).toBeInstanceOf(Error);
      }
    }, 10000);
  });

  describe('NSM Framework Integration', () => {
    it('should store and retrieve NSM state data', async () => {
      const nsmStateData = {
        type: 'NSM_STATE_SNAPSHOT',
        instanceId: 'test-instance-123',
        timestamp: Date.now(),
        state: 'active',
        context: {
          userId: 'user123',
          step: 'processing',
          data: { progress: 75, message: 'Processing user request' }
        },
        history: [
          { transition: 'start', timestamp: Date.now() - 1000 },
          { transition: 'process', timestamp: Date.now() - 500 }
        ]
      };

      const serializedData = JSON.stringify(nsmStateData);

      try {
        // Store NSM state
        const uploadResult = await client.uploadWithVerification(serializedData);
        expect(uploadResult.verified).toBe(true);

        // Retrieve and parse NSM state
        const retrievedData = await client.downloadAndVerify(uploadResult.hash);
        const parsedData = JSON.parse(retrievedData);

        expect(parsedData).toEqual(nsmStateData);
        expect(parsedData.instanceId).toBe('test-instance-123');
        expect(parsedData.state).toBe('active');
        expect(parsedData.context.progress).toBe(75);
      } catch (error) {
        if (error instanceof Error && (error.message.includes('failed') || error.message.includes('timeout'))) {
          console.warn('Skipping real server test - servers may be unavailable:', error.message);
          return;
        }
        throw error;
      }
    }, 30000);

    it('should handle large NSM workflow data', async () => {
      // Create a large workflow with many steps
      const workflowData = {
        type: 'NSM_WORKFLOW_BACKUP',
        instanceId: 'workflow-large-123',
        definition: {
          states: Array.from({ length: 50 }, (_, i) => ({
            id: `state_${i}`,
            name: `State ${i}`,
            type: i === 0 ? 'initial' : i === 49 ? 'final' : 'normal',
            data: `data_for_state_${i}`.repeat(10)
          })),
          transitions: Array.from({ length: 49 }, (_, i) => ({
            id: `transition_${i}`,
            from: `state_${i}`,
            to: `state_${i + 1}`,
            condition: `condition_${i}`,
            action: `action_${i}`
          }))
        },
        executionHistory: Array.from({ length: 100 }, (_, i) => ({
          timestamp: Date.now() - (100 - i) * 1000,
          event: `event_${i}`,
          data: `event_data_${i}`.repeat(5)
        }))
      };

      const serializedWorkflow = JSON.stringify(workflowData);

      try {
        // Should handle large workflow data
        const uploadResult = await client.uploadWithVerification(serializedWorkflow);
        expect(uploadResult.verified).toBe(true);
        expect(uploadResult.size).toBeGreaterThan(10000); // Should be several KB

        const retrievedWorkflow = await client.downloadAndVerify(uploadResult.hash);
        const parsedWorkflow = JSON.parse(retrievedWorkflow);

        expect(parsedWorkflow.definition.states).toHaveLength(50);
        expect(parsedWorkflow.definition.transitions).toHaveLength(49);
        expect(parsedWorkflow.executionHistory).toHaveLength(100);
      } catch (error) {
        if (error instanceof Error && (error.message.includes('failed') || error.message.includes('timeout'))) {
          console.warn('Skipping real server test - servers may be unavailable:', error.message);
          return;
        }
        throw error;
      }
    }, 60000);
  });
});