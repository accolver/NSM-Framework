import './test-setup';
import { getByText as getByTextImpl, getByPlaceholderText as getByPlaceholderTextImpl, getByDisplayValue as getByDisplayValueImpl, queryByText as queryByTextImpl, getByRole as getByRoleImpl, getByLabelText as getByLabelTextImpl } from '@testing-library/react';

// Set up Jest-DOM matchers with proper expect context - this runs in test context
const mockJestUtils = {
  EXPECTED_COLOR: (text: string) => `\x1b[32m${text}\x1b[39m`, // Green
  RECEIVED_COLOR: (text: string) => `\x1b[31m${text}\x1b[39m`, // Red
  matcherHint: (name: string) => name,
  printExpected: (value: any) => String(value),
  printReceived: (value: any) => String(value),
  printWithType: (name: string, value: any) => `${name}: ${typeof value}`,
  stringify: (value: any) => JSON.stringify(value)
};

// Set up jest-dom matchers manually for bun test compatibility
if (typeof expect !== 'undefined') {
  // Simple implementation of toBeInTheDocument
  const customMatchers = {
    toBeInTheDocument(this: any, received: any) {
      const pass = received && (
        received.ownerDocument === global.document ||
        global.document.body.contains(received) ||
        global.document.contains(received)
      );

      return {
        pass,
        message: () =>
          pass
            ? `expected element not to be in the document`
            : `expected element to be in the document`
      };
    },

    toHaveFocus(this: any, received: any) {
      const pass = received === global.document.activeElement;

      return {
        pass,
        message: () =>
          pass
            ? `expected element not to have focus`
            : `expected element to have focus`
      };
    },

    toBeVisible(this: any, received: any) {
      const pass = received && received.offsetParent !== null;

      return {
        pass,
        message: () =>
          pass
            ? `expected element not to be visible`
            : `expected element to be visible`
      };
    }
  };

  // Extend expect with our custom matchers
  try {
    if ((expect as any).extend) {
      (expect as any).extend(customMatchers);
    } else {
      // Manually add matchers if extend doesn't exist
      Object.keys(customMatchers).forEach(matcherName => {
        (expect as any)[matcherName] = function(received: any, ...args: any[]) {
          return (customMatchers as any)[matcherName].call(this, received, ...args);
        };
      });
    }
  } catch (e) {
    console.warn('Could not set up custom expect matchers:', e);
  }
}

// Create a screen-like object that uses our properly set up document
export const screen = {
  getByText: (text: string | RegExp) => getByTextImpl(global.document.body as HTMLElement, text),
  getByPlaceholderText: (text: string | RegExp) => getByPlaceholderTextImpl(global.document.body as HTMLElement, text),
  getByDisplayValue: (value: string | RegExp) => getByDisplayValueImpl(global.document.body as HTMLElement, value),
  queryByText: (text: string | RegExp) => queryByTextImpl(global.document.body as HTMLElement, text),
  getByRole: (role: string) => getByRoleImpl(global.document.body as HTMLElement, role),
  getByLabelText: (text: string | RegExp) => getByLabelTextImpl(global.document.body as HTMLElement, text),
};

export { render, fireEvent, waitFor, cleanup } from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

// Test utilities for Nostr events
import type { INostrEvent } from '@nsm/core';
import { NSM_PROTOCOL } from '@nsm/core';

/**
 * Create a mock Nostr event for testing
 */
export const createMockNostrEvent = (overrides: Partial<INostrEvent> = {}): INostrEvent => {
  return {
    id: 'mock-' + Math.random().toString(36).substring(2, 15),
    pubkey: 'npub' + Math.random().toString(36).substring(2, 32),
    created_at: Math.floor(Date.now() / 1000),
    kind: NSM_PROTOCOL.DEFINITION_KIND,
    tags: [],
    content: 'Mock event content',
    sig: 'mock-signature-' + Math.random().toString(36).substring(2, 32),
    ...overrides
  };
};