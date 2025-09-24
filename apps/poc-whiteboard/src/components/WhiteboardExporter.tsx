import { StateMachineExporter } from '@nsm/dev-tools';
import React, { useCallback } from 'react';
import { AnyActor } from 'xstate';

export interface WhiteboardExporterProps {
  /** The Whiteboard actor */
  actor: AnyActor;
  /** Whether to show the code viewer */
  showCodeViewer?: boolean;
  /** Whether to enable canvas-specific keyboard shortcuts */
  enableCanvasShortcuts?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export const WhiteboardExporter: React.FC<WhiteboardExporterProps> = ({
  actor,
  showCodeViewer = false,
  enableCanvasShortcuts = false,
  className = '',
}) => {
  const handleExportSuccess = useCallback((json: string) => {
    // Whiteboard-specific success handling
    console.log('Whiteboard machine exported successfully');
  }, []);

  const handleExportError = useCallback((error: string) => {
    // Whiteboard-specific error handling
    console.error('Whiteboard export failed:', error);
  }, []);

  const wrapAsCreateMachine = useCallback((json: string) => {
    return `import { createMachine } from 'xstate';\n\nconst machine = createMachine(${json});\n`;
  }, []);

  return (
    <div className={`whiteboard-exporter ${className}`} data-testid="whiteboard-exporter">
      <StateMachineExporter
        machine={actor}
        buttonText="Export Whiteboard Machine"
        className="minimal-overlay whiteboard-themed toolbar-integrated"
        showCodeViewer={showCodeViewer}
        enableKeyboardShortcut={enableCanvasShortcuts}
        serializationOptions={{
          includeSensitiveData: false,
          sanitizeCollaboration: true, // Clean up collaboration data for export
          prettyPrint: true,
          preserveFunctionCode: true, // CRITICAL FIX: Preserve function source code instead of "[Function: assign2]"
          // NOTE: Removed custom replacer to allow proper function serialization
          // The built-in function serialization handles preserveFunctionCode correctly
          // Custom replacers override the internal function handling
        }}
        formatCopiedText={wrapAsCreateMachine}
        onExportSuccess={handleExportSuccess}
        onExportError={handleExportError}
      />

      <style>{`
        .whiteboard-exporter {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 100;
        }

        :global(.minimal-overlay) {
          background: rgba(255, 255, 255, 0.9) !important;
          backdrop-filter: blur(4px);
          border: 1px solid rgba(0, 0, 0, 0.1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          transition: all 0.3s ease;
        }

        :global(.minimal-overlay:hover:not(.disabled)) {
          background: rgba(255, 255, 255, 0.95) !important;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
          transform: translateY(-1px);
        }

        :global(.whiteboard-themed) {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          color: #333;
        }

        :global(.toolbar-integrated) {
          margin: 0;
          border-radius: 6px;
        }

        /* Ensure it doesn't interfere with canvas drawing */
        .whiteboard-exporter {
          pointer-events: auto;
        }

        .whiteboard-exporter * {
          pointer-events: auto;
        }

        /* Custom feedback styling for whiteboard */
        :global(.whiteboard-exporter .feedback-success) {
          background: #4caf50;
          color: white;
          border: 1px solid #45a049;
        }

        :global(.whiteboard-exporter .feedback-error) {
          background: #f44336;
          color: white;
          border: 1px solid #d32f2f;
        }

        :global(.whiteboard-exporter .feedback) {
          animation: whiteboardFadeIn 0.3s ease-out;
        }

        @keyframes whiteboardFadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Code viewer styling for whiteboard */
        :global(.whiteboard-exporter .machine-json-viewer) {
          background: rgba(248, 249, 250, 0.95);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 6px;
          max-width: 400px;
        }

        :global(.formatted-drawing-json) {
          font-size: 12px;
          line-height: 1.4;
        }

        /* Responsive behavior */
        @media (max-width: 1024px) {
          .whiteboard-exporter {
            top: 60px; /* Below the toolbar */
            right: 5px;
          }

          :global(.minimal-overlay) {
            padding: 6px 10px;
            font-size: 12px;
          }

          :global(.minimal-overlay .button-text) {
            display: none;
          }

          :global(.whiteboard-exporter .machine-json-viewer) {
            max-width: 300px;
            max-height: 200px;
          }
        }

        @media (max-width: 768px) {
          .whiteboard-exporter {
            position: fixed;
            bottom: 20px;
            right: 10px;
            top: auto;
          }

          :global(.minimal-overlay .button-icon) {
            margin-right: 0;
          }
        }

        /* Ensure it stays above canvas but below modals */
        .whiteboard-exporter {
          z-index: 100;
        }

        /* Semi-transparent when not hovered to not distract from drawing */
        .whiteboard-exporter:not(:hover) {
          opacity: 0.8;
        }

        .whiteboard-exporter:hover {
          opacity: 1;
        }
      `}</style>
    </div>
  );
};
