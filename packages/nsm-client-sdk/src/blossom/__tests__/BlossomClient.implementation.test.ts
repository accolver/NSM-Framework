/**
 * Test suite for BlossomClient implementation storage extensions (Task 21.3)
 * Tests enhanced methods for uploading and downloading implementation bundles
 */

import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { BlossomClient, BlossomConfig, BlossomUploadResponse } from '../BlossomClient';
import { ImplementationBundler, ImplementationBundle, ExtractedImplementations } from '../ImplementationBundler';
import { calculateSHA256 } from '../utils';

describe('BlossomClient Implementation Extensions', () => {
  let client: BlossomClient;
  let bundler: ImplementationBundler;
  let mockFetch: any;

  const testConfig: BlossomConfig = {
    servers: ['https://blossom.example.com'],
    privateKey: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  };

  beforeEach(() => {
    client = new BlossomClient(testConfig);
    bundler = new ImplementationBundler();
    mockFetch = mock();
    global.fetch = mockFetch;
  });

  describe('uploadImplementations', () => {
    test('should upload implementation bundle with correct content-type', async () => {
      // Create test bundle
      const implementations: ExtractedImplementations = {
        actions: {
          logStart: {
            name: 'logStart',
            source: "(context, event) => console.log('Starting:', event)",
            type: 'action'
          }
        },
        guards: {
          isReady: {
            name: 'isReady',
            source: "(context) => context.ready === true",
            type: 'guard'
          }
        },
        actors: {},
        skippedReferences: { actions: [], guards: [], actors: [] }
      };

      const bundle = bundler.createBundle(implementations);
      const serializedBundle = bundler.serializeBundle(bundle);

      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        hash: bundle.hash,
        url: `https://blossom.example.com/${bundle.hash}`,
        size: serializedBundle.length
      }), { status: 201 }));

      const result = await client.uploadImplementations(bundle);

      expect(result.hash).toBe(bundle.hash);
      expect(result.url).toBe(`https://blossom.example.com/${bundle.hash}`);

      // Verify content-type is set correctly
      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.headers['Content-Type']).toBe('application/x-nsm-implementation');
    });

    test('should validate bundle before upload', async () => {
      // Create invalid bundle
      const invalidBundle = {
        version: '1.0.0',
        contentType: 'application/x-nsm-implementation' as const,
        hash: 'invalid-hash',
        functions: {},
        metadata: { functionCount: 0, createdAt: Date.now() }
      };

      await expect(client.uploadImplementations(invalidBundle))
        .rejects.toThrow('Bundle integrity verification failed');
    });

    test('should use existing upload infrastructure with enhanced integrity checking', async () => {
      const implementations: ExtractedImplementations = {
        actions: {
          testAction: {
            name: 'testAction',
            source: "() => console.log('test')",
            type: 'action'
          }
        },
        guards: {},
        actors: {},
        skippedReferences: { actions: [], guards: [], actors: [] }
      };

      const bundle = bundler.createBundle(implementations);
      const serializedBundle = bundler.serializeBundle(bundle);
      const expectedHash = await calculateSHA256(serializedBundle);

      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        hash: expectedHash,
        url: `https://blossom.example.com/${expectedHash}`,
        size: serializedBundle.length
      }), { status: 201 }));

      const result = await client.uploadImplementations(bundle);

      expect(result.hash).toBe(expectedHash);
      expect(result.verified).toBe(true); // Should be marked as verified

      // Verify Nostr authorization was created
      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.headers['Authorization']).toMatch(/^Nostr .+/);
    });

    test('should handle upload failures gracefully', async () => {
      const bundle = bundler.createBundle({
        actions: {},
        guards: {},
        actors: {},
        skippedReferences: { actions: [], guards: [], actors: [] }
      });

      mockFetch.mockResolvedValueOnce(new Response('Server Error', { status: 500 }));

      await expect(client.uploadImplementations(bundle))
        .rejects.toThrow('Upload failed: Server Error');
    });
  });

  describe('downloadImplementations', () => {
    test('should download and deserialize implementation bundle', async () => {
      // Create test bundle
      const implementations: ExtractedImplementations = {
        actions: {
          downloadTest: {
            name: 'downloadTest',
            source: "() => console.log('downloaded')",
            type: 'action'
          }
        },
        guards: {},
        actors: {},
        skippedReferences: { actions: [], guards: [], actors: [] }
      };

      const originalBundle = bundler.createBundle(implementations);
      const serializedBundle = bundler.serializeBundle(originalBundle);

      mockFetch.mockResolvedValueOnce(new Response(serializedBundle, { status: 200 }));

      const result = await client.downloadImplementations(originalBundle.hash);

      expect(result.hash).toBe(originalBundle.hash);
      expect(result.functions.downloadTest.source).toBe("() => console.log('downloaded')");
      expect(result.metadata.functionCount).toBe(1);
    });

    test('should validate bundle integrity after download', async () => {
      const hash = 'test-hash';
      const corruptedBundle = JSON.stringify({
        version: '1.0.0',
        contentType: 'application/json', // Wrong content type
        hash: 'wrong-hash',
        functions: {},
        metadata: { functionCount: 0, createdAt: Date.now() }
      });

      mockFetch.mockResolvedValueOnce(new Response(corruptedBundle, { status: 200 }));

      await expect(client.downloadImplementations(hash))
        .rejects.toThrow('Bundle integrity verification failed');
    });

    test('should use existing download infrastructure', async () => {
      const hash = 'test-hash';

      mockFetch.mockResolvedValueOnce(new Response('Not Found', { status: 404 }));

      await expect(client.downloadImplementations(hash))
        .rejects.toThrow('Download failed: Not Found');
    });

    test('should cache successfully verified implementations', async () => {
      const implementations: ExtractedImplementations = {
        actions: {
          cachedAction: {
            name: 'cachedAction',
            source: "() => 'cached'",
            type: 'action'
          }
        },
        guards: {},
        actors: {},
        skippedReferences: { actions: [], guards: [], actors: [] }
      };

      const bundle = bundler.createBundle(implementations);
      const serializedBundle = bundler.serializeBundle(bundle);

      mockFetch.mockResolvedValueOnce(new Response(serializedBundle, { status: 200 }));

      // First download
      const result1 = await client.downloadImplementations(bundle.hash);
      expect(result1.hash).toBe(bundle.hash);

      // Second download should use cache (no fetch call)
      const result2 = await client.downloadImplementations(bundle.hash);
      expect(result2.hash).toBe(bundle.hash);

      // Should only have made one fetch call
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('should invalidate cache based on content hash', async () => {
      const implementations1: ExtractedImplementations = {
        actions: {
          action1: {
            name: 'action1',
            source: "() => 'first'",
            type: 'action'
          }
        },
        guards: {},
        actors: {},
        skippedReferences: { actions: [], guards: [], actors: [] }
      };

      const implementations2: ExtractedImplementations = {
        actions: {
          action2: {
            name: 'action2',
            source: "() => 'second'",
            type: 'action'
          }
        },
        guards: {},
        actors: {},
        skippedReferences: { actions: [], guards: [], actors: [] }
      };

      const bundle1 = bundler.createBundle(implementations1, { version: "1.0.0" });
      const bundle2 = bundler.createBundle(implementations2, { version: "2.0.0" });

      // Verify bundles have different hashes
      expect(bundle1.hash).not.toBe(bundle2.hash);

      mockFetch
        .mockResolvedValueOnce(new Response(bundler.serializeBundle(bundle1), { status: 200 }))
        .mockResolvedValueOnce(new Response(bundler.serializeBundle(bundle2), { status: 200 }));

      // Download different bundles
      const result1 = await client.downloadImplementations(bundle1.hash);
      const result2 = await client.downloadImplementations(bundle2.hash);

      expect(result1.functions.action1.source).toBe("() => 'first'");
      expect(result2.functions.action2.source).toBe("() => 'second'");

      // Should have made two fetch calls for different hashes
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Content-type validation', () => {
    test('should validate application/x-nsm-implementation content-type', () => {
      const bundle = bundler.createBundle({
        actions: {},
        guards: {},
        actors: {},
        skippedReferences: { actions: [], guards: [], actors: [] }
      });

      expect(bundle.contentType).toBe('application/x-nsm-implementation');

      // This should not throw
      expect(() => {
        bundler.deserializeBundle(bundler.serializeBundle(bundle));
      }).not.toThrow();
    });
  });

  describe('Integration with existing BlossomClient features', () => {
    test('should work with multi-server configuration', async () => {
      const multiServerConfig: BlossomConfig = {
        servers: [
          'https://server1.example.com',
          'https://server2.example.com'
        ],
        privateKey: testConfig.privateKey
      };

      const multiClient = new BlossomClient(multiServerConfig);
      const bundle = bundler.createBundle({
        actions: {},
        guards: {},
        actors: {},
        skippedReferences: { actions: [], guards: [], actors: [] }
      });

      // Mock first server failure, second server success
      mockFetch
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce(new Response(JSON.stringify({
          hash: bundle.hash,
          url: `https://server2.example.com/${bundle.hash}`,
          size: 100
        }), { status: 201 }));

      const result = await multiClient.uploadImplementations(bundle);
      expect(result.url).toBe(`https://server2.example.com/${bundle.hash}`);
    });

    test('should work with replication features', async () => {
      const replicationConfig: BlossomConfig = {
        ...testConfig,
        redundancy: {
          replicationCount: 2
        }
      };

      const replicationClient = new BlossomClient(replicationConfig);
      const bundle = bundler.createBundle({
        actions: {},
        guards: {},
        actors: {},
        skippedReferences: { actions: [], guards: [], actors: [] }
      });

      // The uploadImplementations should leverage existing replication features
      // This test ensures compatibility with existing infrastructure
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        hash: bundle.hash,
        url: `https://blossom.example.com/${bundle.hash}`,
        size: 100
      }), { status: 201 }));

      const result = await replicationClient.uploadImplementations(bundle);
      expect(result.hash).toBe(bundle.hash);
    });
  });
});