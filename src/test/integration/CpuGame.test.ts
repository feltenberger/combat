import { describe, it, expect } from 'vitest';
import { GameEngine } from '../../engine/GameEngine';
import { createBot } from '../../bot/BotFactory';
import { BotDifficulty, PlayerInput } from '../../types/game';
import { COUNTDOWN_DURATION, ROUNDS_TO_WIN } from '../../config/constants';

function runCpuGame(difficulty: BotDifficulty, maxSeconds: number = 300): {
  engine: GameEngine;
  elapsed: number;
  matchCompleted: boolean;
} {
  const engine = new GameEngine(0, ROUNDS_TO_WIN);
  const hostUid = 'player1';
  const cpuUid = `cpu-bot-${difficulty}`;

  engine.addPlayer(hostUid);
  engine.addPlayer(cpuUid);
  engine.startMatch();

  const bot = createBot(difficulty);
  const dt = 1 / 60;
  let elapsed = 0;
  const maxFrames = maxSeconds * 60;

  for (let frame = 0; frame < maxFrames; frame++) {
    elapsed += dt;

    // Aggressive host: rotate toward opponent and fire constantly
    const hostTank = engine.tanks.get(hostUid);
    const cpuTank = engine.tanks.get(cpuUid);
    let hostAngle = 0;
    if (hostTank && cpuTank && hostTank.alive && cpuTank.alive) {
      hostAngle = Math.atan2(cpuTank.y - hostTank.y, cpuTank.x - hostTank.x);
    }
    const angleDelta = hostTank ? hostAngle - hostTank.angle : 0;
    const normalizedDelta = Math.atan2(Math.sin(angleDelta), Math.cos(angleDelta));

    const hostInput: PlayerInput = {
      left: normalizedDelta < -0.05,
      right: normalizedDelta > 0.05,
      up: true,
      down: false,
      fire: true,
      timestamp: Date.now(),
    };

    const botInput = bot.update({
      myUid: cpuUid,
      opponentUid: hostUid,
      allOpponentUids: [hostUid],
      gameState: engine.getState(),
      arena: engine.arena,
      dt,
      gameTime: elapsed,
    });

    const inputs = new Map<string, PlayerInput>();
    inputs.set(hostUid, hostInput);
    inputs.set(cpuUid, botInput);

    engine.update(dt, inputs);

    // Reset bot on new round
    if (engine.phase === 'COUNTDOWN' && engine.countdown >= COUNTDOWN_DURATION - 0.1) {
      bot.reset();
    }

    if (engine.phase === 'MATCH_OVER') {
      return { engine, elapsed, matchCompleted: true };
    }
  }

  return { engine, elapsed, matchCompleted: false };
}

describe('CPU Game Integration', () => {
  it('completes a game with EasyBot without errors', () => {
    const result = runCpuGame('easy');
    expect(result.matchCompleted).toBe(true);
    expect(result.engine.matchWinner).toBeTruthy();
  });

  it('completes a game with DefensiveBot without errors', () => {
    const result = runCpuGame('defensive');
    expect(result.matchCompleted).toBe(true);
    expect(result.engine.matchWinner).toBeTruthy();
  });

  it('completes a game with OffensiveBot without errors', () => {
    const result = runCpuGame('offensive');
    expect(result.matchCompleted).toBe(true);
    expect(result.engine.matchWinner).toBeTruthy();
  });

  it('completes a game with HardBot without errors', () => {
    const result = runCpuGame('hard');
    expect(result.matchCompleted).toBe(true);
    expect(result.engine.matchWinner).toBeTruthy();
  });

  it('scores are tracked correctly', () => {
    const result = runCpuGame('easy');
    const winner = result.engine.matchWinner!;
    const winnerScore = result.engine.scores.get(winner)!;
    expect(winnerScore).toBeGreaterThanOrEqual(ROUNDS_TO_WIN);
  });

  it('round transitions work correctly', () => {
    const result = runCpuGame('offensive');
    // Match should have gone through at least 2 rounds
    expect(result.engine.round).toBeGreaterThanOrEqual(2);
  });
});
