import { BotBrain, BotContext } from './BotBrain';
import { PlayerInput, BotDifficulty } from '../types/game';
import {
  angleTo, angleDiff, isAimingAt, angleToInput, noInput, distanceBetween,
} from './BotUtilities';
import {
  EASY_ROTATION_CHANCE, EASY_AIM_TOLERANCE,
  EASY_REACTION_DELAY_MIN, EASY_REACTION_DELAY_MAX, EASY_MOVE_CHANCE,
} from './cpuConstants';

type EasyState = 'IDLE' | 'ENGAGE';

export class EasyBot implements BotBrain {
  readonly difficulty: BotDifficulty = 'easy';

  private state: EasyState = 'IDLE';
  private reactionTimer: number = 0;
  private reactionDelay: number = 0;
  private frameCounter: number = 0;

  constructor() {
    this.reactionDelay = this.randomReactionDelay();
  }

  reset(): void {
    this.state = 'IDLE';
    this.reactionTimer = 0;
    this.reactionDelay = this.randomReactionDelay();
    this.frameCounter = 0;
  }

  update(context: BotContext): PlayerInput {
    const { myUid, opponentUid, gameState } = context;
    const myTank = gameState.tanks[myUid];
    const opTank = gameState.tanks[opponentUid];

    if (!myTank?.alive || !opTank?.alive) return noInput();

    this.frameCounter++;

    // State transitions
    if (this.state === 'IDLE') {
      this.reactionTimer += context.dt;
      if (this.reactionTimer >= this.reactionDelay) {
        this.state = 'ENGAGE';
        this.reactionTimer = 0;
      }
      return noInput();
    }

    // ENGAGE state: lazily rotate toward opponent and fire
    const targetAngle = angleTo(myTank.x, myTank.y, opTank.x, opTank.y);
    const diff = angleDiff(myTank.angle, targetAngle);

    // Only rotate 40% of frames (lazy rotation)
    const shouldRotate = (this.frameCounter % 10) < (EASY_ROTATION_CHANCE * 10);

    // Move forward most of the time
    const shouldMove = (this.frameCounter % 10) < (EASY_MOVE_CHANCE * 10);

    // Fire when roughly aimed (wide tolerance, no LOS check)
    const canFire = isAimingAt(myTank.angle, targetAngle, EASY_AIM_TOLERANCE);

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
}
