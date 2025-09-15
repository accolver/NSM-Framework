import React from 'react';

interface KeyboardProps {
  keyboardStatus: Record<string, string>;
  onKeyPress: (letter: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
}

const KEYBOARD_LAYOUT = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
];

export const Keyboard: React.FC<KeyboardProps> = ({
  keyboardStatus,
  onKeyPress,
  onBackspace,
  onEnter
}) => {
  const getKeyClass = (letter: string): string => {
    const status = keyboardStatus[letter];
    return status ? `key-${status}` : 'key-default';
  };

  return (
    <div className="keyboard" role="group" aria-label="Virtual keyboard">
      {KEYBOARD_LAYOUT.map((row, rowIndex) => (
        <div key={rowIndex} className="keyboard-row">
          {rowIndex === 2 && (
            <button
              type="button"
              className="keyboard-key key-special"
              onClick={onEnter}
              aria-label="Enter"
            >
              Enter
            </button>
          )}

          {row.map((letter) => (
            <button
              key={letter}
              type="button"
              className={`keyboard-key ${getKeyClass(letter)}`}
              onClick={() => onKeyPress(letter)}
              aria-label={letter}
            >
              {letter}
            </button>
          ))}

          {rowIndex === 2 && (
            <button
              type="button"
              className="keyboard-key key-special"
              onClick={onBackspace}
              aria-label="Backspace"
            >
              Backspace
            </button>
          )}
        </div>
      ))}
    </div>
  );
};