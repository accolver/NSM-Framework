import React, { useCallback, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Circle, Arrow } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import {
  WhiteboardContext,
  WhiteboardEvent,
  Point,
  DrawingPath,
  Shape,
  DrawingTool,
  ShapeType
} from '../whiteboard-machine';

interface WhiteboardCanvasProps {
  context: WhiteboardContext;
  send: (event: WhiteboardEvent) => void;
  width: number;
  height: number;
}

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({
  context,
  send,
  width,
  height
}) => {
  const stageRef = useRef<any>(null);
  const isDrawing = useRef(false);

  // Handle pointer events for drawing
  const handlePointerDown = useCallback((e: KonvaEventObject<PointerEvent>) => {
    if (context.currentTool === 'eraser') return; // Skip eraser for now

    isDrawing.current = true;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    const point: Point = {
      x: pos.x,
      y: pos.y,
      pressure: e.evt.pressure || 1,
      timestamp: Date.now()
    };

    send({ type: 'START_DRAWING', point });
  }, [context.currentTool, send]);

  const handlePointerMove = useCallback((e: KonvaEventObject<PointerEvent>) => {
    if (!isDrawing.current) return;

    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    const point: Point = {
      x: pos.x,
      y: pos.y,
      pressure: e.evt.pressure || 1,
      timestamp: Date.now()
    };

    send({ type: 'CONTINUE_DRAWING', point });
  }, [send]);

  const handlePointerUp = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    send({ type: 'END_DRAWING' });
  }, [send]);

  // Handle stage click for deselection
  const handleStageClick = useCallback((e: KonvaEventObject<MouseEvent>) => {
    // Only deselect if clicking on empty space
    if (e.target === e.target.getStage()) {
      send({ type: 'DESELECT_ALL' });
    }
  }, [send]);

  // Render completed paths
  const renderPaths = () => {
    return context.paths.map((path: DrawingPath) => {
      const points = path.points.flatMap(point => [point.x, point.y]);

      return (
        <Line
          key={path.id}
          points={points}
          stroke={path.style.color}
          strokeWidth={path.style.width}
          globalCompositeOperation={path.tool === 'eraser' ? 'destination-out' : 'source-over'}
          lineCap="round"
          lineJoin="round"
          opacity={path.style.opacity}
          onClick={() => send({ type: 'SELECT_OBJECT', objectId: path.id })}
        />
      );
    });
  };

  // Render completed shapes
  const renderShapes = () => {
    return context.shapes.map((shape: Shape) => {
      const isSelected = context.selectedObjects.includes(shape.id);
      const strokeWidth = isSelected ? shape.style.width + 2 : shape.style.width;
      const stroke = isSelected ? '#007acc' : shape.style.color;

      const commonProps = {
        key: shape.id,
        stroke,
        strokeWidth,
        fill: shape.style.fill || 'transparent',
        opacity: shape.style.opacity,
        onClick: () => send({ type: 'SELECT_OBJECT', objectId: shape.id }),
        draggable: isSelected
      };

      switch (shape.type) {
        case 'rectangle':
          return (
            <Rect
              {...commonProps}
              x={Math.min(shape.startPoint.x, shape.endPoint.x)}
              y={Math.min(shape.startPoint.y, shape.endPoint.y)}
              width={Math.abs(shape.endPoint.x - shape.startPoint.x)}
              height={Math.abs(shape.endPoint.y - shape.startPoint.y)}
            />
          );
        case 'circle':
          const radius = Math.sqrt(
            Math.pow(shape.endPoint.x - shape.startPoint.x, 2) +
            Math.pow(shape.endPoint.y - shape.startPoint.y, 2)
          ) / 2;
          return (
            <Circle
              {...commonProps}
              x={(shape.startPoint.x + shape.endPoint.x) / 2}
              y={(shape.startPoint.y + shape.endPoint.y) / 2}
              radius={radius}
            />
          );
        case 'line':
          return (
            <Line
              {...commonProps}
              points={[shape.startPoint.x, shape.startPoint.y, shape.endPoint.x, shape.endPoint.y]}
              lineCap="round"
            />
          );
        case 'arrow':
          return (
            <Arrow
              {...commonProps}
              points={[shape.startPoint.x, shape.startPoint.y, shape.endPoint.x, shape.endPoint.y]}
              pointerLength={10}
              pointerWidth={10}
            />
          );
        default:
          return null;
      }
    });
  };

  // Render current drawing path or shape
  const renderCurrentDrawing = () => {
    if (context.currentPath) {
      const points = context.currentPath.points.flatMap(point => [point.x, point.y]);
      return (
        <Line
          points={points}
          stroke={context.currentPath.style.color}
          strokeWidth={context.currentPath.style.width}
          globalCompositeOperation={context.currentPath.tool === 'eraser' ? 'destination-out' : 'source-over'}
          lineCap="round"
          lineJoin="round"
          opacity={context.currentPath.style.opacity}
        />
      );
    }

    if (context.currentShape) {
      const shape = context.currentShape;
      const commonProps = {
        stroke: shape.style.color,
        strokeWidth: shape.style.width,
        fill: shape.style.fill || 'transparent',
        opacity: shape.style.opacity
      };

      switch (shape.type) {
        case 'rectangle':
          return (
            <Rect
              {...commonProps}
              x={Math.min(shape.startPoint.x, shape.endPoint.x)}
              y={Math.min(shape.startPoint.y, shape.endPoint.y)}
              width={Math.abs(shape.endPoint.x - shape.startPoint.x)}
              height={Math.abs(shape.endPoint.y - shape.startPoint.y)}
            />
          );
        case 'circle':
          const radius = Math.sqrt(
            Math.pow(shape.endPoint.x - shape.startPoint.x, 2) +
            Math.pow(shape.endPoint.y - shape.startPoint.y, 2)
          ) / 2;
          return (
            <Circle
              {...commonProps}
              x={(shape.startPoint.x + shape.endPoint.x) / 2}
              y={(shape.startPoint.y + shape.endPoint.y) / 2}
              radius={radius}
            />
          );
        case 'line':
          return (
            <Line
              {...commonProps}
              points={[shape.startPoint.x, shape.startPoint.y, shape.endPoint.x, shape.endPoint.y]}
              lineCap="round"
            />
          );
        case 'arrow':
          return (
            <Arrow
              {...commonProps}
              points={[shape.startPoint.x, shape.startPoint.y, shape.endPoint.x, shape.endPoint.y]}
              pointerLength={10}
              pointerWidth={10}
            />
          );
        default:
          return null;
      }
    }

    return null;
  };

  // Render collaborator cursors
  const renderCollaborators = () => {
    return context.collaborators.map((collaborator) => {
      if (!collaborator.cursor) return null;

      return (
        <g key={collaborator.id}>
          <Circle
            x={collaborator.cursor.x}
            y={collaborator.cursor.y}
            radius={3}
            fill={collaborator.color}
            opacity={0.8}
          />
          <text
            x={collaborator.cursor.x + 8}
            y={collaborator.cursor.y - 8}
            fontSize="12"
            fill={collaborator.color}
          >
            {collaborator.name}
          </text>
        </g>
      );
    });
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      send({
        type: 'RESIZE_CANVAS',
        size: { width: window.innerWidth, height: window.innerHeight - 120 }
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [send]);

  return (
    <div style={{
      border: '1px solid #ccc',
      borderRadius: '4px',
      overflow: 'hidden',
      backgroundColor: '#fafafa'
    }}>
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleStageClick}
        style={{ cursor: context.currentTool === 'pen' ? 'crosshair' : 'default' }}
      >
        <Layer>
          {renderPaths()}
          {renderShapes()}
          {renderCurrentDrawing()}
          {renderCollaborators()}
        </Layer>
      </Stage>
    </div>
  );
};