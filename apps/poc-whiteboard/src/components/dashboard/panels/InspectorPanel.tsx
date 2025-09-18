/**
 * InspectorPanel Component
 *
 * XState Inspector panel for state machine visualization and debugging
 */

import React from 'react';
import type { InspectorPanelProps } from '../types';
import { ErrorBoundary } from '../ErrorBoundary';

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  inspectorService,
  connectInspector,
  openVisualizer,
  className = ''
}) => {
  const handleCopyMachineDefinition = async (
    e: React.MouseEvent<HTMLButtonElement>,
    name: string
  ) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      console.log(`🔍 Copying machine definition for ${name}...`);
      const success = await inspectorService.copyMachineDefinition(name);

      if (success) {
        // Show success feedback
        const button = e.target as HTMLButtonElement;
        const originalText = button.textContent;
        button.textContent = '✓ Copied!';
        button.style.backgroundColor = '#4caf50';

        setTimeout(() => {
          button.textContent = originalText;
          button.style.backgroundColor = '#007acc';
        }, 2000);

        // Also show in console
        console.log(`🔍 Machine definition for ${name} copied successfully`);
        console.log('🔍 Paste it into https://stately.ai/registry/new to visualize');
      } else {
        console.error(`🔍 Failed to copy machine definition for ${name}`);

        // Show error feedback
        const button = e.target as HTMLButtonElement;
        const originalText = button.textContent;
        button.textContent = '✗ Failed';
        button.style.backgroundColor = '#f44336';

        setTimeout(() => {
          button.textContent = originalText;
          button.style.backgroundColor = '#007acc';
        }, 2000);
      }
    } catch (error) {
      console.error(`🔍 Error copying machine definition for ${name}:`, error);
    }
  };

  const handleReconnect = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔍 RECONNECT BUTTON CLICKED - Starting reconnection...');

    try {
      console.log('🔍 Disconnecting first...');
      await inspectorService.disconnect();
      console.log('🔍 Disconnected, now reconnecting...');
      await connectInspector();
      console.log('🔍 Manual reconnection completed');
    } catch (error) {
      console.error('🔍 Manual reconnection failed:', error);
      console.error('🔍 Reconnection error details:', {
        message: (error as any)?.message,
        stack: (error as any)?.stack,
        name: (error as any)?.name
      });
    }
  };

  const handleRetryConnection = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔍 RETRY BUTTON CLICKED - Starting manual connection attempt...');

    try {
      await connectInspector();
      console.log('🔍 Manual connection completed');
    } catch (error) {
      console.error('🔍 Manual connection failed with error:', error);
      console.error('🔍 Error details:', {
        message: (error as any)?.message,
        stack: (error as any)?.stack,
        name: (error as any)?.name
      });
    }
  };

  const handleTestInspector = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔍 TEST BUTTON CLICKED - Running comprehensive diagnostics...');

    // Test 1: Check browser environment
    console.log('🔍 Test 1 - Browser Environment:', {
      window: typeof window !== 'undefined',
      windowOpen: typeof window?.open,
      navigator: typeof navigator !== 'undefined',
      userAgent: navigator?.userAgent
    });

    // Test 2: Test popup functionality
    console.log('🔍 Test 2 - Testing popup functionality...');
    try {
      const testPopup = window.open('about:blank', 'test-popup', 'width=100,height=100');
      if (testPopup) {
        console.log('🔍 Popup test successful - closing test window');
        testPopup.close();
      } else {
        console.warn('🔍 Popup blocked or failed to open');
      }
    } catch (popupError) {
      console.error('🔍 Popup test error:', popupError);
    }

    // Test 3: Test direct @statelyai/inspect usage
    console.log('🔍 Test 3 - Testing direct @statelyai/inspect...');
    try {
      const { createBrowserInspector } = await import('@statelyai/inspect');
      console.log('🔍 Import successful, creating test inspector...');

      const testInspector = createBrowserInspector({
        url: 'https://stately.ai/registry/new',
        window: window,
        iframe: null,
        autoStart: false
      });

      console.log('🔍 Test inspector created:', !!testInspector);
      console.log('🔍 Inspector methods:', {
        start: typeof testInspector?.start,
        stop: typeof testInspector?.stop,
        inspect: typeof testInspector?.inspect
      });

      // Try to start it
      try {
        testInspector?.start();
        console.log('🔍 Test inspector started successfully!');
        setTimeout(() => {
          try {
            testInspector?.stop();
            console.log('🔍 Test inspector stopped');
          } catch (stopError) {
            console.error('🔍 Test inspector stop error:', stopError);
          }
        }, 2000);
      } catch (startError) {
        console.error('🔍 Test inspector start error:', startError);
      }
    } catch (testError) {
      console.error('🔍 Direct test failed:', testError);
    }

    console.log('🔍 Diagnostics complete - check console for results');
  };

  return (
    <ErrorBoundary toolName="XState Inspector">
      <div className={`inspector-panel ${className}`}>
        <h3>XState Inspector</h3>
        <p>State machine visualization and debugging</p>

        <div className="inspector-status">
          <div className={`status-indicator ${inspectorService?.isConnected ? 'connected' : 'disconnected'}`}>
            Status: {inspectorService?.isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        {inspectorService?.isConnected ? (
          <div className="inspector-connected">
            <h4>Inspector Active ✅</h4>
            <p style={{ color: '#4caf50', fontSize: '12px', margin: '4px 0' }}>
              Status: {inspectorService.connectionStatus}
            </p>
            <p>The XState Inspector is running. The visualization should be available in:</p>
            <ul style={{ margin: '8px 0', paddingLeft: '20px', color: '#d4d4d4' }}>
              <li>A popup window (if not blocked)</li>
              <li>Or visit <a href="https://stately.ai/registry/new" target="_blank" rel="noopener noreferrer" style={{ color: '#4fc3f7' }}>https://stately.ai/registry/new</a></li>
            </ul>

            <div className="registered-actors">
              <h5>Registered Actors:</h5>
              {inspectorService.getRegisteredActors().length > 0 ? (
                <div style={{ margin: '4px 0' }}>
                  {inspectorService.getRegisteredActors().map(name => (
                    <div key={name} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                      padding: '4px 8px',
                      backgroundColor: '#2d2d2d',
                      borderRadius: '4px',
                      border: '1px solid #4caf50'
                    }}>
                      <span style={{ color: '#4caf50', fontSize: '12px' }}>{name}</span>
                      <button
                        onClick={(e) => handleCopyMachineDefinition(e, name)}
                        style={{
                          padding: '2px 6px',
                          backgroundColor: '#007acc',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '10px',
                          marginLeft: '8px'
                        }}
                        title={`Copy ${name} machine definition to clipboard`}
                      >
                        Copy
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#ff9800', fontSize: '12px' }}>No actors registered yet</p>
              )}
            </div>

            <div className="inspector-actions" style={{ marginTop: '16px' }}>
              <button
                onClick={openVisualizer}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#007acc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  marginRight: '8px'
                }}
              >
                Open Visualizer
              </button>
              <button
                onClick={handleReconnect}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ff9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Reconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="inspector-disconnected">
            <h4>Inspector Not Connected ❌</h4>
            <p style={{ color: '#ff9800', fontSize: '12px', margin: '4px 0' }}>
              Status: {inspectorService?.connectionStatus || 'disconnected'}
            </p>
            <p style={{ color: '#ff9800' }}>
              The XState Inspector could not connect. This may be due to:
            </p>
            <ul style={{ margin: '8px 0', paddingLeft: '20px', color: '#999', fontSize: '12px' }}>
              <li>Popup blocking in your browser</li>
              <li>Network connectivity issues</li>
              <li>Being in a test environment</li>
            </ul>
            <p style={{ fontSize: '12px', color: '#666' }}>
              Check the browser console for more details.
            </p>

            <div className="inspector-actions" style={{ marginTop: '16px' }}>
              <button
                onClick={handleRetryConnection}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Retry Connection
              </button>
              <button
                onClick={handleTestInspector}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#9c27b0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  marginLeft: '8px'
                }}
              >
                Test Inspector
              </button>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};