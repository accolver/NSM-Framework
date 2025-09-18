# NSM Developer Dashboard - Modular Components

The NSM Developer Dashboard has been refactored from a monolithic 1440+ line component into modular, reusable components that can be imported individually or composed together.

## Architecture Overview

The dashboard follows React best practices with:
- **Component Composition**: Small, focused components that do one thing well
- **TypeScript Interfaces**: Strong typing for all component props
- **Barrel Exports**: Clean imports via index.ts
- **Separation of Concerns**: Business logic, UI, and styling properly separated
- **Responsive Design**: Mobile-first responsive components
- **Accessibility**: ARIA labels and keyboard navigation support

## Component Structure

```
dashboard/
├── index.ts                      # Barrel exports for clean imports
├── types.ts                      # TypeScript interfaces for all components
├── styles.ts                     # Centralized CSS-in-JS styles
├── ModularDeveloperDashboard.tsx # Main dashboard composition
├── DashboardContainer.tsx        # Layout container with responsive behavior
├── DashboardHeader.tsx           # Header with title and controls
├── TabBar.tsx                   # Tab navigation component
├── ToolContent.tsx              # Main content area router
├── ResizeHandle.tsx             # Draggable resize handle
├── KeyboardShortcutsPanel.tsx   # Bottom shortcuts panel
├── ErrorBoundary.tsx            # Error boundary wrapper
└── panels/                      # Individual tool panels
    ├── InspectorPanel.tsx       # XState Inspector panel
    ├── EventLogPanel.tsx        # Event log viewer panel
    ├── TimeTravelPanel.tsx      # Time travel debugger panel
    ├── AppDiscoveryPanel.tsx    # App discovery panel
    └── PerformancePanel.tsx     # Performance metrics panel
```

## Usage Examples

### Import Individual Components

```tsx
import { TabBar, DashboardHeader, InspectorPanel } from './components/dashboard';

// Use components independently
<DashboardHeader
  title="Custom Dashboard"
  onMinimize={handleMinimize}
/>

<TabBar
  tabs={myTabs}
  activeTab="inspector"
  onTabClick={handleTabClick}
/>

<InspectorPanel
  inspectorService={myInspectorService}
  connectInspector={connect}
  openVisualizer={openViz}
/>
```

### Import Full Dashboard

```tsx
import { DeveloperDashboard } from './components/dashboard';

// Original interface maintained for backward compatibility
<DeveloperDashboard
  eventLogService={eventLogService}
  timeTravelService={timeTravelService}
  inspectorService={inspectorService}
  connectInspector={connectInspector}
  openVisualizer={openVisualizer}
/>
```

### Custom Dashboard Composition

```tsx
import {
  DashboardContainer,
  DashboardHeader,
  TabBar,
  InspectorPanel,
  PerformancePanel
} from './components/dashboard';

const MyCustomDashboard = () => {
  return (
    <DashboardContainer layout={layout} isMobile={false} isTablet={false} isDesktop={true}>
      <DashboardHeader title="My Custom Dashboard" />
      <TabBar tabs={customTabs} activeTab="performance" onTabClick={handleClick} />
      <PerformancePanel performanceMetrics={metrics} />
    </DashboardContainer>
  );
};
```

## Component Props

All components are strongly typed with TypeScript interfaces:

- **DashboardServices**: Core service interfaces
- **DashboardLayout**: Layout configuration
- **DashboardTool**: Available tool types
- **Tab**: Tab definition interface
- **BaseComponentProps**: Common props like className

See `types.ts` for complete interface definitions.

## Reusability

Each component can be used independently:

### InspectorPanel
- Standalone XState Inspector interface
- Can be embedded in any React application
- Handles connection states and actor management

### PerformancePanel
- Real-time performance metrics display
- Configurable metric types
- Responsive grid layout

### TabBar
- Generic horizontal scrollable tab navigation
- Keyboard accessibility built-in
- Customizable tab definitions

### AppDiscoveryPanel
- NSM application discovery interface
- Connection management UI
- Scanning states and loading indicators

## Responsive Design

All components include responsive breakpoints:
- **Mobile** (< 768px): Simplified layout, touch-optimized
- **Tablet** (768px - 1024px): Balanced feature set
- **Desktop** (≥ 1024px): Full feature access

## Accessibility

Components follow accessibility best practices:
- ARIA labels and roles
- Keyboard navigation support
- Focus management
- Screen reader compatibility
- High contrast support

## Styling

Centralized styling system:
- CSS-in-JS with `styles.ts`
- Responsive breakpoints
- Dark theme optimized
- Consistent spacing and typography

## Testing

Components are designed for easy testing:
- Isolated component testing
- Mock service interfaces
- Test data utilities
- Component state verification

## Migration

The original `DeveloperDashboard` component is now a simple wrapper around `ModularDeveloperDashboard`, ensuring backward compatibility while enabling gradual migration to the modular architecture.

## Future Enhancements

The modular architecture enables:
- Plugin-based tool system
- Theme customization
- Layout persistence
- Custom tool panels
- Cross-app component sharing