import { BotBrain, BotContext } from './BotBrain';
import { PlayerInput, BotDifficulty, BulletState } from '../types/game';
import {
  angleTo, isAimingAt, angleToInput, noInput, distanceBetween,
  hasLineOfSight, getBulletThreat, getDodgeDirection,
} from './BotUtilities';
import {
  OFFENSIVE_AIM_TOLERANCE, OFFENSIVE_FLANK_CHANCE,
  OFFENSIVE_DODGE_CORRIDOR, OFFENSIVE_ENGAGE_DISTANCE,
} from './cpuConstants';

type OffensiveState = 'APPROACH' | 'ATTACK';

export class OffensiveBot implements BotBrain {
  readonly difficulty: BotDifficulty = 'offensive';

  private state: OffensiveState = 'APPROACH';
  private flanking: boolean = false;
  private flankDirection: number = 1; // 1 or -1
  private stateTimer: number = 0;

  constructor() {
    this.decideFlanking();
  }

  reset(): void {
    this.state = 'APPROACH';
    this.flanking = false;
    this.stateTimer = 0;
    this.decideFlanking();
  }

  update(context: BotContext): PlayerInput {
    const { myUid, opponentUid, gameState, arena, dt } = context;
    const myTank = gameState.tanks[myUid];
    const opTank = gameState.tanks[opponentUid];

    if (!myTank?.alive || !opTank?.alive) return noInput();

    this.stateTimer += dt;
    const dist = distanceBetween(myTank.x, myTank.y, opTank.x, opTank.y);
    const bullets = Array.isArray(gameState.bullets) ? gameState.bullets : [];

    // Only dodge extreme close calls
    const dodgeInput = this.checkDodge(bullets, myTank, myUid, arena);
    if (dodgeInput) return dodgeInput;

    // State transitions
    if (dist <= OFFENSIVE_ENGAGE_DISTANCE) {
      this.state = 'ATTACK';
    } else {
      this.state = 'APPROACH';
    }

    switch (this.state) {
      case 'APPROACH':
        return this.approach(myTank, opTank, arena, dist);
      case 'ATTACK':
        return this.attack(myTank, opTank, arena);
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
      const threat = getBulletThreat(bullet, myTank.x, myTank.y, OFFENSIVE_DODGE_CORRIDOR);
      if (threat !== null) {
        const dodgeAngle = getDodgeDirection(threat, myTank.x, myTank.y, arena);
        if (dodgeAngle !== null) {
          return angleToInput(myTank.angle, dodgeAngle, true, false, false);
        }
      }
    }
    return null;
  }

  private approach(
    myTank: { x: number; y: number; angle: number },
    opTank: { x: number; y: number },
    arena: import('../engine/Arena').Arena,
    dist: number
  ): PlayerInput {
    let targetAngle: number;

    if (this.flanking) {
      // Approach at an angle instead of direct
      const directAngle = angleTo(myTank.x, myTank.y, opTank.x, opTank.y);
      targetAngle = directAngle + (Math.PI / 6) * this.flankDirection;
    } else {
      targetAngle = angleTo(myTank.x, myTank.y, opTank.x, opTank.y);
    }

    // Fire while approaching if aimed
    const opAngle = angleTo(myTank.x, myTank.y, opTank.x, opTank.y);
    const aimed = isAimingAt(myTank.angle, opAngle, OFFENSIVE_AIM_TOLERANCE);

    return angleToInput(myTank.angle, targetAngle, true, false, aimed);
  }

  private attack(
    myTank: { x: number; y: number; angle: number },
    opTank: { x: number; y: number },
    arena: import('../engine/Arena').Arena
  ): PlayerInput {
    const targetAngle = angleTo(myTank.x, myTank.y, opTank.x, opTank.y);
    const aimed = isAimingAt(myTank.angle, targetAngle, OFFENSIVE_AIM_TOLERANCE);

    // Always move forward aggressively, fire when aimed
    return angleToInput(myTank.angle, targetAngle, true, false, aimed);
  }

  private decideFlanking(): void {
    this.flanking = Math.random() < OFFENSIVE_FLANK_CHANCE;
    this.flankDirection = Math.random() < 0.5 ? 1 : -1;
  }
}
