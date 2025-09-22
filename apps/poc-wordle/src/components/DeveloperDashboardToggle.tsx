/**
 * Developer Dashboard Toggle Component
 *
 * Provides a toggle mechanism for showing/hiding the developer dashboard
 */

import React, { useState, useEffect, useCallback } from 'react';

export interface DeveloperDashboardToggleProps {
  onToggle: (isVisible: boolean) => void;
  initiallyVisible?: boolean;
  className?: string;
}

/**
 * Toggle component for developer dashboard with keyboard shortcuts
 */
export const DeveloperDashboardToggle: React.FC<DeveloperDashboardToggleProps> = ({
  onToggle,
  initiallyVisible = false,
  className = ''
}) => {
  // VISIBILITY FIX: Start with dashboard visible by default for better UX
  const [isVisible, setIsVisible] = useState(initiallyVisible || true);
  const [showShortcutHint, setShowShortcutHint] = useState(false);

  // Handle toggle action
  const handleToggle = useCallback(() => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);
    onToggle(newVisibility);
    console.log(`🔧 Developer dashboard ${newVisibility ? 'opened' : 'closed'}`);
  }, [isVisible, onToggle]);

  // VISIBILITY FIX: Trigger initial dashboard visibility on mount
  useEffect(() => {
    if (isVisible && !initiallyVisible) {
      onToggle(true);
    }
  }, []); // Only run once on mount

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Shift+D to toggle dashboard
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        handleToggle();
        return;
      }

      // Alt+D as alternative toggle
      if (event.altKey && event.key === 'd') {
        event.preventDefault();
        handleToggle();
        return;
      }

      // Show hint when Ctrl+Shift is pressed
      if (event.ctrlKey && event.shiftKey && !showShortcutHint) {
        setShowShortcutHint(true);
        setTimeout(() => setShowShortcutHint(false), 2000);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleToggle, showShortcutHint]);

  return (
    <div className={`developer-dashboard-toggle ${className}`}>
      {/* Toggle button */}
      <button
        onClick={handleToggle}
        className={`toggle-button ${isVisible ? 'active' : ''}`}
        title="Toggle Developer Dashboard (Ctrl+Shift+D)"
        aria-label={`${isVisible ? 'Hide' : 'Show'} developer dashboard`}
      >
        <span className="toggle-icon">🛠️</span>
        <span className="toggle-text">
          {isVisible ? 'Hide' : 'Show'} Dashboard
        </span>
      </button>

      {/* Keyboard shortcut hint */}
      {showShortcutHint && (
        <div className="shortcut-hint">
          Press D to toggle dashboard
        </div>
      )}

      {/* Inline styles */}
      <style>{`
        .developer-dashboard-toggle {
          position: fixed;
          top: 10px;
          right: 10px;
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }

        .toggle-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(30, 30, 30, 0.95);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
          backdrop-filter: blur(10px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .toggle-button:hover {
          background: rgba(40, 40, 40, 0.95);
          border-color: rgba(255, 255, 255, 0.3);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .toggle-button:active {
          transform: translateY(0);
        }

        .toggle-button.active {
          background: rgba(0, 120, 255, 0.9);
          border-color: rgba(0, 120, 255, 0.8);
        }

        .toggle-button.active:hover {
          background: rgba(0, 100, 255, 0.95);
        }

        .toggle-icon {
          font-size: 16px;
          line-height: 1;
        }

        .toggle-text {
          font-size: 13px;
          white-space: nowrap;
        }

        .shortcut-hint {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 8px;
          padding: 6px 10px;
          background: rgba(0, 0, 0, 0.9);
          color: #ffffff;
          border-radius: 4px;
          font-size: 12px;
          white-space: nowrap;
          animation: fadeInOut 2s ease-in-out;
        }

        @keyframes fadeInOut {
          0%, 100% { opacity: 0; transform: translateY(-4px); }
          10%, 90% { opacity: 1; transform: translateY(0); }
        }

        /* Mobile responsive adjustments */
        @media (max-width: 768px) {
          .developer-dashboard-toggle {
            top: 5px;
            right: 5px;
          }

          .toggle-button {
            padding: 6px 10px;
            font-size: 13px;
          }

          .toggle-text {
            display: none;
          }

          .toggle-icon {
            font-size: 18px;
          }
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .toggle-button {
            background: #000000;
            border-color: #ffffff;
            color: #ffffff;
          }

          .toggle-button:hover {
            background: #333333;
          }

          .toggle-button.active {
            background: #0066cc;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .toggle-button {
            transition: none;
          }

          .shortcut-hint {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};