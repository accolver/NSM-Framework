import React from 'react';

interface WordGridProps {
  wordGrid: (string | null)[][];
  statusGrid: (string | null)[][];
}

export const WordGrid: React.FC<WordGridProps> = ({ wordGrid, statusGrid }) => {
  return (
    <div role="grid" aria-label="Wordle game grid" className="word-grid">
      {wordGrid.map((row, rowIndex) => (
        <div key={rowIndex} role="row" className="word-row">
          {row.map((letter, colIndex) => {
            const status = statusGrid[rowIndex]?.[colIndex];
            const cellClass = status ? `cell-${status}` : 'cell-empty';

            return (
              <div
                key={colIndex}
                role="gridcell"
                className={`word-cell ${cellClass}`}
                aria-label={letter ? `Letter ${letter}` : 'Empty cell'}
              >
                {letter || ''}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};