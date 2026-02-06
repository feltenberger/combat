import React, { useState } from 'react';
import { BotDifficulty, CpuPlayerConfig } from '../../types/game';
import { TankColor, MAX_CHALLENGE_CPUS } from '../../config/constants';
import { CPU_DIFFICULTY_NAMES } from '../../bot/cpuConstants';
import { buildCpuPlayers } from '../../firebase/cpuGame';

interface ChallengeSetupModalProps {
  targetName: string;
  hostColor: TankColor;
  onConfirm: (cpuPlayers?: CpuPlayerConfig[]) => void;
  onCancel: () => void;
}

const DIFFICULTIES: BotDifficulty[] = ['easy', 'defensive', 'offensive', 'hard'];

export function ChallengeSetupModal({ targetName, hostColor, onConfirm, onCancel }: ChallengeSetupModalProps) {
  const [addCpus, setAddCpus] = useState(false);
  const [botCount, setBotCount] = useState(1);
  const [difficulty1, setDifficulty1] = useState<BotDifficulty>('easy');
  const [difficulty2, setDifficulty2] = useState<BotDifficulty>('hard');

  const handleSend = () => {
    if (!addCpus) {
      onConfirm(undefined);
      return;
    }

    const diffs: BotDifficulty[] = [difficulty1];
    if (botCount >= 2) diffs.push(difficulty2);

    // Use the host color as a used color; guest color will be resolved
    // by IncomingChallenge, so we don't know it yet. Just avoid host color.
    const usedColors = new Set<TankColor>([hostColor]);
    const cpuPlayers = buildCpuPlayers(diffs, usedColors);
    onConfirm(cpuPlayers);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Challenge {targetName}</h3>

        <div className="cpu-toggle-section">
          <label className="cpu-toggle-label">
            <input
              type="checkbox"
              checked={addCpus}
              onChange={(e) => setAddCpus(e.target.checked)}
            />
            Add CPU opponents
          </label>
        </div>

        {addCpus && (
          <div className="cpu-setup-section">
            <div className="cpu-bot-count">
              <span className="bot-count-label">Bots:</span>
              {[1, 2].map((n) => (
                <button
                  key={n}
                  className={`bot-count-btn ${botCount === n ? 'selected' : ''}`}
                  onClick={() => setBotCount(n)}
                  disabled={n > MAX_CHALLENGE_CPUS}
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
          </div>
        )}

        <div className="modal-actions">
          <button onClick={handleSend} className="primary">
            Send Challenge
          </button>
          <button onClick={onCancel} className="secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
