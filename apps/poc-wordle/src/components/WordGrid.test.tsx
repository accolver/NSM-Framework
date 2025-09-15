import { describe, it, expect, afterEach } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import { WordGrid } from './WordGrid';

describe('WordGrid Component', () => {
  afterEach(() => {
    cleanup();
  });

  const mockWordGrid = [
    ['H', 'E', 'L', 'L', 'O'],
    ['W', 'O', 'R', 'L', 'D'],
    [null, null, null, null, null],
    [null, null, null, null, null],
    [null, null, null, null, null],
    [null, null, null, null, null]
  ];

  const mockStatusGrid = [
    ['correct', 'absent', 'present', 'absent', 'correct'],
    ['absent', 'correct', 'absent', 'present', 'absent'],
    [null, null, null, null, null],
    [null, null, null, null, null],
    [null, null, null, null, null],
    [null, null, null, null, null]
  ];

  it('should render a 6x5 grid', () => {
    render(<WordGrid wordGrid={mockWordGrid} statusGrid={mockStatusGrid} />);

    // Should render 30 cells (6 rows × 5 columns)
    const cells = screen.getAllByRole('gridcell');
    expect(cells).toHaveLength(30);
  });

  it('should display letters in correct positions', () => {
    render(<WordGrid wordGrid={mockWordGrid} statusGrid={mockStatusGrid} />);

    expect(screen.getByText('H')).toBeInTheDocument();
    expect(screen.getByText('E')).toBeInTheDocument();
    expect(screen.getByText('W')).toBeInTheDocument();
    // O appears twice in the grid (HELLO, WORLD), L appears 3 times (HELLO twice, WORLD once)
    expect(screen.getAllByText('O')).toHaveLength(2);
    expect(screen.getAllByText('L')).toHaveLength(3);
  });

  it('should apply correct status classes to letters', () => {
    render(<WordGrid wordGrid={mockWordGrid} statusGrid={mockStatusGrid} />);

    const hCell = screen.getByText('H').closest('[role="gridcell"]');
    const eCell = screen.getByText('E').closest('[role="gridcell"]');
    const lCells = screen.getAllByText('L');
    const lCell = lCells[0].closest('[role="gridcell"]');

    expect(hCell).toHaveClass('cell-correct');
    expect(eCell).toHaveClass('cell-absent');
    expect(lCell).toHaveClass('cell-present');
  });

  it('should render empty cells for null values', () => {
    render(<WordGrid wordGrid={mockWordGrid} statusGrid={mockStatusGrid} />);

    const cells = screen.getAllByRole('gridcell');
    const emptyCells = cells.filter(cell => cell.textContent === '');
    expect(emptyCells.length).toBeGreaterThan(0);
  });

  it('should have proper accessibility attributes', () => {
    render(<WordGrid wordGrid={mockWordGrid} statusGrid={mockStatusGrid} />);

    const grid = screen.getByRole('grid');
    expect(grid).toHaveAttribute('aria-label', 'Wordle game grid');

    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(6);
  });
});