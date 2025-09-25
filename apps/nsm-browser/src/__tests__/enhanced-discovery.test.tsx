import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import EnhancedDiscovery from '../components/EnhancedDiscovery';
import { NSMApplication } from '../utils/nostr-events';

// Mock NSM Client
const mockNSMClient = {
  ndk: {
    fetchEvents: vi.fn(),
    subscribe: vi.fn()
  },
  subscribe: vi.fn(),
  unsubscribe: vi.fn()
};

// Mock applications data
const mockApplications: NSMApplication[] = [
  {
    name: 'Counter App',
    description: 'A simple counter application',
    author: 'npub1test123...',
    timestamp: Date.now() / 1000,
    machine: JSON.stringify({
      id: 'counter',
      initial: 'idle',
      states: { idle: { on: { INCREMENT: { actions: 'increment' } } } }
    }),
    category: 'tools',
    tags: ['counter', 'simple'],
    rating: 4.5,
    metadata: {
      version: '1.0.0',
      screenshots: ['https://example.com/counter.png'],
      previewImage: 'https://example.com/counter-preview.png'
    }
  },
  {
    name: 'Chat Bot',
    description: 'AI-powered chat assistant',
    author: 'npub1bot456...',
    timestamp: Date.now() / 1000 - 3600,
    machine: JSON.stringify({
      id: 'chatbot',
      initial: 'waiting',
      states: { waiting: { on: { MESSAGE: 'responding' } } }
    }),
    category: 'social',
    tags: ['ai', 'chat', 'assistant'],
    rating: 4.8,
    metadata: {
      version: '2.1.0',
      screenshots: ['https://example.com/chat1.png', 'https://example.com/chat2.png'],
      previewImage: 'https://example.com/chat-preview.png'
    }
  },
  {
    name: 'Game Engine',
    description: 'Retro-style game framework',
    author: 'npub1game789...',
    timestamp: Date.now() / 1000 - 7200,
    machine: JSON.stringify({
      id: 'game',
      initial: 'menu',
      states: { menu: { on: { START: 'playing' } } }
    }),
    category: 'games',
    tags: ['game', 'retro', 'engine'],
    rating: 4.2,
    metadata: {
      version: '0.8.5',
      screenshots: ['https://example.com/game.png'],
      previewImage: 'https://example.com/game-preview.png'
    }
  }
];

describe('EnhancedDiscovery Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNSMClient.ndk.fetchEvents.mockResolvedValue(new Set());
    mockNSMClient.subscribe.mockReturnValue({ close: vi.fn() });
  });

  describe('Real-time Search and Filtering', () => {
    it('should render search input with placeholder', () => {
      render(<EnhancedDiscovery nsmClient={mockNSMClient} />);

      const searchInput = screen.getByPlaceholderText(/search nsm applications/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should filter applications by name in real-time', async () => {
      const user = userEvent.setup();
      render(<EnhancedDiscovery nsmClient={mockNSMClient} applications={mockApplications} />);

      const searchInput = screen.getByPlaceholderText(/search nsm applications/i);

      // Initially show all applications
      expect(screen.getAllByText('Counter App')).toHaveLength(2); // Featured + main grid
      expect(screen.getAllByText('Chat Bot')).toHaveLength(2); // Featured + main grid
      expect(screen.getAllByText('Game Engine')).toHaveLength(1); // Only main grid (rating 4.2 < 4.5)

      // Filter by "Chat"
      await user.type(searchInput, 'Chat');

      // Should still appear in featured but only Chat Bot in main grid
      expect(screen.getAllByText('Chat Bot')).toHaveLength(2); // Featured + filtered grid
      expect(screen.queryAllByText('Counter App')).toHaveLength(1); // Only in featured
      expect(screen.queryAllByText('Game Engine')).toHaveLength(0); // Filtered out completely
    });

    it('should filter applications by category', async () => {
      const user = userEvent.setup();
      render(<EnhancedDiscovery nsmClient={mockNSMClient} applications={mockApplications} />);

      const categoryFilter = screen.getByLabelText(/category/i);
      await user.selectOptions(categoryFilter, 'games');

      // Game Engine should be in main grid only (not featured)
      expect(screen.getAllByText('Game Engine')).toHaveLength(1);
      expect(screen.queryAllByText('Counter App')).toHaveLength(1); // Only in featured
      expect(screen.queryAllByText('Chat Bot')).toHaveLength(1); // Only in featured
    });

    it('should filter applications by minimum rating', async () => {
      const user = userEvent.setup();
      render(<EnhancedDiscovery nsmClient={mockNSMClient} applications={mockApplications} />);

      const ratingFilter = screen.getByLabelText(/minimum rating/i);
      await user.clear(ratingFilter);
      await user.type(ratingFilter, '4.5');

      // Counter App and Chat Bot meet the rating requirement
      expect(screen.getAllByText('Counter App')).toHaveLength(2); // Featured + filtered grid
      expect(screen.getAllByText('Chat Bot')).toHaveLength(2);    // Featured + filtered grid
      expect(screen.queryAllByText('Game Engine')).toHaveLength(0); // Filtered out completely
    });

    it('should support fuzzy tag-based search', async () => {
      const user = userEvent.setup();
      render(<EnhancedDiscovery nsmClient={mockNSMClient} applications={mockApplications} />);

      const searchInput = screen.getByPlaceholderText(/search nsm applications/i);
      await user.type(searchInput, 'simple');

      // Counter App should appear in featured + filtered grid
      expect(screen.getAllByText('Counter App')).toHaveLength(2); // has 'simple' tag
      expect(screen.queryAllByText('Chat Bot')).toHaveLength(1); // Only in featured
      expect(screen.queryAllByText('Game Engine')).toHaveLength(0); // Filtered out
    });

    it('should show search results count', async () => {
      render(<EnhancedDiscovery nsmClient={mockNSMClient} applications={mockApplications} />);

      expect(screen.getByText(/showing 3 of 3 applications/i)).toBeInTheDocument();
    });
  });

  describe('Application Preview Cards', () => {
    it('should display application metadata', () => {
      render(<EnhancedDiscovery nsmClient={mockNSMClient} applications={mockApplications} />);

      // Check Counter App metadata
      expect(screen.getByText('Counter App')).toBeInTheDocument();
      expect(screen.getByText('A simple counter application')).toBeInTheDocument();
      expect(screen.getByText(/npub1test123/)).toBeInTheDocument();
      expect(screen.getByText('4.5')).toBeInTheDocument(); // rating
      expect(screen.getByText('tools')).toBeInTheDocument(); // category
    });

    it('should show preview images when available', () => {
      render(<EnhancedDiscovery nsmClient={mockNSMClient} applications={mockApplications} />);

      const previewImage = screen.getByAltText('Counter App preview');
      expect(previewImage).toBeInTheDocument();
      expect(previewImage).toHaveAttribute('src', 'https://example.com/counter-preview.png');
    });

    it('should display version information', () => {
      render(<EnhancedDiscovery nsmClient={mockNSMClient} applications={mockApplications} />);

      expect(screen.getByText('v1.0.0')).toBeInTheDocument();
      expect(screen.getByText('v2.1.0')).toBeInTheDocument();
      expect(screen.getByText('v0.8.5')).toBeInTheDocument();
    });

    it('should show application tags', () => {
      render(<EnhancedDiscovery nsmClient={mockNSMClient} applications={mockApplications} />);

      expect(screen.getByText('counter')).toBeInTheDocument();
      expect(screen.getByText('simple')).toBeInTheDocument();
      expect(screen.getByText('ai')).toBeInTheDocument();
      expect(screen.getByText('chat')).toBeInTheDocument();
      expect(screen.getByText('retro')).toBeInTheDocument();
    });
  });

  describe('Application Launching', () => {
    it('should have launch button for each application', () => {
      render(<EnhancedDiscovery nsmClient={mockNSMClient} applications={mockApplications} />);

      const launchButtons = screen.getAllByText(/launch/i);
      expect(launchButtons).toHaveLength(3);
    });

    it('should call onLaunchApplication when launch button is clicked', async () => {
      const mockOnLaunch = vi.fn();
      const user = userEvent.setup();

      render(
        <EnhancedDiscovery
          nsmClient={mockNSMClient}
          applications={mockApplications}
          onLaunchApplication={mockOnLaunch}
        />
      );

      const firstLaunchButton = screen.getAllByText(/launch/i)[0];
      await user.click(firstLaunchButton);

      expect(mockOnLaunch).toHaveBeenCalledWith(mockApplications[0]);
    });

    it('should show loading state when launching application', async () => {
      const mockOnLaunch = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      const user = userEvent.setup();

      render(
        <EnhancedDiscovery
          nsmClient={mockNSMClient}
          applications={mockApplications}
          onLaunchApplication={mockOnLaunch}
        />
      );

      const firstLaunchButton = screen.getAllByText(/launch/i)[0];
      await user.click(firstLaunchButton);

      expect(screen.getByText(/launching/i)).toBeInTheDocument();
    });
  });

  describe('Featured Applications Section', () => {
    it('should display featured applications section', () => {
      render(<EnhancedDiscovery nsmClient={mockNSMClient} applications={mockApplications} />);

      expect(screen.getByText(/featured applications/i)).toBeInTheDocument();
    });

    it('should highlight high-rated applications as featured', () => {
      render(<EnhancedDiscovery nsmClient={mockNSMClient} applications={mockApplications} />);

      // Applications with rating >= 4.5 should be featured
      const featuredSection = screen.getByTestId('featured-applications');

      expect(featuredSection).toContainElement(screen.getByText('Counter App'));
      expect(featuredSection).toContainElement(screen.getByText('Chat Bot'));
      expect(featuredSection).not.toContainElement(screen.getByText('Game Engine'));
    });

    it('should show "New" badge for recent applications', () => {
      const recentApp = {
        ...mockApplications[0],
        timestamp: Date.now() / 1000 // Very recent
      };

      render(<EnhancedDiscovery nsmClient={mockNSMClient} applications={[recentApp]} />);

      expect(screen.getByText('NEW')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('should establish real-time subscription for NSM events', () => {
      render(<EnhancedDiscovery nsmClient={mockNSMClient} />);

      expect(mockNSMClient.subscribe).toHaveBeenCalledWith(
        expect.objectContaining({
          kinds: [30079],
          since: expect.any(Number)
        }),
        expect.any(Function)
      );
    });

    it('should update applications list when new events arrive', async () => {
      const mockSubscription = { close: vi.fn() };
      let subscriptionCallback: Function;

      mockNSMClient.subscribe.mockImplementation((filter, callback) => {
        subscriptionCallback = callback;
        return mockSubscription;
      });

      render(<EnhancedDiscovery nsmClient={mockNSMClient} />);

      // Simulate new application event
      const newEvent = {
        kind: 30079,
        content: JSON.stringify({ id: 'new', initial: 'start', states: { start: {} } }),
        tags: [['d', 'new-app'], ['name', 'New App'], ['description', 'Brand new app']],
        pubkey: 'npub1new...',
        created_at: Date.now() / 1000
      };

      subscriptionCallback!(newEvent);

      await waitFor(() => {
        expect(screen.getByText('New App')).toBeInTheDocument();
      });
    });

    it('should cleanup subscription on unmount', () => {
      const mockSubscription = { close: vi.fn() };
      mockNSMClient.subscribe.mockReturnValue(mockSubscription);

      const { unmount } = render(<EnhancedDiscovery nsmClient={mockNSMClient} />);

      unmount();

      expect(mockSubscription.close).toHaveBeenCalled();
    });
  });

  describe('Activity Filtering', () => {
    it('should filter by application activity level', async () => {
      const user = userEvent.setup();

      // Mock applications with different activity levels
      const appsWithActivity = mockApplications.map((app, index) => ({
        ...app,
        activity: {
          downloads: index * 100,
          lastUsed: Date.now() / 1000 - (index * 86400), // Different last used times
          userCount: index * 50
        }
      }));

      render(<EnhancedDiscovery nsmClient={mockNSMClient} applications={appsWithActivity} />);

      const activityFilter = screen.getByLabelText(/activity level/i);
      await user.selectOptions(activityFilter, 'high');

      // Should show applications with high activity (high downloads/user count)
      expect(screen.getByText('Game Engine')).toBeInTheDocument(); // Highest activity
      expect(screen.queryByText('Counter App')).not.toBeInTheDocument(); // Lowest activity
    });
  });

  describe('Error Handling', () => {
    it('should show error message when failing to load applications', async () => {
      mockNSMClient.ndk.fetchEvents.mockRejectedValue(new Error('Network error'));

      render(<EnhancedDiscovery nsmClient={mockNSMClient} />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load applications/i)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      mockNSMClient.ndk.fetchEvents.mockRejectedValue(new Error('Network error'));

      render(<EnhancedDiscovery nsmClient={mockNSMClient} />);

      await waitFor(() => {
        expect(screen.getByText(/retry/i)).toBeInTheDocument();
      });
    });

    it('should retry loading when retry button is clicked', async () => {
      mockNSMClient.ndk.fetchEvents.mockRejectedValueOnce(new Error('Network error'))
                                     .mockResolvedValueOnce(new Set());

      const user = userEvent.setup();
      render(<EnhancedDiscovery nsmClient={mockNSMClient} />);

      await waitFor(() => {
        expect(screen.getByText(/retry/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByText(/retry/i);
      await user.click(retryButton);

      expect(mockNSMClient.ndk.fetchEvents).toHaveBeenCalledTimes(2);
    });
  });
});