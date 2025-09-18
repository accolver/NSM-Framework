# Dashboard Component Reuse Example

## Using Modular Dashboard Components in Other NSM Apps

The refactored NSM Developer Dashboard components can now be imported and reused in other NSM applications like poc-wordle.

### Example: Adding Performance Monitor to Wordle

```tsx
// In poc-wordle/src/components/WordleGame.tsx

import { PerformancePanel } from '../../../poc-whiteboard/src/components/dashboard';
import type { PerformanceMetrics } from '../../../poc-whiteboard/src/components/dashboard';

const WordleGameWithMetrics = () => {
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    memoryUsage: 0,
    eventCount: 0,
    networkActivity: 0,
    lastUpdated: Date.now()
  });

  useEffect(() => {
    const updateMetrics = () => {
      setPerformanceMetrics({
        memoryUsage: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 0,
        eventCount: gameEvents.length,
        networkActivity: Math.floor(Math.random() * 100),
        lastUpdated: Date.now()
      });
    };

    const interval = setInterval(updateMetrics, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="wordle-container">
      <WordleGrid />
      <WordleKeyboard />

      {/* Reused performance panel */}
      <div style={{ position: 'fixed', bottom: 0, right: 0, width: '300px' }}>
        <PerformancePanel performanceMetrics={performanceMetrics} />
      </div>
    </div>
  );
};
```

### Example: Custom Dashboard with Inspector for Wordle

```tsx
// In poc-wordle/src/components/WordleDeveloperDashboard.tsx

import {
  DashboardContainer,
  DashboardHeader,
  TabBar,
  InspectorPanel,
  PerformancePanel,
  KeyboardShortcutsPanel
} from '../../../poc-whiteboard/src/components/dashboard';
import type { Tab, DashboardLayout } from '../../../poc-whiteboard/src/components/dashboard';

const WORDLE_TABS: readonly Tab[] = [
  { id: 'inspector', label: 'Game State Inspector', shortcut: '1' },
  { id: 'performance', label: 'Performance', shortcut: '2' }
];

export const WordleDeveloperDashboard = ({
  inspectorService,
  connectInspector,
  openVisualizer,
  performanceMetrics
}) => {
  const [layout, setLayout] = useState<DashboardLayout>({
    width: 350,
    activeTab: 'inspector',
    isMinimized: false,
    tabOrder: ['inspector', 'performance']
  });

  const handleTabClick = (tabId) => {
    setLayout(prev => ({ ...prev, activeTab: tabId }));
  };

  const renderContent = () => {
    switch (layout.activeTab) {
      case 'inspector':
        return (
          <InspectorPanel
            inspectorService={inspectorService}
            connectInspector={connectInspector}
            openVisualizer={openVisualizer}
          />
        );
      case 'performance':
        return <PerformancePanel performanceMetrics={performanceMetrics} />;
      default:
        return <div>Unknown tab</div>;
    }
  };

  return (
    <DashboardContainer
      layout={layout}
      isMobile={false}
      isTablet={false}
      isDesktop={true}
    >
      <DashboardHeader
        title="Wordle Developer Tools"
        subtitle="Game state debugging and performance monitoring"
        onMinimize={() => setLayout(prev => ({ ...prev, isMinimized: true }))}
      />

      <TabBar
        tabs={WORDLE_TABS}
        activeTab={layout.activeTab}
        onTabClick={handleTabClick}
      />

      <div className="tool-content">
        {renderContent()}
      </div>

      <KeyboardShortcutsPanel
        shortcuts={[
          { key: '1-2', description: 'Switch tools' },
          { key: 'Alt+D', description: 'Toggle dashboard' }
        ]}
      />
    </DashboardContainer>
  );
};
```

### Benefits of Modular Architecture

1. **Code Reuse**: Same components work across different NSM apps
2. **Consistency**: Unified developer experience across applications
3. **Maintainability**: Updates to common components benefit all apps
4. **Customization**: Each app can compose components differently
5. **Testing**: Components can be tested in isolation
6. **Bundle Optimization**: Tree-shaking ensures only used components are bundled

### Shared Component Library Strategy

For production use, consider moving the dashboard components to a shared package:

```
packages/
├── nsm-core/              # Core NSM functionality
├── nsm-dashboard/         # Shared dashboard components
│   ├── src/
│   │   ├── components/    # All dashboard components
│   │   ├── types.ts      # Shared TypeScript interfaces
│   │   └── index.ts      # Barrel exports
│   └── package.json
└── nsm-themes/           # Shared styling and themes
```

This would allow apps to import via:

```tsx
import { InspectorPanel, PerformancePanel } from '@nsm/dashboard';
import type { DashboardLayout, PerformanceMetrics } from '@nsm/dashboard';
```