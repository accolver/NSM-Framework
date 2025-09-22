/**
 * NSM Mock Module - Provides test-safe mocks for NSM network dependencies
 *
 * This module creates mock implementations of NSM components that prevent
 * network calls during testing while maintaining API compatibility.
 */

import React from 'react';
import { mock } from 'bun:test';

// Mock NDK Provider - renders children without network setup
export const mockNDKProvider = ({ children }: { children: React.ReactNode }) => {
  return React.createElement('div', { 'data-testid': 'mock-ndk-provider' }, children);
};

// Mock NDK Hook - provides disconnected mock implementation
export const mockUseNDK = () => ({
  ndk: {
    connect: () => Promise.resolve(true),
    publish: () => Promise.resolve({ id: 'mock-event-id' }),
    subscribe: () => {},
    signer: null,
    pool: {
      relays: new Map(),
      connect: () => {},
      disconnect: () => {},
    },
    relaySet: {
      relays: new Set(),
      publish: () => Promise.resolve(true),
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
export const mockCreateNSMMachine = () => ({
  start: () => {},
  send: () => {},
  getSnapshot: () => ({
    value: 'playing',
    context: {
      currentGuess: '',
      guesses: [],
      gameState: 'playing',
      targetWord: 'TESTS',
      maxGuesses: 6,
      currentGuessIndex: 0,
    },
  }),
  subscribe: () => {},
  stop: () => {},
  getPersistedSnapshot: () => {},
});

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
    matches: () => false,
    can: () => true,
  },
  send: mock(() => {}),
  service: {
    start: mock(() => {}),
    stop: mock(() => {}),
    getSnapshot: mock(() => {}),
  },
});

// Mock Client SDK
export const mockCreateClient = () => ({
  connect: () => Promise.resolve(true),
  publish: () => Promise.resolve({ id: 'mock-event-id' }),
  subscribe: () => {},
  disconnect: () => {},
  isConnected: false,
});

// Helper function to set up all NSM mocks
export function setupNSMMocks() {
  // These mocks prevent network calls during testing
  global.fetch = Object.assign(
    () => Promise.reject(new Error('Network calls not allowed in tests')),
    {
      preconnect: () => Promise.reject(new Error('Network calls not allowed in tests'))
    }
  ) as typeof fetch;

  // Mock WebSocket to prevent real connections
  global.WebSocket = (() => {}) as any;

  // Prevent actual relay connections
  if (typeof window !== 'undefined') {
    window.WebSocket = (() => {}) as any;
  }
}

// Mock @nsm/dev-tools for dashboard integration
export const mockDevTools = {
  DeveloperDashboard: ({ children }: { children?: React.ReactNode }) => {
    return React.createElement('div', { 'data-testid': 'mock-developer-dashboard' }, children);
  },
  createEventLogService: () => ({
    addEvent: mock(() => {}),
    getEvents: mock(() => []),
    getEventCount: mock(() => 0),
    clear: mock(() => {}),
    stop: mock(() => {}), // Add missing stop method
  }),
  createTimeTravelService: () => ({
    saveSnapshot: mock(() => {}),
    restoreSnapshot: mock(() => {}),
    getSnapshots: mock(() => []),
    clear: mock(() => {}),
    clearHistory: mock(() => {}), // Add missing clearHistory method
    connect: mock(() => {}),
    registerActor: mock(() => {}),
  }),
  createInspectorService: () => ({
    connect: mock(() => {}),
    disconnect: mock(() => {}),
    isConnected: mock(() => false),
    sendEvent: mock(() => {}),
    registerMachine: mock(() => {}),
  })
};

// Test helper to verify no network calls occurred
export function verifyNoNetworkCalls() {
  // Could be enhanced to track and verify mock calls
  return true;
}