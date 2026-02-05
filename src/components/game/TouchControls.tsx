import { useRef, useCallback, useEffect } from 'react';
import { InputManager } from '../../engine/InputManager';

interface TouchControlsProps {
  inputManager: InputManager;
}

const JOYSTICK_SIZE = 140;
const KNOB_SIZE = 56;
const DEAD_ZONE = 15;
const FIRE_SIZE = 80;

export function TouchControls({ inputManager }: TouchControlsProps) {
  const joystickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const joystickTouchId = useRef<number | null>(null);
  const fireTouchId = useRef<number | null>(null);
  const centerRef = useRef({ x: 0, y: 0 });

  const updateJoystick = useCallback((clientX: number, clientY: number) => {
    const cx = centerRef.current.x;
    const cy = centerRef.current.y;
    let dx = clientX - cx;
    let dy = clientY - cy;

    // Clamp to joystick radius
    const maxR = JOYSTICK_SIZE / 2 - KNOB_SIZE / 4;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }

    // Move knob visually
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    }

    // Map to angle-based input if outside dead zone
    if (dist > DEAD_ZONE) {
      inputManager.touchMoveAngle = Math.atan2(dy, dx);
      inputManager.touchMoving = true;
    } else {
      inputManager.touchMoveAngle = null;
      inputManager.touchMoving = false;
    }
  }, [inputManager]);

  const resetJoystick = useCallback(() => {
    if (knobRef.current) {
      knobRef.current.style.transform = 'translate(0px, 0px)';
    }
    inputManager.touchMoveAngle = null;
    inputManager.touchMoving = false;
    joystickTouchId.current = null;
  }, [inputManager]);

  const handleJoystickTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (joystickTouchId.current !== null) return;
    const touch = e.changedTouches[0];
    joystickTouchId.current = touch.identifier;

    const rect = joystickRef.current?.getBoundingClientRect();
    if (rect) {
      centerRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
    updateJoystick(touch.clientX, touch.clientY);
  }, [updateJoystick]);

  const handleJoystickTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchId.current) {
        updateJoystick(touch.clientX, touch.clientY);
        break;
      }
    }
  }, [updateJoystick]);

  const handleJoystickTouchEnd = useCallback((e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchId.current) {
        resetJoystick();
        break;
      }
    }
  }, [resetJoystick]);

  const handleFireStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    fireTouchId.current = e.changedTouches[0].identifier;
    inputManager.setTouchFire(true);
  }, [inputManager]);

  const handleFireEnd = useCallback((e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === fireTouchId.current) {
        fireTouchId.current = null;
        inputManager.setTouchFire(false);
        break;
      }
    }
  }, [inputManager]);

  // Prevent scrolling/zooming on the game page
  useEffect(() => {
    const prevent = (e: TouchEvent) => {
      if ((e.target as HTMLElement)?.closest('.touch-controls')) {
        e.preventDefault();
      }
    };
    document.addEventListener('touchmove', prevent, { passive: false });
    return () => document.removeEventListener('touchmove', prevent);
  }, []);

  return (
    <div className="touch-controls">
      <div
        className="joystick-zone"
        ref={joystickRef}
        onTouchStart={handleJoystickTouchStart}
        onTouchMove={handleJoystickTouchMove}
        onTouchEnd={handleJoystickTouchEnd}
        onTouchCancel={handleJoystickTouchEnd}
      >
        <div className="joystick-base">
          <div className="joystick-knob" ref={knobRef} />
        </div>
      </div>

      <div
        className="fire-zone"
        onTouchStart={handleFireStart}
        onTouchEnd={handleFireEnd}
        onTouchCancel={handleFireEnd}
      >
        <div className="fire-button">FIRE</div>
      </div>
    </div>
  );
}
