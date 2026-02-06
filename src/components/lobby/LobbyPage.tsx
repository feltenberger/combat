import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { NameEntry } from './NameEntry';
import { PlayerList } from './PlayerList';
import { Player } from './PlayerList';
import { CpuPlayButton } from './CpuPlayButton';
import { ChallengeModal } from './ChallengeModal';
import { ChallengeSetupModal } from './ChallengeSetupModal';
import { IncomingChallenge } from './IncomingChallenge';
import { ColorPicker } from './ColorPicker';
import { FireRateSlider } from './FireRateSlider';
import { RoundsToWinSelector } from './RoundsToWinSelector';
import { LivesSelector } from './LivesSelector';
import { useFirebasePresence } from '../../hooks/useFirebasePresence';
import { sendChallenge, listenToChallenge, acceptChallenge, rejectChallenge, clearChallenge } from '../../firebase/lobby';
import { buildCpuGameConfig } from '../../firebase/cpuGame';
import { ChallengeData } from '../../types/firebase';
import { BotDifficulty, CpuPlayerConfig } from '../../types/game';
import { TankColor, DEFAULT_FIRE_RATE, ROUNDS_TO_WIN, DEFAULT_LIVES_PER_ROUND } from '../../config/constants';
import { ARENAS } from '../../engine/Arena';
import { getCpuUid, isCpuUid } from '../../bot/BotFactory';
import { CPU_DEFAULT_COLORS, CPU_DIFFICULTY_NAMES } from '../../bot/cpuConstants';
import { SoundManager, loadSoundPrefs, saveSoundPref } from '../../engine/SoundManager';

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
  const [setupTarget, setSetupTarget] = useState<{ uid: string; name: string } | null>(null);
  const [incomingChallenge, setIncomingChallenge] = useState<ChallengeData | null>(null);
  const [selectedArena, setSelectedArena] = useState(() => {
    const saved = localStorage.getItem('combat-arena');
    return saved !== null ? Number(saved) : 0;
  });
  const [fireRate, setFireRate] = useState(() => {
    const saved = localStorage.getItem('combat-fire-rate');
    return saved !== null ? Number(saved) : DEFAULT_FIRE_RATE;
  });
  const [roundsToWin, setRoundsToWin] = useState(() => {
    const saved = localStorage.getItem('combat-rounds-to-win');
    return saved !== null ? Number(saved) : ROUNDS_TO_WIN;
  });
  const [livesPerRound, setLivesPerRound] = useState(() => {
    const saved = localStorage.getItem('combat-lives-per-round');
    return saved !== null ? Number(saved) : DEFAULT_LIVES_PER_ROUND;
  });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sfxVolume, setSfxVolume] = useState(() => loadSoundPrefs().sfxVolume);
  const [sfxMuted, setSfxMuted] = useState(() => loadSoundPrefs().sfxMuted);
  const [musicVolume, setMusicVolume] = useState(() => loadSoundPrefs().musicVolume);
  const [musicMuted, setMusicMuted] = useState(() => loadSoundPrefs().musicMuted);

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

  // Lobby music
  const soundRef = useRef<SoundManager | null>(null);
  useEffect(() => {
    if (!hasEnteredName) return;
    const sm = new SoundManager();
    sm.resume();
    sm.applyPrefs(loadSoundPrefs());
    sm.startMusic();
    soundRef.current = sm;

    // Fallback: resume on first user gesture (autoplay policy)
    const resumeOnGesture = () => sm.resume();
    window.addEventListener('click', resumeOnGesture, { once: true });
    window.addEventListener('keydown', resumeOnGesture, { once: true });

    return () => {
      sm.stopMusic();
      sm.destroy();
      soundRef.current = null;
      window.removeEventListener('click', resumeOnGesture);
      window.removeEventListener('keydown', resumeOnGesture);
    };
  }, [hasEnteredName]);

  // Sync volume changes to live SoundManager
  useEffect(() => {
    soundRef.current?.setMusicVolume(musicMuted ? 0 : musicVolume);
  }, [musicVolume, musicMuted]);

  useEffect(() => {
    soundRef.current?.setSfxVolume(sfxMuted ? 0 : sfxVolume);
  }, [sfxVolume, sfxMuted]);

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

  const handleArenaChange = (i: number) => {
    setSelectedArena(i);
    localStorage.setItem('combat-arena', String(i));
  };

  const handleFireRateChange = (v: number) => {
    setFireRate(v);
    localStorage.setItem('combat-fire-rate', String(v));
  };

  const handleRoundsToWinChange = (v: number) => {
    setRoundsToWin(v);
    localStorage.setItem('combat-rounds-to-win', String(v));
  };

  const handleLivesPerRoundChange = (v: number) => {
    setLivesPerRound(v);
    localStorage.setItem('combat-lives-per-round', String(v));
  };

  const handleSfxVolumeChange = (v: number) => {
    setSfxVolume(v);
    saveSoundPref('sfxVolume', v);
  };
  const handleSfxMutedChange = (m: boolean) => {
    setSfxMuted(m);
    saveSoundPref('sfxMuted', m);
  };
  const handleMusicVolumeChange = (v: number) => {
    setMusicVolume(v);
    saveSoundPref('musicVolume', v);
  };
  const handleMusicMutedChange = (m: boolean) => {
    setMusicMuted(m);
    saveSoundPref('musicMuted', m);
  };

  // CPU player entries for the player list
  const cpuEntries: Player[] = useMemo(() => {
    const difficulties: BotDifficulty[] = ['easy', 'defensive', 'offensive', 'hard'];
    return difficulties.map(diff => ({
      uid: getCpuUid(diff),
      name: `CPU (${CPU_DIFFICULTY_NAMES[diff]})`,
      color: CPU_DEFAULT_COLORS[diff],
      isCpu: true,
    }));
  }, []);

  const handleStartCpuGame = useCallback((difficulties: BotDifficulty[]) => {
    if (!uid || !name) return;
    const { gameId, config: cpuConfig } = buildCpuGameConfig(uid, name, color, difficulties, selectedArena, fireRate, roundsToWin, livesPerRound);
    navigate(`/game/${gameId}`, { state: { cpuConfig } });
  }, [uid, name, color, selectedArena, fireRate, roundsToWin, livesPerRound, navigate]);

  const handleChallenge = useCallback((targetUid: string, targetName: string) => {
    if (!uid || !name) return;

    // If challenging a CPU, create game directly
    if (isCpuUid(targetUid)) {
      const difficulty = targetUid.replace('cpu-bot-', '') as BotDifficulty;
      handleStartCpuGame([difficulty]);
      return;
    }

    // Show setup modal for human players
    setSetupTarget({ uid: targetUid, name: targetName });
  }, [uid, name, handleStartCpuGame]);

  const handleSetupConfirm = useCallback((cpuPlayers?: CpuPlayerConfig[]) => {
    if (!uid || !name || !setupTarget) return;

    const { uid: targetUid, name: targetName } = setupTarget;
    setSetupTarget(null);
    setChallengingUid(targetUid);
    setChallengingName(targetName);
    sendChallenge(uid, name, targetUid, targetName, selectedArena, color, fireRate, roundsToWin, livesPerRound, cpuPlayers);

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
  }, [uid, name, setupTarget, selectedArena, color, fireRate, roundsToWin, livesPerRound, navigate]);

  const handleSetupCancel = useCallback(() => {
    setSetupTarget(null);
  }, []);

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
                onClick={() => handleArenaChange(i)}
              >
                {arena.name}
              </button>
            ))}
          </div>
        </div>

        <CpuPlayButton onStartCpuGame={handleStartCpuGame} />

        <PlayerList
          players={[...onlinePlayers, ...cpuEntries]}
          onChallenge={handleChallenge}
          challengingUid={challengingUid}
        />

        <div className="settings-section">
          <button
            className="settings-toggle"
            onClick={() => setSettingsOpen(o => !o)}
          >
            Settings {settingsOpen ? '\u25B2' : '\u25BC'}
          </button>

          {settingsOpen && (
            <div className="settings-body">
              <div className="color-select">
                <h3>Tank Color</h3>
                <ColorPicker selected={color} onChange={handleColorChange} />
              </div>

              <div className="fire-rate-select">
                <h3>Fire Rate</h3>
                <FireRateSlider value={fireRate} onChange={handleFireRateChange} />
              </div>

              <div className="rounds-select">
                <h3>Rounds to Win</h3>
                <RoundsToWinSelector value={roundsToWin} onChange={handleRoundsToWinChange} />
              </div>

              <div className="lives-select">
                <h3>Lives per Round</h3>
                <LivesSelector value={livesPerRound} onChange={handleLivesPerRoundChange} />
              </div>

              <div className="volume-select">
                <h3>Sound Effects</h3>
                <div className="volume-row">
                  <button
                    className={`volume-toggle ${sfxMuted ? 'muted' : ''}`}
                    onClick={() => handleSfxMutedChange(!sfxMuted)}
                    title={sfxMuted ? 'Unmute SFX' : 'Mute SFX'}
                  >
                    {sfxMuted ? 'OFF' : 'ON'}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={sfxVolume}
                    onChange={e => handleSfxVolumeChange(Number(e.target.value))}
                    disabled={sfxMuted}
                    className="volume-slider"
                  />
                  <span className="volume-value">{sfxMuted ? '--' : sfxVolume}</span>
                </div>
              </div>

              <div className="volume-select">
                <h3>Music</h3>
                <div className="volume-row">
                  <button
                    className={`volume-toggle ${musicMuted ? 'muted' : ''}`}
                    onClick={() => handleMusicMutedChange(!musicMuted)}
                    title={musicMuted ? 'Unmute Music' : 'Mute Music'}
                  >
                    {musicMuted ? 'OFF' : 'ON'}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={musicVolume}
                    onChange={e => handleMusicVolumeChange(Number(e.target.value))}
                    disabled={musicMuted}
                    className="volume-slider"
                  />
                  <span className="volume-value">{musicMuted ? '--' : musicVolume}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {setupTarget && (
        <ChallengeSetupModal
          targetName={setupTarget.name}
          hostColor={color}
          onConfirm={handleSetupConfirm}
          onCancel={handleSetupCancel}
        />
      )}

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
