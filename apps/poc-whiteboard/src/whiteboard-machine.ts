import { createMachine, assign } from 'xstate';
import { CollaborationService, createCollaborationService } from './services/collaboration';
import { RealTimeCollaborationService, createRealTimeCollaborationService, CursorPosition } from './services/realtime-collaboration';

// Types for Whiteboard application
export type DrawingTool = 'pen' | 'brush' | 'eraser' | 'shape';
export type ShapeType = 'rectangle' | 'circle' | 'line' | 'arrow';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
  timestamp: number;
}

export interface DrawingPath {
  id: string;
  tool: DrawingTool;
  points: Point[];
  style: {
    color: string;
    width: number;
    opacity: number;
  };
  timestamp: number;
  userId?: string;
}

export interface Shape {
  id: string;
  type: ShapeType;
  startPoint: Point;
  endPoint: Point;
  style: {
    color: string;
    width: number;
    opacity: number;
    fill?: string;
  };
  timestamp: number;
  userId?: string;
}

export interface Collaborator {
  id: string;
  name: string;
  cursor?: Point;
  color: string;
  lastSeen: number;
}

export interface WhiteboardContext {
  // Drawing state
  currentTool: DrawingTool;
  currentShapeType: ShapeType;
  isDrawing: boolean;
  currentPath: DrawingPath | null;
  currentShape: Shape | null;

  // Canvas objects
  paths: DrawingPath[];
  shapes: Shape[];
  selectedObjects: string[];

  // Style settings
  currentStyle: {
    color: string;
    width: number;
    opacity: number;
    fill?: string;
  };

  // Collaboration
  collaborators: Collaborator[];
  userId: string;
  userName: string;
  collaborationService: CollaborationService | null;
  realTimeCollaborationService: RealTimeCollaborationService | null;

  // Canvas state
  canvasSize: { width: number; height: number };
  zoom: number;
  pan: { x: number; y: number };

  // Undo/Redo
  history: Array<{
    paths: DrawingPath[];
    shapes: Shape[];
    timestamp: number;
  }>;
  historyIndex: number;
}

export type WhiteboardEvent =
  // Drawing events
  | { type: 'START_DRAWING'; point: Point }
  | { type: 'CONTINUE_DRAWING'; point: Point }
  | { type: 'END_DRAWING' }
  | { type: 'CANCEL_DRAWING' }

  // Tool events
  | { type: 'SELECT_TOOL'; tool: DrawingTool }
  | { type: 'SELECT_SHAPE'; shapeType: ShapeType }
  | { type: 'SET_STYLE'; style: Partial<WhiteboardContext['currentStyle']> }

  // Object manipulation
  | { type: 'SELECT_OBJECT'; objectId: string; multiSelect?: boolean }
  | { type: 'DESELECT_ALL' }
  | { type: 'DELETE_SELECTED' }
  | { type: 'MOVE_OBJECTS'; delta: { x: number; y: number } }

  // Canvas operations
  | { type: 'CLEAR_CANVAS' }
  | { type: 'ZOOM'; factor: number; center?: Point }
  | { type: 'PAN'; delta: { x: number; y: number } }
  | { type: 'RESIZE_CANVAS'; size: { width: number; height: number } }

  // History
  | { type: 'UNDO' }
  | { type: 'REDO' }

  // Collaboration
  | { type: 'JOIN_SESSION'; userId: string; userName: string }
  | { type: 'LEAVE_SESSION'; userId: string }
  | { type: 'UPDATE_CURSOR'; userId: string; cursor: Point }
  | { type: 'RECEIVE_REMOTE_OBJECT'; object: DrawingPath | Shape }
  | { type: 'RECEIVE_REMOTE_DELETE'; objectIds: string[] }
  | { type: 'INITIALIZE_COLLABORATION'; userId: string; userName: string }
  | { type: 'SYNC_STATE'; remoteUpdate: Uint8Array }
  | { type: 'REQUEST_SYNC' }

  // Real-time collaboration events
  | { type: 'INITIALIZE_REALTIME_COLLABORATION' }
  | { type: 'UPDATE_REMOTE_CURSOR'; userId: string; position: CursorPosition }
  // Live drawing events removed - handled by collaboration service directly to prevent infinite loops
  // | { type: 'START_LIVE_DRAWING'; userId: string; drawingId: string }
  // | { type: 'END_LIVE_DRAWING'; userId: string }
  // Participant events removed - handled by collaboration service directly
  // | { type: 'PARTICIPANT_JOINED'; userId: string; userName: string }
  // | { type: 'PARTICIPANT_LEFT'; userId: string };

// Helper functions
const generateId = () => Math.random().toString(36).substr(2, 9);

const createPath = (context: WhiteboardContext, point: Point): DrawingPath => ({
  id: generateId(),
  tool: context.currentTool,
  points: [point],
  style: { ...context.currentStyle },
  timestamp: Date.now(),
  userId: context.userId
});

const createShape = (context: WhiteboardContext, startPoint: Point): Shape => ({
  id: generateId(),
  type: context.currentShapeType,
  startPoint,
  endPoint: startPoint,
  style: { ...context.currentStyle },
  timestamp: Date.now(),
  userId: context.userId
});

const saveToHistory = (context: WhiteboardContext) => {
  const newHistoryEntry = {
    paths: [...context.paths],
    shapes: [...context.shapes],
    timestamp: Date.now()
  };

  // Remove any history after current index (when undoing and then making new changes)
  const newHistory = context.history.slice(0, context.historyIndex + 1);
  newHistory.push(newHistoryEntry);

  // Limit history size to 50 entries
  if (newHistory.length > 50) {
    newHistory.shift();
  }

  return {
    history: newHistory,
    historyIndex: newHistory.length - 1
  };
};

// Actions
const startDrawing = assign({
  isDrawing: true,
  currentPath: ({ context, event }) => {
    if (event.type === 'START_DRAWING') {
      return context.currentTool === 'shape' ? null : createPath(context, event.point);
    }
    return context.currentPath;
  },
  currentShape: ({ context, event }) => {
    if (event.type === 'START_DRAWING') {
      return context.currentTool === 'shape' ? createShape(context, event.point) : null;
    }
    return context.currentShape;
  }
});

const continueDrawing = assign({
  currentPath: ({ context, event }) => {
    if (event.type === 'CONTINUE_DRAWING' && context.currentPath) {
      return {
        ...context.currentPath,
        points: [...context.currentPath.points, event.point]
      };
    }
    return context.currentPath;
  },
  currentShape: ({ context, event }) => {
    if (event.type === 'CONTINUE_DRAWING' && context.currentShape) {
      return {
        ...context.currentShape,
        endPoint: event.point
      };
    }
    return context.currentShape;
  }
});

const endDrawing = assign(({ context }) => {
  const newPaths = context.currentPath
    ? [...context.paths, context.currentPath]
    : context.paths;

  const newShapes = context.currentShape
    ? [...context.shapes, context.currentShape]
    : context.shapes;

  // Create new context for history calculation
  const newContext = {
    ...context,
    paths: newPaths,
    shapes: newShapes,
    currentPath: null,
    currentShape: null,
    isDrawing: false
  };

  const historyUpdate = saveToHistory(newContext);

  // Sync with collaboration service
  if (context.currentPath && context.collaborationService) {
    context.collaborationService.addPath(context.currentPath);
  }
  if (context.currentShape && context.collaborationService) {
    context.collaborationService.addShape(context.currentShape);
  }

  return {
    isDrawing: false,
    paths: newPaths,
    shapes: newShapes,
    currentPath: null,
    currentShape: null,
    ...historyUpdate
  };
});

const cancelDrawing = assign({
  isDrawing: false,
  currentPath: null,
  currentShape: null
});

const selectTool = assign({
  currentTool: ({ event }) => event.type === 'SELECT_TOOL' ? event.tool : 'pen'
});

const selectShape = assign({
  currentShapeType: ({ event }) => event.type === 'SELECT_SHAPE' ? event.shapeType : 'rectangle'
});

const setStyle = assign({
  currentStyle: ({ context, event }) => {
    if (event.type === 'SET_STYLE') {
      return { ...context.currentStyle, ...event.style };
    }
    return context.currentStyle;
  }
});

const selectObject = assign({
  selectedObjects: ({ context, event }) => {
    if (event.type === 'SELECT_OBJECT') {
      if (event.multiSelect) {
        return context.selectedObjects.includes(event.objectId)
          ? context.selectedObjects.filter(id => id !== event.objectId)
          : [...context.selectedObjects, event.objectId];
      } else {
        return [event.objectId];
      }
    }
    return context.selectedObjects;
  }
});

const deselectAll = assign({
  selectedObjects: []
});

const deleteSelected = assign(({ context }) => {
  const newPaths = context.paths.filter(path => !context.selectedObjects.includes(path.id));
  const newShapes = context.shapes.filter(shape => !context.selectedObjects.includes(shape.id));

  const newContext = {
    ...context,
    paths: newPaths,
    shapes: newShapes,
    selectedObjects: []
  };

  const historyUpdate = saveToHistory(newContext);

  return {
    paths: newPaths,
    shapes: newShapes,
    selectedObjects: [],
    ...historyUpdate
  };
});

const clearCanvas = assign(({ context }) => {
  const historyUpdate = saveToHistory(context);
  return {
    paths: [],
    shapes: [],
    selectedObjects: [],
    currentPath: null,
    currentShape: null,
    isDrawing: false,
    ...historyUpdate
  };
});

const undo = assign({
  historyIndex: ({ context }) => Math.max(0, context.historyIndex - 1),
  paths: ({ context }) => {
    const targetIndex = Math.max(0, context.historyIndex - 1);
    return context.history[targetIndex]?.paths || [];
  },
  shapes: ({ context }) => {
    const targetIndex = Math.max(0, context.historyIndex - 1);
    return context.history[targetIndex]?.shapes || [];
  },
  selectedObjects: []
});

const redo = assign({
  historyIndex: ({ context }) => Math.min(context.history.length - 1, context.historyIndex + 1),
  paths: ({ context }) => {
    const targetIndex = Math.min(context.history.length - 1, context.historyIndex + 1);
    return context.history[targetIndex]?.paths || context.paths;
  },
  shapes: ({ context }) => {
    const targetIndex = Math.min(context.history.length - 1, context.historyIndex + 1);
    return context.history[targetIndex]?.shapes || context.shapes;
  },
  selectedObjects: []
});

const joinSession = assign({
  userId: ({ event }) => event.type === 'JOIN_SESSION' ? event.userId : '',
  userName: ({ event }) => event.type === 'JOIN_SESSION' ? event.userName : '',
  realTimeCollaborationService: ({ context, event }) => {
    // CRITICAL FIX: Automatically add current user silently when joining session
    if (event.type === 'JOIN_SESSION' && context.realTimeCollaborationService) {
      context.realTimeCollaborationService.addParticipantSilent(event.userId, event.userName);
    }
    return context.realTimeCollaborationService;
  }
});

const updateCollaborators = assign({
  collaborators: ({ context, event }) => {
    if (event.type === 'UPDATE_CURSOR') {
      const existing = context.collaborators.find(c => c.id === event.userId);
      if (existing) {
        return context.collaborators.map(c =>
          c.id === event.userId
            ? { ...c, cursor: event.cursor, lastSeen: Date.now() }
            : c
        );
      } else {
        return [...context.collaborators, {
          id: event.userId,
          name: `User ${event.userId.slice(0, 4)}`,
          cursor: event.cursor,
          color: `hsl(${Math.random() * 360}, 70%, 50%)`,
          lastSeen: Date.now()
        }];
      }
    }
    return context.collaborators;
  }
});

const initializeCollaboration = assign({
  userId: ({ event }) => event.type === 'INITIALIZE_COLLABORATION' ? event.userId : '',
  userName: ({ event }) => event.type === 'INITIALIZE_COLLABORATION' ? event.userName : '',
  collaborationService: ({ context, event }) => {
    if (event.type === 'INITIALIZE_COLLABORATION') {
      const service = createCollaborationService(event.userId);
      service.initialize(context);
      return service;
    }
    return context.collaborationService;
  }
});

// Real-time collaboration actions
const initializeRealTimeCollaboration = assign({
  realTimeCollaborationService: ({ context }) => {
    if (context.collaborationService) {
      const eventCallback = (event: any) => {
        console.log('Real-time collaboration event:', event);
        // This will be handled by the React component
      };
      return createRealTimeCollaborationService(context.collaborationService, eventCallback);
    }
    return context.realTimeCollaborationService;
  }
});

const updateRemoteCursor = assign({
  collaborators: ({ context, event }) => {
    if (event.type === 'UPDATE_REMOTE_CURSOR' && context.realTimeCollaborationService) {
      context.realTimeCollaborationService.updateCursorPosition(event.userId, event.position);

      // Update collaborators array for display
      const existingIndex = context.collaborators.findIndex(c => c.id === event.userId);
      const updatedCollaborators = [...context.collaborators];

      if (existingIndex >= 0) {
        updatedCollaborators[existingIndex] = {
          ...updatedCollaborators[existingIndex],
          cursor: { x: event.position.x, y: event.position.y, timestamp: Date.now() },
          lastSeen: Date.now()
        };
      }

      return updatedCollaborators;
    }
    return context.collaborators;
  }
});

// REMOVED: Live drawing actions no longer needed
// Live drawing management is handled directly by the canvas component to prevent infinite loops
// The collaboration service is called directly from WhiteboardCanvas, not through state machine events

// REMOVED: Participant actions no longer needed
// Participant management is handled directly by the collaboration service
// when JOIN_SESSION is called (via addParticipantSilent in joinSession action)

const receiveRemoteObject = assign({
  paths: ({ context, event }) => {
    if (event.type === 'RECEIVE_REMOTE_OBJECT' && 'tool' in event.object) {
      // It's a DrawingPath
      const path = event.object as DrawingPath;
      // Check if we already have this object to avoid duplicates
      if (!context.paths.find(p => p.id === path.id)) {
        return [...context.paths, path];
      }
    }
    return context.paths;
  },
  shapes: ({ context, event }) => {
    if (event.type === 'RECEIVE_REMOTE_OBJECT' && 'type' in event.object) {
      // It's a Shape
      const shape = event.object as Shape;
      // Check if we already have this object to avoid duplicates
      if (!context.shapes.find(s => s.id === shape.id)) {
        return [...context.shapes, shape];
      }
    }
    return context.shapes;
  }
});

const syncCollaborationState = assign({
  paths: ({ context, event }) => {
    if (event.type === 'SYNC_STATE' && context.collaborationService) {
      context.collaborationService.applyDocumentUpdate(event.remoteUpdate);
      const state = context.collaborationService.getCurrentState();
      return state.paths;
    }
    return context.paths;
  },
  shapes: ({ context, event }) => {
    if (event.type === 'SYNC_STATE' && context.collaborationService) {
      const state = context.collaborationService.getCurrentState();
      return state.shapes;
    }
    return context.shapes;
  }
});

// Guards
const canUndo = ({ context }: { context: WhiteboardContext }) =>
  context.historyIndex > 0;

const canRedo = ({ context }: { context: WhiteboardContext }) =>
  context.historyIndex < context.history.length - 1;

const isDrawingTool = ({ context }: { context: WhiteboardContext }) =>
  ['pen', 'brush', 'eraser'].includes(context.currentTool);

const isShapeTool = ({ context }: { context: WhiteboardContext }) =>
  context.currentTool === 'shape';

// Create machine factory for testing with different configurations
export const createWhiteboardMachine = (initialContext?: Partial<WhiteboardContext>) =>
  createMachine({
    id: 'whiteboardMachine',
    initial: 'idle',
    context: {
      // Drawing state
      currentTool: 'pen',
      currentShapeType: 'rectangle',
      isDrawing: false,
      currentPath: null,
      currentShape: null,

      // Canvas objects
      paths: [],
      shapes: [],
      selectedObjects: [],

      // Style settings
      currentStyle: {
        color: '#000000',
        width: 2,
        opacity: 1,
        fill: 'transparent'
      },

      // Collaboration
      collaborators: [],
      userId: '',
      userName: '',
      collaborationService: null,
      realTimeCollaborationService: null,

      // Canvas state
      canvasSize: { width: 800, height: 600 },
      zoom: 1,
      pan: { x: 0, y: 0 },

      // History
      history: [],
      historyIndex: -1,

      ...initialContext
    } as WhiteboardContext,
    states: {
      idle: {
        on: {
          START_DRAWING: [
            {
              guard: isDrawingTool,
              target: 'drawing',
              actions: startDrawing
            },
            {
              guard: isShapeTool,
              target: 'shaping',
              actions: startDrawing
            }
          ],
          SELECT_TOOL: { actions: selectTool },
          SELECT_SHAPE: { actions: selectShape },
          SET_STYLE: { actions: setStyle },
          SELECT_OBJECT: { actions: selectObject },
          DESELECT_ALL: { actions: deselectAll },
          DELETE_SELECTED: { actions: deleteSelected },
          CLEAR_CANVAS: { actions: clearCanvas },
          UNDO: { guard: canUndo, actions: undo },
          REDO: { guard: canRedo, actions: redo },
          JOIN_SESSION: { actions: joinSession },
          UPDATE_CURSOR: { actions: updateCollaborators },
          INITIALIZE_COLLABORATION: { actions: initializeCollaboration },
          RECEIVE_REMOTE_OBJECT: { actions: receiveRemoteObject },
          SYNC_STATE: { actions: syncCollaborationState },

          // Real-time collaboration events
          INITIALIZE_REALTIME_COLLABORATION: { actions: initializeRealTimeCollaboration },
          UPDATE_REMOTE_CURSOR: { actions: updateRemoteCursor },
          // REMOVED: Live drawing events no longer handled by state machine
          // They are managed directly by the collaboration service to prevent infinite loops
          // REMOVED: Participant events no longer handled by state machine
          // They are managed directly by the collaboration service
        }
      },
      drawing: {
        on: {
          CONTINUE_DRAWING: { actions: continueDrawing },
          END_DRAWING: {
            target: 'idle',
            actions: endDrawing
          },
          CANCEL_DRAWING: {
            target: 'idle',
            actions: cancelDrawing
          }
        }
      },
      shaping: {
        on: {
          CONTINUE_DRAWING: { actions: continueDrawing },
          END_DRAWING: {
            target: 'idle',
            actions: endDrawing
          },
          CANCEL_DRAWING: {
            target: 'idle',
            actions: cancelDrawing
          }
        }
      },
      selected: {
        on: {
          MOVE_OBJECTS: { actions: 'moveObjects' },
          DELETE_SELECTED: {
            target: 'idle',
            actions: deleteSelected
          },
          DESELECT_ALL: {
            target: 'idle',
            actions: deselectAll
          },
          START_DRAWING: {
            target: 'drawing',
            actions: [deselectAll, startDrawing]
          }
        }
      }
    }
  });

// Default machine with empty canvas
export const whiteboardMachine = createWhiteboardMachine();