/**
 * EventLogPanel Component
 *
 * Wrapper for the EventLogViewer component
 */

import React from 'react';
import type { EventLogPanelProps } from '../types';
import { ErrorBoundary } from '../ErrorBoundary';
import { EventLogViewer } from '../../components/EventLogViewer';

export const EventLogPanel: React.FC<EventLogPanelProps> = ({
  eventLogService,
  className = ''
}) => {
  return (
    <ErrorBoundary toolName="Event Log">
      <EventLogViewer
        eventLogService={eventLogService}
        className={`h-full ${className}`}
      />
    </ErrorBoundary>
  );
};