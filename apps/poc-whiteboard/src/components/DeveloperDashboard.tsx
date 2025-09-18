import React from 'react';
import type { EventLogService } from '../services/event-log-service';
import type { TimeTravelService } from '../services/time-travel-service';
import type { InspectorService } from '../services/inspector-service';

// Import the modular dashboard components
import { ModularDeveloperDashboard } from './dashboard';

/**
 * Developer Dashboard Props
 */
export interface DeveloperDashboardProps {
  eventLogService: EventLogService;
  timeTravelService: TimeTravelService;
  inspectorService: InspectorService;
  connectInspector: () => Promise<void>;
  openVisualizer: () => void;
  className?: string;
}


/**
 * Developer Dashboard Component
 *
 * Refactored wrapper that uses the new modular dashboard architecture
 * while maintaining backward compatibility
 */
export const DeveloperDashboard: React.FC<DeveloperDashboardProps> = (props) => {
  return <ModularDeveloperDashboard {...props} />;
};

export default DeveloperDashboard;