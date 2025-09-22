/**
 * DashboardContainer Component
 *
 * Main container with layout styling and responsive behavior
 */

import React from 'react';
import type { DashboardContainerProps } from './types';
import { dashboardStyles } from './styles';

export const DashboardContainer: React.FC<DashboardContainerProps> = ({
  layout,
  isMobile,
  isTablet,
  isDesktop,
  isResizing = false,
  children,
  className = ''
}) => {
  // Determine layout class based on screen size
  const layoutClass = isMobile ? 'mobile-layout' : isTablet ? 'tablet-layout' : 'desktop-layout';

  // Don't render if minimized
  if (layout.isMinimized) {
    return null;
  }

  return (
    <>
      <style>{dashboardStyles}</style>
      <div
        data-testid="dashboard-container"
        className={`developer-dashboard ${layoutClass} ${className}`}
        style={{
          width: isMobile ? '100%' : layout.width,
          cursor: isResizing ? 'ew-resize' : 'default'
        }}
        role="region"
        aria-label="Developer Tools Dashboard"
      >
        {children}
      </div>
    </>
  );
};