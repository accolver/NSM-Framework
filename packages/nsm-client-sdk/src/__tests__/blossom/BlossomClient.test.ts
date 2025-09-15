/**
 * Test suite for BlossomClient core operations (Task 4.1)
 * Testing PUT/GET/DELETE operations with Nostr authorization
 */

import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { BlossomClient, BlossomConfig, BlossomUploadResponse } from '../../blossom/BlossomClient';
import { calculateSHA256 } from '../../blossom/utils';

describe('BlossomClient Core Operations', () => {
  let client: BlossomClient;
  let mockFetch: any;

  const testConfig: BlossomConfig = {
    servers: ['https://blossom.example.com'],
    privateKey: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  };

  beforeEach(() => {
    client = new BlossomClient(testConfig);
    mockFetch = mock();
    global.fetch = mockFetch;
  });

  describe('Constructor and Configuration', () => {
    test('should create BlossomClient with valid config', () => {
      expect(client).toBeDefined();
      expect(client.getServers()).toEqual(testConfig.servers);
    });

    test('should throw error with empty servers array', () => {
      expect(() => new BlossomClient({ servers: [], privateKey: testConfig.privateKey }))
        .toThrow('At least one Blossom server must be configured');
    });

    test('should throw error with invalid private key', () => {
      expect(() => new BlossomClient({ servers: testConfig.servers, privateKey: 'invalid' }))
        .toThrow('Private key must be 64 character hex string');
    });
  });

  describe('PUT Operations (Upload)', () => {
    test('should upload blob with proper authorization event', async () => {
      const content = 'test machine logic code';
      const expectedHash = await calculateSHA256(content);

      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        hash: expectedHash,
        url: `https://blossom.example.com/${expectedHash}`,
        size: content.length
      }), { status: 201 }));

      const result = await client.upload(content);

      expect(result.hash).toBe(expectedHash);
      expect(result.url).toBe(`https://blossom.example.com/${expectedHash}`);
      expect(result.size).toBe(content.length);

      // Verify fetch was called with correct parameters
      expect(mockFetch).toHaveBeenCalledWith(
        'https://blossom.example.com/upload',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Authorization': expect.stringMatching(/^Nostr .+/),
            'Content-Type': 'application/octet-stream'
          }),
          body: expect.any(Blob)
        })
      );
    });

    test('should handle upload failure with proper error', async () => {
      mockFetch.mockResolvedValueOnce(new Response('Server Error', { status: 500 }));

      await expect(client.upload('test content'))
        .rejects.toThrow('Upload failed: Server Error');
    });

    test('should create valid Nostr authorization event for upload', async () => {
      const content = 'test content';
      const hash = await calculateSHA256(content);

      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        hash,
        url: `https://blossom.example.com/${hash}`,
        size: content.length
      }), { status: 201 }));

      await client.upload(content);

      const callArgs = mockFetch.mock.calls[0][1];
      const authHeader = callArgs.headers['Authorization'];

      // Decode and verify the Nostr event structure
      const authEvent = JSON.parse(atob(authHeader.replace('Nostr ', '')));

      expect(authEvent.kind).toBe(24242); // Blossom auth event kind
      expect(authEvent.content).toBe(`Upload ${hash}`);
      expect(authEvent.tags).toContainEqual(['t', 'upload']);
      expect(authEvent.tags).toContainEqual(['x', hash]);
      expect(authEvent.created_at).toBeTypeOf('number');
      expect(authEvent.sig).toBeDefined();
    });
  });

  describe('GET Operations (Download)', () => {
    test('should download blob by hash', async () => {
      const content = 'downloaded content';
      const hash = await calculateSHA256(content);

      mockFetch.mockResolvedValueOnce(new Response(content, { status: 200 }));

      const result = await client.download(hash);

      expect(result).toBe(content);
      expect(mockFetch).toHaveBeenCalledWith(`https://blossom.example.com/${hash}`);
    });

    test('should handle download failure for non-existent content', async () => {
      const hash = 'nonexistent123';
      mockFetch.mockResolvedValueOnce(new Response('Not Found', { status: 404 }));

      await expect(client.download(hash))
        .rejects.toThrow('Download failed: Not Found');
    });
  });

  describe('DELETE Operations', () => {
    test('should delete blob with proper authorization', async () => {
      const hash = 'test-hash-to-delete';

      mockFetch.mockResolvedValueOnce(new Response('', { status: 204 }));

      await client.delete(hash);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://blossom.example.com/${hash}`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Authorization': expect.stringMatching(/^Nostr .+/)
          })
        })
      );
    });

    test('should create valid Nostr authorization event for delete', async () => {
      const hash = 'test-hash-to-delete';

      mockFetch.mockResolvedValueOnce(new Response('', { status: 204 }));

      await client.delete(hash);

      const callArgs = mockFetch.mock.calls[0][1];
      const authHeader = callArgs.headers['Authorization'];
      const authEvent = JSON.parse(atob(authHeader.replace('Nostr ', '')));

      expect(authEvent.kind).toBe(24242);
      expect(authEvent.content).toBe(`Delete ${hash}`);
      expect(authEvent.tags).toContainEqual(['t', 'delete']);
      expect(authEvent.tags).toContainEqual(['x', hash]);
    });

    test('should handle delete failure gracefully', async () => {
      const hash = 'test-hash';
      mockFetch.mockResolvedValueOnce(new Response('Forbidden', { status: 403 }));

      await expect(client.delete(hash))
        .rejects.toThrow('Delete failed: Forbidden');
    });
  });
});