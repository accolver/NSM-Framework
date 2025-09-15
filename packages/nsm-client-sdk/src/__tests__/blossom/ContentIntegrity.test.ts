/**
 * Test suite for Blossom Content Integrity Verification (Task 4.2)
 * Testing SHA-256 verification and content validation
 */

import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { BlossomClient, BlossomConfig } from '../../blossom/BlossomClient';
import { calculateSHA256, verifyContentIntegrity } from '../../blossom/utils';

describe('Blossom Content Integrity Verification', () => {
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

  describe('SHA-256 Hash Calculation', () => {
    test('should calculate correct SHA-256 hash for string content', async () => {
      const content = 'hello world';
      const expectedHash = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';

      const hash = await calculateSHA256(content);
      expect(hash).toBe(expectedHash);
    });

    test('should calculate correct SHA-256 hash for binary content', async () => {
      const content = new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f]); // "hello"
      const expectedHash = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824';

      const hash = await calculateSHA256(content);
      expect(hash).toBe(expectedHash);
    });

    test('should handle empty content', async () => {
      const content = '';
      const expectedHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

      const hash = await calculateSHA256(content);
      expect(hash).toBe(expectedHash);
    });

    test('should calculate same hash for same content', async () => {
      const content = 'test content for duplication';
      const hash1 = await calculateSHA256(content);
      const hash2 = await calculateSHA256(content);

      expect(hash1).toBe(hash2);
    });
  });

  describe('Content Integrity Verification', () => {
    test('should verify matching content and hash', async () => {
      const content = 'test machine logic code';
      const hash = await calculateSHA256(content);

      const isValid = await verifyContentIntegrity(content, hash);
      expect(isValid).toBe(true);
    });

    test('should reject mismatched content and hash', async () => {
      const content = 'original content';
      const wrongHash = 'incorrect-hash-value';

      const isValid = await verifyContentIntegrity(content, wrongHash);
      expect(isValid).toBe(false);
    });

    test('should handle binary content verification', async () => {
      const content = new Uint8Array([1, 2, 3, 4, 5]);
      const hash = await calculateSHA256(content);

      const isValid = await verifyContentIntegrity(content, hash);
      expect(isValid).toBe(true);
    });
  });

  describe('BlossomClient with Integrity Verification', () => {
    test('should verify downloaded content integrity automatically', async () => {
      const originalContent = 'state machine logic';
      const correctHash = await calculateSHA256(originalContent);

      mockFetch.mockResolvedValueOnce(new Response(originalContent, { status: 200 }));

      const downloadedContent = await client.downloadAndVerify(correctHash);
      expect(downloadedContent).toBe(originalContent);

      expect(mockFetch).toHaveBeenCalledWith(`https://blossom.example.com/${correctHash}`);
    });

    test('should throw error when downloaded content hash mismatch', async () => {
      const tamperedContent = 'tampered state machine logic';
      const originalHash = 'original-hash-that-wont-match';

      mockFetch.mockResolvedValueOnce(new Response(tamperedContent, { status: 200 }));

      await expect(client.downloadAndVerify(originalHash))
        .rejects.toThrow('Content integrity verification failed: hash mismatch');
    });

    test('should verify upload response hash matches content', async () => {
      const content = 'upload verification test';
      const correctHash = await calculateSHA256(content);

      // Mock server responding with correct hash
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        hash: correctHash,
        url: `https://blossom.example.com/${correctHash}`,
        size: content.length
      }), { status: 201 }));

      const result = await client.uploadWithVerification(content);
      expect(result.hash).toBe(correctHash);
      expect(result.verified).toBe(true);
    });

    test('should detect server hash tampering on upload', async () => {
      const content = 'content for tampering test';
      const tamperedHash = 'tampered-server-response-hash';

      // Mock server responding with wrong hash (possible tampering)
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        hash: tamperedHash,
        url: `https://blossom.example.com/${tamperedHash}`,
        size: content.length
      }), { status: 201 }));

      await expect(client.uploadWithVerification(content))
        .rejects.toThrow('Server returned incorrect hash: possible tampering');
    });
  });

  describe('Content Validation', () => {
    test('should validate file size limits', async () => {
      const largeContent = 'x'.repeat(10 * 1024 * 1024 + 1); // 10MB + 1 byte

      await expect(client.upload(largeContent, { maxSize: 10 * 1024 * 1024 }))
        .rejects.toThrow('Content exceeds maximum size limit');
    });

    test('should validate content type if specified', async () => {
      const jsContent = 'function test() { return true; }';

      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        hash: await calculateSHA256(jsContent),
        url: 'https://blossom.example.com/hash',
        size: jsContent.length
      }), { status: 201 }));

      const result = await client.upload(jsContent, { contentType: 'application/javascript' });
      expect(result.contentType).toBe('application/javascript');
    });

    test('should reject invalid content types', async () => {
      const content = 'test content';

      await expect(client.upload(content, { contentType: 'invalid/type', strict: true }))
        .rejects.toThrow('Invalid content type: invalid/type');
    });
  });
});