import React from 'react';

interface ChallengeModalProps {
  targetName: string;
  onCancel: () => void;
}

export function ChallengeModal({ targetName, onCancel }: ChallengeModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Challenge Sent</h3>
        <p>Waiting for <strong>{targetName}</strong> to respond...</p>
        <div className="spinner" />
        <button onClick={onCancel} className="secondary">
          Cancel
        </button>
      </div>
    </div>
  );
}
