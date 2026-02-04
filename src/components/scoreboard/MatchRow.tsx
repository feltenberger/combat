import React from 'react';
import { MatchRecord } from '../../types/firebase';
import { ARENAS } from '../../engine/Arena';

interface MatchRowProps {
  match: MatchRecord;
}

export function MatchRow({ match }: MatchRowProps) {
  const date = new Date(match.completedAt);
  const timeStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const arenaName = ARENAS[match.arenaIndex]?.name || 'Unknown';

  const hostWon = match.winnerUid === match.hostUid;

  return (
    <tr>
      <td className={hostWon ? 'winner' : ''}>{match.hostName}</td>
      <td className="score">{match.hostScore} - {match.guestScore}</td>
      <td className={!hostWon ? 'winner' : ''}>{match.guestName}</td>
      <td className="arena">{arenaName}</td>
      <td className="time">{timeStr}</td>
    </tr>
  );
}
