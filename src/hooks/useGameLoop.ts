import { useEffect, useRef } from 'react';

export function useGameLoop(callback: (dt: number) => void, active: boolean = true) {
  const callbackRef = useRef(callback);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  callbackRef.current = callback;

  useEffect(() => {
    if (!active) return;

    lastTimeRef.current = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1); // Cap at 100ms
      lastTimeRef.current = time;
      callbackRef.current(dt);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [active]);
}
