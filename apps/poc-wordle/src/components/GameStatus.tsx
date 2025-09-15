import React from 'react';

interface GameStatusProps {
  gameState: 'playing' | 'won' | 'lost';
  attemptNumber: number;
  hiddenWord: string;
  onReset: () => void;
}

export const GameStatus: React.FC<GameStatusProps> = ({
  gameState,
  attemptNumber,
  hiddenWord,
  onReset
}) => {
  const renderStatusContent = () => {
    switch (gameState) {
      case 'playing':
        return (
          <div className="status-playing">
            <p>Attempt {attemptNumber + 1} of 6</p>
          </div>
        );

      case 'won':
        return (
          <div className="status-won">
            <h2>Congratulations!</h2>
            <p>You won in {attemptNumber + 1} attempts!</p>
            <button
              type="button"
              className="reset-button"
              onClick={onReset}
              aria-label="Play again"
            >
              Play Again
            </button>
          </div>
        );

      case 'lost':
        return (
          <div className="status-lost">
            <h2>Game Over</h2>
            <p>The word was: {hiddenWord}</p>
            <button
              type="button"
              className="reset-button"
              onClick={onReset}
              aria-label="Play again"
            >
              Play Again
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="game-status" role="status" aria-live="polite">
      {renderStatusContent()}
    </div>
  );
};