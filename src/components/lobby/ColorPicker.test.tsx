import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColorPicker } from './ColorPicker';

describe('ColorPicker', () => {
  it('renders all 4 color options', () => {
    render(<ColorPicker selected="blue" onChange={() => {}} />);
    expect(screen.getByLabelText('Blue')).toBeInTheDocument();
    expect(screen.getByLabelText('Red')).toBeInTheDocument();
    expect(screen.getByLabelText('Green')).toBeInTheDocument();
    expect(screen.getByLabelText('Camo')).toBeInTheDocument();
  });

  it('calls onChange when a color is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorPicker selected="blue" onChange={onChange} />);

    await user.click(screen.getByLabelText('Red'));
    expect(onChange).toHaveBeenCalledWith('red');
  });

  it('does not call onChange for disabled colors', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorPicker selected="blue" onChange={onChange} disabled={['red']} />);

    await user.click(screen.getByLabelText('Red'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('marks the selected color with selected class', () => {
    render(<ColorPicker selected="green" onChange={() => {}} />);
    expect(screen.getByLabelText('Green')).toHaveClass('selected');
    expect(screen.getByLabelText('Blue')).not.toHaveClass('selected');
  });

  it('marks disabled colors with disabled attribute', () => {
    render(<ColorPicker selected="blue" onChange={() => {}} disabled={['camo']} />);
    expect(screen.getByLabelText('Camo')).toBeDisabled();
    expect(screen.getByLabelText('Blue')).not.toBeDisabled();
  });
});
