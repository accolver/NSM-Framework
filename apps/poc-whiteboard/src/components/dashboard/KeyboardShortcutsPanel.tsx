/**
 * KeyboardShortcutsPanel Component
 *
 * Bottom panel showing available keyboard shortcuts
 */

import React from 'react';
import type { KeyboardShortcutsPanelProps } from './types';

const DEFAULT_SHORTCUTS = [
  { key: '1-5', description: 'Switch tools' },
  { key: 'Alt+D', description: 'Toggle dashboard' },
  { key: 'Ctrl+Shift+I', description: 'Inspector' },
  { key: '←/→', description: 'Navigate tabs' }
];

export const KeyboardShortcutsPanel: React.FC<KeyboardShortcutsPanelProps> = ({
  shortcuts = DEFAULT_SHORTCUTS,
  className = ''
}) => {
  return (
    <div className={`shortcuts-panel ${className}`}>
      <h4>Keyboard Shortcuts</h4>
      <div className="shortcut-list">
        {shortcuts.map((shortcut, index) => (
          <div key={index} className="shortcut-item">
            <span className="shortcut-key">{shortcut.key}</span>
            <span>{shortcut.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
};