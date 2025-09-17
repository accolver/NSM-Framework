import React from 'react';
import { EventLogViewer } from './EventLogViewer';
import type { EventLogService } from '../services/event-log-service';

export interface EventsPanelProps {
  eventLogService: EventLogService;
  className?: string;
  title?: string;
  description?: string;
  height?: string | number;
  showHeader?: boolean;
  'data-testid'?: string;
}

/**
 * Reusable Events Panel Component
 *
 * Features:
 * - Wraps EventLogViewer with consistent styling
 * - Configurable title and description
 * - Scrollable events section
 * - Responsive design
 */
export const EventsPanel: React.FC<EventsPanelProps> = ({
  eventLogService,
  className = '',
  title = 'Events',
  description = 'Real-time event monitoring',
  height = 'auto',
  showHeader = true,
  'data-testid': testId = 'events-panel'
}) => {
  return (
    <div
      className={`events-panel ${className}`}
      data-testid={testId}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      {showHeader && (
        <div className="events-panel-header">
          <h3 className="events-panel-title">{title}</h3>
          {description && (
            <p className="events-panel-description">{description}</p>
          )}
        </div>
      )}
      <div className="events-panel-content">
        <EventLogViewer
          eventLogService={eventLogService}
          className="h-full"
        />
      </div>
    </div>
  );
};

export default EventsPanel;