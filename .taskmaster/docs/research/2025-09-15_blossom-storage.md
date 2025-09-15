# Blossom Protocol Storage Research

## Overview
Blossom is a specification for content-addressed storage on Nostr, providing HTTP endpoints for storing binary blobs addressed by their SHA-256 hash. It's designed to handle large assets that don't fit in Nostr events.

## Key Features for NSM Framework
- **Content-Addressed Storage**: Files addressed by SHA-256 hash ensuring integrity
- **Nostr Identity Integration**: Upload/delete operations authorized by signed Nostr events
- **Decentralized Storage**: Multiple servers can host the same content
- **HTTP-Based**: Simple REST API for file operations

## Core Operations
```javascript
// Upload application logic to Blossom
async function uploadMachineLogic(machineCode: string, privateKey: string) {
  const blob = new Blob([machineCode], { type: 'application/javascript' });
  const hash = await calculateSHA256(blob);

  // Create authorization event
  const authEvent = {
    kind: 24242, // Blossom auth event
    content: `Upload ${hash}`,
    tags: [['t', 'upload'], ['x', hash]],
    created_at: Math.floor(Date.now() / 1000)
  };

  const signedAuth = signEvent(authEvent, privateKey);

  // Upload to Blossom server
  const response = await fetch('https://blossom.example.com/upload', {
    method: 'PUT',
    headers: {
      'Authorization': `Nostr ${btoa(JSON.stringify(signedAuth))}`,
      'Content-Type': 'application/octet-stream'
    },
    body: blob
  });

  return hash;
}

// Download and verify content
async function downloadMachineLogic(hash: string) {
  const response = await fetch(`https://blossom.example.com/${hash}`);
  const content = await response.text();

  // Verify integrity
  const computedHash = await calculateSHA256(content);
  if (computedHash !== hash) {
    throw new Error('Content integrity verification failed');
  }

  return content;
}
```

## Integration Patterns for NSM
- Store compiled state machine logic as JavaScript/TypeScript files
- Reference Blossom content in NSM Definition Events via hash
- Implement fallback servers for redundancy using NIP-B7
- Use content addressing for versioning and cache invalidation

## Security and Verification
- Always verify SHA-256 hash matches downloaded content
- Validate file types and sizes before processing
- Implement sandboxing for executed code from Blossom
- Use multiple servers for availability and censorship resistance