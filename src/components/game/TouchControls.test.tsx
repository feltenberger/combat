import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { TouchControls } from './TouchControls';
import { InputManager } from '../../engine/InputManager';

describe('TouchControls', () => {
  function renderWithMockedRect() {
    const inputManager = new InputManager();
    const { container } = render(<TouchControls inputManager={inputManager} />);

    const joystickZone = container.querySelector('.joystick-zone')!;
    // Center of 160x160 zone is (80, 80)
    vi.spyOn(joystickZone, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, right: 160, bottom: 160,
      width: 160, height: 160, x: 0, y: 0, toJSON: () => {},
    });

    return { inputManager, container, joystickZone };
  }

  it('renders joystick and fire button', () => {
    const inputManager = new InputManager();
    const { container } = render(<TouchControls inputManager={inputManager} />);

    expect(container.querySelector('.joystick-zone')).toBeInTheDocument();
    expect(container.querySelector('.joystick-knob')).toBeInTheDocument();
    expect(container.querySelector('.fire-button')).toBeInTheDocument();
  });

  it('sets touchMoveAngle on joystick touch to the right', () => {
    const { inputManager, joystickZone } = renderWithMockedRect();

    // Touch at (120, 80) — 40px right of center (80,80)
    fireEvent.touchStart(joystickZone, {
      changedTouches: [{ identifier: 0, clientX: 120, clientY: 80 }],
    });

    expect(inputManager.touchMoving).toBe(true);
    expect(inputManager.touchMoveAngle).toBeCloseTo(0); // right = 0 rad
  });

  it('sets touchMoveAngle on joystick touch downward', () => {
    const { inputManager, joystickZone } = renderWithMockedRect();

    // Touch at (80, 120) — 40px below center
    fireEvent.touchStart(joystickZone, {
      changedTouches: [{ identifier: 0, clientX: 80, clientY: 120 }],
    });

    expect(inputManager.touchMoving).toBe(true);
    expect(inputManager.touchMoveAngle).toBeCloseTo(Math.PI / 2); // down = π/2
  });

  it('ignores movement within dead zone', () => {
    const { inputManager, joystickZone } = renderWithMockedRect();

    // Touch at (85, 80) — only 5px from center, inside 15px dead zone
    fireEvent.touchStart(joystickZone, {
      changedTouches: [{ identifier: 0, clientX: 85, clientY: 80 }],
    });

    expect(inputManager.touchMoving).toBe(false);
    expect(inputManager.touchMoveAngle).toBeNull();
  });

  it('resets on joystick touch end', () => {
    const { inputManager, joystickZone } = renderWithMockedRect();

    fireEvent.touchStart(joystickZone, {
      changedTouches: [{ identifier: 0, clientX: 120, clientY: 80 }],
    });
    expect(inputManager.touchMoving).toBe(true);

    fireEvent.touchEnd(joystickZone, {
      changedTouches: [{ identifier: 0, clientX: 120, clientY: 80 }],
    });
    expect(inputManager.touchMoving).toBe(false);
    expect(inputManager.touchMoveAngle).toBeNull();
  });

  it('triggers fire on fire button touch', () => {
    const inputManager = new InputManager();
    const spy = vi.spyOn(inputManager, 'setTouchFire');
    const { container } = render(<TouchControls inputManager={inputManager} />);

    const fireZone = container.querySelector('.fire-zone')!;

    fireEvent.touchStart(fireZone, {
      changedTouches: [{ identifier: 1, clientX: 0, clientY: 0 }],
    });
    expect(spy).toHaveBeenCalledWith(true);

    fireEvent.touchEnd(fireZone, {
      changedTouches: [{ identifier: 1, clientX: 0, clientY: 0 }],
    });
    expect(spy).toHaveBeenCalledWith(false);
  });
});
