import { describe, it, expect, afterEach } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './components/App';

describe('User Experience Fix - STAIR Word Submission', () => {
  afterEach(() => {
    cleanup();
  });

  it('should now allow STAIR to be submitted via physical keyboard', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Focus the app
    const appContainer = screen.getByRole('main');
    await user.click(appContainer);

    // Type STAIR
    await user.keyboard('STAIR');

    // Verify STAIR appears in the grid
    const stairLetters = screen.getAllByText('S');
    expect(stairLetters.length).toBeGreaterThanOrEqual(1);

    // Press Enter to submit
    await user.keyboard('{Enter}');

    // Should advance to attempt 2 (indicating successful submission)
    expect(screen.getByText(/attempt 2 of 6/i)).toBeInTheDocument();
  });

  it('should now allow STAIR to be submitted via virtual keyboard', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Click virtual keyboard letters to spell STAIR
    const sKey = screen.getByRole('button', { name: 'S' });
    const tKey = screen.getByRole('button', { name: 'T' });
    const aKey = screen.getByRole('button', { name: 'A' });
    const iKey = screen.getByRole('button', { name: 'I' });
    const rKey = screen.getByRole('button', { name: 'R' });

    await user.click(sKey);
    await user.click(tKey);
    await user.click(aKey);
    await user.click(iKey);
    await user.click(rKey);

    // Click Enter button
    const enterButton = screen.getByRole('button', { name: 'Enter' });
    await user.click(enterButton);

    // Should advance to attempt 2 (indicating successful submission)
    expect(screen.getByText(/attempt 2 of 6/i)).toBeInTheDocument();
  });

  it('should still reject invalid words like XYZZZ', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Focus and type invalid word
    const appContainer = screen.getByRole('main');
    await user.click(appContainer);
    await user.keyboard('XYZZZ');

    // Press Enter
    await user.keyboard('{Enter}');

    // Should still be on attempt 1 (failed submission)
    expect(screen.getByText(/attempt 1 of 6/i)).toBeInTheDocument();
  });
});