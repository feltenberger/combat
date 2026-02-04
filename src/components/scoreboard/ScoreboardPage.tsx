import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MatchList } from './MatchList';
import { getRecentMatches } from '../../firebase/matchHistory';
import { MatchRecord } from '../../types/firebase';

export function ScoreboardPage() {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getRecentMatches(50).then((data) => {
      setMatches(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="scoreboard-page">
      <header className="scoreboard-header">
        <h1>COMBAT - Scoreboard</h1>
        <button onClick={() => navigate('/')} className="secondary">
          Back to Lobby
        </button>
      </header>
      <div className="scoreboard-content">
        {loading ? (
          <p className="loading">Loading matches...</p>
        ) : (
          <MatchList matches={matches} />
        )}
      </div>
    </div>
  );
}
