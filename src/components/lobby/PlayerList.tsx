import React from 'react';
import { TankColor, TANK_COLORS } from '../../config/constants';

export interface Player {
  uid: string;
  name: string;
  color: TankColor;
  isCpu?: boolean;
}

interface PlayerListProps {
  players: Player[];
  onChallenge: (uid: string, name: string) => void;
  challengingUid: string | null;
}

export function PlayerList({ players, onChallenge, challengingUid }: PlayerListProps) {
  const humanPlayers = players.filter(p => !p.isCpu);
  const cpuPlayers = players.filter(p => p.isCpu);

  return (
    <div className="player-list">
      <h3>Online Players</h3>
      {humanPlayers.length === 0 && cpuPlayers.length === 0 && (
        <div className="empty-hint">
          <p>No other players online</p>
          <p className="hint">Open another browser tab to test!</p>
        </div>
      )}
      <ul>
        {humanPlayers.map((p) => (
          <li key={p.uid}>
            <span className="player-name">
              <span
                className="online-dot"
                style={{ backgroundColor: TANK_COLORS[p.color]?.main || '#44dd44' }}
              />
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
        {cpuPlayers.map((p) => (
          <li key={p.uid} className="cpu-player">
            <span className="player-name">
              <span
                className="online-dot cpu-dot"
                style={{ backgroundColor: TANK_COLORS[p.color]?.main || '#44dd44' }}
              />
              {p.name}
              <span className="cpu-badge">CPU</span>
            </span>
            <button
              onClick={() => onChallenge(p.uid, p.name)}
              disabled={challengingUid !== null}
            >
              Play
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
