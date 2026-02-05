import { BotBrain, BotContext } from './BotBrain';
import { PlayerInput, BotDifficulty, BulletState } from '../types/game';
import {
  angleTo, isAimingAt, angleToInput, noInput, distanceBetween,
  hasLineOfSight, getBulletThreat, getDodgeDirection, findCoverPositions,
} from './BotUtilities';
import {
  DEFENSIVE_PREFERRED_DISTANCE, DEFENSIVE_RETREAT_DISTANCE,
  DEFENSIVE_AIM_TOLERANCE, DEFENSIVE_DODGE_CORRIDOR, DEFENSIVE_COVER_SEARCH_MAX,
} from './cpuConstants';

type DefensiveState = 'PATROL' | 'COVER' | 'RETREAT';

export class DefensiveBot implements BotBrain {
  readonly difficulty: BotDifficulty = 'defensive';

  private state: DefensiveState = 'PATROL';
  private coverTarget: { x: number; y: number } | null = null;
  private stateTimer: number = 0;

  reset(): void {
    this.state = 'PATROL';
    this.coverTarget = null;
    this.stateTimer = 0;
  }

  update(context: BotContext): PlayerInput {
    const { myUid, opponentUid, gameState, arena, dt } = context;
    const myTank = gameState.tanks[myUid];
    const opTank = gameState.tanks[opponentUid];

    if (!myTank?.alive || !opTank?.alive) return noInput();

    this.stateTimer += dt;
    const dist = distanceBetween(myTank.x, myTank.y, opTank.x, opTank.y);
    const bullets = Array.isArray(gameState.bullets) ? gameState.bullets : [];

    // Check for bullet threats first — dodge takes priority
    const dodgeInput = this.checkDodge(bullets, myTank, myUid, arena);
    if (dodgeInput) return dodgeInput;

    // State transitions
    if (dist < DEFENSIVE_RETREAT_DISTANCE) {
      this.state = 'RETREAT';
    } else if (dist > DEFENSIVE_PREFERRED_DISTANCE && this.state === 'RETREAT') {
      this.state = 'PATROL';
    }

    switch (this.state) {
      case 'PATROL':
        return this.patrol(myTank, opTank, arena, dist);
      case 'COVER':
        return this.seekCover(myTank, opTank, arena);
      case 'RETREAT':
        return this.retreat(myTank, opTank, arena);
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

  private patrol(
    myTank: { x: number; y: number; angle: number },
    opTank: { x: number; y: number },
    arena: import('../engine/Arena').Arena,
    dist: number
  ): PlayerInput {
    const targetAngle = angleTo(myTank.x, myTank.y, opTank.x, opTank.y);
    const hasLOS = hasLineOfSight(myTank.x, myTank.y, opTank.x, opTank.y, arena);
    const aimed = isAimingAt(myTank.angle, targetAngle, DEFENSIVE_AIM_TOLERANCE);

    // Fire only with clear LOS and tight aim
    const shouldFire = hasLOS && aimed;

    // Maintain preferred distance
    const moveForward = dist > DEFENSIVE_PREFERRED_DISTANCE + 50;
    const moveBack = dist < DEFENSIVE_PREFERRED_DISTANCE - 50;

    if (!hasLOS && this.stateTimer > 1.5) {
      // Seek cover if we can't see the opponent
      this.state = 'COVER';
      this.coverTarget = null;
      this.stateTimer = 0;
    }

    return angleToInput(myTank.angle, targetAngle, moveForward, moveBack, shouldFire);
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
        this.state = 'PATROL';
        this.stateTimer = 0;
        return noInput();
      }
    }

    const dist = distanceBetween(myTank.x, myTank.y, this.coverTarget.x, this.coverTarget.y);
    if (dist < 20) {
      // Reached cover, go back to patrol
      this.state = 'PATROL';
      this.coverTarget = null;
      this.stateTimer = 0;
      return noInput();
    }

    const moveAngle = angleTo(myTank.x, myTank.y, this.coverTarget.x, this.coverTarget.y);

    // Check if we can fire at opponent on the way
    const opAngle = angleTo(myTank.x, myTank.y, opTank.x, opTank.y);
    const hasLOS = hasLineOfSight(myTank.x, myTank.y, opTank.x, opTank.y, arena);
    const aimed = isAimingAt(myTank.angle, opAngle, DEFENSIVE_AIM_TOLERANCE);

    return angleToInput(myTank.angle, moveAngle, true, false, hasLOS && aimed);
  }

  private retreat(
    myTank: { x: number; y: number; angle: number },
    opTank: { x: number; y: number },
    arena: import('../engine/Arena').Arena
  ): PlayerInput {
    // Move away from opponent
    const awayAngle = angleTo(opTank.x, opTank.y, myTank.x, myTank.y);

    // Fire while retreating if aimed
    const opAngle = angleTo(myTank.x, myTank.y, opTank.x, opTank.y);
    const hasLOS = hasLineOfSight(myTank.x, myTank.y, opTank.x, opTank.y, arena);
    const aimed = isAimingAt(myTank.angle, opAngle, DEFENSIVE_AIM_TOLERANCE);

    return angleToInput(myTank.angle, awayAngle, true, false, hasLOS && aimed);
  }
}
