import '../../test-setup';
import { describe, test, expect } from 'bun:test';
import React from 'react';

describe('Simple DOM Test', () => {
  test('should have document available', () => {
    expect(global.document).toBeDefined();
    expect(global.window).toBeDefined();
  });

  test('should be able to create elements', () => {
    const div = global.document.createElement('div');
    expect(div).toBeDefined();
    expect(div.tagName).toBe('DIV');
  });
});