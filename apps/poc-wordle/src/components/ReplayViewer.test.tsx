import { describe, it, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { ReplayViewer } from './ReplayViewer';
import type { GameReplay } from '../persistence/types';

const mockReplay: GameReplay = {
  gameId: 'test-replay',
  hiddenWord: 'STACK',
  steps: [
    { type: 'game_start', timestamp: 0 },
    { type: 'keypress', timestamp: 100, data: { letter: 'S' } },
    { type: 'keypress', timestamp: 200, data: { letter: 'T' } },
    { type: 'keypress', timestamp: 300, data: { letter: 'A' } },
    { type: 'keypress', timestamp: 400, data: { letter: 'C' } },
    { type: 'keypress', timestamp: 500, data: { letter: 'K' } },
    { type: 'submit', timestamp: 600, data: {
      guess: {
        word: 'STACK',
        letterStatus: ['correct', 'correct', 'correct', 'correct', 'correct']
      }
    }},
    { type: 'game_end', timestamp: 700, data: { outcome: 'won' } }
  ],
  duration: 700,
  outcome: 'won',
  finalAttemptCount: 1
};

describe('ReplayViewer', () => {
  it('should render replay header with game information', () => {
    render(
      <ReplayViewer
        replay={mockReplay}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Game Replay')).toBeDefined();
    expect(screen.getByText(/Word: STACK/)).toBeDefined();
    expect(screen.getByText(/Won/)).toBeDefined();
    expect(screen.getByText(/Duration: 0:01/)).toBeDefined(); // 700ms = 0:01
  });

  it('should render playback controls', () => {
    render(
      <ReplayViewer
        replay={mockReplay}
        onClose={() => {}}
      />
    );

    // Check for control buttons (by title attributes)
    expect(screen.getByTitle('Reset to beginning')).toBeDefined();
    expect(screen.getByTitle('Previous step')).toBeDefined();
    expect(screen.getByTitle('Play')).toBeDefined();
    expect(screen.getByTitle('Next step')).toBeDefined();
  });

  it('should show progress information', () => {
    render(
      <ReplayViewer
        replay={mockReplay}
        onClose={() => {}}
      />
    );

    expect(screen.getByText(/Step 1 of 8/)).toBeDefined(); // 8 total steps
    expect(screen.getByText('0%')).toBeDefined(); // At beginning
  });

  it('should render word grid and keyboard', () => {
    render(
      <ReplayViewer
        replay={mockReplay}
        onClose={() => {}}
      />
    );

    // The WordGrid and Keyboard components should be rendered
    // We can check for elements that would be present in those components
    const wordGridElements = screen.getAllByRole('gridcell');
    expect(wordGridElements.length).toBeGreaterThan(0);
  });

  it('should show speed control options', () => {
    render(
      <ReplayViewer
        replay={mockReplay}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Speed:')).toBeDefined();

    // Check for speed options in select
    const speedSelect = screen.getByDisplayValue('1x');
    expect(speedSelect).toBeDefined();
  });

  it('should format duration correctly', () => {
    const longReplay: GameReplay = {
      ...mockReplay,
      duration: 125000, // 2 minutes 5 seconds
    };

    render(
      <ReplayViewer
        replay={longReplay}
        onClose={() => {}}
      />
    );

    expect(screen.getByText(/Duration: 2:05/)).toBeDefined();
  });

  it('should show current step information', () => {
    render(
      <ReplayViewer
        replay={mockReplay}
        onClose={() => {}}
      />
    );

    // Initially should show game_start step
    expect(screen.getByText(/Current: game_start/)).toBeDefined();
  });

  it('should handle lost game outcome', () => {
    const lostReplay: GameReplay = {
      ...mockReplay,
      outcome: 'lost',
      finalAttemptCount: 6
    };

    render(
      <ReplayViewer
        replay={lostReplay}
        onClose={() => {}}
      />
    );

    expect(screen.getByText(/Lost/)).toBeDefined();
  });
});