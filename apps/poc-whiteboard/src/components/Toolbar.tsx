import React from 'react';
import {
  WhiteboardEvent,
  WhiteboardContext,
  DrawingTool,
  ShapeType
} from '../whiteboard-machine';

interface ToolbarProps {
  context: WhiteboardContext;
  send: (event: WhiteboardEvent) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ context, send }) => {
  const tools: { name: DrawingTool; label: string; icon: string }[] = [
    { name: 'pen', label: 'Pen', icon: '✏️' },
    { name: 'brush', label: 'Brush', icon: '🖌️' },
    { name: 'eraser', label: 'Eraser', icon: '🧽' },
    { name: 'shape', label: 'Shapes', icon: '🔴' }
  ];

  const shapes: { name: ShapeType; label: string; icon: string }[] = [
    { name: 'rectangle', label: 'Rectangle', icon: '⬜' },
    { name: 'circle', label: 'Circle', icon: '⭕' },
    { name: 'line', label: 'Line', icon: '📏' },
    { name: 'arrow', label: 'Arrow', icon: '➡️' }
  ];

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500',
    '#800080', '#FFC0CB', '#A52A2A', '#808080'
  ];

  const strokeWidths = [1, 2, 4, 8, 12];

  return (
    <div style={{
      padding: '16px',
      backgroundColor: '#f8f9fa',
      borderBottom: '1px solid #dee2e6',
      display: 'flex',
      gap: '24px',
      alignItems: 'center',
      flexWrap: 'wrap'
    }}>
      {/* Drawing Tools */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold', marginRight: '8px' }}>Tools:</span>
        {tools.map((tool) => (
          <button
            key={tool.name}
            onClick={() => send({ type: 'SELECT_TOOL', tool: tool.name })}
            style={{
              padding: '8px 12px',
              border: '2px solid',
              borderColor: context.currentTool === tool.name ? '#007acc' : '#ccc',
              borderRadius: '4px',
              backgroundColor: context.currentTool === tool.name ? '#e3f2fd' : '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '14px'
            }}
            title={tool.label}
          >
            <span>{tool.icon}</span>
            <span>{tool.label}</span>
          </button>
        ))}
      </div>

      {/* Shape Tools (when shape tool is selected) */}
      {context.currentTool === 'shape' && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', marginRight: '8px' }}>Shapes:</span>
          {shapes.map((shape) => (
            <button
              key={shape.name}
              onClick={() => send({ type: 'SELECT_SHAPE', shapeType: shape.name })}
              style={{
                padding: '6px 10px',
                border: '2px solid',
                borderColor: context.currentShapeType === shape.name ? '#007acc' : '#ccc',
                borderRadius: '4px',
                backgroundColor: context.currentShapeType === shape.name ? '#e3f2fd' : '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '14px'
              }}
              title={shape.label}
            >
              <span>{shape.icon}</span>
            </button>
          ))}
        </div>
      )}

      {/* Color Picker */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold', marginRight: '8px' }}>Color:</span>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => send({ type: 'SET_STYLE', style: { color } })}
              style={{
                width: '24px',
                height: '24px',
                backgroundColor: color,
                border: context.currentStyle.color === color ? '3px solid #007acc' : '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer',
                padding: '0'
              }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Stroke Width */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold', marginRight: '8px' }}>Width:</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {strokeWidths.map((width) => (
            <button
              key={width}
              onClick={() => send({ type: 'SET_STYLE', style: { width } })}
              style={{
                padding: '4px 8px',
                border: '2px solid',
                borderColor: context.currentStyle.width === width ? '#007acc' : '#ccc',
                borderRadius: '4px',
                backgroundColor: context.currentStyle.width === width ? '#e3f2fd' : '#fff',
                cursor: 'pointer',
                fontSize: '12px',
                minWidth: '32px'
              }}
            >
              {width}px
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto' }}>
        <button
          onClick={() => send({ type: 'UNDO' })}
          disabled={context.historyIndex <= 0}
          style={{
            padding: '8px 12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            backgroundColor: context.historyIndex <= 0 ? '#f5f5f5' : '#fff',
            cursor: context.historyIndex <= 0 ? 'not-allowed' : 'pointer',
            opacity: context.historyIndex <= 0 ? 0.6 : 1
          }}
        >
          ↶ Undo
        </button>
        <button
          onClick={() => send({ type: 'REDO' })}
          disabled={context.historyIndex >= context.history.length - 1}
          style={{
            padding: '8px 12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            backgroundColor: context.historyIndex >= context.history.length - 1 ? '#f5f5f5' : '#fff',
            cursor: context.historyIndex >= context.history.length - 1 ? 'not-allowed' : 'pointer',
            opacity: context.historyIndex >= context.history.length - 1 ? 0.6 : 1
          }}
        >
          ↷ Redo
        </button>
        <button
          onClick={() => send({ type: 'CLEAR_CANVAS' })}
          style={{
            padding: '8px 12px',
            border: '1px solid #dc3545',
            borderRadius: '4px',
            backgroundColor: '#fff',
            color: '#dc3545',
            cursor: 'pointer'
          }}
        >
          🗑️ Clear
        </button>
      </div>
    </div>
  );
};