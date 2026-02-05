import React, { useState } from 'react';
import { BotDifficulty } from '../../types/game';
import { CPU_DIFFICULTY_NAMES } from '../../bot/cpuConstants';

interface CpuPlayButtonProps {
  onStartCpuGame: (difficulty: BotDifficulty) => void;
}

const DIFFICULTIES: BotDifficulty[] = ['easy', 'defensive', 'offensive', 'hard'];

export function CpuPlayButton({ onStartCpuGame }: CpuPlayButtonProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<BotDifficulty>('easy');

  return (
    <div className="cpu-play-section">
      <h3>Play vs CPU</h3>
      <div className="cpu-difficulty-buttons">
        {DIFFICULTIES.map((diff) => (
          <button
            key={diff}
            className={`difficulty-btn ${selectedDifficulty === diff ? 'selected' : ''}`}
            onClick={() => setSelectedDifficulty(diff)}
          >
            {CPU_DIFFICULTY_NAMES[diff]}
          </button>
        ))}
      </div>
      <button
        className="primary cpu-start-btn"
        onClick={() => onStartCpuGame(selectedDifficulty)}
      >
        Start Game
      </button>
    </div>
  );
}
