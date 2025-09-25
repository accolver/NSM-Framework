import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ApplicationManager from '../components/ApplicationManager';
import { NSMApplication } from '../utils/nostr-events';

// Mock IndexedDB for application storage
const mockIndexedDB = {
  open: vi.fn(),
  transaction: vi.fn(),
  objectStore: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn()
};

Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
  writable: true
});

// Mock service worker for offline support
const mockServiceWorker = {
  register: vi.fn().mockResolvedValue({
    installing: null,
    waiting: null,
    active: { state: 'activated' }
  })
};

Object.defineProperty(window.navigator, 'serviceWorker', {
  value: mockServiceWorker,
  writable: true
});

// Mock applications data
const mockApplications: NSMApplication[] = [
  {
    name: 'Counter App',
    description: 'A simple counter',
    author: 'npub1test123...',
    timestamp: Date.now() / 1000,
    machine: JSON.stringify({ id: 'counter', initial: 'idle' }),
    category: 'tools',
    id: 'app-1'
  },
  {
    name: 'Chat Bot',
    description: 'AI chat assistant',
    author: 'npub1bot456...',
    timestamp: Date.now() / 1000 - 3600,
    machine: JSON.stringify({ id: 'chatbot', initial: 'waiting' }),
    category: 'social',
    id: 'app-2'
  }
];

describe('Application Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Application Installation and Caching', () => {
    it('should show install button for uninstalled applications', () => {
      render(<ApplicationManager applications={mockApplications} />);

      const installButtons = screen.getAllByText(/install/i);
      expect(installButtons).toHaveLength(2); // One for each app
    });

    it('should install application to local storage', async () => {
      const user = userEvent.setup();
      const mockTransaction = {
        objectStore: vi.fn().mockReturnValue({
          put: vi.fn().mockResolvedValue(undefined)
        })
      };

      mockIndexedDB.open.mockResolvedValue({
        transaction: vi.fn().mockReturnValue(mockTransaction)
      });

      render(<ApplicationManager applications={mockApplications} />);

      const firstInstallButton = screen.getAllByText(/install/i)[0];
      await user.click(firstInstallButton);

      await waitFor(() => {
        expect(screen.getByText(/installing/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(mockTransaction.objectStore).toHaveBeenCalledWith('applications', 'readwrite');
      });
    });

    it('should cache application assets for offline use', async () => {
      const user = userEvent.setup();
      const mockCaches = {
        open: vi.fn().mockResolvedValue({
          add: vi.fn().mockResolvedValue(undefined),
          addAll: vi.fn().mockResolvedValue(undefined)
        })
      };

      Object.defineProperty(window, 'caches', { value: mockCaches });

      render(<ApplicationManager applications={mockApplications} />);

      const firstInstallButton = screen.getAllByText(/install/i)[0];
      await user.click(firstInstallButton);

      await waitFor(() => {
        expect(mockCaches.open).toHaveBeenCalledWith('nsm-applications');
      });
    });

    it('should show installed status for cached applications', async () => {
      // Mock installed application in IndexedDB
      mockIndexedDB.open.mockResolvedValue({
        transaction: vi.fn().mockReturnValue({
          objectStore: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({ id: 'app-1', installed: true })
          })
        })
      });

      render(<ApplicationManager applications={mockApplications} />);

      await waitFor(() => {
        expect(screen.getByText(/installed/i)).toBeInTheDocument();
      });
    });

    it('should show storage usage information', async () => {
      const mockStorageEstimate = {
        quota: 1000000000, // 1GB
        usage: 50000000    // 50MB
      };

      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: vi.fn().mockResolvedValue(mockStorageEstimate)
        }
      });

      render(<ApplicationManager applications={mockApplications} />);

      await waitFor(() => {
        expect(screen.getByText(/50.*MB.*used/i)).toBeInTheDocument();
      });
    });
  });

  describe('Application Favorites and History', () => {
    it('should allow favoriting applications', async () => {
      const user = userEvent.setup();
      render(<ApplicationManager applications={mockApplications} />);

      const favoriteButtons = screen.getAllByLabelText(/add to favorites/i);
      await user.click(favoriteButtons[0]);

      expect(screen.getByLabelText(/remove from favorites/i)).toBeInTheDocument();
    });

    it('should persist favorites to localStorage', async () => {
      const user = userEvent.setup();
      render(<ApplicationManager applications={mockApplications} />);

      const favoriteButton = screen.getAllByLabelText(/add to favorites/i)[0];
      await user.click(favoriteButton);

      const storedFavorites = localStorage.getItem('nsm-favorites');
      expect(storedFavorites).toContain('app-1');
    });

    it('should display favorites section', () => {
      localStorage.setItem('nsm-favorites', JSON.stringify(['app-1']));
      render(<ApplicationManager applications={mockApplications} />);

      expect(screen.getByText(/favorites/i)).toBeInTheDocument();
      expect(screen.getByTestId('favorites-section')).toContainElement(
        screen.getByText('Counter App')
      );
    });

    it('should track application launch history', async () => {
      const user = userEvent.setup();
      const mockOnLaunch = vi.fn();

      render(
        <ApplicationManager
          applications={mockApplications}
          onLaunchApplication={mockOnLaunch}
        />
      );

      const launchButton = screen.getAllByText(/launch/i)[0];
      await user.click(launchButton);

      const storedHistory = localStorage.getItem('nsm-history');
      expect(storedHistory).toContain('app-1');
    });

    it('should display recently used applications', () => {
      const historyData = [
        { id: 'app-1', lastUsed: Date.now() },
        { id: 'app-2', lastUsed: Date.now() - 86400000 }
      ];
      localStorage.setItem('nsm-history', JSON.stringify(historyData));

      render(<ApplicationManager applications={mockApplications} />);

      expect(screen.getByText(/recently used/i)).toBeInTheDocument();
    });

    it('should limit history to last 10 applications', async () => {
      const user = userEvent.setup();
      const mockOnLaunch = vi.fn();

      // Pre-populate with 10 items
      const existingHistory = Array.from({ length: 10 }, (_, i) => ({
        id: `app-${i}`,
        lastUsed: Date.now() - (i * 1000)
      }));
      localStorage.setItem('nsm-history', JSON.stringify(existingHistory));

      render(
        <ApplicationManager
          applications={mockApplications}
          onLaunchApplication={mockOnLaunch}
        />
      );

      const launchButton = screen.getAllByText(/launch/i)[0];
      await user.click(launchButton);

      const storedHistory = JSON.parse(localStorage.getItem('nsm-history') || '[]');
      expect(storedHistory).toHaveLength(10); // Should still be 10
      expect(storedHistory[0].id).toBe('app-1'); // New item should be first
    });
  });

  describe('Application Updates', () => {
    it('should detect when applications have updates available', () => {
      const appsWithUpdates = [
        {
          ...mockApplications[0],
          version: '1.0.0',
          latestVersion: '1.1.0'
        }
      ];

      render(<ApplicationManager applications={appsWithUpdates} />);

      expect(screen.getByText(/update available/i)).toBeInTheDocument();
    });

    it('should show update notification badge', () => {
      const appsWithUpdates = [
        {
          ...mockApplications[0],
          version: '1.0.0',
          latestVersion: '1.1.0'
        }
      ];

      render(<ApplicationManager applications={appsWithUpdates} />);

      expect(screen.getByTestId('update-badge')).toBeInTheDocument();
    });

    it('should allow updating installed applications', async () => {
      const user = userEvent.setup();
      const appsWithUpdates = [
        {
          ...mockApplications[0],
          version: '1.0.0',
          latestVersion: '1.1.0',
          installed: true
        }
      ];

      render(<ApplicationManager applications={appsWithUpdates} />);

      const updateButton = screen.getByText(/update/i);
      await user.click(updateButton);

      expect(screen.getByText(/updating/i)).toBeInTheDocument();
    });

    it('should show changelog when update is available', async () => {
      const user = userEvent.setup();
      const appsWithUpdates = [
        {
          ...mockApplications[0],
          version: '1.0.0',
          latestVersion: '1.1.0',
          changelog: 'Fixed bugs and improved performance'
        }
      ];

      render(<ApplicationManager applications={appsWithUpdates} />);

      const changelogButton = screen.getByText(/what\'s new/i);
      await user.click(changelogButton);

      expect(screen.getByText(/fixed bugs and improved performance/i)).toBeInTheDocument();
    });
  });

  describe('Offline Support', () => {
    it('should register service worker for offline support', async () => {
      render(<ApplicationManager applications={mockApplications} />);

      await waitFor(() => {
        expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js');
      });
    });

    it('should show offline indicator when offline', () => {
      Object.defineProperty(window.navigator, 'onLine', {
        value: false,
        writable: true
      });

      render(<ApplicationManager applications={mockApplications} />);

      expect(screen.getByText(/offline/i)).toBeInTheDocument();
    });

    it('should disable online-only features when offline', () => {
      Object.defineProperty(window.navigator, 'onLine', {
        value: false,
        writable: true
      });

      render(<ApplicationManager applications={mockApplications} />);

      const installButtons = screen.getAllByText(/install/i);
      installButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('should show cached applications when offline', () => {
      Object.defineProperty(window.navigator, 'onLine', {
        value: false,
        writable: true
      });

      const cachedApps = [{ ...mockApplications[0], cached: true }];
      render(<ApplicationManager applications={cachedApps} />);

      expect(screen.getByTestId('offline-apps')).toBeInTheDocument();
    });
  });

  describe('Application Uninstall', () => {
    it('should show uninstall option for installed applications', () => {
      const installedApps = [{ ...mockApplications[0], installed: true }];
      render(<ApplicationManager applications={installedApps} />);

      expect(screen.getByText(/uninstall/i)).toBeInTheDocument();
    });

    it('should confirm before uninstalling application', async () => {
      const user = userEvent.setup();
      const installedApps = [{ ...mockApplications[0], installed: true }];

      render(<ApplicationManager applications={installedApps} />);

      const uninstallButton = screen.getByText(/uninstall/i);
      await user.click(uninstallButton);

      expect(screen.getByText(/are you sure.*uninstall/i)).toBeInTheDocument();
    });

    it('should remove application from storage when uninstalled', async () => {
      const user = userEvent.setup();
      const mockTransaction = {
        objectStore: vi.fn().mockReturnValue({
          delete: vi.fn().mockResolvedValue(undefined)
        })
      };

      mockIndexedDB.open.mockResolvedValue({
        transaction: vi.fn().mockReturnValue(mockTransaction)
      });

      const installedApps = [{ ...mockApplications[0], installed: true }];
      render(<ApplicationManager applications={installedApps} />);

      const uninstallButton = screen.getByText(/uninstall/i);
      await user.click(uninstallButton);

      const confirmButton = screen.getByText(/confirm/i);
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockTransaction.objectStore).toHaveBeenCalledWith('applications', 'readwrite');
      });
    });
  });

  describe('Permission Management', () => {
    it('should show permissions required by application', () => {
      const appWithPermissions = {
        ...mockApplications[0],
        permissions: ['storage', 'network', 'notifications']
      };

      render(<ApplicationManager applications={[appWithPermissions]} />);

      expect(screen.getByText(/permissions/i)).toBeInTheDocument();
      expect(screen.getByText(/storage/i)).toBeInTheDocument();
      expect(screen.getByText(/network/i)).toBeInTheDocument();
      expect(screen.getByText(/notifications/i)).toBeInTheDocument();
    });

    it('should request user consent before granting permissions', async () => {
      const user = userEvent.setup();
      const appWithPermissions = {
        ...mockApplications[0],
        permissions: ['notifications']
      };

      // Mock notification permission
      Object.defineProperty(window.Notification, 'requestPermission', {
        value: vi.fn().mockResolvedValue('granted')
      });

      render(<ApplicationManager applications={[appWithPermissions]} />);

      const installButton = screen.getByText(/install/i);
      await user.click(installButton);

      expect(screen.getByText(/grant permissions/i)).toBeInTheDocument();
    });

    it('should prevent installation if required permissions denied', async () => {
      const user = userEvent.setup();
      const appWithPermissions = {
        ...mockApplications[0],
        permissions: ['notifications']
      };

      Object.defineProperty(window.Notification, 'requestPermission', {
        value: vi.fn().mockResolvedValue('denied')
      });

      render(<ApplicationManager applications={[appWithPermissions]} />);

      const installButton = screen.getByText(/install/i);
      await user.click(installButton);

      await waitFor(() => {
        expect(screen.getByText(/permissions denied/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle installation failures gracefully', async () => {
      const user = userEvent.setup();
      mockIndexedDB.open.mockRejectedValue(new Error('Storage unavailable'));

      render(<ApplicationManager applications={mockApplications} />);

      const installButton = screen.getAllByText(/install/i)[0];
      await user.click(installButton);

      await waitFor(() => {
        expect(screen.getByText(/installation failed/i)).toBeInTheDocument();
      });
    });

    it('should handle quota exceeded errors', async () => {
      const user = userEvent.setup();
      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';

      mockIndexedDB.open.mockRejectedValue(quotaError);

      render(<ApplicationManager applications={mockApplications} />);

      const installButton = screen.getAllByText(/install/i)[0];
      await user.click(installButton);

      await waitFor(() => {
        expect(screen.getByText(/insufficient storage/i)).toBeInTheDocument();
      });
    });

    it('should retry failed operations', async () => {
      const user = userEvent.setup();

      mockIndexedDB.open
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({
          transaction: vi.fn().mockReturnValue({
            objectStore: vi.fn().mockReturnValue({
              put: vi.fn().mockResolvedValue(undefined)
            })
          })
        });

      render(<ApplicationManager applications={mockApplications} />);

      const installButton = screen.getAllByText(/install/i)[0];
      await user.click(installButton);

      await waitFor(() => {
        expect(screen.getByText(/retry/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByText(/retry/i);
      await user.click(retryButton);

      await waitFor(() => {
        expect(mockIndexedDB.open).toHaveBeenCalledTimes(2);
      });
    });
  });
});