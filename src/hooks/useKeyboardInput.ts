import { useEffect, useRef } from 'react';
import { InputManager } from '../engine/InputManager';

export function useKeyboardInput() {
  const inputManager = useRef(new InputManager());

  useEffect(() => {
    inputManager.current.bind();
    return () => {
      inputManager.current.unbind();
    };
  }, []);

  return inputManager.current;
}
