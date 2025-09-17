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
  console.log('🎨 App component rendering - START');

  const [actor] = useState(() => {
    console.log('🎨 Creating XState actor');

    // Create actor without inspection first - we'll connect inspector later
    const newActor = createActor(whiteboardMachine);
    console.log('🎨 Actor created with sessionId:', newActor.sessionId);

    return newActor;
  });

  const [state, setState] = useState(() => {
    console.log('🎨 Getting initial state snapshot');
    return actor.getSnapshot();
  });

  const [canvasSize, setCanvasSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight - 120 // Account for toolbar
  });
  const [inspectorConnected, setInspectorConnected] = useState(false);
  const [showDashboard, setShowDashboard] = useState(true);

  // Initialize services with error handling and debugging
  const [eventLogService] = useState(() => {
    console.log('🎨 Initializing EventLogService');
    try {
      return getEventLogService({
        maxEvents: 500,
        enableRealtime: true,
        autoStart: true
      });
    } catch (error) {
      console.error('🚨 Failed to initialize EventLogService:', error);
      throw error;
    }
  });

  const [timeTravelService] = useState(() => {
    console.log('🎨 Initializing TimeTravelService');
    try {
      return getTimeTravelService({
        maxSnapshots: 100,
        enableRealtime: true,
        autoCapture: true,
        devOnly: true
      });
    } catch (error) {
      console.error('🚨 Failed to initialize TimeTravelService:', error);
      throw error;
    }
  });

  const [inspectorService] = useState(() => {
    console.log('🎨 Initializing InspectorService');
    try {
      return getInspectorService({
        autoStart: false, // Change to false to prevent blocking
        devOnly: true
      });
    } catch (error) {
      console.error('🚨 Failed to initialize InspectorService:', error);
      throw error;
    }
  });

  // Initialize the actor and subscribe to state changes
  useEffect(() => {
    console.log('🎨 Main useEffect starting - initializing state machine');

    let subscriptionRef: any = null;
    let isDestroyed = false;

    const initializeApp = async () => {
      try {
        console.log('🎨 Starting actor...');
        actor.start();
        console.log('✅ Actor started successfully');

        // Initialize developer tools in development - but don't block
        if (process.env.NODE_ENV === 'development') {
          console.log('🎨 Initializing dev tools (non-blocking)...');

          // Connect inspector asynchronously without blocking
          setTimeout(async () => {
            try {
              console.log('🔍 Attempting inspector connection...');
              const connected = await inspectorService.connect();
              if (connected) {
                // Wait a moment for the inspector to fully initialize
                setTimeout(() => {
                  try {
                    inspectorService.registerActor(actor, 'whiteboard-machine');
                    console.log('🔍 XState Inspector connected - machine visualization available');
                    console.log('🔍 Check your browser for a popup window or visit https://stately.ai/viz');
                    if (!isDestroyed) setInspectorConnected(true);
                  } catch (regError) {
                    console.warn('🔍 Inspector registration error:', regError);
                    if (!isDestroyed) setInspectorConnected(false);
                  }
                }, 500);
              } else {
                console.log('🔍 XState Inspector failed to connect - visualization not available');
                if (!isDestroyed) setInspectorConnected(false);
              }
            } catch (error) {
              console.warn('🔍 Inspector connection error:', error);
              if (!isDestroyed) setInspectorConnected(false);
            }
          }, 100);

          // Initialize Time Travel Service asynchronously
          setTimeout(() => {
            try {
              console.log('🕰️ Connecting time travel service...');
              timeTravelService.connect();
              const registered = timeTravelService.registerActor(actor, 'whiteboard-machine');
              if (registered) {
                console.log('🕰️ Time Travel Service initialized - time travel debugging available');
              }
            } catch (error) {
              console.warn('🕰️ Time travel service error:', error);
            }
          }, 200);
        }

        // Set up subscription
        console.log('🎨 Setting up actor subscription...');
        subscriptionRef = actor.subscribe((snapshot) => {
          console.log('🔄 Whiteboard state update:', snapshot.value);

          // Log state machine events to EventLogService for real-time updates
          try {
            if (snapshot.value !== state.value || snapshot.context !== state.context) {
              // Create a state update event for the event log
              const stateEvent = createMockNostrEvent({
                kind: NSM_PROTOCOL.STATE_UPDATE_KIND,
                content: JSON.stringify({
                  state: snapshot.value,
                  previousState: state.value,
                  context: {
                    currentTool: snapshot.context.currentTool,
                    isDrawing: snapshot.context.isDrawing,
                    pathsCount: snapshot.context.paths.length,
                    shapesCount: snapshot.context.shapes.length,
                    selectedObjects: snapshot.context.selectedObjects.length
                  },
                  timestamp: Date.now()
                })
              });

              logNostrEvent(stateEvent);
              console.log('📝 Logged state change event to EventLogService');
            }
          } catch (error) {
            console.warn('⚠️ Error logging state change:', error);
          }

          // Prevent potential infinite loop by checking if state actually changed
          setState(prevState => {
            if (prevState.value === snapshot.value &&
                prevState.context === snapshot.context) {
              return prevState; // No change, prevent re-render
            }
            return snapshot;
          });

          // CRITICAL FIX: Only set up event callbacks once, not on every state change
          // This was likely causing infinite loops
          if (snapshot.context.collaborationService && !snapshot.context.collaborationService._callbackSet) {
            console.log('📡 Setting up collaboration service callback (once)');
            snapshot.context.collaborationService.setEventCallback((event) => {
              console.log('📡 Received remote event:', event);
              // Use setTimeout to break potential infinite loop
              setTimeout(() => actor.send(event), 0);
            });
            // Mark callback as set
            snapshot.context.collaborationService._callbackSet = true;
          }

          // CRITICAL FIX: Same for real-time collaboration - set up once only
          if (snapshot.context.realTimeCollaborationService && !snapshot.context.realTimeCollaborationService._listenersSet) {
            console.log('⚡ Setting up real-time collaboration listeners (once)');
            const rtService = snapshot.context.realTimeCollaborationService;

            // Listen for cursor updates
            rtService.onCursorUpdate((event) => {
              console.log('👆 Cursor update:', event);
              setTimeout(() => actor.send({
                type: 'UPDATE_REMOTE_CURSOR',
                userId: event.userId,
                position: event.position
              }), 0);
            });

            // Listen for live drawing events
            rtService.onLiveDrawingUpdate((event) => {
              console.log('✏️ Live drawing update:', event);
              setTimeout(() => actor.send({
                type: event.type === 'LIVE_DRAWING_START' ? 'START_LIVE_DRAWING' : 'END_LIVE_DRAWING',
                userId: event.userId,
                drawingId: event.drawingId
              }), 0);
            });

            // Listen for participant updates
            rtService.onParticipantUpdate((event) => {
              console.log('👥 Participant update:', event);
              setTimeout(() => actor.send({
                type: event.type === 'PARTICIPANT_JOINED' ? 'PARTICIPANT_JOINED' : 'PARTICIPANT_LEFT',
                userId: event.userId,
                userName: event.userName
              }), 0);
            });

            // Mark listeners as set
            rtService._listenersSet = true;
          }
        });
        console.log('✅ Actor subscription set up successfully');

      } catch (error) {
        console.error('🚨 Error during app initialization:', error);
      }
    };

    // Start initialization
    initializeApp();

    return () => {
      console.log('🎨 Whiteboard app cleanup starting');
      isDestroyed = true;

      if (subscriptionRef) {
        console.log('🎨 Unsubscribing from actor');
        subscriptionRef.unsubscribe();
      }

      console.log('🎨 Stopping actor');
      actor.stop();

      // Cleanup developer tools
      if (process.env.NODE_ENV === 'development') {
        console.log('🎨 Disconnecting dev tools');
        timeTravelService.disconnect();
      }
      console.log('✅ Whiteboard app cleanup complete');
    };
  }, []); // Remove dependencies that could cause re-execution

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
    console.log('🎨 Collaboration initialization useEffect starting...');

    // Use setTimeout to ensure this runs after main initialization
    const initTimeout = setTimeout(() => {
      try {
        const userId = `user_${Math.random().toString(36).substr(2, 9)}`;
        const userName = `User ${userId.slice(-4)}`;

        console.log('🤝 Initializing collaboration for user:', userId);

        // Initialize collaboration service first
        console.log('🤝 Sending INITIALIZE_COLLABORATION');
        actor.send({
          type: 'INITIALIZE_COLLABORATION',
          userId,
          userName
        });

        // Small delay between initializations to prevent race conditions
        setTimeout(() => {
          console.log('⚡ Sending INITIALIZE_REALTIME_COLLABORATION');
          actor.send({
            type: 'INITIALIZE_REALTIME_COLLABORATION'
          });

          setTimeout(() => {
            console.log('🤝 Sending JOIN_SESSION');
            actor.send({
              type: 'JOIN_SESSION',
              userId,
              userName
            });

            setTimeout(() => {
              console.log('👥 Sending PARTICIPANT_JOINED');
              actor.send({
                type: 'PARTICIPANT_JOINED',
                userId,
                userName
              });

              // Add demo NSM events after everything is set up
              if (process.env.NODE_ENV === 'development') {
                console.log('📝 Adding demo NSM events...');
                try {
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

                  console.log('✅ Demo NSM events added successfully');
                } catch (error) {
                  console.warn('⚠️ Error adding demo NSM events:', error);
                }
              }
            }, 50); // PARTICIPANT_JOINED
          }, 50); // JOIN_SESSION
        }, 50); // INITIALIZE_REALTIME_COLLABORATION
      } catch (error) {
        console.error('🚨 Error during collaboration initialization:', error);
      }
    }, 500); // Wait for main initialization

    return () => {
      clearTimeout(initTimeout);
    };
  }, []); // Remove actor dependency to prevent re-execution

  const send = useCallback((event: any) => {
    actor.send(event);
  }, [actor]);

  console.log('🎨 App component rendering - RENDER phase, state:', state.value);

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