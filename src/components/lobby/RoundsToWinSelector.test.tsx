import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoundsToWinSelector } from './RoundsToWinSelector';
import { ROUNDS_TO_WIN_OPTIONS } from '../../config/constants';

describe('RoundsToWinSelector', () => {
  it('renders all round options', () => {
    render(<RoundsToWinSelector value={2} onChange={() => {}} />);
    for (const n of ROUNDS_TO_WIN_OPTIONS) {
      expect(screen.getByText(String(n))).toBeInTheDocument();
    }
  });

  it('highlights the selected value', () => {
    render(<RoundsToWinSelector value={3} onChange={() => {}} />);
    expect(screen.getByText('3')).toHaveClass('selected');
    expect(screen.getByText('2')).not.toHaveClass('selected');
  });

  it('calls onChange when a button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RoundsToWinSelector value={2} onChange={onChange} />);
    await user.click(screen.getByText('5'));
    expect(onChange).toHaveBeenCalledWith(5);
  });
});
