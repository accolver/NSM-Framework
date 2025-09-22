/**
 * DashboardHeader Component
 *
 * Header with title, controls, and status indicators
 */

import React from 'react';
import type { DashboardHeaderProps } from './types';

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title = 'NSM Developer Dashboard',
  subtitle = 'Comprehensive developer tools and debugging interface',
  onMinimize,
  showMinimizeButton = true,
  showWarning = false,
  warningMessage = 'Some tools unavailable',
  className = ''
}) => {
  return (
    <div className={`dashboard-header ${className}`}>
      <div className="dashboard-title">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      <div className="dashboard-controls">
        {showWarning && (
          <span className="status-indicator status-warning">{warningMessage}</span>
        )}
        {showMinimizeButton && onMinimize && (
          <button
            className="control-btn"
            onClick={onMinimize}
            title="Minimize Dashboard"
          >
            ─
          </button>
        )}
      </div>
    </div>
  );
};