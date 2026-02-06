import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { GameCanvas, GameCanvasHandle } from './GameCanvas';
import { TouchControls } from './TouchControls';
import { GameEngine } from '../../engine/GameEngine';
import { Renderer } from '../../renderer/Renderer';
import { InputManager } from '../../engine/InputManager';
import { Bullet } from '../../engine/Bullet';
import { GameSyncService } from '../../firebase/gameSync';
import { saveMatchResult } from '../../firebase/matchHistory';
import { useGameLoop } from '../../hooks/useGameLoop';
import { PlayerInput, GameState, CpuPlayerConfig } from '../../types/game';
import { GameRoom } from '../../types/firebase';
import { STATE_BROADCAST_INTERVAL, ROUNDS_TO_WIN, COUNTDOWN_DURATION, TankColor, DEFAULT_FIRE_RATE, DEFAULT_LIVES_PER_ROUND } from '../../config/constants';
import { lerpAngle, lerp } from '../../utils/math';
import { createBot } from '../../bot/BotFactory';
import { BotBrain } from '../../bot/BotBrain';
import { findNearestAliveOpponent } from '../../bot/BotUtilities';
import { SoundManager, loadSoundPrefs } from '../../engine/SoundManager';

interface GamePageProps {
  uid: string | null;
}

export function GamePage({ uid }: GamePageProps) {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const gamePageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<GameCanvasHandle>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const rendererRef = useRef(new Renderer());
  const inputManagerRef = useRef(new InputManager());
  const syncRef = useRef<GameSyncService | null>(null);

  const [config, setConfig] = useState<GameRoom['config'] | null>(null);
  const [disconnected, setDisconnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isHost = useRef(false);
  const remoteInputRef = useRef<PlayerInput>({
    left: false, right: false, up: false, down: false, fire: false, timestamp: 0,
  });
  const lastBroadcastRef = useRef(0);
  const playerOrderRef = useRef<string[]>([]);
  const playerNamesRef = useRef<Record<string, string>>({});
  const playerColorsRef = useRef<Record<string, TankColor>>({});
  const matchResultSavedRef = useRef(false);
  const isCpuGameRef = useRef(false);
  const botsRef = useRef<Map<string, BotBrain>>(new Map());
  const soundRef = useRef<SoundManager | null>(null);

  // For guest interpolation
  const prevStateRef = useRef<GameState | null>(null);
  const nextStateRef = useRef<GameState | null>(null);
  const stateReceivedTimeRef = useRef(0);
  const configRef = useRef<GameRoom['config'] | null>(null);
  const lastSoundStateRef = useRef<GameState | null>(null);

  // Helper to initialize game engine from config
  const initFromConfig = useCallback((cfg: GameRoom['config']) => {
    setConfig(cfg);
    configRef.current = cfg;

    isHost.current = cfg.hostUid === uid;

    // Build player order: host, guest, then additional CPU players
    const cpuPlayers = cfg.cpuPlayers || [];
    const allUids = new Set<string>([cfg.hostUid, cfg.guestUid]);
    for (const cpu of cpuPlayers) {
      allUids.add(cpu.uid);
    }
    playerOrderRef.current = Array.from(allUids);

    // Build names
    const names: Record<string, string> = {
      [cfg.hostUid]: cfg.hostName,
      [cfg.guestUid]: cfg.guestName,
    };
    for (const cpu of cpuPlayers) {
      names[cpu.uid] = cpu.name;
    }
    playerNamesRef.current = names;

    // Build colors
    const colors: Record<string, TankColor> = {
      [cfg.hostUid]: cfg.hostColor || 'blue',
      [cfg.guestUid]: cfg.guestColor || 'red',
    };
    for (const cpu of cpuPlayers) {
      colors[cpu.uid] = cpu.color;
    }
    playerColorsRef.current = colors;

    if (!engineRef.current) {
      const livesPerRound = cfg.livesPerRound ?? DEFAULT_LIVES_PER_ROUND;
      const engine = new GameEngine(cfg.arenaIndex, cfg.roundsToWin || ROUNDS_TO_WIN, cfg.fireRate ?? DEFAULT_FIRE_RATE, livesPerRound);
      for (const pUid of playerOrderRef.current) {
        engine.addPlayer(pUid);
      }
      engine.sound = soundRef.current;
      engineRef.current = engine;
      engine.startMatch();
    }
  }, [uid]);

  // CPU game setup — fully local, no Firebase
  useEffect(() => {
    const cpuConfig = (location.state as { cpuConfig?: GameRoom['config'] })?.cpuConfig;
    if (!cpuConfig || !uid) return;

    isCpuGameRef.current = true;

    // Create bot instances from cpuPlayers array or fall back to single cpuDifficulty
    const cpuPlayers = cpuConfig.cpuPlayers || [];
    if (cpuPlayers.length > 0) {
      for (const cpu of cpuPlayers) {
        botsRef.current.set(cpu.uid, createBot(cpu.difficulty));
      }
    } else if (cpuConfig.cpuDifficulty) {
      botsRef.current.set(cpuConfig.guestUid, createBot(cpuConfig.cpuDifficulty));
    }

    const sm = new SoundManager();
    sm.resume();
    sm.applyPrefs(loadSoundPrefs());
    soundRef.current = sm;
    inputManagerRef.current.bind();
    initFromConfig(cpuConfig);

    return () => {
      inputManagerRef.current.unbind();
      sm.destroy();
      soundRef.current = null;
    };
  }, [uid, location.state, initFromConfig]);

  // Online game setup — uses Firebase
  useEffect(() => {
    const cpuConfig = (location.state as { cpuConfig?: GameRoom['config'] })?.cpuConfig;
    if (cpuConfig) return; // CPU games handled above
    if (!uid || !gameId) return;

    const sm = new SoundManager();
    sm.resume();
    sm.applyPrefs(loadSoundPrefs());
    soundRef.current = sm;

    const sync = new GameSyncService(gameId, uid);
    syncRef.current = sync;

    sync.setupDisconnect();
    inputManagerRef.current.bind();

    let presenceSetUp = false;

    sync.listenToConfig((cfg) => {
      if (!cfg) return;
      initFromConfig(cfg);

      if (!engineRef.current) return;

      // If host, create bots for any CPU players and listen for remote human input
      if (isHost.current) {
        const cpuPlayers = cfg.cpuPlayers || [];
        if (cpuPlayers.length > 0) {
          for (const cpu of cpuPlayers) {
            if (!botsRef.current.has(cpu.uid)) {
              botsRef.current.set(cpu.uid, createBot(cpu.difficulty));
            }
          }
        }

        // Listen for human guest input (if guest is not a CPU)
        const humanGuest = !cpuPlayers.some(c => c.uid === cfg.guestUid);
        if (humanGuest) {
          sync.listenToInput(cfg.guestUid, (input) => {
            remoteInputRef.current = input;
          });
        }
      } else {
        sync.listenToState((state) => {
          const prev = nextStateRef.current;
          prevStateRef.current = prev;
          nextStateRef.current = state;
          stateReceivedTimeRef.current = performance.now();

          // Guest-side sound detection from state diffs
          const sm = soundRef.current;
          if (sm && prev && state.phase === 'PLAYING') {
            const prevBullets = Array.isArray(prev.bullets) ? prev.bullets : [];
            const nextBullets = Array.isArray(state.bullets) ? state.bullets : [];
            const prevIds = new Set(prevBullets.map(b => b.id));
            const nextIds = new Set(nextBullets.map(b => b.id));

            // New bullets -> gunshot
            for (const id of nextIds) {
              if (!prevIds.has(id)) sm.playGunshot();
            }

            // Disappeared bullets -> wall hit, rock hit, or explosion
            for (const id of prevIds) {
              if (!nextIds.has(id)) {
                // Check if a tank died (explosion)
                const prevTanks = prev.tanks || {};
                const nextTanks = state.tanks || {};
                let tankDied = false;
                for (const tUid of Object.keys(nextTanks)) {
                  if (prevTanks[tUid]?.alive && !nextTanks[tUid]?.alive) {
                    tankDied = true;
                    break;
                  }
                }
                if (tankDied) {
                  sm.playExplosion();
                } else {
                  // Check if any rock HP decreased
                  const prevRock = prev.rockHP || {};
                  const nextRock = state.rockHP || {};
                  let rockHit = false;
                  for (const key of Object.keys(nextRock)) {
                    if (prevRock[key] !== undefined && nextRock[key] < prevRock[key]) {
                      rockHit = true;
                      break;
                    }
                  }
                  if (rockHit) {
                    sm.playRockHit();
                  } else {
                    sm.playWallHit();
                  }
                }
              }
            }
          }
        });
      }

      if (!presenceSetUp) {
        presenceSetUp = true;
        const opponentUid = cfg.hostUid === uid ? cfg.guestUid : cfg.hostUid;
        let opponentSeen = false;
        sync.listenToPresence(opponentUid, (online) => {
          if (online) {
            opponentSeen = true;
          } else if (opponentSeen) {
            setDisconnected(true);
          }
        });
      }
    });

    // Fallback gesture listener for autoplay policy
    const resumeOnGesture = () => sm.resume();
    window.addEventListener('click', resumeOnGesture, { once: true });
    window.addEventListener('keydown', resumeOnGesture, { once: true });

    return () => {
      inputManagerRef.current.unbind();
      sync.cleanup();
      sm.destroy();
      soundRef.current = null;
      window.removeEventListener('click', resumeOnGesture);
      window.removeEventListener('keydown', resumeOnGesture);
    };
  }, [uid, gameId, location.state, initFromConfig]);

  // Game loop
  useGameLoop((dt) => {
    const engine = engineRef.current;
    const ctx = canvasRef.current?.getContext();
    if (!engine || !ctx) return;

    if (isHost.current) {
      const localInput = inputManagerRef.current.getInput();
      const inputs = new Map<string, PlayerInput>();
      inputs.set(uid!, localInput);

      const currentState = engine.getState();
      const allPlayerUids = playerOrderRef.current;

      // Generate bot inputs
      for (const [botUid, bot] of botsRef.current.entries()) {
        const otherUids = allPlayerUids.filter(id => id !== botUid);
        const nearestOpponent = findNearestAliveOpponent(botUid, otherUids, currentState);

        const botInput = bot.update({
          myUid: botUid,
          opponentUid: nearestOpponent || otherUids[0] || uid!,
          allOpponentUids: otherUids,
          gameState: currentState,
          arena: engine.arena,
          dt,
          gameTime: engine.gameTime,
        });
        inputs.set(botUid, botInput);

        // Reset bots on new round
        if (engine.phase === 'COUNTDOWN' && engine.countdown >= COUNTDOWN_DURATION - 0.1) {
          bot.reset();
        }
      }

      // For online games, get remote human input
      if (!isCpuGameRef.current) {
        // Find human players who are not the local player and not bots
        for (const pUid of allPlayerUids) {
          if (pUid !== uid && !botsRef.current.has(pUid)) {
            inputs.set(pUid, remoteInputRef.current);
          }
        }

        syncRef.current?.writeInput(localInput);
      }

      engine.update(dt, inputs);

      if (!isCpuGameRef.current) {
        const now = performance.now();
        if (now - lastBroadcastRef.current >= STATE_BROADCAST_INTERVAL) {
          syncRef.current?.writeState(engine.getState());
          lastBroadcastRef.current = now;
        }
      }

      // Save match result when match is over
      if (engine.phase === 'MATCH_OVER' && !matchResultSavedRef.current) {
        matchResultSavedRef.current = true;
        if (!isCpuGameRef.current) {
          syncRef.current?.finishGame();
        }
        const cfg = configRef.current;
        if (cfg && engine.matchWinner) {
          const cpuPlayers = cfg.cpuPlayers || [];
          const players = playerOrderRef.current.map(pUid => ({
            uid: pUid,
            name: playerNamesRef.current[pUid] || 'Unknown',
            score: engine.scores.get(pUid) || 0,
            color: playerColorsRef.current[pUid],
            isCpu: botsRef.current.has(pUid),
          }));

          saveMatchResult({
            gameId: gameId!,
            hostUid: cfg.hostUid,
            hostName: cfg.hostName,
            guestUid: cfg.guestUid,
            guestName: cfg.guestName,
            winnerUid: engine.matchWinner,
            winnerName: playerNamesRef.current[engine.matchWinner] || 'Unknown',
            hostScore: engine.scores.get(cfg.hostUid) || 0,
            guestScore: engine.scores.get(cfg.guestUid) || 0,
            rounds: engine.round,
            arenaIndex: cfg.arenaIndex,
            completedAt: Date.now(),
            cpuDifficulty: cfg.cpuDifficulty,
            players,
            livesPerRound: cfg.livesPerRound,
            playerCount: playerOrderRef.current.length,
          });
        }
      }
    } else {
      // Guest: write input, interpolate from state snapshots
      const localInput = inputManagerRef.current.getInput();
      syncRef.current?.writeInput(localInput);

      if (nextStateRef.current) {
        if (prevStateRef.current && stateReceivedTimeRef.current > 0) {
          const elapsed = performance.now() - stateReceivedTimeRef.current;
          const t = Math.min(elapsed / STATE_BROADCAST_INTERVAL, 1);

          const prev = prevStateRef.current;
          const next = nextStateRef.current;

          const nextTanks = next.tanks || {};
          const prevTanks = prev.tanks || {};
          for (const tankUid of Object.keys(nextTanks)) {
            const prevTank = prevTanks[tankUid];
            const nextTank = nextTanks[tankUid];
            if (prevTank && nextTank) {
              const tank = engine.tanks.get(tankUid);
              if (tank) {
                tank.x = lerp(prevTank.x, nextTank.x, t);
                tank.y = lerp(prevTank.y, nextTank.y, t);
                tank.angle = lerpAngle(prevTank.angle, nextTank.angle, t);
                tank.alive = nextTank.alive;
                if (nextTank.lives !== undefined) tank.lives = nextTank.lives;
                if (nextTank.eliminated !== undefined) tank.eliminated = nextTank.eliminated;
                if (nextTank.invincible !== undefined) {
                  tank.invincibilityTimer = nextTank.invincible ? 0.1 : 0;
                }
              }
            } else if (nextTank) {
              const tank = engine.tanks.get(tankUid);
              if (tank) tank.setState(nextTank);
            }
          }

          engine.phase = next.phase;
          engine.round = next.round;
          engine.countdown = next.countdown;
          engine.roundResult = next.roundResult;
          engine.matchWinner = next.matchWinner;
          if (next.rockHP) engine.arena.setRockHPFromMap(next.rockHP);

          if (next.scores) {
            for (const [scoreUid, score] of Object.entries(next.scores)) {
              engine.scores.set(scoreUid, score);
            }
          }

          const nextBullets = Array.isArray(next.bullets) ? next.bullets : [];
          const prevBullets = Array.isArray(prev.bullets) ? prev.bullets : [];
          engine.bullets = [];
          for (const bs of nextBullets) {
            const prevBullet = prevBullets.find(b => b.id === bs.id);
            const b = new Bullet(bs.id, bs.x, bs.y, bs.angle, bs.ownerId, bs.spawnTime);
            if (prevBullet) {
              b.x = lerp(prevBullet.x, bs.x, t);
              b.y = lerp(prevBullet.y, bs.y, t);
            }
            engine.bullets.push(b);
          }
        } else {
          engine.applyState(nextStateRef.current);
        }
      }

      engine.particles.update(dt);
    }

    // Render
    rendererRef.current.render(
      ctx,
      engine,
      playerOrderRef.current,
      playerNamesRef.current,
      disconnected,
      playerColorsRef.current,
    );
  }, !!config);

  const leaveGame = useCallback(() => {
    syncRef.current?.cleanup();
    navigate('/');
  }, [navigate]);

  // Fullscreen the game-page div, not document.documentElement.
  // Fullscreening <html> breaks position:fixed touch controls on mobile.
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      gamePageRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  // Handle ESC to return to lobby
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        leaveGame();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [leaveGame]);

  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  return (
    <div className="game-page" ref={gamePageRef}>
      <GameCanvas ref={canvasRef} />
      {isTouchDevice && <TouchControls inputManager={inputManagerRef.current} />}
      {isTouchDevice && (
        <button className="fullscreen-btn" onClick={toggleFullscreen}>
          {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </button>
      )}
      <button className="back-to-lobby" onClick={leaveGame}>
        {isTouchDevice ? 'Leave Game' : 'ESC \u2014 Leave Game'}
      </button>
    </div>
  );
}
