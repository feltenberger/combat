import React, { useState } from 'react';
import { ChallengeData } from '../../types/firebase';
import { TankColor } from '../../config/constants';
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
