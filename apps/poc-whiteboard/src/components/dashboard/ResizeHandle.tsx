/**
 * ResizeHandle Component
 *
 * Draggable resize handle for dashboard width adjustment
 */

import React from 'react';
import type { ResizeHandleProps } from './types';

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  onResizeStart,
  className = ''
}) => {
  return (
    <div
      data-testid="resize-handle"
      className={`resize-handle ${className}`}
      onMouseDown={onResizeStart}
    />
  );
};