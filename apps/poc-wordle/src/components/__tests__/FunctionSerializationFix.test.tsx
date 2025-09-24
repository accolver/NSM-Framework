import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { createActor } from 'xstate';
import { WordleExporter } from '../WordleExporter';
import { createWordleMachine } from '../../wordle-machine';

// Mock the clipboard API to capture serialized JSON
const mockWriteText = jest.fn();
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: mockWriteText,
  },
  writable: true,
});

describe('XState Function Serialization Fix', () => {
  const testMachine = createWordleMachine('TESTS');
  const testActor = createActor(testMachine);

  beforeEach(() => {
    mockWriteText.mockClear();
    testActor.start();
  });

  afterEach(() => {
    testActor.stop();
  });

  it('should preserve actual function source code instead of generic names', async () => {
    render(<WordleExporter actor={testActor} />);

    const exportButton = document.querySelector('button[aria-label*="Export"]');
    expect(exportButton).toBeTruthy();

    fireEvent.click(exportButton!);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledTimes(1);
    });

    const exportedContent = mockWriteText.mock.calls[0][0];


    // Extract JSON from the import wrapper if present
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
    expect(serializedStr).not.toContain('"name": "guard"');

    // SHOULD contain actual function source code for actions
    const actions = findActionsInMachine(parsed);
    expect(actions.length).toBeGreaterThan(0);

    // The serialized JSON should contain function source code
    expect(serializedStr).toContain('currentGuess');
    expect(serializedStr).toContain('event.letter');
    expect(serializedStr).toContain('slice(0, -1)');

    // Check that we found some actions with function implementations
    const actionsWithImplementations = actions.filter(action =>
      action && typeof action === 'object' &&
      (action.implementation || action.source || action.assignment)
    );
    expect(actionsWithImplementations.length).toBeGreaterThan(0);
  });

  it('should preserve guard function source code', async () => {
    render(<WordleExporter actor={testActor} />);

    const exportButton = document.querySelector('button[aria-label*="Export"]');
    fireEvent.click(exportButton!);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledTimes(1);
    });

    const exportedContent = mockWriteText.mock.calls[0][0];

    // Extract JSON from the import wrapper if present
    let jsonContent = exportedContent;
    if (exportedContent.includes('createMachine(') && exportedContent.includes(');')) {
      const startIndex = exportedContent.indexOf('createMachine(') + 'createMachine('.length;
      const endIndex = exportedContent.lastIndexOf(');');
      jsonContent = exportedContent.substring(startIndex, endIndex);
    }

    const parsed = JSON.parse(jsonContent);

    // The serialized JSON should contain guard function source code
    const serializedStr = JSON.stringify(parsed);


    expect(serializedStr).toContain('currentGuess.length < 5');
    expect(serializedStr).toContain('currentGuess.length === 5');
  });

  it('should make exported machine reconstructable', async () => {
    render(<WordleExporter actor={testActor} />);

    const exportButton = document.querySelector('button[aria-label*="Export"]');
    fireEvent.click(exportButton!);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledTimes(1);
    });

    const exportedContent = mockWriteText.mock.calls[0][0];

    // Extract JSON from the import wrapper if present
    let jsonContent = exportedContent;
    if (exportedContent.includes('createMachine(') && exportedContent.includes(');')) {
      const startIndex = exportedContent.indexOf('createMachine(') + 'createMachine('.length;
      const endIndex = exportedContent.lastIndexOf(');');
      jsonContent = exportedContent.substring(startIndex, endIndex);
    }

    const parsed = JSON.parse(jsonContent);

    // The exported machine should contain enough information to be reconstructable
    expect(parsed).toHaveProperty('id', 'wordleMachine');
    expect(parsed).toHaveProperty('states');
    expect(parsed.states).toHaveProperty('playing');
    expect(parsed.states).toHaveProperty('won');
    expect(parsed.states).toHaveProperty('lost');

    // Verify that function source code is included in the export
    const serializedStr = JSON.stringify(parsed);
    expect(serializedStr).toContain('currentGuess');
    expect(serializedStr).toContain('__type');
    expect(serializedStr).toContain('source');
  });
});

// Helper functions to extract actions and guards from machine configuration
function findActionsInMachine(machineConfig: any): any[] {
  const actions: any[] = [];

  function searchInObject(obj: any) {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      obj.forEach(searchInObject);
      return;
    }

    // Check if this object represents an action with implementation
    if (obj.__type && (obj.__type === 'direct_action' || obj.__type === 'named_action') && obj.implementation) {
      actions.push(obj);
    }

    // Check if this is an XState assign action
    if (obj.__type === 'xstate.assign' && obj.assignment) {
      actions.push(obj);
    }

    // Check if this has source property (serialized function)
    if (obj.__type === 'function' && obj.source) {
      actions.push(obj);
    }

    // Check if this has actions property
    if (obj.actions) {
      if (Array.isArray(obj.actions)) {
        obj.actions.forEach((action: any) => {
          if (action && typeof action === 'object') {
            actions.push(action);
            searchInObject(action);
          }
        });
      } else if (typeof obj.actions === 'object') {
        actions.push(obj.actions);
        searchInObject(obj.actions);
      }
    }

    // Recursively search other properties
    Object.values(obj).forEach(searchInObject);
  }

  searchInObject(machineConfig);
  return actions;
}

function findGuardsInMachine(machineConfig: any): any[] {
  const guards: any[] = [];

  function searchInObject(obj: any) {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      obj.forEach(searchInObject);
      return;
    }

    // Check if this object represents a guard
    if (obj.__type && (obj.__type === 'direct_guard' || obj.__type === 'named_guard')) {
      guards.push(obj);
    }

    // Check if this has guard property
    if (obj.guard && typeof obj.guard === 'object') {
      guards.push(obj.guard);
    }

    // Recursively search other properties
    Object.values(obj).forEach(searchInObject);
  }

  searchInObject(machineConfig);
  return guards;
}