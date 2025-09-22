import React, { useMemo } from 'react';

export interface CodeViewerProps {
  /** The code to display */
  code: string;
  /** Programming language for syntax highlighting */
  language?: 'json' | 'javascript' | 'typescript';
  /** Additional CSS classes */
  className?: string;
  /** ARIA label for accessibility */
  'aria-label'?: string;
  /** Whether to show line numbers */
  showLineNumbers?: boolean;
  /** Maximum height before scrolling */
  maxHeight?: string;
}

/**
 * Simple syntax highlighter for JSON
 */
const highlightJson = (code: string): string => {
  return code
    .replace(/("(?:\\.|[^"\\])*")\s*:/g, '<span class="json-key">$1</span>:')
    .replace(/"(?:\\.|[^"\\])*"/g, '<span class="json-string">$&</span>')
    .replace(/\b(true|false|null)\b/g, '<span class="json-keyword">$1</span>')
    .replace(/\b-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g, '<span class="json-number">$1</span>')
    .replace(/[{}]/g, '<span class="json-brace">$&</span>')
    .replace(/[\[\]]/g, '<span class="json-bracket">$&</span>')
    .replace(/,/g, '<span class="json-comma">$&</span>');
};

/**
 * Basic syntax highlighter for JavaScript/TypeScript
 */
const highlightJavaScript = (code: string): string => {
  return code
    .replace(/\b(const|let|var|function|class|import|export|from|default|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|this|super|typeof|instanceof)\b/g, '<span class="js-keyword">$1</span>')
    .replace(/"(?:\\.|[^"\\])*"/g, '<span class="js-string">$&</span>')
    .replace(/'(?:\\.|[^'\\])*'/g, '<span class="js-string">$&</span>')
    .replace(/`(?:\\.|[^`\\])*`/g, '<span class="js-template">$&</span>')
    .replace(/\/\/.*$/gm, '<span class="js-comment">$&</span>')
    .replace(/\/\*[\s\S]*?\*\//g, '<span class="js-comment">$&</span>')
    .replace(/\b\d+(?:\.\d+)?\b/g, '<span class="js-number">$&</span>');
};

export const CodeViewer: React.FC<CodeViewerProps> = ({
  code,
  language = 'json',
  className = '',
  'aria-label': ariaLabel = 'Code viewer',
  showLineNumbers = false,
  maxHeight = '300px'
}) => {
  const highlightedCode = useMemo(() => {
    if (!code.trim()) {
      return '';
    }

    switch (language) {
      case 'json':
        return highlightJson(code);
      case 'javascript':
      case 'typescript':
        return highlightJavaScript(code);
      default:
        return code;
    }
  }, [code, language]);

  const lines = useMemo(() => {
    return code.split('\n');
  }, [code]);

  return (
    <div
      className={`code-viewer syntax-highlighted formatted-json formatted-drawing-json ${className}`}
      role="region"
      aria-label={ariaLabel}
      style={{ maxHeight }}
    >
      <div className="code-container">
        {showLineNumbers && (
          <div className="line-numbers">
            {lines.map((_, index) => (
              <div key={index} className="line-number">
                {index + 1}
              </div>
            ))}
          </div>
        )}
        <div className="code-content">
          <pre>
            <code
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
              className={`language-${language}`}
            />
          </pre>
        </div>
      </div>

      <style>{`
        .code-viewer {
          border: 1px solid #e1e4e8;
          border-radius: 6px;
          background: #f6f8fa;
          overflow: auto;
          font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
          font-size: 14px;
          line-height: 1.45;
        }

        .code-container {
          display: flex;
          min-height: 100%;
        }

        .line-numbers {
          background: #f1f3f4;
          border-right: 1px solid #e1e4e8;
          padding: 10px 8px;
          text-align: right;
          user-select: none;
          min-width: 40px;
        }

        .line-number {
          color: #586069;
          font-size: 12px;
        }

        .code-content {
          flex: 1;
          padding: 10px;
          overflow-x: auto;
        }

        pre {
          margin: 0;
          white-space: pre;
        }

        code {
          color: #24292e;
          font-family: inherit;
        }

        /* JSON Syntax Highlighting */
        :global(.json-key) {
          color: #032f62;
          font-weight: 600;
        }

        :global(.json-string) {
          color: #d73a49;
        }

        :global(.json-keyword) {
          color: #005cc5;
          font-weight: 600;
        }

        :global(.json-number) {
          color: #005cc5;
        }

        :global(.json-brace),
        :global(.json-bracket) {
          color: #24292e;
          font-weight: 600;
        }

        :global(.json-comma) {
          color: #24292e;
        }

        /* JavaScript Syntax Highlighting */
        :global(.js-keyword) {
          color: #d73a49;
          font-weight: 600;
        }

        :global(.js-string),
        :global(.js-template) {
          color: #032f62;
        }

        :global(.js-comment) {
          color: #6a737d;
          font-style: italic;
        }

        :global(.js-number) {
          color: #005cc5;
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .code-viewer {
            background: #0d1117;
            border-color: #30363d;
            color: #c9d1d9;
          }

          .line-numbers {
            background: #161b22;
            border-color: #30363d;
          }

          .line-number {
            color: #8b949e;
          }

          code {
            color: #c9d1d9;
          }

          :global(.json-key) {
            color: #79c0ff;
          }

          :global(.json-string) {
            color: #a5d6ff;
          }

          :global(.json-keyword) {
            color: #ff7b72;
          }

          :global(.json-number) {
            color: #79c0ff;
          }

          :global(.js-keyword) {
            color: #ff7b72;
          }

          :global(.js-string),
          :global(.js-template) {
            color: #a5d6ff;
          }

          :global(.js-comment) {
            color: #8b949e;
          }

          :global(.js-number) {
            color: #79c0ff;
          }
        }
      `}</style>
    </div>
  );
};