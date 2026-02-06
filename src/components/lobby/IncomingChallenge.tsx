import React, { useState, useMemo } from 'react';
import { ChallengeData } from '../../types/firebase';
import { TankColor, ROUNDS_TO_WIN, FIRE_RATE_PRESETS, DEFAULT_FIRE_RATE, DEFAULT_LIVES_PER_ROUND } from '../../config/constants';
import { ARENAS } from '../../engine/Arena';
import { ColorPicker } from './ColorPicker';

interface IncomingChallengeProps {
  challenge: ChallengeData;
  myColor: TankColor;
  onAccept: (resolvedColor: TankColor) => void;
  onReject: () => void;
}

export function IncomingChallenge({ challenge, myColor, onAccept, onReject }: IncomingChallengeProps) {
  const cpuPlayers = Array.isArray(challenge.cpuPlayers) ? challenge.cpuPlayers : [];

  // Colors that must be disabled: challenger's color + any CPU colors
  const disabledColors = useMemo(() => {
    const colors: TankColor[] = [];
    if (challenge.fromColor) colors.push(challenge.fromColor);
    for (const cpu of cpuPlayers) {
      if (cpu.color && !colors.includes(cpu.color)) {
        colors.push(cpu.color);
      }
    }
    return colors;
  }, [challenge.fromColor, cpuPlayers]);

  const hasClash = disabledColors.includes(myColor);
  const [resolvedColor, setResolvedColor] = useState<TankColor>(() => {
    if (!hasClash) return myColor;
    // Pick first color not in disabledColors
    const allColors: TankColor[] = ['blue', 'red', 'green', 'camo'];
    return allColors.find(c => !disabledColors.includes(c)) || 'blue';
  });

  const lives = challenge.livesPerRound ?? DEFAULT_LIVES_PER_ROUND;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Challenge!</h3>
        <p><strong>{challenge.fromName}</strong> wants to battle!</p>
        <div className="challenge-details">
          <span>{ARENAS[challenge.arenaIndex]?.name ?? 'Unknown Arena'}</span>
          <span className="challenge-detail-sep">&middot;</span>
          <span>First to {challenge.roundsToWin ?? ROUNDS_TO_WIN}</span>
          <span className="challenge-detail-sep">&middot;</span>
          <span>{FIRE_RATE_PRESETS[challenge.fireRate ?? DEFAULT_FIRE_RATE]?.label ?? 'Classic'} fire</span>
          {lives > 1 && (
            <>
              <span className="challenge-detail-sep">&middot;</span>
              <span>{lives} lives</span>
            </>
          )}
        </div>
        {cpuPlayers.length > 0 && (
          <div className="cpu-opponents-info">
            <p className="cpu-opponents-label">CPU opponents included:</p>
            <ul className="cpu-opponents-list">
              {cpuPlayers.map((cpu, i) => (
                <li key={cpu.uid || i}>{cpu.name}</li>
              ))}
            </ul>
          </div>
        )}
        {hasClash && (
          <div className="color-clash">
            <p className="clash-message">
              Your color is taken! Pick a different one:
            </p>
            <ColorPicker
              selected={resolvedColor}
              onChange={setResolvedColor}
              disabled={disabledColors}
            />
          </div>
        )}
        <div className="modal-actions">
          <button onClick={() => onAccept(hasClash ? resolvedColor : myColor)} className="primary">
            Accept
          </button>
          <button onClick={onReject} className="secondary">
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
