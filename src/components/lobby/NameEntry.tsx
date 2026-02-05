import React, { useState } from 'react';
import { TankColor } from '../../config/constants';
import { ColorPicker } from './ColorPicker';

interface NameEntryProps {
  onSubmit: (name: string, color: TankColor) => void;
  initialColor?: TankColor;
}

export function NameEntry({ onSubmit, initialColor = 'blue' }: NameEntryProps) {
  const [name, setName] = useState(localStorage.getItem('combat-name') || '');
  const [color, setColor] = useState<TankColor>(initialColor);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 16) return;
    localStorage.setItem('combat-name', trimmed);
    localStorage.setItem('combat-color', color);
    onSubmit(trimmed, color);
  };

  return (
    <div className="name-entry">
      <h1>COMBAT</h1>
      <p className="subtitle">Tank Battle Arena</p>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          maxLength={16}
          autoFocus
        />
        <ColorPicker selected={color} onChange={setColor} />
        <button type="submit" disabled={name.trim().length < 2}>
          Enter Lobby
        </button>
      </form>
    </div>
  );
}
