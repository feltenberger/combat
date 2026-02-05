import { InputManager } from './InputManager';

describe('InputManager', () => {
  let inputManager: InputManager;

  beforeEach(() => {
    inputManager = new InputManager();
    inputManager.bind();
  });

  afterEach(() => {
    inputManager.unbind();
  });

  describe('keyboard input', () => {
    it('should detect arrow key presses', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));

      const input = inputManager.getInput();
      expect(input.up).toBe(true);
      expect(input.left).toBe(true);
      expect(input.down).toBe(false);
      expect(input.right).toBe(false);
    });

    it('should detect WASD key presses', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));

      const input = inputManager.getInput();
      expect(input.up).toBe(true);
      expect(input.right).toBe(true);
      expect(input.down).toBe(false);
      expect(input.left).toBe(false);
    });

    it('should clear keys on keyup', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      expect(inputManager.getInput().up).toBe(true);

      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp' }));
      expect(inputManager.getInput().up).toBe(false);
    });

    describe('fire input (spacebar)', () => {
      it('should detect spacebar press', () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));

        const input = inputManager.getInput();
        expect(input.fire).toBe(true);
      });

      it('should allow continuous fire while holding spacebar', () => {
        // Press spacebar once
        window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));

        // Get input multiple times while key is held - all should report fire=true
        const input1 = inputManager.getInput();
        const input2 = inputManager.getInput();
        const input3 = inputManager.getInput();

        expect(input1.fire).toBe(true);
        expect(input2.fire).toBe(true);
        expect(input3.fire).toBe(true);
      });

      it('should stop firing when spacebar is released', () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
        expect(inputManager.getInput().fire).toBe(true);

        window.dispatchEvent(new KeyboardEvent('keyup', { key: ' ' }));
        expect(inputManager.getInput().fire).toBe(false);
      });
    });
  });

  describe('touch input', () => {
    it('should detect touch fire when held', () => {
      inputManager.setTouchFire(true);

      const input = inputManager.getInput();
      expect(input.fire).toBe(true);
    });

    it('should allow continuous fire while touch is held', () => {
      inputManager.setTouchFire(true);

      // Get input multiple times while touch is held
      const input1 = inputManager.getInput();
      const input2 = inputManager.getInput();
      const input3 = inputManager.getInput();

      expect(input1.fire).toBe(true);
      expect(input2.fire).toBe(true);
      expect(input3.fire).toBe(true);
    });

    it('should stop firing when touch is released', () => {
      inputManager.setTouchFire(true);
      expect(inputManager.getInput().fire).toBe(true);

      inputManager.setTouchFire(false);
      expect(inputManager.getInput().fire).toBe(false);
    });

    it('should set touch movement angle', () => {
      inputManager.touchMoving = true;
      inputManager.touchMoveAngle = Math.PI / 4;

      const input = inputManager.getInput();
      expect(input.targetAngle).toBe(Math.PI / 4);
    });

    it('should not set targetAngle when not touch moving', () => {
      inputManager.touchMoving = false;
      inputManager.touchMoveAngle = Math.PI / 4;

      const input = inputManager.getInput();
      expect(input.targetAngle).toBeUndefined();
    });
  });

  describe('combined inputs', () => {
    it('should fire from either keyboard or touch', () => {
      // Only keyboard
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
      expect(inputManager.getInput().fire).toBe(true);

      window.dispatchEvent(new KeyboardEvent('keyup', { key: ' ' }));
      expect(inputManager.getInput().fire).toBe(false);

      // Only touch
      inputManager.setTouchFire(true);
      expect(inputManager.getInput().fire).toBe(true);

      inputManager.setTouchFire(false);
      expect(inputManager.getInput().fire).toBe(false);

      // Both
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
      inputManager.setTouchFire(true);
      expect(inputManager.getInput().fire).toBe(true);
    });
  });

  describe('unbind', () => {
    it('should clear all state on unbind', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
      inputManager.setTouchFire(true);
      inputManager.touchMoving = true;
      inputManager.touchMoveAngle = Math.PI;

      inputManager.unbind();

      const input = inputManager.getInput();
      expect(input.up).toBe(false);
      expect(input.fire).toBe(false);
      expect(input.targetAngle).toBeUndefined();
    });

    it('should not respond to key events after unbind', () => {
      inputManager.unbind();

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));

      const input = inputManager.getInput();
      expect(input.up).toBe(false);
      expect(input.fire).toBe(false);
    });
  });

  describe('empty static method', () => {
    it('should return an input with all values false', () => {
      const input = InputManager.empty();

      expect(input.left).toBe(false);
      expect(input.right).toBe(false);
      expect(input.up).toBe(false);
      expect(input.down).toBe(false);
      expect(input.fire).toBe(false);
      expect(input.timestamp).toBeDefined();
    });
  });
});
