import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    console.error('🚨 ErrorBoundary caught error:', error);
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 ErrorBoundary details:', {
      error: error.toString(),
      errorInfo,
      stack: error.stack
    });

    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          margin: '20px',
          fontFamily: 'monospace'
        }}>
          <h2 style={{ color: '#d63031', marginBottom: '16px' }}>
            🚨 Whiteboard App Error
          </h2>

          <details style={{ marginBottom: '16px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
              Error Details
            </summary>
            <pre style={{
              backgroundColor: '#f8f8f8',
              padding: '10px',
              borderRadius: '4px',
              overflow: 'auto',
              marginTop: '8px'
            }}>
              {this.state.error && this.state.error.toString()}
            </pre>
          </details>

          <details style={{ marginBottom: '16px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
              Component Stack
            </summary>
            <pre style={{
              backgroundColor: '#f8f8f8',
              padding: '10px',
              borderRadius: '4px',
              overflow: 'auto',
              marginTop: '8px'
            }}>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
          </details>

          <div style={{ marginTop: '20px' }}>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
                window.location.reload();
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#0984e3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '8px'
              }}
            >
              🔄 Reload Page
            </button>

            <button
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#00b894',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              🔃 Try Again
            </button>
          </div>

          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#e8f5e8',
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            <strong>Debugging Tips:</strong>
            <ul style={{ marginTop: '8px', marginBottom: '0' }}>
              <li>Check the browser console for additional error details</li>
              <li>Try refreshing the page</li>
              <li>Check if all required services are running</li>
              <li>Verify network connectivity</li>
            </ul>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}