// import { StateMachineExporter } from '@nsm/dev-tools';
import React, { useCallback } from 'react';
import { AnyActor } from 'xstate';

export interface WordleExporterProps {
  /** The Wordle game actor */
  actor: AnyActor;
  /** Whether to show the code viewer */
  showCodeViewer?: boolean;
  /** Whether to enable game-specific keyboard shortcuts */
  enableGameShortcuts?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export const WordleExporter: React.FC<WordleExporterProps> = ({
  actor,
  showCodeViewer = false,
  enableGameShortcuts = false,
  className = '',
}) => {
  const handleExportSuccess = useCallback((json: string) => {
    // Wordle-specific success handling
    console.log('Wordle machine exported successfully');
  }, []);

  const handleExportError = useCallback((error: string) => {
    // Wordle-specific error handling
    console.error('Wordle export failed:', error);
  }, []);

  const wrapAsCreateMachine = useCallback((json: string) => {
    // Provide a paste-ready snippet for XState users
    return `import { createMachine } from 'xstate';\n\nconst machine = createMachine(${json});\n`;
  }, []);

  return (
    <div className={`wordle-exporter ${className}`} data-testid="wordle-exporter">
      <StateMachineExporter
        machine={actor}
        buttonText="Export Wordle Machine"
        className="wordle-export-minimal wordle-themed"
        showCodeViewer={showCodeViewer}
        enableKeyboardShortcut={enableGameShortcuts}
        serializationOptions={{
          includeSensitiveData: false, // Don't export the hidden word in production
          sanitizeCollaboration: false, // Wordle is single-player
          prettyPrint: true,
          preserveFunctionCode: true, // CRITICAL FIX: Preserve function source code instead of "[Function: assign2]"
        }}
        formatCopiedText={wrapAsCreateMachine}
        onExportSuccess={handleExportSuccess}
        onExportError={handleExportError}
      />

      {/* Success/Error feedback with Wordle theming */}
      <style>{`
        .wordle-exporter {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 1000;
          /* VISIBILITY FIX: Add subtle animation to draw attention */
          animation: subtlePulse 3s ease-in-out infinite;
        }

        :global(.wordle-export-minimal) {
          background: #6aaa64 !important;
          border: 2px solid #538d4e;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        :global(.wordle-export-minimal:hover:not(.disabled)) {
          background: #538d4e !important;
          transform: scale(1.02);
        }

        :global(.wordle-themed) {
          font-family: 'Clear Sans', 'Helvetica Neue', Arial, sans-serif;
        }

        :global(.wordle-exporter .feedback-success) {
          background: #6aaa64;
          color: white;
          border: 1px solid #538d4e;
        }

        :global(.wordle-exporter .feedback-error) {
          background: #c9b458;
          color: white;
          border: 1px solid #b59f3b;
        }

        .wordle-export-container {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
        }

        /* Ensure the exporter doesn't interfere with game controls */
        :global(.wordle-exporter *) {
          pointer-events: auto;
        }

        /* Make sure it doesn't block game interactions */
        .wordle-exporter:not(:hover) {
          opacity: 0.7;
          transition: opacity 0.3s ease;
        }

        .wordle-exporter:hover {
          opacity: 1;
        }

        /* Custom success message styling */
        :global(.wordle-exporter .feedback) {
          animation: wordleSlideIn 0.4s ease-out;
        }

        @keyframes wordleSlideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        /* VISIBILITY FIX: Subtle pulse animation to indicate interactivity */
        @keyframes subtlePulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 2px 8px rgba(106, 170, 100, 0.3);
          }
          50% {
            transform: scale(1.02);
            box-shadow: 0 4px 12px rgba(106, 170, 100, 0.5);
          }
        }

        /* Responsive design for mobile */
        @media (max-width: 768px) {
          .wordle-exporter {
            bottom: 10px;
            right: 10px;
          }

          :global(.wordle-export-minimal) {
            padding: 6px 10px;
            font-size: 12px;
          }

          :global(.wordle-export-minimal .button-text) {
            display: none;
          }

          :global(.wordle-export-minimal .button-icon) {
            margin-right: 0;
          }
        }
      `}</style>
    </div>
  );
};
