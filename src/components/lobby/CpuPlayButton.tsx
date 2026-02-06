import React, { useState } from 'react';
import { BotDifficulty } from '../../types/game';
import { CPU_DIFFICULTY_NAMES } from '../../bot/cpuConstants';
import { MAX_CPU_OPPONENTS } from '../../config/constants';

interface CpuPlayButtonProps {
  onStartCpuGame: (difficulties: BotDifficulty[]) => void;
}

const DIFFICULTIES: BotDifficulty[] = ['easy', 'defensive', 'offensive', 'hard'];

export function CpuPlayButton({ onStartCpuGame }: CpuPlayButtonProps) {
  const [botCount, setBotCount] = useState(1);
  const [difficulty1, setDifficulty1] = useState<BotDifficulty>('easy');
  const [difficulty2, setDifficulty2] = useState<BotDifficulty>('hard');

  const handleStart = () => {
    const diffs: BotDifficulty[] = [difficulty1];
    if (botCount >= 2) diffs.push(difficulty2);
    onStartCpuGame(diffs);
  };

  return (
    <div className="cpu-play-section">
      <h3>Play vs CPU</h3>
      <div className="cpu-bot-count">
        <span className="bot-count-label">Bots:</span>
        {[1, 2].map((n) => (
          <button
            key={n}
            className={`bot-count-btn ${botCount === n ? 'selected' : ''}`}
            onClick={() => setBotCount(n)}
            disabled={n > MAX_CPU_OPPONENTS}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="cpu-bot-config">
        <div className="cpu-bot-row">
          {botCount > 1 && <span className="bot-label">Bot 1:</span>}
          <div className="cpu-difficulty-buttons">
            {DIFFICULTIES.map((diff) => (
              <button
                key={diff}
                className={`difficulty-btn ${difficulty1 === diff ? 'selected' : ''}`}
                onClick={() => setDifficulty1(diff)}
              >
                {CPU_DIFFICULTY_NAMES[diff]}
              </button>
            ))}
          </div>
        </div>
        {botCount >= 2 && (
          <div className="cpu-bot-row">
            <span className="bot-label">Bot 2:</span>
            <div className="cpu-difficulty-buttons">
              {DIFFICULTIES.map((diff) => (
                <button
                  key={diff}
                  className={`difficulty-btn ${difficulty2 === diff ? 'selected' : ''}`}
                  onClick={() => setDifficulty2(diff)}
                >
                  {CPU_DIFFICULTY_NAMES[diff]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <button
        className="primary cpu-start-btn"
        onClick={handleStart}
      >
        Start Game
      </button>
    </div>
  );
}
