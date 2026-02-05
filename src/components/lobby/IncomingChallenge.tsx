import React, { useState } from 'react';
import { ChallengeData } from '../../types/firebase';
import { TankColor, ROUNDS_TO_WIN, FIRE_RATE_PRESETS, DEFAULT_FIRE_RATE } from '../../config/constants';
import { ARENAS } from '../../engine/Arena';
import { ColorPicker } from './ColorPicker';

interface IncomingChallengeProps {
  challenge: ChallengeData;
  myColor: TankColor;
  onAccept: (resolvedColor: TankColor) => void;
  onReject: () => void;
}

export function IncomingChallenge({ challenge, myColor, onAccept, onReject }: IncomingChallengeProps) {
  const hasClash = challenge.fromColor === myColor;
  const [resolvedColor, setResolvedColor] = useState<TankColor>(
    hasClash ? (myColor === 'blue' ? 'red' : 'blue') : myColor
  );

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
        </div>
        {hasClash && (
          <div className="color-clash">
            <p className="clash-message">
              You both chose the same color! Pick a different one:
            </p>
            <ColorPicker
              selected={resolvedColor}
              onChange={setResolvedColor}
              disabled={[challenge.fromColor!]}
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
