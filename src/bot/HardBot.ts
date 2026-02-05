import { BotBrain, BotContext } from './BotBrain';
import { PlayerInput, BotDifficulty, BulletState } from '../types/game';
import {
  angleTo, isAimingAt, angleToInput, noInput, distanceBetween,
  hasLineOfSight, getBulletThreat, getDodgeDirection,
  findPath, getLeadingAngle,
} from './BotUtilities';
import {
  HARD_AIM_TOLERANCE, HARD_DODGE_CORRIDOR,
  HARD_REPOSITION_INTERVAL, HARD_AGGRESSION_BASE, HARD_AGGRESSION_SCORE_WEIGHT,
} from './cpuConstants';
import { TANK_SPEED } from '../config/constants';

type HardState = 'ASSESS' | 'ENGAGE' | 'DODGE' | 'REPOSITION';

export class HardBot implements BotBrain {
  readonly difficulty: BotDifficulty = 'hard';

  private state: HardState = 'ASSESS';
  private repositionTimer: number = 0;
  private path: Array<{ x: number; y: number }> = [];
  private pathIndex: number = 0;
  private lastOpX: number = 0;
  private lastOpY: number = 0;
  private aggression: number = HARD_AGGRESSION_BASE;

  reset(): void {
    this.state = 'ASSESS';
    this.repositionTimer = 0;
    this.path = [];
    this.pathIndex = 0;
    this.lastOpX = 0;
    this.lastOpY = 0;
    this.aggression = HARD_AGGRESSION_BASE;
  }

  update(context: BotContext): PlayerInput {
    const { myUid, opponentUid, gameState, arena, dt } = context;
    const myTank = gameState.tanks[myUid];
    const opTank = gameState.tanks[opponentUid];

    if (!myTank?.alive || !opTank?.alive) return noInput();

    this.repositionTimer += dt;
    const dist = distanceBetween(myTank.x, myTank.y, opTank.x, opTank.y);
    const bullets = Array.isArray(gameState.bullets) ? gameState.bullets : [];

    // Adapt aggression based on score
    const myScore = gameState.scores[myUid] || 0;
    const opScore = gameState.scores[opponentUid] || 0;
    this.aggression = HARD_AGGRESSION_BASE +
      (myScore - opScore) * HARD_AGGRESSION_SCORE_WEIGHT;
    this.aggression = Math.max(0.1, Math.min(0.9, this.aggression));

    // Calculate opponent velocity for shot leading
    const opVx = (opTank.x - this.lastOpX) / Math.max(dt, 0.001);
    const opVy = (opTank.y - this.lastOpY) / Math.max(dt, 0.001);
    this.lastOpX = opTank.x;
    this.lastOpY = opTank.y;

    // Check for bullet threats — dodge takes highest priority
    const dodgeInput = this.checkDodge(bullets, myTank, myUid, arena);
    if (dodgeInput) {
      this.state = 'DODGE';
      return dodgeInput;
    }

    if (this.state === 'DODGE') {
      this.state = 'ASSESS';
    }

    // State transitions
    const hasLOS = hasLineOfSight(myTank.x, myTank.y, opTank.x, opTank.y, arena);

    if (this.repositionTimer >= HARD_REPOSITION_INTERVAL && !hasLOS) {
      this.state = 'REPOSITION';
      this.repositionTimer = 0;
      this.path = findPath(myTank.x, myTank.y, opTank.x, opTank.y, arena);
      this.pathIndex = 0;
    } else if (hasLOS) {
      this.state = 'ENGAGE';
    } else if (this.state === 'ASSESS') {
      this.state = 'REPOSITION';
      this.path = findPath(myTank.x, myTank.y, opTank.x, opTank.y, arena);
      this.pathIndex = 0;
    }

    if (this.state === 'ENGAGE') {
      return this.engage(myTank, opTank, opVx, opVy, arena, dist);
    } else if (this.state === 'REPOSITION') {
      return this.reposition(myTank, opTank, opVx, opVy, arena);
    }
    return this.assess(myTank, opTank, arena);
  }

  private checkDodge(
    bullets: BulletState[],
    myTank: { x: number; y: number; angle: number },
    myUid: string,
    arena: import('../engine/Arena').Arena
  ): PlayerInput | null {
    for (const bullet of bullets) {
      if (bullet.ownerId === myUid) continue;
      const threat = getBulletThreat(bullet, myTank.x, myTank.y, HARD_DODGE_CORRIDOR);
      if (threat !== null) {
        const dodgeAngle = getDodgeDirection(threat, myTank.x, myTank.y, arena);
        if (dodgeAngle !== null) {
          return angleToInput(myTank.angle, dodgeAngle, true, false, false);
        }
      }
    }
    return null;
  }

  private engage(
    myTank: { x: number; y: number; angle: number },
    opTank: { x: number; y: number },
    opVx: number, opVy: number,
    arena: import('../engine/Arena').Arena,
    dist: number
  ): PlayerInput {
    // Lead the shot
    const leadAngle = getLeadingAngle(
      myTank.x, myTank.y, opTank.x, opTank.y, opVx, opVy
    );

    const aimed = isAimingAt(myTank.angle, leadAngle, HARD_AIM_TOLERANCE);

    // Movement based on aggression
    const moveForward = this.aggression > 0.5 || dist > 350;
    const moveBack = this.aggression < 0.3 && dist < 150;

    return angleToInput(myTank.angle, leadAngle, moveForward, moveBack, aimed);
  }

  private reposition(
    myTank: { x: number; y: number; angle: number },
    opTank: { x: number; y: number },
    opVx: number, opVy: number,
    arena: import('../engine/Arena').Arena
  ): PlayerInput {
    // Follow A* path
    if (this.path.length === 0 || this.pathIndex >= this.path.length) {
      this.state = 'ASSESS';
      return noInput();
    }

    const waypoint = this.path[this.pathIndex];
    const wpDist = distanceBetween(myTank.x, myTank.y, waypoint.x, waypoint.y);

    if (wpDist < 20) {
      this.pathIndex++;
      if (this.pathIndex >= this.path.length) {
        this.state = 'ASSESS';
        return noInput();
      }
    }

    const target = this.path[Math.min(this.pathIndex, this.path.length - 1)];
    const moveAngle = angleTo(myTank.x, myTank.y, target.x, target.y);

    // Opportunistic firing while moving
    const hasLOS = hasLineOfSight(myTank.x, myTank.y, opTank.x, opTank.y, arena);
    const opAngle = getLeadingAngle(
      myTank.x, myTank.y, opTank.x, opTank.y, opVx, opVy
    );
    const aimed = isAimingAt(myTank.angle, opAngle, HARD_AIM_TOLERANCE);

    // If we have LOS and are aimed, prioritize firing over path following
    if (hasLOS && aimed) {
      return angleToInput(myTank.angle, opAngle, false, false, true);
    }

    return angleToInput(myTank.angle, moveAngle, true, false, false);
  }

  private assess(
    myTank: { x: number; y: number; angle: number },
    opTank: { x: number; y: number },
    arena: import('../engine/Arena').Arena
  ): PlayerInput {
    // Look toward opponent and prepare
    const targetAngle = angleTo(myTank.x, myTank.y, opTank.x, opTank.y);
    return angleToInput(myTank.angle, targetAngle, false, false, false);
  }
}
