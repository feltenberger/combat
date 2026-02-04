import React, { useState } from 'react';

interface NameEntryProps {
  onSubmit: (name: string) => void;
}

export function NameEntry({ onSubmit }: NameEntryProps) {
  const [name, setName] = useState(localStorage.getItem('combat-name') || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 16) return;
    localStorage.setItem('combat-name', trimmed);
    onSubmit(trimmed);
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
        <button type="submit" disabled={name.trim().length < 2}>
          Enter Lobby
        </button>
      </form>
    </div>
  );
}
