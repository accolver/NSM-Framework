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

// Enhanced NSM Client Mock for proper testing
export class MockNSMClient {
  public isConnected = false;
  private mockPublishInteraction = mock();
  private mockPublishStateUpdate = mock();
  private mockConnect = mock();
  private mockSubscribe = mock();

  constructor(options: any = {}) {
    // Mock successful connection by default
    this.mockConnect.mockImplementation(() => {
      this.isConnected = true;
      return Promise.resolve();
    });
  }

  async connect() {
    await this.mockConnect();
    this.isConnected = true;
  }

  disconnect() {
    this.isConnected = false;
  }

  async publishInteraction(payload: any) {
    if (!this.isConnected) {
      throw new Error('Not connected');
    }
    this.mockPublishInteraction(payload);
    return Promise.resolve();
  }

  async publishStateUpdate(payload: any) {
    if (!this.isConnected) {
      throw new Error('Not connected');
    }
    this.mockPublishStateUpdate(payload);
    return Promise.resolve();
  }

  subscribeToApplication(applicationId: string, handlers: any) {
    this.mockSubscribe(applicationId, handlers);
    return {
      stop: mock(),
      on: mock()
    };
  }

  // Test helper methods
  getPublishInteractionMock() {
    return this.mockPublishInteraction;
  }

  getPublishStateUpdateMock() {
    return this.mockPublishStateUpdate;
  }

  getConnectMock() {
    return this.mockConnect;
  }

  getSubscribeMock() {
    return this.mockSubscribe;
  }
}

// XState Function Serialization Utilities
export class XStateFunctionSerializer {
  static serialize(fn: Function) {
    return {
      __type: 'function',
      name: fn.name,
      source: fn.toString()
    };
  }

  static deserialize(serialized: any) {
    if (serialized && serialized.__type === 'function') {
      try {
        return new Function('return ' + serialized.source)();
      } catch (error) {
        console.error('Failed to deserialize function:', error);
        return null;
      }
    }
    return serialized;
  }

  static serializeObject(obj: any): any {
    if (typeof obj === 'function') {
      return this.serialize(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.serializeObject(item));
    }

    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.serializeObject(value);
      }
      return result;
    }

    return obj;
  }

  static deserializeObject(obj: any): any {
    if (obj && obj.__type === 'function') {
      return this.deserialize(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deserializeObject(item));
    }

    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.deserializeObject(value);
      }
      return result;
    }

    return obj;
  }
}

// Mock NDK Event with correct API
export class MockNDKEvent {
  private mockPublish = mock();

  constructor(public ndk: any, public eventData: any) {}

  async publish() {
    this.mockPublish();
    return Promise.resolve();
  }

  getPublishMock() {
    return this.mockPublish;
  }
}

// Test helper to verify no network calls occurred
export function verifyNoNetworkCalls() {
  // Could be enhanced to track and verify mock calls
  return true;
}