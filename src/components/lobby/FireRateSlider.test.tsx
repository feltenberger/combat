import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FireRateSlider } from './FireRateSlider';
import { FIRE_RATE_PRESETS } from '../../config/constants';

describe('FireRateSlider', () => {
  it('renders all preset labels', () => {
    render(<FireRateSlider value={3} onChange={() => {}} />);
    for (const preset of FIRE_RATE_PRESETS) {
      expect(screen.getByText(preset.label)).toBeInTheDocument();
    }
  });

  it('highlights the active label', () => {
    render(<FireRateSlider value={1} onChange={() => {}} />);
    const fastLabel = screen.getByText('Fast');
    expect(fastLabel).toHaveClass('active');
    const classicLabel = screen.getByText('Classic');
    expect(classicLabel).not.toHaveClass('active');
  });

  it('shows detail text for the selected preset', () => {
    render(<FireRateSlider value={0} onChange={() => {}} />);
    expect(screen.getByText(/0\.1s cooldown/)).toBeInTheDocument();
    expect(screen.getByText(/5 bullets/)).toBeInTheDocument();
  });

  it('shows singular "bullet" for Classic preset', () => {
    render(<FireRateSlider value={3} onChange={() => {}} />);
    expect(screen.getByText(/1 bullet$/)).toBeInTheDocument();
  });

  it('calls onChange when slider value changes', () => {
    const onChange = vi.fn();
    render(<FireRateSlider value={3} onChange={onChange} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '1' } });
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('sets correct min/max on the range input', () => {
    render(<FireRateSlider value={2} onChange={() => {}} />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', String(FIRE_RATE_PRESETS.length - 1));
  });
});
