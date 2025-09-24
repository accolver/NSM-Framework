import React, { useCallback, useEffect, useState } from 'react';
import { AnyActor, AnyStateMachine } from 'xstate';
import { copyToClipboard } from '../utils/clipboardAPI';
import { SerializationOptions, serializeMachine } from '../utils/machineSerializer';
import { CodeViewer } from './CodeViewer';

export interface StateMachineExporterProps {
  /** The XState machine or actor to export */
  machine: AnyStateMachine | AnyActor | null;
  /** Custom button text */
  buttonText?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the code viewer option */
  showCodeViewer?: boolean;
  /** Whether to enable keyboard shortcut (Ctrl+Shift+E) */
  enableKeyboardShortcut?: boolean;
  /** Serialization options */
  serializationOptions?: SerializationOptions;
  /** Optional formatter to transform/wrap the copied text */
  formatCopiedText?: (json: string) => string;
  /** Callback when export is successful */
  onExportSuccess?: (json: string) => void;
  /** Callback when export fails */
  onExportError?: (error: string) => void;
}

export const StateMachineExporter: React.FC<StateMachineExporterProps> = ({
  machine,
  buttonText = 'Export Machine JSON',
  className = '',
  showCodeViewer = false,
  enableKeyboardShortcut = false,
  serializationOptions = {},
  formatCopiedText,
  onExportSuccess,
  onExportError,
}) => {
  // CRITICAL FIX: ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // Ensure React state hooks are called consistently - ALWAYS at the top level
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [isCodeViewerOpen, setIsCodeViewerOpen] = useState<boolean>(false);
  const [cachedJson, setCachedJson] = useState<string>('');

  // Generate JSON for the machine - called consistently regardless of machine state
  const generateJson = useCallback(() => {
    if (!machine) {
      return '';
    }

    try {

      return serializeMachine(machine, serializationOptions);
    } catch (error) {
      console.error('Failed to generate JSON:', error);
      return '';
    }
  }, [machine, serializationOptions]);

  // Handle export action - called consistently
  const handleExport = useCallback(async () => {
    if (!machine || isExporting) {
      return;
    }

    setIsExporting(true);
    setFeedback(null);

    try {
      const json = generateJson();
      const payload = formatCopiedText ? formatCopiedText(json) : json;
      const result = await copyToClipboard(payload);

      if (result.success) {
        setFeedback({
          type: 'success',
          message: 'Copied to clipboard!',
        });
        onExportSuccess?.(json);
      } else {
        throw new Error(result.error || 'Failed to copy to clipboard');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      setFeedback({
        type: 'error',
        message: errorMessage,
      });
      onExportError?.(errorMessage);
    } finally {
      setIsExporting(false);
    }
  }, [machine, isExporting, generateJson, formatCopiedText, onExportSuccess, onExportError]);

  // Update cached JSON when machine changes - called consistently
  useEffect(() => {
    setCachedJson(generateJson());
  }, [generateJson]);

  // Keyboard shortcut handler - called consistently
  useEffect(() => {
    if (!enableKeyboardShortcut) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'E') {
        event.preventDefault();
        handleExport();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcut, handleExport]);

  // Clear feedback after 3 seconds - called consistently
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Basic styles for early return case
  const basicStyles = `
    .state-machine-exporter {
      display: inline-flex;
      flex-direction: column;
      gap: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    }
    .export-button {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: #007acc;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s ease;
    }
    .export-button.disabled {
      background: #ccc;
      cursor: not-allowed;
      opacity: 0.6;
    }
  `;

  // NOW it's safe to do conditional rendering - all hooks have been called
  // Early return for null machine - but hooks are already initialized above
  if (!machine) {
    return (
      <div className={`state-machine-exporter ${className}`}>
        <button
          disabled={true}
          className="export-button disabled"
          aria-label="Export state machine definition as JSON"
        >
          <span className="button-icon">📋</span>
          <span className="button-text">{buttonText}</span>
        </button>
        <style>{basicStyles}</style>
      </div>
    );
  }

  const isDisabled = !machine || isExporting;

  return (
    <div className={`state-machine-exporter ${className}`}>
      <div className="exporter-controls">
        <button
          onClick={handleExport}
          disabled={isDisabled}
          className={`export-button ${isDisabled ? 'disabled' : ''}`}
          aria-label="Export state machine definition as JSON"
          title={enableKeyboardShortcut ? 'Export JSON (Ctrl+Shift+E)' : 'Export JSON'}
        >
          <span className="button-icon">📋</span>
          <span className="button-text">{buttonText}</span>
          {isExporting && <span className="loading-spinner">⏳</span>}
        </button>

        {showCodeViewer && (
          <button
            onClick={() => setIsCodeViewerOpen(!isCodeViewerOpen)}
            className="code-viewer-toggle"
            aria-label="Toggle code viewer"
            disabled={!machine}
          >
            <span className="toggle-icon">{isCodeViewerOpen ? '🔼' : '🔽'}</span>
            <span className="toggle-text">View Code</span>
          </button>
        )}
      </div>

      {feedback && (
        <div className={`feedback feedback-${feedback.type}`} role="alert">
          {feedback.message}
        </div>
      )}

      {showCodeViewer && isCodeViewerOpen && (
        <CodeViewer
          code={cachedJson}
          language="json"
          className="machine-json-viewer"
          aria-label="JSON code viewer"
        />
      )}

      <style>{`
        .state-machine-exporter {
          display: inline-flex;
          flex-direction: column;
          gap: 8px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }

        .exporter-controls {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .export-button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: #007acc;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s ease;
        }

        .export-button:hover:not(.disabled) {
          background: #005a9e;
        }

        .export-button.disabled {
          background: #ccc;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .code-viewer-toggle {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          background: #f5f5f5;
          border: 1px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: background-color 0.2s ease;
        }

        .code-viewer-toggle:hover {
          background: #e5e5e5;
        }

        .code-viewer-toggle:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .feedback {
          padding: 6px 10px;
          border-radius: 4px;
          font-size: 13px;
          animation: fadeIn 0.3s ease;
        }

        .feedback-success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .feedback-error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .loading-spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .machine-json-viewer {
          margin-top: 8px;
          max-height: 400px;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
};
