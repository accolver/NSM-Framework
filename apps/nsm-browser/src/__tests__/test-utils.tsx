import { ReactElement } from 'react';
import { render, RenderOptions, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

// Custom render function that wraps with necessary providers and act()
export const renderWithAct = async (ui: ReactElement, options?: RenderOptions) => {
  let renderResult: any;

  await act(async () => {
    renderResult = render(ui, options);
  });

  return renderResult;
};

// Utility to handle async operations within act()
export const actAsync = async (callback: () => Promise<void>) => {
  await act(async () => {
    await callback();
  });
};

// Setup user event with proper act() handling
export const setupUserEvent = () => {
  return userEvent.setup({
    advanceTimers: vi.advanceTimersByTime,
  });
};

// Mock storage operations for tests
export const mockStorage = () => {
  const storage: Record<string, string> = {};

  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn((key: string) => storage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        storage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete storage[key];
      }),
      clear: vi.fn(() => {
        Object.keys(storage).forEach(key => delete storage[key]);
      }),
      key: vi.fn((index: number) => Object.keys(storage)[index] || null),
      get length() {
        return Object.keys(storage).length;
      }
    },
    writable: true
  });

  return storage;
};

// Mock IndexedDB for tests
export const mockIndexedDB = () => {
  const mockStore = new Map();

  const mockTransaction = {
    objectStore: vi.fn().mockReturnValue({
      get: vi.fn((key: string) => ({
        onsuccess: null,
        onerror: null,
        result: mockStore.get(key) || undefined
      })),
      put: vi.fn((data: any) => {
        mockStore.set(data.id, data);
        return {
          onsuccess: null,
          onerror: null
        };
      }),
      delete: vi.fn((key: string) => {
        mockStore.delete(key);
        return {
          onsuccess: null,
          onerror: null
        };
      })
    })
  };

  const mockDB = {
    transaction: vi.fn().mockReturnValue(mockTransaction)
  };

  Object.defineProperty(window, 'indexedDB', {
    value: {
      open: vi.fn().mockImplementation(() => ({
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        result: mockDB
      }))
    },
    writable: true
  });

  return { mockStore, mockTransaction, mockDB };
};

// Mock Cache API for tests
export const mockCacheAPI = () => {
  const mockCache = {
    add: vi.fn().mockResolvedValue(undefined),
    addAll: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(true),
    keys: vi.fn().mockResolvedValue([]),
    match: vi.fn().mockResolvedValue(undefined)
  };

  Object.defineProperty(window, 'caches', {
    value: {
      open: vi.fn().mockResolvedValue(mockCache),
      delete: vi.fn().mockResolvedValue(true),
      keys: vi.fn().mockResolvedValue([])
    },
    writable: true
  });

  return mockCache;
};

// Mock Service Worker for tests
export const mockServiceWorker = () => {
  const mockSW = {
    register: vi.fn().mockResolvedValue({
      installing: null,
      waiting: null,
      active: { state: 'activated' }
    }),
    ready: Promise.resolve({
      active: { state: 'activated' }
    })
  };

  Object.defineProperty(navigator, 'serviceWorker', {
    value: mockSW,
    writable: true
  });

  return mockSW;
};

// Mock Navigator Storage API
export const mockStorageAPI = (quota: number = 1000000000, usage: number = 50000000) => {
  Object.defineProperty(navigator, 'storage', {
    value: {
      estimate: vi.fn().mockResolvedValue({ quota, usage })
    },
    writable: true
  });
};

// Mock online/offline events
export const mockNetworkStatus = (online: boolean = true) => {
  Object.defineProperty(navigator, 'onLine', {
    value: online,
    writable: true
  });

  return {
    goOnline: () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true
      });
      window.dispatchEvent(new Event('online'));
    },
    goOffline: () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      });
      window.dispatchEvent(new Event('offline'));
    }
  };
};

// Wait for async effects to complete
export const waitForEffects = async (timeout: number = 100) => {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, timeout));
  });
};