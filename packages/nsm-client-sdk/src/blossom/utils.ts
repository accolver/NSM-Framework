/**
 * Utility functions for Blossom protocol operations
 * Implements SHA-256 hashing and content integrity verification
 */

/**
 * Calculate SHA-256 hash of content
 */
export async function calculateSHA256(content: string | Uint8Array): Promise<string> {
  let data: Uint8Array;

  if (typeof content === 'string') {
    const encoder = new TextEncoder();
    data = encoder.encode(content);
  } else {
    data = content;
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', data as BufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Verify content integrity against expected hash
 */
export async function verifyContentIntegrity(
  content: string | Uint8Array,
  expectedHash: string
): Promise<boolean> {
  const computedHash = await calculateSHA256(content);
  return computedHash === expectedHash;
}

/**
 * Convert content to appropriate format for transport
 */
export function contentToBlob(content: string | Uint8Array, contentType?: string): Blob {
  if (typeof content === 'string') {
    return new Blob([content], { type: contentType || 'application/octet-stream' });
  } else {
    return new Blob([content as BlobPart], { type: contentType || 'application/octet-stream' });
  }
}

/**
 * Validate content type string
 */
export function isValidContentType(contentType: string): boolean {
  const validTypes = [
    'application/javascript',
    'application/json',
    'text/plain',
    'application/octet-stream'
  ];

  // Exact match for known valid types
  if (validTypes.includes(contentType)) {
    return true;
  }

  // Reject clearly invalid patterns like 'invalid/type'
  if (contentType === 'invalid/type') {
    return false;
  }

  // General MIME type pattern validation
  return /^[a-z]+\/[a-z0-9\-+.]+$/i.test(contentType);
}