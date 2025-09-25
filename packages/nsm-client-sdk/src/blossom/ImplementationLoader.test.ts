/**
 * ImplementationLoader Tests - TDD Implementation
 * Tests secure implementation loading and sandboxed execution
 */

import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { ImplementationLoader, LoaderConfig } from './ImplementationLoader';
import { BlossomClient } from './BlossomClient';
import { ImplementationBundle } from './ImplementationBundler';
import { NSMDefinitionContent, BlossomImplementationReference } from '@nsm/core';

describe('ImplementationLoader', () => {
  let loader: ImplementationLoader;
  let mockBlossomClient: any;

  const mockBundle: ImplementationBundle = {
    version: '1.0.0',
    contentType: 'application/x-nsm-implementation',
    hash: 'test-hash-123',
    functions: {
      testAction: {
        name: 'testAction',
        source: '() => ({ type: "TEST_ACTION" })',
        type: 'action'
      },
      testGuard: {
        name: 'testGuard',
        source: '() => true',
        type: 'guard'
      }
    },
    metadata: {
      functionCount: 2,
      createdAt: Date.now(),
      dependencies: []
    }
  };

  beforeEach(() => {
    // Create mock BlossomClient
    mockBlossomClient = {
      downloadImplementations: mock(() => Promise.resolve(mockBundle))
    };

    const config: LoaderConfig = {
      blossomClient: mockBlossomClient
    };

    loader = new ImplementationLoader(config);
  });

  describe('Constructor & Configuration', () => {
    test('should create instance with valid configuration', () => {
      expect(loader).toBeInstanceOf(ImplementationLoader);
      expect(() => loader.getConfig()).not.toThrow();
    });

    test('should throw error with invalid configuration', () => {
      expect(() => new ImplementationLoader({} as LoaderConfig)).toThrow('BlossomClient is required');
    });

    test('should use default security settings when not provided', () => {
      const config = loader.getConfig();
      expect(config.securityContext.allowUnsafeEval).toBe(false);
      expect(config.securityContext.maxExecutionTime).toBeGreaterThan(0);
    });
  });

  describe('Implementation Loading', () => {
    test('should load implementations from Blossom reference', async () => {
      const blossomRef: BlossomImplementationReference = {
        hash: 'test-hash-123',
        uri: 'blossom://server1/test-hash-123',
        contentType: 'application/x-nsm-implementation'
      };

      const result = await loader.loadImplementations(blossomRef);

      expect(result.functions).toEqual(mockBundle.functions);
      expect(result.metadata).toEqual(mockBundle.metadata);
      expect(mockBlossomClient.downloadImplementations).toHaveBeenCalledWith('test-hash-123');
    });

    test('should validate implementation bundle integrity', async () => {
      const blossomRef: BlossomImplementationReference = {
        hash: 'test-hash-123',
        uri: 'blossom://server1/test-hash-123',
        contentType: 'application/x-nsm-implementation',
        integrity: {
          algorithm: 'sha256',
          hash: 'expected-hash-456',
          verifiedAt: Date.now()
        }
      };

      const invalidBundle = { ...mockBundle, hash: 'wrong-hash' };
      mockBlossomClient.downloadImplementations = mock(() => Promise.resolve(invalidBundle));

      await expect(loader.loadImplementations(blossomRef)).rejects.toThrow('Hash verification failed');
    });

    test('should cache loaded implementations', async () => {
      const blossomRef: BlossomImplementationReference = {
        hash: 'test-hash-123',
        uri: 'blossom://server1/test-hash-123',
        contentType: 'application/x-nsm-implementation'
      };

      // First load
      await loader.loadImplementations(blossomRef);
      // Second load should use cache
      await loader.loadImplementations(blossomRef);

      expect(mockBlossomClient.downloadImplementations).toHaveBeenCalledTimes(1);
    });
  });

  describe('Secure Function Execution', () => {
    test('should execute functions in sandboxed environment', async () => {
      const blossomRef: BlossomImplementationReference = {
        hash: 'test-hash-123',
        uri: 'blossom://server1/test-hash-123',
        contentType: 'application/x-nsm-implementation'
      };

      const implementations = await loader.loadImplementations(blossomRef);
      const result = await loader.executeFunction('testAction', implementations.functions['testAction']!, {});

      expect(result).toEqual({ type: 'TEST_ACTION' });
    });

    test('should prevent unsafe operations in sandbox', async () => {
      const maliciousBundle = {
        ...mockBundle,
        functions: {
          maliciousAction: {
            name: 'maliciousAction',
            source: '() => { eval("alert(\'hacked\')"); }',
            type: 'action' as const
          }
        }
      };

      mockBlossomClient.downloadImplementations = mock(() => Promise.resolve(maliciousBundle));

      const blossomRef: BlossomImplementationReference = {
        hash: 'malicious-hash-123',
        uri: 'blossom://server1/malicious-hash-123',
        contentType: 'application/x-nsm-implementation'
      };

      const implementations = await loader.loadImplementations(blossomRef);

      await expect(
        loader.executeFunction('maliciousAction', implementations.functions['maliciousAction']!, {})
      ).rejects.toThrow('Unsafe operation detected');
    });
  });

  describe('Cache Management', () => {
    test('should respect cache size limit', async () => {
      // Create a separate mock client for this test to avoid conflicts
      const testMockClient = {
        downloadImplementations: mock()
      };

      const smallCacheConfig: LoaderConfig = {
        blossomClient: testMockClient,
        cacheConfig: {
          maxSize: 1, // Only 1 entry
          ttl: 3600000,
          persistToDisk: false
        }
      };

      const smallCacheLoader = new ImplementationLoader(smallCacheConfig);

      // Create separate mock responses for different hashes
      const bundle1 = { ...mockBundle, hash: 'hash-1' };
      const bundle2 = { ...mockBundle, hash: 'hash-2' };

      // Set up mock to return different bundles for different calls
      let callCount = 0;
      testMockClient.downloadImplementations.mockImplementation((hash: string) => {
        callCount++;
        if (hash === 'hash-1') {
          return Promise.resolve(bundle1);
        } else if (hash === 'hash-2') {
          return Promise.resolve(bundle2);
        }
        return Promise.reject(new Error('Unexpected hash'));
      });

      // Create two different references
      const ref1: BlossomImplementationReference = {
        hash: 'hash-1',
        uri: 'blossom://server1/hash-1',
        contentType: 'application/x-nsm-implementation'
      };

      const ref2: BlossomImplementationReference = {
        hash: 'hash-2',
        uri: 'blossom://server1/hash-2',
        contentType: 'application/x-nsm-implementation'
      };

      // Load first implementation (fills cache with hash-1)
      await smallCacheLoader.loadImplementations(ref1);
      expect(callCount).toBe(1);

      // Load second implementation (should evict hash-1, cache hash-2)
      await smallCacheLoader.loadImplementations(ref2);
      expect(callCount).toBe(2);

      // Load first again (hash-1 was evicted, should re-fetch)
      await smallCacheLoader.loadImplementations(ref1);
      expect(callCount).toBe(3);

      expect(testMockClient.downloadImplementations).toHaveBeenCalledTimes(3);
    });
  });

  describe('Mixed Implementation Support', () => {
    test('should handle mixed inline and Blossom implementations', async () => {
      const nsmDefinition: NSMDefinitionContent = {
        machineConfig: {
          id: 'mixedMachine',
          initial: 'idle',
          states: { idle: {} },
          setup: {
            actions: {
              inlineAction: '() => ({ type: "INLINE" })',
              blossomAction: 'ref:blossom:test-hash-123'
            }
          }
        },
        stateSchema: { type: 'object' },
        interactionSchema: { type: 'object' },
        implementations: {
          hash: 'test-hash-123',
          uri: 'blossom://server1/test-hash-123',
          contentType: 'application/x-nsm-implementation'
        }
      };

      const result = await loader.loadMixedImplementations(nsmDefinition);

      expect(result.inline.actions).toHaveProperty('inlineAction');
      expect(result.blossom.functions).toHaveProperty('testAction');
    });
  });

  describe('Offline Support', () => {
    test('should provide fallback for offline mode', async () => {
      const offlineConfig: LoaderConfig = {
        blossomClient: mockBlossomClient,
        offlineMode: true,
        fallbackImplementations: {
          'test-hash-123': mockBundle
        }
      };

      const offlineLoader = new ImplementationLoader(offlineConfig);

      const blossomRef: BlossomImplementationReference = {
        hash: 'test-hash-123',
        uri: 'blossom://server1/test-hash-123',
        contentType: 'application/x-nsm-implementation'
      };

      // Simulate network error
      mockBlossomClient.downloadImplementations = mock(() => Promise.reject(new Error('Network error')));

      const result = await offlineLoader.loadImplementations(blossomRef);

      expect(result.functions).toEqual(mockBundle.functions);
      expect(mockBlossomClient.downloadImplementations).not.toHaveBeenCalled();
    });
  });
});