import React from 'react';
import { LIVES_OPTIONS } from '../../config/constants';

interface LivesSelectorProps {
  value: number;
  onChange: (value: number) => void;
}

export function LivesSelector({ value, onChange }: LivesSelectorProps) {
  return (
    <div className="lives-buttons">
      {LIVES_OPTIONS.map((n) => (
        <button
          key={n}
          className={`lives-btn ${value === n ? 'selected' : ''}`}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
