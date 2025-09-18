/**
 * ToolContent Component
 *
 * Main content area that renders the appropriate tool panel based on active tab
 */

import React from 'react';
import type { ToolContentProps } from './types';
import { InspectorPanel } from './panels/InspectorPanel';
import { EventLogPanel } from './panels/EventLogPanel';
import { TimeTravelPanel } from './panels/TimeTravelPanel';
import { AppDiscoveryPanel } from './panels/AppDiscoveryPanel';
import { PerformancePanel } from './panels/PerformancePanel';

export const ToolContent: React.FC<ToolContentProps> = ({
  activeTab,
  services,
  performanceMetrics,
  discoveredApps,
  isScanning,
  onAppConnect,
  className = ''
}) => {
  // Service availability checks
  const serviceAvailable = {
    eventlog: !!services.eventLogService,
    timetravel: !!services.timeTravelService,
    inspector: !!services.inspectorService
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'inspector':
        if (!serviceAvailable.inspector) {
          return <div className="service-unavailable">XState Inspector service not available</div>;
        }
        return (
          <InspectorPanel
            inspectorService={services.inspectorService}
            connectInspector={services.connectInspector}
            openVisualizer={services.openVisualizer}
          />
        );

      case 'eventlog':
        if (!serviceAvailable.eventlog) {
          return <div className="service-unavailable">Event Log service not available</div>;
        }
        return (
          <EventLogPanel
            eventLogService={services.eventLogService}
          />
        );

      case 'timetravel':
        if (!serviceAvailable.timetravel) {
          return <div className="service-unavailable">Time Travel service not available</div>;
        }
        return (
          <TimeTravelPanel
            timeTravelService={services.timeTravelService}
          />
        );

      case 'appdiscovery':
        return (
          <AppDiscoveryPanel
            discoveredApps={discoveredApps}
            isScanning={isScanning}
            onAppConnect={onAppConnect}
          />
        );

      case 'performance':
        return (
          <PerformancePanel
            performanceMetrics={performanceMetrics}
          />
        );

      default:
        return <div>Unknown tool: {activeTab}</div>;
    }
  };

  return (
    <div
      className={`tool-content ${className}`}
      role="tabpanel"
      id={`panel-${activeTab}`}
      aria-labelledby={`tab-${activeTab}`}
    >
      {renderContent()}
    </div>
  );
};