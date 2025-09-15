import { describe, it, expect, mock, afterEach } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Keyboard } from './Keyboard';

describe('Keyboard Component', () => {
  afterEach(() => {
    cleanup();
  });

  const mockKeyboardStatus = {
    'A': 'correct',
    'B': 'absent',
    'C': 'present',
    'D': 'correct'
  };

  const mockOnKeyPress = mock();
  const mockOnBackspace = mock();
  const mockOnEnter = mock();

  const defaultProps = {
    keyboardStatus: mockKeyboardStatus,
    onKeyPress: mockOnKeyPress,
    onBackspace: mockOnBackspace,
    onEnter: mockOnEnter
  };

  it('should render all alphabet keys', () => {
    render(<Keyboard {...defaultProps} />);

    const qwertyRows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

    qwertyRows.forEach(row => {
      row.split('').forEach(letter => {
        expect(screen.getByRole('button', { name: letter })).toBeInTheDocument();
      });
    });
  });

  it('should render Backspace and Enter keys', () => {
    render(<Keyboard {...defaultProps} />);

    expect(screen.getByRole('button', { name: 'Backspace' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enter' })).toBeInTheDocument();
  });

  it('should apply status classes to keys', () => {
    render(<Keyboard {...defaultProps} />);

    const aKey = screen.getByRole('button', { name: 'A' });
    const bKey = screen.getByRole('button', { name: 'B' });
    const cKey = screen.getByRole('button', { name: 'C' });

    expect(aKey).toHaveClass('key-correct');
    expect(bKey).toHaveClass('key-absent');
    expect(cKey).toHaveClass('key-present');
  });

  it('should call onKeyPress when letter key is clicked', async () => {
    const user = userEvent.setup();
    render(<Keyboard {...defaultProps} />);

    const qKey = screen.getByRole('button', { name: 'Q' });
    await user.click(qKey);

    expect(mockOnKeyPress).toHaveBeenCalledWith('Q');
  });

  it('should call onBackspace when Backspace key is clicked', async () => {
    const user = userEvent.setup();
    render(<Keyboard {...defaultProps} />);

    const backspaceKey = screen.getByRole('button', { name: 'Backspace' });
    await user.click(backspaceKey);

    expect(mockOnBackspace).toHaveBeenCalled();
  });
});