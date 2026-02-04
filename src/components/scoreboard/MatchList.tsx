import React from 'react';
import { MatchRecord } from '../../types/firebase';
import { MatchRow } from './MatchRow';

interface MatchListProps {
  matches: MatchRecord[];
}

export function MatchList({ matches }: MatchListProps) {
  if (matches.length === 0) {
    return (
      <div className="match-list empty">
        <p>No matches played yet</p>
      </div>
    );
  }

  return (
    <div className="match-list">
      <table>
        <thead>
          <tr>
            <th>Player 1</th>
            <th>Score</th>
            <th>Player 2</th>
            <th>Arena</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match, i) => (
            <MatchRow key={match.gameId || i} match={match} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
