import React from 'react';

interface IncomingChallengeProps {
  fromName: string;
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingChallenge({ fromName, onAccept, onReject }: IncomingChallengeProps) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Challenge!</h3>
        <p><strong>{fromName}</strong> wants to battle!</p>
        <div className="modal-actions">
          <button onClick={onAccept} className="primary">
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
