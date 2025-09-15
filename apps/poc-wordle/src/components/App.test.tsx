import { describe, it, expect, afterEach } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

describe('App Component', () => {
  afterEach(() => {
    cleanup();
  });

  it('should render all main components', () => {
    render(<App />);

    // Check for WordGrid (30 cells for 6x5 grid)
    const cells = screen.getAllByRole('gridcell');
    expect(cells).toHaveLength(30);

    // Check for Keyboard
    expect(screen.getByRole('button', { name: 'Q' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enter' })).toBeInTheDocument();

    // Check for GameStatus
    expect(screen.getByText(/attempt 1 of 6/i)).toBeInTheDocument();
  });

  it('should handle keyboard input integration', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Click on a virtual keyboard key
    const qKey = screen.getByRole('button', { name: 'Q' });
    await user.click(qKey);

    // Should show the letter in the grid (appears in both keyboard and grid, so at least 2)
    const qElements = screen.getAllByText('Q');
    expect(qElements.length).toBeGreaterThanOrEqual(2);
  });

  it('should handle physical keyboard input', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Focus the app container and type
    const appContainer = screen.getByRole('main');
    await user.click(appContainer);
    await user.keyboard('A');

    // Should show the letter in the grid (appears in both keyboard and grid, so at least 2)
    const aElements = screen.getAllByText('A');
    expect(aElements.length).toBeGreaterThanOrEqual(2);
  });

  it('should update game status after moves', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Focus the app and type some letters
    const appContainer = screen.getByRole('main');
    await user.click(appContainer);
    await user.keyboard('HELLO');

    // Submit the guess
    const enterKey = screen.getByRole('button', { name: 'Enter' });
    await user.click(enterKey);

    // Should advance to attempt 2
    expect(screen.getByText(/attempt 2 of 6/i)).toBeInTheDocument();
  });

  it('should have proper accessibility structure', () => {
    render(<App />);

    // Should have main landmark
    expect(screen.getByRole('main')).toBeInTheDocument();

    // Should have proper headings
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();

    // Should be keyboard navigable
    expect(screen.getByRole('main')).toHaveAttribute('tabIndex', '0');
  });
});