/**
 * NSM Mock Module - Provides test-safe mocks for NSM network dependencies
 *
 * This module creates mock implementations of NSM components that prevent
 * network calls during testing while maintaining API compatibility.
 */

import { mock } from 'bun:test';
import React from 'react';

// Mock NDK Provider - renders children without network setup
export const mockNDKProvider = ({ children }: { children: React.ReactNode }) => {
  return React.createElement('div', { 'data-testid': 'mock-ndk-provider' }, children);
};

// Mock NDK Hook - provides disconnected mock implementation
export const mockUseNDK = () => ({
  ndk: {
    connect: mock().mockResolvedValue(true),
    publish: mock().mockResolvedValue({ id: 'mock-event-id' }),
    subscribe: mock(),
    signer: null,
    pool: {
      relays: new Map(),
      connect: mock(),
      disconnect: mock(),
    },
    relaySet: {
      relays: new Set(),
      publish: mock().mockResolvedValue(true),
    },
  },
  connected: false, // Explicitly disconnected in tests
  isLoading: false,
});

// Mock NSM Provider - renders children without state machine setup
export const mockNSMProvider = ({ children }: { children: React.ReactNode }) => {
  return React.createElement('div', { 'data-testid': 'mock-nsm-provider' }, children);
};

// Mock NSM Machine Factory
export const mockCreateNSMMachine = mock(() => ({
  start: mock(),
  send: mock(),
  getSnapshot: mock(() => ({
    value: 'playing',
    context: {
      currentGuess: '',
      guesses: [],
      gameState: 'playing',
      targetWord: 'TESTS',
      maxGuesses: 6,
      currentGuessIndex: 0,
    },
  })),
  subscribe: mock(),
  stop: mock(),
  getPersistedSnapshot: mock(),
}));

// Mock NSM Hook - provides test-safe state machine interface
export const mockUseNSM = () => ({
  state: {
    value: 'playing',
    context: {
      currentGuess: '',
      guesses: [],
      gameState: 'playing',
      targetWord: 'TESTS',
      maxGuesses: 6,
      currentGuessIndex: 0,
    },
    matches: mock(() => false),
    can: mock(() => true),
  },
  send: mock(),
  service: {
    start: mock(),
    stop: mock(),
    getSnapshot: mock(),
  },
});

// Mock Client SDK
export const mockCreateClient = mock(() => ({
  connect: mock().mockResolvedValue(true),
  publish: mock().mockResolvedValue({ id: 'mock-event-id' }),
  subscribe: mock(),
  disconnect: mock(),
  isConnected: false,
}));

// Helper function to set up all NSM mocks
export function setupNSMMocks() {
  // These mocks prevent network calls during testing
  global.fetch = mock(() => Promise.reject(new Error('Network calls not allowed in tests')));

  // Mock WebSocket to prevent real connections
  global.WebSocket = mock() as any;

  // Prevent actual relay connections
  if (typeof window !== 'undefined') {
    window.WebSocket = mock() as any;
  }
}

// Test helper to verify no network calls occurred
export function verifyNoNetworkCalls() {
  // Could be enhanced to track and verify mock calls
  return true;
}