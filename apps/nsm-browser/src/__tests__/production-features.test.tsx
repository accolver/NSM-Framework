import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import PWAManager from '../components/PWAManager';
import AccessibilityProvider from '../components/AccessibilityProvider';
import SecuritySandbox from '../components/SecuritySandbox';

expect.extend(toHaveNoViolations);

// Mock service worker
const mockServiceWorker = {
  register: vi.fn().mockResolvedValue({
    installing: null,
    waiting: null,
    active: { state: 'activated' }
  }),
  ready: Promise.resolve({
    showNotification: vi.fn(),
    sync: { register: vi.fn() }
  })
};

Object.defineProperty(window.navigator, 'serviceWorker', {
  value: mockServiceWorker,
  writable: true
});

// Mock notification API
Object.defineProperty(window, 'Notification', {
  value: {
    requestPermission: vi.fn().mockResolvedValue('granted'),
    permission: 'granted'
  },
  writable: true
});

// Mock Web Share API
Object.defineProperty(window.navigator, 'share', {
  value: vi.fn().mockResolvedValue(undefined),
  writable: true
});

// Mock application data
const mockApplication = {
  name: 'Test PWA App',
  description: 'Test application for PWA features',
  author: 'npub1pwa...',
  timestamp: Date.now() / 1000,
  machine: JSON.stringify({ id: 'pwa', initial: 'offline' }),
  manifest: {
    name: 'NSM Browser',
    short_name: 'NSM',
    description: 'Browse and run Nostr State Machine applications',
    theme_color: '#2563eb',
    background_color: '#ffffff',
    display: 'standalone',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
    ]
  }
};

describe('PWA Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Service Worker Registration', () => {
    it('should register service worker on mount', async () => {
      render(<PWAManager application={mockApplication} />);

      await waitFor(() => {
        expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js');
      });
    });

    it('should show service worker registration status', async () => {
      render(<PWAManager application={mockApplication} />);

      await waitFor(() => {
        expect(screen.getByText(/service worker.*active/i)).toBeInTheDocument();
      });
    });

    it('should handle service worker registration failure', async () => {
      mockServiceWorker.register.mockRejectedValue(new Error('Registration failed'));

      render(<PWAManager application={mockApplication} />);

      await waitFor(() => {
        expect(screen.getByText(/service worker.*failed/i)).toBeInTheDocument();
      });
    });

    it('should provide service worker update mechanism', async () => {
      const user = userEvent.setup();
      const mockUpdate = vi.fn();

      mockServiceWorker.register.mockResolvedValue({
        installing: null,
        waiting: { state: 'installed' },
        active: { state: 'activated' },
        update: mockUpdate
      });

      render(<PWAManager application={mockApplication} />);

      await waitFor(() => {
        expect(screen.getByText(/update available/i)).toBeInTheDocument();
      });

      const updateButton = screen.getByText(/update/i);
      await user.click(updateButton);

      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('App Installation', () => {
    it('should show install prompt when available', () => {
      const mockInstallEvent = {
        preventDefault: vi.fn(),
        prompt: vi.fn().mockResolvedValue({ outcome: 'accepted' })
      };

      render(<PWAManager application={mockApplication} installPrompt={mockInstallEvent} />);

      expect(screen.getByText(/install app/i)).toBeInTheDocument();
    });

    it('should handle install prompt', async () => {
      const user = userEvent.setup();
      const mockInstallEvent = {
        preventDefault: vi.fn(),
        prompt: vi.fn().mockResolvedValue({ outcome: 'accepted' })
      };

      render(<PWAManager application={mockApplication} installPrompt={mockInstallEvent} />);

      const installButton = screen.getByText(/install app/i);
      await user.click(installButton);

      expect(mockInstallEvent.prompt).toHaveBeenCalled();
    });

    it('should show installation status', async () => {
      const user = userEvent.setup();
      const mockInstallEvent = {
        preventDefault: vi.fn(),
        prompt: vi.fn().mockResolvedValue({ outcome: 'accepted' })
      };

      render(<PWAManager application={mockApplication} installPrompt={mockInstallEvent} />);

      const installButton = screen.getByText(/install app/i);
      await user.click(installButton);

      await waitFor(() => {
        expect(screen.getByText(/app installed/i)).toBeInTheDocument();
      });
    });

    it('should handle install rejection', async () => {
      const user = userEvent.setup();
      const mockInstallEvent = {
        preventDefault: vi.fn(),
        prompt: vi.fn().mockResolvedValue({ outcome: 'dismissed' })
      };

      render(<PWAManager application={mockApplication} installPrompt={mockInstallEvent} />);

      const installButton = screen.getByText(/install app/i);
      await user.click(installButton);

      await waitFor(() => {
        expect(screen.getByText(/install cancelled/i)).toBeInTheDocument();
      });
    });
  });

  describe('Offline Support', () => {
    it('should detect offline status', () => {
      Object.defineProperty(window.navigator, 'onLine', {
        value: false,
        writable: true
      });

      render(<PWAManager application={mockApplication} />);

      expect(screen.getByText(/offline mode/i)).toBeInTheDocument();
    });

    it('should show cached content when offline', () => {
      Object.defineProperty(window.navigator, 'onLine', {
        value: false,
        writable: true
      });

      render(<PWAManager application={mockApplication} hasCachedContent={true} />);

      expect(screen.getByText(/running from cache/i)).toBeInTheDocument();
    });

    it('should queue operations when offline', async () => {
      const user = userEvent.setup();
      Object.defineProperty(window.navigator, 'onLine', {
        value: false,
        writable: true
      });

      render(<PWAManager application={mockApplication} />);

      const syncButton = screen.getByText(/sync when online/i);
      await user.click(syncButton);

      expect(screen.getByText(/1.*operation.*queued/i)).toBeInTheDocument();
    });

    it('should sync queued operations when back online', async () => {
      const mockSync = vi.fn();
      Object.defineProperty(window.navigator, 'onLine', {
        value: true,
        writable: true
      });

      render(<PWAManager application={mockApplication} onSync={mockSync} queuedOperations={2} />);

      await waitFor(() => {
        expect(mockSync).toHaveBeenCalled();
      });
    });
  });

  describe('Background Sync', () => {
    it('should register background sync', async () => {
      const mockRegister = vi.fn();
      mockServiceWorker.ready = Promise.resolve({
        sync: { register: mockRegister }
      });

      render(<PWAManager application={mockApplication} />);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith('nsm-data-sync');
      });
    });

    it('should show sync status', () => {
      render(<PWAManager application={mockApplication} syncStatus="syncing" />);

      expect(screen.getByText(/syncing/i)).toBeInTheDocument();
    });

    it('should handle sync failures', () => {
      render(<PWAManager application={mockApplication} syncStatus="failed" />);

      expect(screen.getByText(/sync failed/i)).toBeInTheDocument();
    });
  });

  describe('Web App Manifest', () => {
    it('should generate manifest.json', () => {
      render(<PWAManager application={mockApplication} />);

      const manifestLink = document.querySelector('link[rel="manifest"]');
      expect(manifestLink).toBeInTheDocument();
    });

    it('should set theme color', () => {
      render(<PWAManager application={mockApplication} />);

      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      expect(themeColorMeta).toHaveAttribute('content', '#2563eb');
    });

    it('should support custom manifest properties', () => {
      const customManifest = {
        ...mockApplication.manifest,
        orientation: 'portrait',
        categories: ['productivity', 'utilities']
      };

      render(<PWAManager application={{ ...mockApplication, manifest: customManifest }} />);

      // Manifest should be accessible via generated URL
      const manifestLink = document.querySelector('link[rel="manifest"]');
      expect(manifestLink).toHaveAttribute('href', expect.stringContaining('manifest.json'));
    });
  });

  describe('Push Notifications', () => {
    it('should request notification permissions', async () => {
      render(<PWAManager application={mockApplication} enableNotifications={true} />);

      await waitFor(() => {
        expect(window.Notification.requestPermission).toHaveBeenCalled();
      });
    });

    it('should show notification status', () => {
      render(<PWAManager application={mockApplication} notificationPermission="granted" />);

      expect(screen.getByText(/notifications.*enabled/i)).toBeInTheDocument();
    });

    it('should handle notification permission denial', () => {
      render(<PWAManager application={mockApplication} notificationPermission="denied" />);

      expect(screen.getByText(/notifications.*disabled/i)).toBeInTheDocument();
    });

    it('should display notifications', async () => {
      const mockShowNotification = vi.fn();
      mockServiceWorker.ready = Promise.resolve({
        showNotification: mockShowNotification
      });

      render(<PWAManager application={mockApplication} />);

      // Trigger notification
      fireEvent(window, new CustomEvent('nsm-notification', {
        detail: { title: 'Test Notification', body: 'Test message' }
      }));

      await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith(
          'Test Notification',
          expect.objectContaining({ body: 'Test message' })
        );
      });
    });
  });
});

describe('Accessibility Provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('WCAG Compliance', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <AccessibilityProvider>
          <div>
            <h1>NSM Browser</h1>
            <button>Launch App</button>
            <input aria-label="Search applications" />
          </div>
        </AccessibilityProvider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should provide proper ARIA labels', () => {
      render(
        <AccessibilityProvider>
          <button data-testid="test-button">Action</button>
        </AccessibilityProvider>
      );

      const button = screen.getByTestId('test-button');
      expect(button).toHaveAttribute('aria-label', expect.any(String));
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <AccessibilityProvider>
          <button data-testid="button1">First</button>
          <button data-testid="button2">Second</button>
          <button data-testid="button3">Third</button>
        </AccessibilityProvider>
      );

      const firstButton = screen.getByTestId('button1');
      firstButton.focus();

      await user.keyboard('{Tab}');
      expect(screen.getByTestId('button2')).toHaveFocus();

      await user.keyboard('{Tab}');
      expect(screen.getByTestId('button3')).toHaveFocus();
    });

    it('should announce dynamic content changes', () => {
      const { rerender } = render(
        <AccessibilityProvider>
          <div data-testid="status">Loading...</div>
        </AccessibilityProvider>
      );

      rerender(
        <AccessibilityProvider>
          <div data-testid="status" aria-live="polite">Content loaded</div>
        </AccessibilityProvider>
      );

      expect(screen.getByTestId('status')).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide descriptive text for complex elements', () => {
      render(
        <AccessibilityProvider>
          <div data-testid="state-diagram" role="img" aria-labelledby="diagram-title">
            <h2 id="diagram-title">State Machine Diagram</h2>
          </div>
        </AccessibilityProvider>
      );

      const diagram = screen.getByTestId('state-diagram');
      expect(diagram).toHaveAttribute('role', 'img');
      expect(diagram).toHaveAttribute('aria-labelledby', 'diagram-title');
    });

    it('should use semantic HTML elements', () => {
      render(
        <AccessibilityProvider>
          <nav data-testid="navigation">
            <ul>
              <li><a href="/browse">Browse</a></li>
              <li><a href="/publish">Publish</a></li>
            </ul>
          </nav>
        </AccessibilityProvider>
      );

      expect(screen.getByTestId('navigation')).toBeInTheDocument();
      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });

    it('should provide alternative text for images', () => {
      render(
        <AccessibilityProvider>
          <img src="/preview.png" alt="Application preview showing counter interface" />
        </AccessibilityProvider>
      );

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt', expect.stringMatching(/application preview/i));
    });

    it('should support skip navigation links', () => {
      render(
        <AccessibilityProvider>
          <a href="#main-content" className="skip-link">Skip to main content</a>
          <nav>Navigation menu</nav>
          <main id="main-content">Main content</main>
        </AccessibilityProvider>
      );

      expect(screen.getByText(/skip to main content/i)).toBeInTheDocument();
    });
  });

  describe('High Contrast and Theming', () => {
    it('should support high contrast mode', () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        value: vi.fn(() => ({
          matches: true,
          media: '(prefers-contrast: high)',
          addEventListener: vi.fn(),
          removeEventListener: vi.fn()
        }))
      });

      render(
        <AccessibilityProvider>
          <div data-testid="content">High contrast content</div>
        </AccessibilityProvider>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('high-contrast');
    });

    it('should respect reduced motion preferences', () => {
      Object.defineProperty(window, 'matchMedia', {
        value: vi.fn(() => ({
          matches: true,
          media: '(prefers-reduced-motion: reduce)',
          addEventListener: vi.fn(),
          removeEventListener: vi.fn()
        }))
      });

      render(
        <AccessibilityProvider>
          <div data-testid="animated-element">Content</div>
        </AccessibilityProvider>
      );

      const element = screen.getByTestId('animated-element');
      expect(element).toHaveClass('reduced-motion');
    });

    it('should support focus indicators', async () => {
      const user = userEvent.setup();
      render(
        <AccessibilityProvider>
          <button data-testid="focusable">Focus me</button>
        </AccessibilityProvider>
      );

      const button = screen.getByTestId('focusable');
      await user.tab(); // Focus the button

      expect(button).toHaveFocus();
      expect(button).toHaveClass('focus-visible');
    });
  });

  describe('Font Size and Zoom Support', () => {
    it('should support font size scaling', () => {
      render(
        <AccessibilityProvider fontSize="large">
          <div data-testid="text-content">Scalable text</div>
        </AccessibilityProvider>
      );

      const content = screen.getByTestId('text-content');
      expect(content).toHaveClass('font-large');
    });

    it('should maintain layout at 200% zoom', () => {
      // Mock high zoom level
      Object.defineProperty(window, 'devicePixelRatio', { value: 2 });

      render(
        <AccessibilityProvider>
          <div data-testid="layout-container">
            <header>Header</header>
            <main>Main content</main>
            <footer>Footer</footer>
          </div>
        </AccessibilityProvider>
      );

      const container = screen.getByTestId('layout-container');
      expect(container).toHaveClass('zoom-compatible');
    });
  });
});

describe('Security Sandbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Code Execution Isolation', () => {
    it('should create isolated execution environment', () => {
      render(
        <SecuritySandbox application={mockApplication}>
          <div>Sandboxed content</div>
        </SecuritySandbox>
      );

      expect(screen.getByTestId('sandbox-container')).toBeInTheDocument();
    });

    it('should use iframe for untrusted code', () => {
      render(
        <SecuritySandbox application={mockApplication} isolationMode="iframe">
          <div>Iframe content</div>
        </SecuritySandbox>
      );

      const iframe = screen.getByTestId('security-iframe');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('sandbox', expect.stringContaining('allow-scripts'));
    });

    it('should apply content security policy', () => {
      render(
        <SecuritySandbox application={mockApplication}>
          <div>CSP protected content</div>
        </SecuritySandbox>
      );

      // Check for CSP meta tag in document head
      const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      expect(cspMeta).toBeInTheDocument();
    });

    it('should sanitize HTML content', () => {
      const maliciousContent = '<script>alert("xss")</script><div>Safe content</div>';

      render(
        <SecuritySandbox application={mockApplication}>
          <div dangerouslySetInnerHTML={{ __html: maliciousContent }} />
        </SecuritySandbox>
      );

      // Script should be removed, safe content preserved
      expect(screen.getByText('Safe content')).toBeInTheDocument();
      expect(screen.queryByText(/alert.*xss/)).not.toBeInTheDocument();
    });
  });

  describe('Permission Management', () => {
    it('should request permissions before granting access', async () => {
      const user = userEvent.setup();
      render(
        <SecuritySandbox
          application={mockApplication}
          requiredPermissions={['storage', 'network']}
        >
          <button data-testid="permission-action">Perform Action</button>
        </SecuritySandbox>
      );

      const button = screen.getByTestId('permission-action');
      await user.click(button);

      expect(screen.getByText(/permissions required/i)).toBeInTheDocument();
    });

    it('should show permission details', () => {
      render(
        <SecuritySandbox
          application={mockApplication}
          requiredPermissions={['storage', 'network', 'notifications']}
        >
          <div>Content</div>
        </SecuritySandbox>
      );

      expect(screen.getByText(/permissions:/i)).toBeInTheDocument();
      expect(screen.getByText(/storage/i)).toBeInTheDocument();
      expect(screen.getByText(/network/i)).toBeInTheDocument();
      expect(screen.getByText(/notifications/i)).toBeInTheDocument();
    });

    it('should enforce permission restrictions', async () => {
      const user = userEvent.setup();
      const mockOnPermissionDenied = vi.fn();

      render(
        <SecuritySandbox
          application={mockApplication}
          grantedPermissions={['storage']} // Missing 'network'
          onPermissionDenied={mockOnPermissionDenied}
        >
          <button data-testid="network-action">Network Request</button>
        </SecuritySandbox>
      );

      // Simulate network request without permission
      fireEvent(screen.getByTestId('network-action'), new CustomEvent('network-request'));

      expect(mockOnPermissionDenied).toHaveBeenCalledWith('network');
    });

    it('should allow revoking permissions', async () => {
      const user = userEvent.setup();
      const mockOnPermissionRevoked = vi.fn();

      render(
        <SecuritySandbox
          application={mockApplication}
          grantedPermissions={['storage', 'network']}
          onPermissionRevoked={mockOnPermissionRevoked}
        >
          <div>Sandboxed app</div>
        </SecuritySandbox>
      );

      const revokeButton = screen.getByText(/revoke.*storage/i);
      await user.click(revokeButton);

      expect(mockOnPermissionRevoked).toHaveBeenCalledWith('storage');
    });
  });

  describe('Resource Limits', () => {
    it('should enforce memory limits', () => {
      render(
        <SecuritySandbox
          application={mockApplication}
          resourceLimits={{ maxMemory: 100 * 1024 * 1024 }} // 100MB
        >
          <div>Memory limited app</div>
        </SecuritySandbox>
      );

      expect(screen.getByText(/memory limit.*100.*MB/i)).toBeInTheDocument();
    });

    it('should monitor CPU usage', () => {
      render(
        <SecuritySandbox
          application={mockApplication}
          resourceLimits={{ maxCPU: 50 }} // 50% CPU
        >
          <div>CPU limited app</div>
        </SecuritySandbox>
      );

      expect(screen.getByText(/cpu limit.*50/i)).toBeInTheDocument();
    });

    it('should handle resource limit violations', () => {
      const mockOnResourceExceeded = vi.fn();

      render(
        <SecuritySandbox
          application={mockApplication}
          resourceUsage={{ memory: 150 * 1024 * 1024 }} // Exceeds limit
          resourceLimits={{ maxMemory: 100 * 1024 * 1024 }}
          onResourceExceeded={mockOnResourceExceeded}
        >
          <div>Over-limit app</div>
        </SecuritySandbox>
      );

      expect(mockOnResourceExceeded).toHaveBeenCalledWith('memory');
      expect(screen.getByText(/memory limit exceeded/i)).toBeInTheDocument();
    });
  });

  describe('Network Security', () => {
    it('should filter allowed domains', () => {
      render(
        <SecuritySandbox
          application={mockApplication}
          allowedDomains={['api.example.com', 'cdn.example.org']}
        >
          <div>Network restricted app</div>
        </SecuritySandbox>
      );

      expect(screen.getByText(/allowed domains/i)).toBeInTheDocument();
      expect(screen.getByText(/api\.example\.com/i)).toBeInTheDocument();
    });

    it('should block unauthorized network requests', () => {
      const mockOnNetworkBlocked = vi.fn();

      render(
        <SecuritySandbox
          application={mockApplication}
          allowedDomains={['api.example.com']}
          onNetworkBlocked={mockOnNetworkBlocked}
        >
          <div>Network app</div>
        </SecuritySandbox>
      );

      // Simulate blocked network request
      fireEvent(window, new CustomEvent('network-request-blocked', {
        detail: { url: 'https://malicious.com/api' }
      }));

      expect(mockOnNetworkBlocked).toHaveBeenCalledWith('https://malicious.com/api');
    });

    it('should validate SSL certificates', () => {
      render(
        <SecuritySandbox
          application={mockApplication}
          enforceSSL={true}
        >
          <div>SSL enforced app</div>
        </SecuritySandbox>
      );

      expect(screen.getByText(/ssl.*required/i)).toBeInTheDocument();
    });
  });
});