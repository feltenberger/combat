import React from 'react';
import { FIRE_RATE_PRESETS } from '../../config/constants';

interface FireRateSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function FireRateSlider({ value, onChange }: FireRateSliderProps) {
  return (
    <div className="fire-rate-slider">
      <input
        type="range"
        min={0}
        max={FIRE_RATE_PRESETS.length - 1}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Fire rate"
      />
      <div className="fire-rate-labels">
        {FIRE_RATE_PRESETS.map((preset, i) => (
          <span key={preset.label} className={i === value ? 'active' : ''}>
            {preset.label}
          </span>
        ))}
      </div>
      <div className="fire-rate-detail">
        {FIRE_RATE_PRESETS[value].cooldown}s cooldown &middot; {FIRE_RATE_PRESETS[value].maxBullets} bullet{FIRE_RATE_PRESETS[value].maxBullets !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
