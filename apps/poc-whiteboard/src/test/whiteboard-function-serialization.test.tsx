import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { createActor, assign, createMachine } from 'xstate';
import { WhiteboardExporter } from '../components/WhiteboardExporter';

// Simple test machine with functions to verify serialization
const createTestWhiteboardMachine = () => {
  return createMachine({
    id: 'whiteboardTest',
    initial: 'idle',
    context: {
      elements: [],
      selectedTool: 'pen'
    },
    states: {
      idle: {
        on: {
          ADD_ELEMENT: {
            actions: assign({
              elements: ({ context, event }) => [...context.elements, event.element]
            })
          },
          CHANGE_TOOL: {
            actions: assign({
              selectedTool: ({ context, event }) => event.tool
            })
          }
        }
      }
    }
  });
};

// Mock the clipboard API
const mockWriteText = jest.fn();
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: mockWriteText,
  },
  writable: true,
});

describe('Whiteboard Function Serialization', () => {
  const testMachine = createTestWhiteboardMachine();
  const testActor = createActor(testMachine);

  beforeEach(() => {
    mockWriteText.mockClear();
    testActor.start();
  });

  afterEach(() => {
    testActor.stop();
  });

  it('should preserve function source code in whiteboard machine export', async () => {
    render(<WhiteboardExporter actor={testActor} />);

    const exportButton = document.querySelector('button[aria-label*="Export"]');
    expect(exportButton).toBeTruthy();

    fireEvent.click(exportButton!);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledTimes(1);
    });

    const exportedContent = mockWriteText.mock.calls[0][0];

    // Extract JSON from the import wrapper
    let jsonContent = exportedContent;
    if (exportedContent.includes('createMachine(') && exportedContent.includes(');')) {
      const startIndex = exportedContent.indexOf('createMachine(') + 'createMachine('.length;
      const endIndex = exportedContent.lastIndexOf(');');
      jsonContent = exportedContent.substring(startIndex, endIndex);
    }

    const parsed = JSON.parse(jsonContent);

    // Should NOT contain generic function names like "assign2"
    const serializedStr = JSON.stringify(parsed);
    expect(serializedStr).not.toContain('"name": "assign2"');

    // SHOULD contain actual function source code
    expect(serializedStr).toContain('elements');
    expect(serializedStr).toContain('event.element');
    expect(serializedStr).toContain('selectedTool');
    expect(serializedStr).toContain('event.tool');

    // Should contain function metadata
    expect(serializedStr).toContain('__type');
    expect(serializedStr).toContain('source');
  });

  it('should export valid machine structure with preserved functions', async () => {
    render(<WhiteboardExporter actor={testActor} />);

    const exportButton = document.querySelector('button[aria-label*="Export"]');
    fireEvent.click(exportButton!);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledTimes(1);
    });

    const exportedContent = mockWriteText.mock.calls[0][0];

    // Extract JSON
    let jsonContent = exportedContent;
    if (exportedContent.includes('createMachine(') && exportedContent.includes(');')) {
      const startIndex = exportedContent.indexOf('createMachine(') + 'createMachine('.length;
      const endIndex = exportedContent.lastIndexOf(');');
      jsonContent = exportedContent.substring(startIndex, endIndex);
    }

    const parsed = JSON.parse(jsonContent);

    // Basic structure validation
    expect(parsed).toHaveProperty('id', 'whiteboardTest');
    expect(parsed).toHaveProperty('states');
    expect(parsed.states).toHaveProperty('idle');

    // Verify the exported machine contains function implementations
    const serializedStr = JSON.stringify(parsed);
    expect(serializedStr).toContain('ADD_ELEMENT');
    expect(serializedStr).toContain('CHANGE_TOOL');
  });
});