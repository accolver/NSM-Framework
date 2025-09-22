/**
 * TimeTravelPanel Component
 *
 * Wrapper for the TimeTravelDebugger component
 */

import React from 'react';
import type { TimeTravelPanelProps } from '../types';
import { ErrorBoundary } from '../ErrorBoundary';
import { TimeTravelDebugger } from '../../components/TimeTravelDebugger';

export const TimeTravelPanel: React.FC<TimeTravelPanelProps> = ({
  timeTravelService,
  className = ''
}) => {
  return (
    <ErrorBoundary toolName="Time Travel">
      <TimeTravelDebugger
        timeTravelService={timeTravelService}
        className={`h-full ${className}`}
      />
    </ErrorBoundary>
  );
};