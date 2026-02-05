import { PlayerInput } from '../types/game';

export class InputManager {
  private keys: Set<string> = new Set();
  private spaceHeld: boolean = false;
  private bound: boolean = false;

  // Touch state
  touchMoveAngle: number | null = null;
  touchMoving: boolean = false;
  touchFireHeld: boolean = false;

  bind(): void {
    if (this.bound) return;
    this.bound = true;
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  unbind(): void {
    this.bound = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.keys.clear();
    this.spaceHeld = false;
    this.touchMoveAngle = null;
    this.touchMoving = false;
    this.touchFireHeld = false;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    // Prevent default for game keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 'a', 's', 'd'].includes(e.key)) {
      e.preventDefault();
    }
    this.keys.add(e.key.toLowerCase());
    if (e.key === ' ') {
      this.spaceHeld = true;
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
    if (e.key === ' ') {
      this.spaceHeld = false;
    }
  };

  setTouchFire(pressed: boolean): void {
    this.touchFireHeld = pressed;
  }

  getInput(): PlayerInput {
    const input: PlayerInput = {
      left: this.keys.has('arrowleft') || this.keys.has('a'),
      right: this.keys.has('arrowright') || this.keys.has('d'),
      up: this.keys.has('arrowup') || this.keys.has('w'),
      down: this.keys.has('arrowdown') || this.keys.has('s'),
      fire: this.spaceHeld || this.touchFireHeld,
      timestamp: Date.now(),
    };

    // Touch joystick overrides directional keys with angle-based movement
    if (this.touchMoving && this.touchMoveAngle !== null) {
      input.targetAngle = this.touchMoveAngle;
    }

    return input;
  }

  // For receiving remote input
  static empty(): PlayerInput {
    return {
      left: false,
      right: false,
      up: false,
      down: false,
      fire: false,
      timestamp: Date.now(),
    };
  }
}
