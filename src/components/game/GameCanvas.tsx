import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../config/constants';

export interface GameCanvasHandle {
  getContext: () => CanvasRenderingContext2D | null;
}

export const GameCanvas = forwardRef<GameCanvasHandle>((_props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useImperativeHandle(ref, () => ({
    getContext: () => canvasRef.current?.getContext('2d') || null,
  }));

  return (
    <div className="game-canvas-container">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="game-canvas"
      />
    </div>
  );
});

GameCanvas.displayName = 'GameCanvas';
