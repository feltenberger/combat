import React from 'react';
import { TankColor, TANK_COLORS } from '../../config/constants';

interface ColorPickerProps {
  selected: TankColor;
  onChange: (color: TankColor) => void;
  disabled?: TankColor[];
}

const COLOR_LABELS: Record<TankColor, string> = {
  blue: 'Blue',
  red: 'Red',
  green: 'Green',
  camo: 'Camo',
};

const ALL_COLORS: TankColor[] = ['blue', 'red', 'green', 'camo'];

export function ColorPicker({ selected, onChange, disabled = [] }: ColorPickerProps) {
  return (
    <div className="color-picker">
      {ALL_COLORS.map((color) => {
        const isDisabled = disabled.includes(color);
        const isSelected = selected === color;
        return (
          <button
            key={color}
            className={`color-swatch ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
            onClick={() => !isDisabled && onChange(color)}
            disabled={isDisabled}
            type="button"
            aria-label={COLOR_LABELS[color]}
          >
            <span
              className="color-circle"
              style={{ backgroundColor: TANK_COLORS[color].main }}
            />
            <span className="color-label">{COLOR_LABELS[color]}</span>
          </button>
        );
      })}
    </div>
  );
}
