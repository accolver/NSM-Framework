# XState Inspector Integration

This whiteboard application includes XState inspector integration for visualizing state machine behavior in development.

## Features

- **Live State Visualization**: See the current state of the whiteboard state machine
- **State Transitions**: Monitor state changes as you interact with the whiteboard
- **Event Logging**: Track all events sent to the state machine
- **Context Inspection**: Examine the current context values (paths, shapes, collaborators, etc.)

## Setup

The inspector is automatically configured for development mode. You'll see the inspector status in the header when running in development.

### Prerequisites

1. Make sure you're running the app in development mode:
   ```bash
   bun run dev
   ```

2. The inspector will attempt to connect to the default WebSocket endpoint (ws://localhost:8080)

### Using the Inspector

1. **Automatic Connection**: The inspector service automatically attempts to connect when the app starts in development mode

2. **Status Indicator**: Look for the "Inspector: Connected/Disconnected" status in the header

3. **State Machine Registration**: The whiteboard machine is automatically registered as 'whiteboard-machine'

### Manual Inspector Setup (Optional)

If you want to use the XState Inspector standalone:

1. Install the XState Inspector globally:
   ```bash
   npm install -g @statelyai/inspect
   ```

2. Start the inspector server:
   ```bash
   xstate-inspect
   ```

3. Open http://localhost:8080 in your browser

4. The whiteboard app will automatically connect and you'll see the state machine visualization

## Inspector Features

### State Visualization
- See the current state (idle, drawing, shaping, selected)
- Monitor state transitions in real-time
- Understand the state machine structure

### Context Inspection
- **Drawing State**: currentTool, isDrawing, currentPath/Shape
- **Canvas Objects**: paths, shapes, selectedObjects
- **Collaboration**: collaborators, userId, userName
- **History**: history entries, historyIndex for undo/redo
- **Canvas State**: canvasSize, zoom, pan

### Event Tracking
- **Drawing Events**: START_DRAWING, CONTINUE_DRAWING, END_DRAWING
- **Tool Events**: SELECT_TOOL, SELECT_SHAPE, SET_STYLE
- **Object Events**: SELECT_OBJECT, DELETE_SELECTED, MOVE_OBJECTS
- **Canvas Events**: CLEAR_CANVAS, ZOOM, PAN, RESIZE_CANVAS
- **History Events**: UNDO, REDO
- **Collaboration Events**: All collaboration-related events

## Development Workflow

1. Start the whiteboard app: `bun run dev`
2. Check the inspector status in the header
3. Interact with the whiteboard (draw, select tools, etc.)
4. Observer state changes in real-time
5. Use for debugging state machine logic

## Configuration

The inspector service can be configured via the `InspectorConfig`:

```typescript
{
  url: 'ws://localhost:8080',     // WebSocket URL
  autoStart: true,               // Auto-connect on creation
  maxBufferSize: 1000,          // Event buffer size
  devOnly: true                 // Only enable in development
}
```

## Troubleshooting

### Inspector Not Connected
- Ensure you're running in development mode
- Check that no other application is using port 8080
- Look for WebSocket connection errors in the console

### State Machine Not Visible
- Verify the actor registration succeeded
- Check that the inspector service connected properly
- Ensure the WebSocket server is running

### Performance Issues
- Reduce the `maxBufferSize` if experiencing lag
- The inspector automatically disables in production mode
- Consider disconnecting the inspector if not needed

## Production Considerations

- The inspector is automatically disabled in production builds
- No performance impact in production environments
- WebSocket connections are not attempted in production mode

## API Reference

See `src/services/inspector-service.ts` for the complete API documentation.