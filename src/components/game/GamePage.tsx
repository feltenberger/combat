import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GameCanvas, GameCanvasHandle } from './GameCanvas';
import { GameEngine } from '../../engine/GameEngine';
import { Renderer } from '../../renderer/Renderer';
import { InputManager } from '../../engine/InputManager';
import { Bullet } from '../../engine/Bullet';
import { GameSyncService } from '../../firebase/gameSync';
import { saveMatchResult } from '../../firebase/matchHistory';
import { useGameLoop } from '../../hooks/useGameLoop';
import { PlayerInput, GameState } from '../../types/game';
import { GameRoom } from '../../types/firebase';
import { STATE_BROADCAST_INTERVAL, ROUNDS_TO_WIN } from '../../config/constants';
import { lerpAngle, lerp } from '../../utils/math';

interface GamePageProps {
  uid: string | null;
}

export function GamePage({ uid }: GamePageProps) {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
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
  const matchResultSavedRef = useRef(false);

  // For guest interpolation
  const prevStateRef = useRef<GameState | null>(null);
  const nextStateRef = useRef<GameState | null>(null);
  const stateReceivedTimeRef = useRef(0);
  const configRef = useRef<GameRoom['config'] | null>(null);

  // Set up game on config received
  useEffect(() => {
    if (!uid || !gameId) return;

    const sync = new GameSyncService(gameId, uid);
    syncRef.current = sync;

    // Setup disconnect detection
    sync.setupDisconnect();

    inputManagerRef.current.bind();

    let presenceSetUp = false;

    sync.listenToConfig((cfg) => {
      if (!cfg) return;
      setConfig(cfg);
      configRef.current = cfg;

      isHost.current = cfg.hostUid === uid;
      playerOrderRef.current = [cfg.hostUid, cfg.guestUid];
      playerNamesRef.current = {
        [cfg.hostUid]: cfg.hostName,
        [cfg.guestUid]: cfg.guestName,
      };

      // Initialize engine
      if (!engineRef.current) {
        const engine = new GameEngine(cfg.arenaIndex, cfg.roundsToWin || ROUNDS_TO_WIN);
        engine.addPlayer(cfg.hostUid);
        engine.addPlayer(cfg.guestUid);
        engineRef.current = engine;

        if (isHost.current) {
          // Host starts the match
          engine.startMatch();

          // Listen for guest input
          sync.listenToInput(cfg.guestUid, (input) => {
            remoteInputRef.current = input;
          });
        } else {
          // Guest listens for state
          sync.listenToState((state) => {
            prevStateRef.current = nextStateRef.current;
            nextStateRef.current = state;
            stateReceivedTimeRef.current = performance.now();
          });
        }
      }

      // Listen for opponent disconnect (only set up once)
      if (!presenceSetUp) {
        presenceSetUp = true;
        const opponentUid = cfg.hostUid === uid ? cfg.guestUid : cfg.hostUid;
        let opponentSeen = false;
        sync.listenToPresence(opponentUid, (online) => {
          if (online) {
            opponentSeen = true;
          } else if (opponentSeen) {
            // Only mark disconnected after we've seen them online at least once
            setDisconnected(true);
          }
        });
      }
    });

    return () => {
      inputManagerRef.current.unbind();
      sync.cleanup();
    };
  }, [uid, gameId]);

  // Game loop
  useGameLoop((dt) => {
    const engine = engineRef.current;
    const ctx = canvasRef.current?.getContext();
    if (!engine || !ctx) return;

    if (isHost.current) {
      // Host: run simulation with local + remote input
      const localInput = inputManagerRef.current.getInput();
      const inputs = new Map<string, PlayerInput>();
      inputs.set(uid!, localInput);
      inputs.set(
        playerOrderRef.current.find(id => id !== uid) || '',
        remoteInputRef.current
      );

      engine.update(dt, inputs);

      // Write own input for sync
      syncRef.current?.writeInput(localInput);

      // Broadcast state at STATE_BROADCAST_RATE
      const now = performance.now();
      if (now - lastBroadcastRef.current >= STATE_BROADCAST_INTERVAL) {
        syncRef.current?.writeState(engine.getState());
        lastBroadcastRef.current = now;
      }

      // Save match result when match is over
      if (engine.phase === 'MATCH_OVER' && !matchResultSavedRef.current) {
        matchResultSavedRef.current = true;
        syncRef.current?.finishGame();
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
          });
        }
      }
    } else {
      // Guest: write input, interpolate from state snapshots
      const localInput = inputManagerRef.current.getInput();
      syncRef.current?.writeInput(localInput);

      // Interpolation between prev and next state
      if (nextStateRef.current) {
        if (prevStateRef.current && stateReceivedTimeRef.current > 0) {
          const elapsed = performance.now() - stateReceivedTimeRef.current;
          const t = Math.min(elapsed / STATE_BROADCAST_INTERVAL, 1);

          // Create interpolated state
          const prev = prevStateRef.current;
          const next = nextStateRef.current;

          // Build interpolated tank states
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

          // Snap non-interpolatable state
          engine.phase = next.phase;
          engine.round = next.round;
          engine.countdown = next.countdown;
          engine.roundResult = next.roundResult;
          engine.matchWinner = next.matchWinner;
          if (next.rockHP) engine.arena.setRockHPFromMap(next.rockHP);

          // Update scores
          if (next.scores) {
            for (const [scoreUid, score] of Object.entries(next.scores)) {
              engine.scores.set(scoreUid, score);
            }
          }

          // Update bullets directly from state (Firebase strips empty arrays)
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

      // Still update particles locally for smoothness
      engine.particles.update(dt);
    }

    // Render
    rendererRef.current.render(
      ctx,
      engine,
      playerOrderRef.current,
      playerNamesRef.current,
      disconnected,
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

  return (
    <div className="game-page">
      <GameCanvas ref={canvasRef} />
      <button className="back-to-lobby" onClick={leaveGame}>
        ESC &mdash; Leave Game
      </button>
    </div>
  );
}
