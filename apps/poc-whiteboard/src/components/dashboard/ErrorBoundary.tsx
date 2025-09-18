/**
 * ErrorBoundary Component
 *
 * Error boundary wrapper for dashboard tools
 */

import React from 'react';
import type { ErrorBoundaryProps } from './types';

export const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({
  children,
  toolName,
  onError,
  className = ''
}) => {
  try {
    return <div className={className}>{children}</div>;
  } catch (error) {
    // Log the error if onError handler is provided
    if (onError && error instanceof Error) {
      onError(error, { componentStack: '' } as React.ErrorInfo);
    }

    return (
      <div className={`error-state ${className}`}>
        <h3>Something went wrong in the {toolName} tool</h3>
        <p>Please try refreshing or switching to another tool.</p>
        {error instanceof Error && (
          <details style={{ marginTop: '8px', fontSize: '10px', color: '#999' }}>
            <summary>Error details</summary>
            <pre style={{ marginTop: '4px', whiteSpace: 'pre-wrap' }}>
              {error.message}
            </pre>
          </details>
        )}
      </div>
    );
  }
};