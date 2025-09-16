import React, { useState, useEffect, useCallback } from 'react';
import { createActor } from 'xstate';
import { whiteboardMachine } from '../whiteboard-machine';
import { WhiteboardCanvas } from './WhiteboardCanvas';
import { Toolbar } from './Toolbar';

export const App: React.FC = () => {
  const [actor] = useState(() => createActor(whiteboardMachine));
  const [state, setState] = useState(() => actor.getSnapshot());
  const [canvasSize, setCanvasSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight - 120 // Account for toolbar
  });

  // Initialize the actor and subscribe to state changes
  useEffect(() => {
    console.log('🎨 Whiteboard app starting - initializing state machine');
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
    });

    return () => {
      console.log('🎨 Whiteboard app stopping');
      subscription.unsubscribe();
      actor.stop();
    };
  }, [actor]);

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

    // Then join the session
    actor.send({
      type: 'JOIN_SESSION',
      userId,
      userName
    });
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
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <Toolbar context={state.context} send={send} />

      {/* Canvas */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <WhiteboardCanvas
          context={state.context}
          send={send}
          width={canvasSize.width}
          height={canvasSize.height}
        />
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