import { BotBrain, BotContext } from './BotBrain';
import { PlayerInput, BotDifficulty } from '../types/game';
import {
  angleTo, angleDiff, isAimingAt, angleToInput, noInput, distanceBetween,
} from './BotUtilities';
import {
  EASY_ROTATION_CHANCE, EASY_AIM_TOLERANCE, EASY_AIM_ERROR,
  EASY_REACTION_DELAY_MIN, EASY_REACTION_DELAY_MAX, EASY_MOVE_CHANCE,
  EASY_WANDER_CHANCE, EASY_WANDER_DURATION_MIN, EASY_WANDER_DURATION_MAX,
  EASY_FIRE_HESITATION,
} from './cpuConstants';

type EasyState = 'IDLE' | 'ENGAGE' | 'WANDER';

export class EasyBot implements BotBrain {
  readonly difficulty: BotDifficulty = 'easy';

  private state: EasyState = 'IDLE';
  private reactionTimer: number = 0;
  private reactionDelay: number = 0;
  private frameCounter: number = 0;
  private wanderAngle: number = 0;
  private wanderTimer: number = 0;
  private wanderDuration: number = 0;
  private aimOffset: number = 0;
  private aimOffsetTimer: number = 0;

  constructor() {
    this.reactionDelay = this.randomReactionDelay();
    this.aimOffset = this.randomAimOffset();
  }

  reset(): void {
    this.state = 'IDLE';
    this.reactionTimer = 0;
    this.reactionDelay = this.randomReactionDelay();
    this.frameCounter = 0;
    this.wanderTimer = 0;
    this.aimOffset = this.randomAimOffset();
    this.aimOffsetTimer = 0;
  }

  update(context: BotContext): PlayerInput {
    const { myUid, opponentUid, gameState } = context;
    const myTank = gameState.tanks[myUid];
    const opTank = gameState.tanks[opponentUid];

    if (!myTank?.alive || !opTank?.alive) return noInput();

    this.frameCounter++;

    // Refresh aim offset periodically so shots drift around
    this.aimOffsetTimer += context.dt;
    if (this.aimOffsetTimer > 1.5) {
      this.aimOffset = this.randomAimOffset();
      this.aimOffsetTimer = 0;
    }

    // IDLE: wait before reacting
    if (this.state === 'IDLE') {
      this.reactionTimer += context.dt;
      if (this.reactionTimer >= this.reactionDelay) {
        this.state = 'ENGAGE';
        this.reactionTimer = 0;
      }
      return noInput();
    }

    // WANDER: move in a random direction, ignoring the player
    if (this.state === 'WANDER') {
      this.wanderTimer += context.dt;
      if (this.wanderTimer >= this.wanderDuration) {
        this.state = 'ENGAGE';
        this.wanderTimer = 0;
      }
      return angleToInput(myTank.angle, this.wanderAngle, true, false, false);
    }

    // ENGAGE: randomly decide to wander instead
    if (Math.random() < EASY_WANDER_CHANCE * context.dt) {
      this.state = 'WANDER';
      this.wanderAngle = Math.random() * Math.PI * 2;
      this.wanderTimer = 0;
      this.wanderDuration = EASY_WANDER_DURATION_MIN +
        Math.random() * (EASY_WANDER_DURATION_MAX - EASY_WANDER_DURATION_MIN);
      return angleToInput(myTank.angle, this.wanderAngle, true, false, false);
    }

    // Occasionally go back to idle (lose focus)
    if (Math.random() < 0.1 * context.dt) {
      this.state = 'IDLE';
      this.reactionDelay = this.randomReactionDelay();
      this.reactionTimer = 0;
      return noInput();
    }

    // ENGAGE state: lazily rotate toward opponent with aim error
    const trueAngle = angleTo(myTank.x, myTank.y, opTank.x, opTank.y);
    const targetAngle = trueAngle + this.aimOffset;

    // Only rotate some frames (lazy rotation)
    const shouldRotate = (this.frameCounter % 10) < (EASY_ROTATION_CHANCE * 10);

    // Move forward less often
    const shouldMove = (this.frameCounter % 10) < (EASY_MOVE_CHANCE * 10);

    // Fire when roughly aimed (very wide tolerance), but hesitate randomly
    const roughlyAimed = isAimingAt(myTank.angle, targetAngle, EASY_AIM_TOLERANCE);
    const canFire = roughlyAimed && Math.random() > EASY_FIRE_HESITATION;

    if (shouldRotate) {
      return angleToInput(myTank.angle, targetAngle, shouldMove, false, canFire);
    }

    // When not rotating, just move forward and maybe fire
    return {
      left: false,
      right: false,
      up: shouldMove,
      down: false,
      fire: canFire,
      timestamp: Date.now(),
    };
  }

  private randomReactionDelay(): number {
    return EASY_REACTION_DELAY_MIN +
      Math.random() * (EASY_REACTION_DELAY_MAX - EASY_REACTION_DELAY_MIN);
  }

  private randomAimOffset(): number {
    return (Math.random() - 0.5) * 2 * EASY_AIM_ERROR;
  }
}
