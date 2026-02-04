import { PlayerInput } from '../types/game';

export class InputManager {
  private keys: Set<string> = new Set();
  private firePressed: boolean = false;
  private fireConsumed: boolean = false;
  private bound: boolean = false;

  // Touch state
  touchLeft: boolean = false;
  touchRight: boolean = false;
  touchUp: boolean = false;
  touchDown: boolean = false;
  touchFire: boolean = false;
  private touchFireConsumed: boolean = false;

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
    this.firePressed = false;
    this.fireConsumed = false;
    this.touchLeft = false;
    this.touchRight = false;
    this.touchUp = false;
    this.touchDown = false;
    this.touchFire = false;
    this.touchFireConsumed = false;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    // Prevent default for game keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 'a', 's', 'd'].includes(e.key)) {
      e.preventDefault();
    }
    this.keys.add(e.key.toLowerCase());
    if (e.key === ' ') {
      if (!this.fireConsumed) {
        this.firePressed = true;
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
    if (e.key === ' ') {
      this.fireConsumed = false;
      this.firePressed = false;
    }
  };

  setTouchFire(pressed: boolean): void {
    if (pressed && !this.touchFireConsumed) {
      this.touchFire = true;
    }
    if (!pressed) {
      this.touchFireConsumed = false;
      this.touchFire = false;
    }
  }

  getInput(): PlayerInput {
    const fire = this.firePressed || this.touchFire;
    const input: PlayerInput = {
      left: this.keys.has('arrowleft') || this.keys.has('a') || this.touchLeft,
      right: this.keys.has('arrowright') || this.keys.has('d') || this.touchRight,
      up: this.keys.has('arrowup') || this.keys.has('w') || this.touchUp,
      down: this.keys.has('arrowdown') || this.keys.has('s') || this.touchDown,
      fire,
      timestamp: Date.now(),
    };
    if (this.firePressed) {
      this.firePressed = false;
      this.fireConsumed = true;
    }
    if (this.touchFire) {
      this.touchFire = false;
      this.touchFireConsumed = true;
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
