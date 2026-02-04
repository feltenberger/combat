import React from 'react';

interface Player {
  uid: string;
  name: string;
}

interface PlayerListProps {
  players: Player[];
  onChallenge: (uid: string, name: string) => void;
  challengingUid: string | null;
}

export function PlayerList({ players, onChallenge, challengingUid }: PlayerListProps) {
  if (players.length === 0) {
    return (
      <div className="player-list empty">
        <p>No other players online</p>
        <p className="hint">Open another browser tab to test!</p>
      </div>
    );
  }

  return (
    <div className="player-list">
      <h3>Online Players</h3>
      <ul>
        {players.map((p) => (
          <li key={p.uid}>
            <span className="player-name">
              <span className="online-dot" />
              {p.name}
            </span>
            <button
              onClick={() => onChallenge(p.uid, p.name)}
              disabled={challengingUid !== null}
            >
              {challengingUid === p.uid ? 'Challenging...' : 'Challenge'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
