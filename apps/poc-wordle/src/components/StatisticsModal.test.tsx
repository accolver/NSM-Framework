import { describe, it, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { StatisticsModal } from './StatisticsModal';
import type { GameStatistics } from '../persistence/types';

const mockStatistics: GameStatistics = {
  totalGames: 10,
  gamesWon: 7,
  gamesLost: 3,
  winPercentage: 70,
  currentStreak: 3,
  bestStreak: 5,
  averageGuesses: 4.2,
  averageTime: 180000, // 3 minutes
  guessDistribution: {
    1: 0,
    2: 1,
    3: 2,
    4: 3,
    5: 1,
    6: 0
  },
  lastPlayed: new Date('2025-01-15T10:00:00Z'),
  fastestWin: 120000, // 2 minutes
  currentGameNumber: 11
};

describe('StatisticsModal', () => {
  it('should not render when closed', () => {
    render(
      <StatisticsModal
        isOpen={false}
        onClose={() => {}}
        statistics={mockStatistics}
      />
    );

    expect(screen.queryByText('Statistics')).toBeNull();
  });

  it('should not render when statistics is null', () => {
    render(
      <StatisticsModal
        isOpen={true}
        onClose={() => {}}
        statistics={null}
      />
    );

    expect(screen.queryByText('Statistics')).toBeNull();
  });

  it('should render statistics when open and data provided', () => {
    render(
      <StatisticsModal
        isOpen={true}
        onClose={() => {}}
        statistics={mockStatistics}
      />
    );

    expect(screen.getByText('Statistics')).toBeDefined();
    expect(screen.getByText('10')).toBeDefined(); // Total games
    expect(screen.getByText('70%')).toBeDefined(); // Win percentage
    expect(screen.getByText('3')).toBeDefined(); // Current streak
    expect(screen.getByText('5')).toBeDefined(); // Best streak
  });

  it('should display guess distribution correctly', () => {
    render(
      <StatisticsModal
        isOpen={true}
        onClose={() => {}}
        statistics={mockStatistics}
      />
    );

    expect(screen.getByText('Guess Distribution')).toBeDefined();
    // Check for distribution numbers
    expect(screen.getAllByText('1')).toBeDefined(); // 1 game won in 2 guesses
    expect(screen.getAllByText('2')).toBeDefined(); // 2 games won in 3 guesses
    expect(screen.getAllByText('3')).toBeDefined(); // 3 games won in 4 guesses
  });

  it('should format time correctly', () => {
    render(
      <StatisticsModal
        isOpen={true}
        onClose={() => {}}
        statistics={mockStatistics}
      />
    );

    expect(screen.getByText('4.2')).toBeDefined(); // Average guesses
    expect(screen.getByText('3:00')).toBeDefined(); // Average time (3 minutes)
    expect(screen.getByText('2:00')).toBeDefined(); // Fastest win (2 minutes)
  });

  it('should show additional statistics for players with wins', () => {
    render(
      <StatisticsModal
        isOpen={true}
        onClose={() => {}}
        statistics={mockStatistics}
      />
    );

    expect(screen.getByText('Avg Guesses')).toBeDefined();
    expect(screen.getByText('Avg Time')).toBeDefined();
  });

  it('should hide additional statistics for players with no wins', () => {
    const noWinsStats: GameStatistics = {
      ...mockStatistics,
      gamesWon: 0,
      winPercentage: 0,
      averageGuesses: 0,
      averageTime: 0
    };

    render(
      <StatisticsModal
        isOpen={true}
        onClose={() => {}}
        statistics={noWinsStats}
      />
    );

    expect(screen.queryByText('Avg Guesses')).toBeNull();
    expect(screen.queryByText('Avg Time')).toBeNull();
  });

  it('should display last played date', () => {
    render(
      <StatisticsModal
        isOpen={true}
        onClose={() => {}}
        statistics={mockStatistics}
      />
    );

    expect(screen.getByText(/Last played:/)).toBeDefined();
  });
});