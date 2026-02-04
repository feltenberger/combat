import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { initAuth } from './config/firebase';
import { LobbyPage } from './components/lobby/LobbyPage';
import { GamePage } from './components/game/GamePage';
import { ScoreboardPage } from './components/scoreboard/ScoreboardPage';

function App() {
  const [uid, setUid] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    initAuth()
      .then((user) => {
        setUid(user.uid);
        setAuthReady(true);
      })
      .catch((err) => {
        console.error('Auth failed:', err);
        // Still allow to proceed for development
        setUid('dev-' + Math.random().toString(36).slice(2, 8));
        setAuthReady(true);
      });
  }, []);

  if (!authReady) {
    return (
      <div className="loading-screen">
        <h1>COMBAT</h1>
        <p>Connecting...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LobbyPage uid={uid} />} />
        <Route path="/game/:gameId" element={<GamePage uid={uid} />} />
        <Route path="/scoreboard" element={<ScoreboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
