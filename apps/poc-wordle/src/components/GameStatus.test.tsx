import { describe, it, expect, mock, afterEach } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameStatus } from './GameStatus';

describe('GameStatus Component', () => {
  afterEach(() => {
    cleanup();
  });

  const mockOnReset = mock();

  it('should display playing status when game is active', () => {
    render(
      <GameStatus
        gameState="playing"
        attemptNumber={2}
        hiddenWord="ABOUT"
        onReset={mockOnReset}
      />
    );

    expect(screen.getByText(/attempt 3 of 6/i)).toBeInTheDocument();
  });

  it('should display win message when player wins', () => {
    render(
      <GameStatus
        gameState="won"
        attemptNumber={3}
        hiddenWord="ABOUT"
        onReset={mockOnReset}
      />
    );

    expect(screen.getByText(/congratulations!/i)).toBeInTheDocument();
    expect(screen.getByText(/you won in 4 attempts/i)).toBeInTheDocument();
  });

  it('should display loss message when player loses', () => {
    render(
      <GameStatus
        gameState="lost"
        attemptNumber={6}
        hiddenWord="ABOUT"
        onReset={mockOnReset}
      />
    );

    expect(screen.getByText(/game over/i)).toBeInTheDocument();
    expect(screen.getByText(/the word was: ABOUT/i)).toBeInTheDocument();
  });

  it('should show reset button when game is over', () => {
    render(
      <GameStatus
        gameState="won"
        attemptNumber={3}
        hiddenWord="ABOUT"
        onReset={mockOnReset}
      />
    );

    expect(screen.getByRole('button', { name: /play again/i })).toBeInTheDocument();
  });

  it('should call onReset when reset button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <GameStatus
        gameState="lost"
        attemptNumber={6}
        hiddenWord="ABOUT"
        onReset={mockOnReset}
      />
    );

    const resetButton = screen.getByRole('button', { name: /play again/i });
    await user.click(resetButton);

    expect(mockOnReset).toHaveBeenCalled();
  });
});