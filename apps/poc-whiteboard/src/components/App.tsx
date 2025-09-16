import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { createActor } from 'xstate';
import { whiteboardMachine } from '../whiteboard-machine';
import { WhiteboardCanvas } from './WhiteboardCanvas';
import { Toolbar } from './Toolbar';
import { getInspectorService } from '../services/inspector-service';
import { getEventLogService, logNostrEvent } from '../services/event-log-service';
import { getTimeTravelService } from '../services/time-travel-service';
import { NSM_PROTOCOL } from '@nsm/core';
import type { INostrEvent } from '@nsm/core';

// Lazy load developer-only components
const DeveloperDashboard = lazy(() => import('./DeveloperDashboard').then(module => ({ default: module.DeveloperDashboard })));

// Helper function to create mock Nostr events for demonstration
const createMockNostrEvent = (overrides: Partial<INostrEvent> = {}): INostrEvent => {
  return {
    id: 'mock-' + Math.random().toString(36).substring(2, 15),
    pubkey: 'npub' + Math.random().toString(36).substring(2, 32),
    created_at: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 3600), // Random time in last hour
    kind: NSM_PROTOCOL.DEFINITION_KIND,
    tags: [],
    content: 'Mock event content',
    sig: 'mock-signature-' + Math.random().toString(36).substring(2, 32),
    ...overrides
  };
};

export const App: React.FC = () => {
  const [actor] = useState(() => createActor(whiteboardMachine));
  const [state, setState] = useState(() => actor.getSnapshot());
  const [canvasSize, setCanvasSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight - 120 // Account for toolbar
  });
  const [inspectorConnected, setInspectorConnected] = useState(false);
  const [showDashboard, setShowDashboard] = useState(true);
  const [eventLogService] = useState(() => getEventLogService({
    maxEvents: 500,
    enableRealtime: true,
    autoStart: true
  }));
  const [timeTravelService] = useState(() => getTimeTravelService({
    maxSnapshots: 100,
    enableRealtime: true,
    autoCapture: true,
    devOnly: true
  }));
  const [inspectorService] = useState(() => getInspectorService({
    autoStart: true,
    devOnly: true
  }));

  // Initialize the actor and subscribe to state changes
  useEffect(() => {
    console.log('🎨 Whiteboard app starting - initializing state machine');

    // Initialize developer tools in development
    if (process.env.NODE_ENV === 'development') {
      // Connect and register the actor for inspection
      inspectorService.connect().then((connected) => {
        if (connected) {
          inspectorService.registerActor(actor, 'whiteboard-machine');
          console.log('🔍 XState Inspector connected - machine visualization available');
          setInspectorConnected(true);
        } else {
          console.log('🔍 XState Inspector failed to connect - visualization not available');
          setInspectorConnected(false);
        }
      }).catch(() => {
        setInspectorConnected(false);
      });

      // Initialize Time Travel Service
      timeTravelService.connect();
      const registered = timeTravelService.registerActor(actor, 'whiteboard-machine');
      if (registered) {
        console.log('🕰️ Time Travel Service initialized - time travel debugging available');
      }
    }

    actor.start();

    const subscription = actor.subscribe((snapshot) => {
      console.log('🔄 Whiteboard state update:', snapshot.value, snapshot.context);
      setState(snapshot);

      // Set up collaboration service callback when it's initialized
      if (snapshot.context.collaborationService) {
        snapshot.context.collaborationService.setEventCallback((event) => {
          console.log('📡 Received remote event:', event);
          actor.send(event);
        });
      }

      // Set up real-time collaboration event listeners when it's initialized
      if (snapshot.context.realTimeCollaborationService) {
        const rtService = snapshot.context.realTimeCollaborationService;

        // Listen for cursor updates
        rtService.onCursorUpdate((event) => {
          console.log('👆 Cursor update:', event);
          actor.send({
            type: 'UPDATE_REMOTE_CURSOR',
            userId: event.userId,
            position: event.position
          });
        });

        // Listen for live drawing events
        rtService.onLiveDrawingUpdate((event) => {
          console.log('✏️ Live drawing update:', event);
          actor.send({
            type: event.type === 'LIVE_DRAWING_START' ? 'START_LIVE_DRAWING' : 'END_LIVE_DRAWING',
            userId: event.userId,
            drawingId: event.drawingId
          });
        });

        // Listen for participant updates
        rtService.onParticipantUpdate((event) => {
          console.log('👥 Participant update:', event);
          actor.send({
            type: event.type === 'PARTICIPANT_JOINED' ? 'PARTICIPANT_JOINED' : 'PARTICIPANT_LEFT',
            userId: event.userId,
            userName: event.userName
          });
        });
      }
    });

    return () => {
      console.log('🎨 Whiteboard app stopping');
      subscription.unsubscribe();
      actor.stop();

      // Cleanup developer tools
      if (process.env.NODE_ENV === 'development') {
        timeTravelService.disconnect();
      }
    };
  }, [actor, inspectorService, timeTravelService]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const newSize = {
        width: window.innerWidth,
        height: window.innerHeight - 120
      };
      setCanvasSize(newSize);
      actor.send({
        type: 'RESIZE_CANVAS',
        size: newSize
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [actor]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default browser shortcuts that might interfere
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              actor.send({ type: 'REDO' });
            } else {
              actor.send({ type: 'UNDO' });
            }
            break;
          case 'y':
            e.preventDefault();
            actor.send({ type: 'REDO' });
            break;
          case 'a':
            e.preventDefault();
            // Could implement select all in future
            break;
        }
      }

      // Tool shortcuts
      switch (e.key) {
        case '1':
          e.preventDefault();
          actor.send({ type: 'SELECT_TOOL', tool: 'pen' });
          break;
        case '2':
          e.preventDefault();
          actor.send({ type: 'SELECT_TOOL', tool: 'brush' });
          break;
        case '3':
          e.preventDefault();
          actor.send({ type: 'SELECT_TOOL', tool: 'eraser' });
          break;
        case '4':
          e.preventDefault();
          actor.send({ type: 'SELECT_TOOL', tool: 'shape' });
          break;
        case 'Escape':
          e.preventDefault();
          actor.send({ type: 'DESELECT_ALL' });
          break;
        case 'Delete':
        case 'Backspace':
          if (state.context.selectedObjects.length > 0) {
            e.preventDefault();
            actor.send({ type: 'DELETE_SELECTED' });
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actor, state.context.selectedObjects.length]);

  // Initialize collaboration and join session on mount
  useEffect(() => {
    const userId = `user_${Math.random().toString(36).substr(2, 9)}`;
    const userName = `User ${userId.slice(-4)}`;

    // Initialize collaboration service first
    actor.send({
      type: 'INITIALIZE_COLLABORATION',
      userId,
      userName
    });

    // Initialize real-time collaboration features
    actor.send({
      type: 'INITIALIZE_REALTIME_COLLABORATION'
    });

    // Then join the session
    actor.send({
      type: 'JOIN_SESSION',
      userId,
      userName
    });

    // Add the user as a participant
    actor.send({
      type: 'PARTICIPANT_JOINED',
      userId,
      userName
    });

    // Add some demo NSM events for the event log
    if (process.env.NODE_ENV === 'development') {
      // NSM Definition event
      logNostrEvent(createMockNostrEvent({
        kind: NSM_PROTOCOL.DEFINITION_KIND,
        content: JSON.stringify({
          type: 'whiteboard',
          definition: {
            states: ['idle', 'drawing', 'selecting'],
            events: ['START_DRAWING', 'END_DRAWING', 'SELECT_TOOL']
          }
        })
      }));

      // NSM State Update event
      logNostrEvent(createMockNostrEvent({
        kind: NSM_PROTOCOL.STATE_UPDATE_KIND,
        content: JSON.stringify({
          state: 'idle',
          previousState: 'drawing',
          timestamp: Date.now()
        })
      }));

      // NSM Interaction events
      logNostrEvent(createMockNostrEvent({
        kind: NSM_PROTOCOL.INTERACTION_KIND_MIN + 100, // 7100
        content: JSON.stringify({
          action: 'startDrawing',
          tool: 'pen',
          coordinates: { x: 150, y: 200 },
          userId: userId
        })
      }));

      logNostrEvent(createMockNostrEvent({
        kind: NSM_PROTOCOL.INTERACTION_KIND_MIN + 200, // 7200
        content: JSON.stringify({
          action: 'endDrawing',
          pathId: 'path-' + Math.random().toString(36).substring(2, 9),
          userId: userId
        })
      }));
    }
  }, [actor]);

  const send = useCallback((event: any) => {
    actor.send(event);
  }, [actor]);

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 24px',
        backgroundColor: '#1976d2',
        color: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
            NSM Collaborative Whiteboard
          </h1>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '14px' }}>
            <span>State: {String(state.value)}</span>
            <span>Objects: {state.context.paths.length + state.context.shapes.length}</span>
            <span>Selected: {state.context.selectedObjects.length}</span>
            {state.context.collaborators.length > 0 && (
              <span>Collaborators: {state.context.collaborators.length}</span>
            )}
            {process.env.NODE_ENV === 'development' && (
              <>
                <span style={{
                  color: inspectorConnected ? '#4caf50' : '#ff9800',
                  fontWeight: 'bold'
                }}>
                  🔍 Inspector: {inspectorConnected ? 'Connected' : 'Disconnected'}
                </span>
                <button
                  onClick={() => setShowDashboard(!showDashboard)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: showDashboard ? '#4caf50' : 'transparent',
                    color: 'white',
                    border: '1px solid white',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  🔧 Developer Dashboard
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <Toolbar context={state.context} send={send} />

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Canvas */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <WhiteboardCanvas
            context={state.context}
            send={send}
            width={showDashboard ? canvasSize.width * 0.6 : canvasSize.width}
            height={canvasSize.height}
          />
        </div>

        {/* Developer Dashboard */}
        {showDashboard && process.env.NODE_ENV === 'development' && (
          <Suspense fallback={
            <div style={{
              width: '40%',
              padding: '16px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#f8f9fa',
              borderLeft: '1px solid #dee2e6'
            }}>
              <div style={{
                textAlign: 'center',
                color: '#6c757d'
              }}>
                <div style={{ marginBottom: '8px' }}>⚡</div>
                <div>Loading Developer Dashboard...</div>
              </div>
            </div>
          }>
            <DeveloperDashboard
              eventLogService={eventLogService}
              timeTravelService={timeTravelService}
              inspectorService={inspectorService}
            />
          </Suspense>
        )}
      </div>

      {/* Footer with keyboard shortcuts */}
      <footer style={{
        padding: '8px 24px',
        backgroundColor: '#f8f9fa',
        borderTop: '1px solid #dee2e6',
        fontSize: '12px',
        color: '#6c757d'
      }}>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <span><strong>Shortcuts:</strong></span>
          <span>1-4: Tools</span>
          <span>Ctrl/Cmd+Z: Undo</span>
          <span>Ctrl/Cmd+Y: Redo</span>
          <span>Del: Delete Selected</span>
          <span>Esc: Deselect</span>
        </div>
      </footer>
    </div>
  );
};