# Reusable NSM Dashboard Components

This directory contains modular, reusable components extracted from the NSM Developer Dashboard for use across different NSM applications.

## Components

### TabContainer

A flexible, accessible tab container with responsive design.

**Features:**
- Horizontal scrolling on desktop, vertical layout on mobile
- Keyboard navigation support (arrow keys, tab)
- Accessibility compliant (ARIA attributes)
- Customizable styling
- Support for icons and disabled states

**Usage:**
```tsx
import { TabContainer } from './components/TabContainer';

const tabs = [
  { id: 'tab1', label: 'Tab 1', shortcut: '1' },
  { id: 'tab2', label: 'Tab 2', shortcut: '2', disabled: true },
  { id: 'tab3', label: 'Tab 3', shortcut: '3', icon: <Icon /> },
];

<TabContainer
  tabs={tabs}
  activeTab="tab1"
  onTabClick={(tabId) => setActiveTab(tabId)}
  isMobile={window.innerWidth < 768}
/>
```

**Props:**
- `tabs: TabItem[]` - Array of tab configurations
- `activeTab: string` - ID of currently active tab
- `onTabClick: (tabId: string) => void` - Tab click handler
- `onKeyDown?: (event: KeyboardEvent) => void` - Optional keyboard handler
- `isMobile?: boolean` - Mobile layout flag
- `className?: string` - Additional CSS classes
- `data-testid?: string` - Test ID for testing

### EventsPanel

A reusable wrapper for the EventLogViewer with configurable header.

**Features:**
- Configurable title and description
- Optional header display
- Customizable height
- Scrollable events section
- Integration with EventLogService

**Usage:**
```tsx
import { EventsPanel } from './components/EventsPanel';

<EventsPanel
  eventLogService={eventLogService}
  title="Game Events"
  description="Real-time Wordle game events"
  height={400}
  showHeader={true}
/>
```

**Props:**
- `eventLogService: EventLogService` - NSM event log service instance
- `title?: string` - Panel title (default: "Events")
- `description?: string` - Panel description
- `height?: string | number` - Panel height
- `showHeader?: boolean` - Show/hide header (default: true)
- `className?: string` - Additional CSS classes
- `data-testid?: string` - Test ID for testing

## Integration with poc-wordle

To integrate these components into the poc-wordle app:

1. **Copy Components**: Copy `TabContainer.tsx` and `EventsPanel.tsx` to your app's components directory
2. **Install Dependencies**: Ensure you have the required services (`event-log-service`, etc.)
3. **Import and Use**: Import components in your app

### Example Integration in Wordle App

```tsx
// In your Wordle app component
import { TabContainer, EventsPanel } from '../shared/components';
import { createEventLogService } from '../services/event-log-service';

const WordleApp = () => {
  const [activeTab, setActiveTab] = useState('game');
  const eventLogService = createEventLogService();

  const tabs = [
    { id: 'game', label: 'Game', shortcut: '1' },
    { id: 'events', label: 'Events', shortcut: '2' },
    { id: 'stats', label: 'Statistics', shortcut: '3' },
  ];

  return (
    <div className="wordle-app">
      <TabContainer
        tabs={tabs}
        activeTab={activeTab}
        onTabClick={setActiveTab}
      />

      <div className="tab-content">
        {activeTab === 'game' && <WordleGame />}
        {activeTab === 'events' && (
          <EventsPanel
            eventLogService={eventLogService}
            title="Wordle Events"
            description="Game events and state changes"
          />
        )}
        {activeTab === 'stats' && <WordleStats />}
      </div>
    </div>
  );
};
```

## Styling

The components inherit CSS classes from the parent dashboard but can be customized:

### TabContainer CSS Classes
- `.tab-container` - Main container
- `.tabs-horizontal-scroll` - Horizontal scrolling layout
- `.vertical-tabs` - Vertical mobile layout
- `.tab` - Individual tab button
- `.tab.active` - Active tab state
- `.tab.disabled` - Disabled tab state
- `.tab-icon` - Tab icon wrapper
- `.tab-shortcut` - Keyboard shortcut badge

### EventsPanel CSS Classes
- `.events-panel` - Main panel container
- `.events-panel-header` - Header section
- `.events-panel-title` - Title text
- `.events-panel-description` - Description text
- `.events-panel-content` - Content wrapper
- `.events-scrollable` - Scrollable events list

## Testing

Both components include data-testid attributes for easy testing:

```tsx
// Test TabContainer
const tabContainer = screen.getByTestId('tab-container');
const tabs = screen.getAllByRole('tab');

// Test EventsPanel
const eventsPanel = screen.getByTestId('events-panel');
const scrollContainer = screen.getByTestId('events-scroll-container');
```

## Browser Support

- **Desktop**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS 14+, Android 8+
- **Accessibility**: WCAG 2.1 AA compliant
- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Tested with VoiceOver and NVDA