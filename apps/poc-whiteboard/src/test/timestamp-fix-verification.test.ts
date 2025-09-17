import { describe, it, expect } from 'vitest';
import { createEventLogService } from '../services/event-log-service';
import type { INostrEvent } from '@nsm/core';

describe('Timestamp Calculation Fix', () => {
  it('should handle very old timestamps correctly', () => {
    const service = createEventLogService();

    // Create an event with a timestamp that would cause the original bug
    // This simulates an event from year 1970 (Unix epoch start)
    const veryOldEvent: INostrEvent = {
      id: 'test-old-event',
      pubkey: 'test-pubkey',
      created_at: 0, // Unix timestamp 0 = January 1, 1970
      kind: 1,
      tags: [],
      content: '{"test": "old event"}',
      sig: 'test-signature'
    };

    const metadata = service.getEventMetadata(veryOldEvent);

    // Should now show "very old" instead of showing millions of minutes
    expect(metadata.relativeTime).toBe('very old');
  });

  it('should handle invalid future timestamps', () => {
    const service = createEventLogService();

    // Create an event with future timestamp (more than 1 day ahead)
    const futureEvent: INostrEvent = {
      id: 'test-future-event',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000) + (2 * 24 * 60 * 60), // 2 days in future
      kind: 1,
      tags: [],
      content: '{"test": "future event"}',
      sig: 'test-signature'
    };

    const metadata = service.getEventMetadata(futureEvent);

    // Should show "invalid timestamp" for unrealistic future times
    expect(metadata.relativeTime).toBe('invalid timestamp');
  });

  it('should handle extremely old timestamps before Unix epoch', () => {
    const service = createEventLogService();

    // Create an event from before Unix epoch (negative timestamp)
    const prehistoricEvent: INostrEvent = {
      id: 'test-prehistoric-event',
      pubkey: 'test-pubkey',
      created_at: -86400, // 1 day before Unix epoch
      kind: 1,
      tags: [],
      content: '{"test": "prehistoric event"}',
      sig: 'test-signature'
    };

    const metadata = service.getEventMetadata(prehistoricEvent);

    // Should show "invalid timestamp" for times before Unix epoch
    expect(metadata.relativeTime).toBe('invalid timestamp');
  });

  it('should handle normal recent timestamps correctly', () => {
    const service = createEventLogService();

    // Create an event from 5 minutes ago
    const recentEvent: INostrEvent = {
      id: 'test-recent-event',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000) - (5 * 60), // 5 minutes ago
      kind: 1,
      tags: [],
      content: '{"test": "recent event"}',
      sig: 'test-signature'
    };

    const metadata = service.getEventMetadata(recentEvent);

    // Should show normal relative time for recent events
    expect(metadata.relativeTime).toBe('5 minutes ago');
  });
});