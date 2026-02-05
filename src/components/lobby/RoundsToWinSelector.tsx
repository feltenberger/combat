import React from 'react';
import { ROUNDS_TO_WIN_OPTIONS } from '../../config/constants';

interface RoundsToWinSelectorProps {
  value: number;
  onChange: (value: number) => void;
}

export function RoundsToWinSelector({ value, onChange }: RoundsToWinSelectorProps) {
  return (
    <div className="rounds-buttons">
      {ROUNDS_TO_WIN_OPTIONS.map((n) => (
        <button
          key={n}
          className={`rounds-btn ${value === n ? 'selected' : ''}`}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
