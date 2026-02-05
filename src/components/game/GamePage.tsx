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
import { PlayerInput, GameState } from '../../types/game';
import { GameRoom } from '../../types/firebase';
import { STATE_BROADCAST_INTERVAL, ROUNDS_TO_WIN, COUNTDOWN_DURATION, TankColor } from '../../config/constants';
import { lerpAngle, lerp } from '../../utils/math';
import { createBot } from '../../bot/BotFactory';
import { BotBrain } from '../../bot/BotBrain';

interface GamePageProps {
  uid: string | null;
}

export function GamePage({ uid }: GamePageProps) {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const canvasRef = useRef<GameCanvasHandle>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const rendererRef = useRef(new Renderer());
  const inputManagerRef = useRef(new InputManager());
  const syncRef = useRef<GameSyncService | null>(null);

  const [config, setConfig] = useState<GameRoom['config'] | null>(null);
  const [disconnected, setDisconnected] = useState(false);

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
  const botRef = useRef<BotBrain | null>(null);

  // For guest interpolation
  const prevStateRef = useRef<GameState | null>(null);
  const nextStateRef = useRef<GameState | null>(null);
  const stateReceivedTimeRef = useRef(0);
  const configRef = useRef<GameRoom['config'] | null>(null);

  // Helper to initialize game engine from config
  const initFromConfig = useCallback((cfg: GameRoom['config']) => {
    setConfig(cfg);
    configRef.current = cfg;

    isHost.current = cfg.hostUid === uid;
    playerOrderRef.current = [cfg.hostUid, cfg.guestUid];
    playerNamesRef.current = {
      [cfg.hostUid]: cfg.hostName,
      [cfg.guestUid]: cfg.guestName,
    };
    playerColorsRef.current = {
      [cfg.hostUid]: cfg.hostColor || 'blue',
      [cfg.guestUid]: cfg.guestColor || 'red',
    };

    if (!engineRef.current) {
      const engine = new GameEngine(cfg.arenaIndex, cfg.roundsToWin || ROUNDS_TO_WIN);
      engine.addPlayer(cfg.hostUid);
      engine.addPlayer(cfg.guestUid);
      engineRef.current = engine;
      engine.startMatch();
    }
  }, [uid]);

  // CPU game setup — fully local, no Firebase
  useEffect(() => {
    const cpuConfig = (location.state as { cpuConfig?: GameRoom['config'] })?.cpuConfig;
    if (!cpuConfig || !uid) return;

    isCpuGameRef.current = true;
    botRef.current = createBot(cpuConfig.cpuDifficulty!);
    inputManagerRef.current.bind();
    initFromConfig(cpuConfig);

    return () => {
      inputManagerRef.current.unbind();
    };
  }, [uid, location.state, initFromConfig]);

  // Online game setup — uses Firebase
  useEffect(() => {
    const cpuConfig = (location.state as { cpuConfig?: GameRoom['config'] })?.cpuConfig;
    if (cpuConfig) return; // CPU games handled above
    if (!uid || !gameId) return;

    const sync = new GameSyncService(gameId, uid);
    syncRef.current = sync;

    sync.setupDisconnect();
    inputManagerRef.current.bind();

    let presenceSetUp = false;

    sync.listenToConfig((cfg) => {
      if (!cfg) return;
      initFromConfig(cfg);

      if (!engineRef.current) return;

      if (isHost.current) {
        sync.listenToInput(cfg.guestUid, (input) => {
          remoteInputRef.current = input;
        });
      } else {
        sync.listenToState((state) => {
          prevStateRef.current = nextStateRef.current;
          nextStateRef.current = state;
          stateReceivedTimeRef.current = performance.now();
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

    return () => {
      inputManagerRef.current.unbind();
      sync.cleanup();
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

      const opponentUid = playerOrderRef.current.find(id => id !== uid) || '';

      if (isCpuGameRef.current && botRef.current) {
        // Generate bot input locally
        const botInput = botRef.current.update({
          myUid: opponentUid,
          opponentUid: uid!,
          gameState: engine.getState(),
          arena: engine.arena,
          dt,
          gameTime: 0,
        });
        inputs.set(opponentUid, botInput);

        // Reset bot on new round
        if (engine.phase === 'COUNTDOWN' && engine.countdown >= COUNTDOWN_DURATION - 0.1) {
          botRef.current.reset();
        }
      } else {
        inputs.set(opponentUid, remoteInputRef.current);
      }

      engine.update(dt, inputs);

      if (!isCpuGameRef.current) {
        syncRef.current?.writeInput(localInput);

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
    <div className="game-page">
      <GameCanvas ref={canvasRef} />
      {isTouchDevice && <TouchControls inputManager={inputManagerRef.current} />}
      <button className="back-to-lobby" onClick={leaveGame}>
        {isTouchDevice ? 'Leave Game' : 'ESC \u2014 Leave Game'}
      </button>
    </div>
  );
}
