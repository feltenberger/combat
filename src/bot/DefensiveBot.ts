import { BotBrain, BotContext } from './BotBrain';
import { PlayerInput, BotDifficulty, BulletState } from '../types/game';
import {
  angleTo, isAimingAt, angleToInput, noInput, distanceBetween,
  hasLineOfSight, getBulletThreat, getDodgeDirection, findCoverPositions,
} from './BotUtilities';
import {
  DEFENSIVE_PREFERRED_DISTANCE, DEFENSIVE_RETREAT_DISTANCE,
  DEFENSIVE_AIM_TOLERANCE, DEFENSIVE_DODGE_CORRIDOR, DEFENSIVE_COVER_SEARCH_MAX,
  DEFENSIVE_FIRE_HESITATION, DEFENSIVE_CREEP_CHANCE, DEFENSIVE_FREEZE_CHANCE,
  DEFENSIVE_FREEZE_DURATION_MIN, DEFENSIVE_FREEZE_DURATION_MAX,
  DEFENSIVE_COVER_LINGER_TIME, DEFENSIVE_PEEK_DURATION,
} from './cpuConstants';

type DefensiveState = 'CAMP' | 'COVER' | 'RETREAT' | 'PEEK';

export class DefensiveBot implements BotBrain {
  readonly difficulty: BotDifficulty = 'defensive';

  private state: DefensiveState = 'CAMP';
  private coverTarget: { x: number; y: number } | null = null;
  private stateTimer: number = 0;
  private freezeTimer: number = 0;
  private coverLingerTimer: number = 0;
  private peekTimer: number = 0;

  reset(): void {
    this.state = 'CAMP';
    this.coverTarget = null;
    this.stateTimer = 0;
    this.freezeTimer = 0;
    this.coverLingerTimer = 0;
    this.peekTimer = 0;
  }

  update(context: BotContext): PlayerInput {
    const { myUid, opponentUid, gameState, arena, dt } = context;
    const myTank = gameState.tanks[myUid];
    const opTank = gameState.tanks[opponentUid];

    if (!myTank?.alive || !opTank?.alive) return noInput();

    this.stateTimer += dt;
    const dist = distanceBetween(myTank.x, myTank.y, opTank.x, opTank.y);
    const bullets = Array.isArray(gameState.bullets) ? gameState.bullets : [];

    // Check for bullet threats first — dodge takes priority over everything
    const dodgeInput = this.checkDodge(bullets, myTank, myUid, arena);
    if (dodgeInput) return dodgeInput;

    // Handle freeze (complete indecision)
    if (this.freezeTimer > 0) {
      this.freezeTimer -= dt;
      return noInput();
    }

    // Random freeze chance (per-second probability scaled by dt)
    if (Math.random() < DEFENSIVE_FREEZE_CHANCE * dt) {
      this.freezeTimer = DEFENSIVE_FREEZE_DURATION_MIN +
        Math.random() * (DEFENSIVE_FREEZE_DURATION_MAX - DEFENSIVE_FREEZE_DURATION_MIN);
      return noInput();
    }

    // State transitions
    if (dist < DEFENSIVE_RETREAT_DISTANCE && this.state !== 'RETREAT') {
      this.state = 'RETREAT';
      this.stateTimer = 0;
    } else if (this.state === 'RETREAT' && dist > DEFENSIVE_PREFERRED_DISTANCE) {
      this.state = 'CAMP';
      this.stateTimer = 0;
    }

    switch (this.state) {
      case 'CAMP':
        return this.camp(myTank, opTank, arena, dist);
      case 'COVER':
        return this.seekCover(myTank, opTank, arena);
      case 'PEEK':
        return this.peek(myTank, opTank, arena, dt);
      case 'RETREAT':
        return this.retreat(myTank, opTank);
      default:
        return noInput();
    }
  }

  private checkDodge(
    bullets: BulletState[],
    myTank: { x: number; y: number; angle: number },
    myUid: string,
    arena: import('../engine/Arena').Arena
  ): PlayerInput | null {
    for (const bullet of bullets) {
      if (bullet.ownerId === myUid) continue;
      const threat = getBulletThreat(bullet, myTank.x, myTank.y, DEFENSIVE_DODGE_CORRIDOR);
      if (threat !== null) {
        const dodgeAngle = getDodgeDirection(threat, myTank.x, myTank.y, arena);
        if (dodgeAngle !== null) {
          return angleToInput(myTank.angle, dodgeAngle, true, false, false);
        }
      }
    }
    return null;
  }

  private camp(
    myTank: { x: number; y: number; angle: number },
    opTank: { x: number; y: number },
    arena: import('../engine/Arena').Arena,
    dist: number
  ): PlayerInput {
    const targetAngle = angleTo(myTank.x, myTank.y, opTank.x, opTank.y);
    const hasLOS = hasLineOfSight(myTank.x, myTank.y, opTank.x, opTank.y, arena);
    const aimed = isAimingAt(myTank.angle, targetAngle, DEFENSIVE_AIM_TOLERANCE);

    // If opponent has LOS on us, take a shot if aimed then seek cover
    if (hasLOS) {
      const shouldFire = aimed && Math.random() > DEFENSIVE_FIRE_HESITATION;
      this.state = 'COVER';
      this.coverTarget = null;
      this.coverLingerTimer = 0;
      this.stateTimer = 0;
      return angleToInput(myTank.angle, targetAngle, false, false, shouldFire);
    }

    // No LOS — creep movement (hesitant, slow)
    const wantsToMove = dist > DEFENSIVE_PREFERRED_DISTANCE + 50;
    const wantsToMoveBack = dist < DEFENSIVE_PREFERRED_DISTANCE - 50;
    const creep = Math.random() < DEFENSIVE_CREEP_CHANCE;
    const moveForward = wantsToMove && creep;
    const moveBack = wantsToMoveBack && creep;

    return angleToInput(myTank.angle, targetAngle, moveForward, moveBack, false);
  }

  private seekCover(
    myTank: { x: number; y: number; angle: number },
    opTank: { x: number; y: number },
    arena: import('../engine/Arena').Arena
  ): PlayerInput {
    if (!this.coverTarget) {
      const covers = findCoverPositions(
        myTank.x, myTank.y, opTank.x, opTank.y, arena, DEFENSIVE_COVER_SEARCH_MAX
      );
      if (covers.length > 0) {
        this.coverTarget = covers[0];
      } else {
        this.state = 'CAMP';
        this.stateTimer = 0;
        return noInput();
      }
    }

    const dist = distanceBetween(myTank.x, myTank.y, this.coverTarget.x, this.coverTarget.y);
    if (dist < 20) {
      // Reached cover — linger here before peeking
      this.coverLingerTimer += 1 / 60; // approximate frame time
      if (this.coverLingerTimer >= DEFENSIVE_COVER_LINGER_TIME) {
        this.state = 'PEEK';
        this.peekTimer = 0;
        this.coverLingerTimer = 0;
        this.stateTimer = 0;
        return noInput();
      }
      // Stay put in cover
      return noInput();
    }

    // Move toward cover with intermittent creep
    const moveAngle = angleTo(myTank.x, myTank.y, this.coverTarget.x, this.coverTarget.y);
    const creep = Math.random() < DEFENSIVE_CREEP_CHANCE;

    return angleToInput(myTank.angle, moveAngle, creep, false, false);
  }

  private peek(
    myTank: { x: number; y: number; angle: number },
    opTank: { x: number; y: number },
    arena: import('../engine/Arena').Arena,
    dt: number
  ): PlayerInput {
    this.peekTimer += dt;

    // Peek time expired — return to CAMP to re-evaluate
    if (this.peekTimer >= DEFENSIVE_PEEK_DURATION) {
      this.state = 'CAMP';
      this.stateTimer = 0;
      return noInput();
    }

    // During peek: move toward opponent to step out of cover, fire if able
    const targetAngle = angleTo(myTank.x, myTank.y, opTank.x, opTank.y);
    const hasLOS = hasLineOfSight(myTank.x, myTank.y, opTank.x, opTank.y, arena);
    const aimed = isAimingAt(myTank.angle, targetAngle, DEFENSIVE_AIM_TOLERANCE);
    const shouldFire = hasLOS && aimed && Math.random() > DEFENSIVE_FIRE_HESITATION;

    return angleToInput(myTank.angle, targetAngle, true, false, shouldFire);
  }

  private retreat(
    myTank: { x: number; y: number; angle: number },
    opTank: { x: number; y: number },
  ): PlayerInput {
    // Face the opponent but move backward — looks unsure and scared
    const towardOpponent = angleTo(myTank.x, myTank.y, opTank.x, opTank.y);

    return angleToInput(myTank.angle, towardOpponent, false, true, false);
  }
}
