/**
 * TDD Tests for WhiteboardExporter Function Serialization
 *
 * These tests verify that the WhiteboardExporter correctly exports XState functions
 * with their source code instead of generic "[Function: assign2]" placeholders.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createActor } from 'xstate';
import { WhiteboardExporter } from '../components/WhiteboardExporter';
import { whiteboardMachine } from '../whiteboard-machine';

// Mock the clipboard API
const mockWriteText = vi.fn();
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: mockWriteText,
  },
  writable: true,
});

describe('WhiteboardExporter Function Serialization (TDD)', () => {
  let actor: any;
  let copiedText: string = '';

  beforeEach(() => {
    actor = createActor(whiteboardMachine);
    actor.start();

    // Initialize collaboration to set up some context
    actor.send({
      type: 'INITIALIZE_COLLABORATION',
      userId: 'test-user',
      userName: 'Test User'
    });

    // Reset the mock and capture copied text
    mockWriteText.mockReset();
    mockWriteText.mockImplementation((text: string) => {
      copiedText = text;
      return Promise.resolve();
    });
  });

  it('should export XState functions with their source code', async () => {
    const { getByText } = render(
      <WhiteboardExporter
        actor={actor}
        showCodeViewer={false}
        enableCanvasShortcuts={false}
      />
    );

    const exportButton = getByText('Export Whiteboard Machine');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalled();
    });

    // Parse the exported machine code
    const exportedCode = copiedText;
    expect(exportedCode).toContain('import { createMachine } from \'xstate\';');

    // Extract the JSON part
    const jsonStart = exportedCode.indexOf('createMachine(') + 'createMachine('.length;
    const jsonEnd = exportedCode.lastIndexOf(');');
    const jsonPart = exportedCode.substring(jsonStart, jsonEnd);

    const parsed = JSON.parse(jsonPart);

    // Should have function source code, not generic "[Function: assign2]"
    expect(exportedCode).not.toContain('[Function: assign2]');

    // Look for assign functions with source code
    let foundFunctionSource = false;

    function searchForFunctionSource(obj: any): void {
      if (typeof obj === 'object' && obj !== null) {
        // Look for XState assign functions
        if (obj.__type === 'xstate.assign' && obj.assignment) {
          for (const [key, value] of Object.entries(obj.assignment)) {
            if (typeof value === 'object' && value !== null &&
                (value as any).__type === 'function' && (value as any).source) {
              foundFunctionSource = true;
              console.log('Found function source for:', key, (value as any).name);
            }
          }
        }

        // Look for direct actions with function source code
        if (obj.__type === 'direct_action' && obj.implementation) {
          if (typeof obj.implementation === 'object' && obj.implementation.__type === 'function' && obj.implementation.source) {
            foundFunctionSource = true;
            console.log('Found direct action with source:', obj.name);
          }
        }

        // Look for direct guards with function source code
        if (obj.__type === 'direct_guard' && obj.implementation) {
          if (typeof obj.implementation === 'object' && obj.implementation.__type === 'function' && obj.implementation.source) {
            foundFunctionSource = true;
            console.log('Found direct guard with source:', obj.name);
          }
        }

        for (const value of Object.values(obj)) {
          searchForFunctionSource(value);
        }
      }
    }

    searchForFunctionSource(parsed);
    expect(foundFunctionSource).toBe(true);
  });

  it('should preserve function names in exported code', async () => {
    const { getByText } = render(
      <WhiteboardExporter
        actor={actor}
        showCodeViewer={false}
        enableCanvasShortcuts={false}
      />
    );

    const exportButton = getByText('Export Whiteboard Machine');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalled();
    });

    const exportedCode = copiedText;

    // Should contain direct_action types with function names
    expect(exportedCode).toContain('"__type": "direct_action"');
    expect(exportedCode).toMatch(/"name":\s*"[a-zA-Z_][a-zA-Z0-9_]*"/);

    // Should not contain generic function references
    expect(exportedCode).not.toContain('[Function: anonymous]');
  });

  it('should handle drawing state functions correctly', async () => {
    // Start drawing to trigger state machine actions
    actor.send({
      type: 'START_DRAWING',
      point: { x: 100, y: 100, timestamp: Date.now() }
    });

    const { getByText } = render(
      <WhiteboardExporter
        actor={actor}
        showCodeViewer={false}
        enableCanvasShortcuts={false}
      />
    );

    const exportButton = getByText('Export Whiteboard Machine');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalled();
    });

    const exportedCode = copiedText;
    const jsonStart = exportedCode.indexOf('createMachine(') + 'createMachine('.length;
    const jsonEnd = exportedCode.lastIndexOf(');');
    const jsonPart = exportedCode.substring(jsonStart, jsonEnd);

    const parsed = JSON.parse(jsonPart);

    // Should have the drawing state with proper context
    expect(parsed.context.isDrawing).toBe(true);
    expect(parsed.context.currentPath).toBeTruthy();

    // Should contain the drawing state configuration
    expect(parsed.states.drawing).toBeDefined();
    expect(parsed.states.drawing.on).toBeDefined();
  });

  it('should sanitize collaboration services but preserve functions', async () => {
    const { getByText } = render(
      <WhiteboardExporter
        actor={actor}
        showCodeViewer={false}
        enableCanvasShortcuts={false}
      />
    );

    const exportButton = getByText('Export Whiteboard Machine');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalled();
    });

    const exportedCode = copiedText;
    const jsonStart = exportedCode.indexOf('createMachine(') + 'createMachine('.length;
    const jsonEnd = exportedCode.lastIndexOf(');');
    const jsonPart = exportedCode.substring(jsonStart, jsonEnd);

    const parsed = JSON.parse(jsonPart);

    // Should sanitize collaboration services
    expect(parsed.context.collaborationService).toBeNull();
    expect(parsed.context.realTimeCollaborationService).toBeNull();
    expect(parsed.context.userId).toBe('');
    expect(parsed.context.userName).toBe('');

    // But should still contain function definitions
    let hasFunctions = false;

    function checkForFunctions(obj: any): void {
      if (typeof obj === 'object' && obj !== null) {
        if (obj.__type === 'function' || obj.__type === 'xstate.assign' ||
            obj.__type === 'direct_action' || obj.__type === 'direct_guard') {
          hasFunctions = true;
        }

        for (const value of Object.values(obj)) {
          checkForFunctions(value);
        }
      }
    }

    checkForFunctions(parsed);
    expect(hasFunctions).toBe(true);
  });

  it('should create valid XState machine code', async () => {
    const { getByText } = render(
      <WhiteboardExporter
        actor={actor}
        showCodeViewer={false}
        enableCanvasShortcuts={false}
      />
    );

    const exportButton = getByText('Export Whiteboard Machine');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalled();
    });

    const exportedCode = copiedText;

    // Should be valid JavaScript code structure
    expect(exportedCode).toMatch(/import\s+\{\s*createMachine\s*\}\s+from\s+['"]xstate['"];/);
    expect(exportedCode).toContain('const machine = createMachine(');
    expect(exportedCode).toMatch(/\);\s*$/);

    // Extract and validate JSON structure
    const jsonStart = exportedCode.indexOf('createMachine(') + 'createMachine('.length;
    const jsonEnd = exportedCode.lastIndexOf(');');
    const jsonPart = exportedCode.substring(jsonStart, jsonEnd);

    expect(() => JSON.parse(jsonPart)).not.toThrow();

    const parsed = JSON.parse(jsonPart);
    expect(parsed.id).toBe('whiteboardMachine');
    expect(parsed.initial).toBe('idle');
    expect(parsed.states).toBeDefined();
    expect(parsed.context).toBeDefined();
  });
});