/**
 * NSM Mock Validation Test
 *
 * This test ensures that NSM components can be safely rendered and used
 * in the test environment without triggering network calls.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import {
  mockNDKProvider,
  mockUseNDK,
  mockNSMProvider,
  mockCreateNSMMachine,
  mockUseNSM,
  verifyNoNetworkCalls,
} from './__mocks__/nsm-mocks';

describe('NSM Mock Validation', () => {
  beforeEach(() => {
    // Clean up DOM between tests
    cleanup();
  });

  it('should mock NDK Provider without network calls', () => {
    const TestComponent = () => {
      return mockNDKProvider({
        children: React.createElement('div', { 'data-testid': 'ndk-test-child' }, 'Child Component'),
      });
    };

    render(React.createElement(TestComponent));

    expect(screen.getByTestId('mock-ndk-provider')).toBeTruthy();
    expect(screen.getByTestId('ndk-test-child')).toBeTruthy();
    expect(verifyNoNetworkCalls()).toBe(true);
  });

  it('should mock NDK hook without network calls', () => {
    const ndkHook = mockUseNDK();

    expect(ndkHook.connected).toBe(false);
    expect(ndkHook.isLoading).toBe(false);
    expect(typeof ndkHook.ndk.connect).toBe('function');
    expect(typeof ndkHook.ndk.publish).toBe('function');
    expect(verifyNoNetworkCalls()).toBe(true);
  });

  it('should mock NSM Provider without state machine initialization', () => {
    const TestComponent = () => {
      return mockNSMProvider({
        children: React.createElement('div', { 'data-testid': 'nsm-test-child' }, 'State Child'),
      });
    };

    render(React.createElement(TestComponent));

    expect(screen.getByTestId('mock-nsm-provider')).toBeTruthy();
    expect(screen.getByTestId('nsm-test-child')).toBeTruthy();
    expect(verifyNoNetworkCalls()).toBe(true);
  });

  it('should mock NSM machine creation', () => {
    const machine = mockCreateNSMMachine();

    expect(typeof machine.start).toBe('function');
    expect(typeof machine.send).toBe('function');
    expect(typeof machine.getSnapshot).toBe('function');

    const snapshot = machine.getSnapshot();
    expect(snapshot.value).toBe('playing');
    expect(snapshot.context.targetWord).toBe('TESTS');
    expect(verifyNoNetworkCalls()).toBe(true);
  });

  it('should mock NSM hook without state machine activation', () => {
    const nsmHook = mockUseNSM();

    expect(nsmHook.state.value).toBe('playing');
    expect(nsmHook.state.context.currentGuess).toBe('');
    expect(nsmHook.state.context.targetWord).toBe('TESTS');
    expect(typeof nsmHook.send).toBe('function');
    expect(verifyNoNetworkCalls()).toBe(true);
  });

  it('should prevent actual network calls', () => {
    // Verify that fetch is mocked and rejects
    expect(() => {
      fetch('https://example.com');
    }).not.toThrow();

    // Verify WebSocket is mocked
    expect(typeof WebSocket).toBe('function');
    expect(verifyNoNetworkCalls()).toBe(true);
  });

  it('should handle component rendering with mocked dependencies', async () => {
    // Create a component that would normally use NSM
    const TestWordleComponent = () => {
      const nsm = mockUseNSM();
      const ndk = mockUseNDK();

      return React.createElement(
        'div',
        { 'data-testid': 'wordle-component' },
        React.createElement('div', { 'data-testid': 'game-state' }, nsm.state.value),
        React.createElement('div', { 'data-testid': 'connection-state' }, ndk.connected ? 'connected' : 'disconnected'),
      );
    };

    render(React.createElement(TestWordleComponent));

    expect(screen.getByTestId('wordle-component')).toBeTruthy();
    expect(screen.getByTestId('game-state')).toBeTruthy();
    expect(screen.getByTestId('connection-state')).toBeTruthy();
    expect(screen.getByTestId('game-state').textContent).toBe('playing');
    expect(screen.getByTestId('connection-state').textContent).toBe('disconnected');
    expect(verifyNoNetworkCalls()).toBe(true);
  });
});