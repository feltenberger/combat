import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { NameEntry } from './NameEntry';
import { PlayerList } from './PlayerList';
import { ChallengeModal } from './ChallengeModal';
import { IncomingChallenge } from './IncomingChallenge';
import { ColorPicker } from './ColorPicker';
import { useFirebasePresence } from '../../hooks/useFirebasePresence';
import { sendChallenge, listenToChallenge, acceptChallenge, rejectChallenge, clearChallenge } from '../../firebase/lobby';
import { ChallengeData } from '../../types/firebase';
import { TankColor } from '../../config/constants';
import { ARENAS } from '../../engine/Arena';

interface LobbyPageProps {
  uid: string | null;
}

export function LobbyPage({ uid }: LobbyPageProps) {
  const [name, setName] = useState(localStorage.getItem('combat-name') || '');
  const [hasEnteredName, setHasEnteredName] = useState(!!name);
  const [color, setColor] = useState<TankColor>(
    (localStorage.getItem('combat-color') as TankColor) || 'blue'
  );
  const [challengingUid, setChallengingUid] = useState<string | null>(null);
  const [challengingName, setChallengingName] = useState('');
  const [incomingChallenge, setIncomingChallenge] = useState<ChallengeData | null>(null);
  const [selectedArena, setSelectedArena] = useState(0);

  const navigate = useNavigate();
  const { onlinePlayers } = useFirebasePresence(
    hasEnteredName ? uid : null,
    name,
    color
  );

  // Listen for incoming challenges
  useEffect(() => {
    if (!uid || !hasEnteredName) return;
    const unsub = listenToChallenge(uid, (challenge) => {
      if (!challenge) {
        setIncomingChallenge(null);
        return;
      }
      if (challenge.status === 'accepted' && challenge.gameId) {
        clearChallenge(uid);
        navigate(`/game/${challenge.gameId}`);
        return;
      }
      if (challenge.status === 'pending' && challenge.from !== uid) {
        setIncomingChallenge(challenge);
      }
    });
    return unsub;
  }, [uid, hasEnteredName, navigate]);

  const handleNameSubmit = (n: string, c: TankColor) => {
    setName(n);
    setColor(c);
    setHasEnteredName(true);
  };

  const handleEditName = () => {
    setHasEnteredName(false);
  };

  const handleColorChange = (c: TankColor) => {
    setColor(c);
    localStorage.setItem('combat-color', c);
  };

  const handleChallenge = useCallback((targetUid: string, targetName: string) => {
    if (!uid || !name) return;
    setChallengingUid(targetUid);
    setChallengingName(targetName);
    sendChallenge(uid, name, targetUid, targetName, selectedArena, color);

    // Listen for response on the target's challenge node
    const unsub = listenToChallenge(targetUid, (challenge) => {
      if (!challenge) {
        // Challenge was cleared (rejected)
        setChallengingUid(null);
        setChallengingName('');
        unsub();
        return;
      }
      if (challenge.status === 'accepted' && challenge.gameId) {
        clearChallenge(uid);
        unsub();
        navigate(`/game/${challenge.gameId}`);
      }
    });
  }, [uid, name, selectedArena, color, navigate]);

  const handleCancelChallenge = () => {
    if (challengingUid) {
      clearChallenge(challengingUid);
    }
    setChallengingUid(null);
    setChallengingName('');
  };

  const handleAcceptChallenge = async (resolvedColor?: TankColor) => {
    if (!uid || !incomingChallenge) return;
    const finalColor = resolvedColor || color;
    const gameId = await acceptChallenge(uid, incomingChallenge, finalColor);
    setIncomingChallenge(null);
    navigate(`/game/${gameId}`);
  };

  const handleRejectChallenge = () => {
    if (!uid) return;
    rejectChallenge(uid);
    setIncomingChallenge(null);
  };

  if (!hasEnteredName) {
    return <NameEntry onSubmit={handleNameSubmit} initialColor={color} />;
  }

  return (
    <div className="lobby-page">
      <header className="lobby-header">
        <h1>COMBAT</h1>
        <div className="header-actions">
          <span className="user-name">Playing as: <strong>{name}</strong></span>
          <button onClick={handleEditName} className="secondary small">
            Edit
          </button>
          <button onClick={() => navigate('/scoreboard')} className="secondary small">
            Scoreboard
          </button>
        </div>
      </header>

      <div className="lobby-content">
        <div className="arena-select">
          <h3>Select Arena</h3>
          <div className="arena-buttons">
            {ARENAS.map((arena, i) => (
              <button
                key={i}
                className={`arena-btn ${selectedArena === i ? 'selected' : ''}`}
                onClick={() => setSelectedArena(i)}
              >
                {arena.name}
              </button>
            ))}
          </div>
        </div>

        <div className="color-select">
          <h3>Tank Color</h3>
          <ColorPicker selected={color} onChange={handleColorChange} />
        </div>

        <PlayerList
          players={onlinePlayers}
          onChallenge={handleChallenge}
          challengingUid={challengingUid}
        />
      </div>

      {challengingUid && (
        <ChallengeModal
          targetName={challengingName}
          onCancel={handleCancelChallenge}
        />
      )}

      {incomingChallenge && (
        <IncomingChallenge
          challenge={incomingChallenge}
          myColor={color}
          onAccept={handleAcceptChallenge}
          onReject={handleRejectChallenge}
        />
      )}
    </div>
  );
}
