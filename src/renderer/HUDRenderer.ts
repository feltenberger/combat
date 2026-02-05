import { CANVAS_WIDTH, COLORS, TankColor, TANK_COLORS } from '../config/constants';

export class HUDRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    p1Name: string,
    p2Name: string,
    p1Score: number,
    p2Score: number,
    round: number,
    roundsToWin: number,
    p1Color: TankColor = 'blue',
    p2Color: TankColor = 'red',
  ): void {
    const hudHeight = 36;
    const y = 0;

    // Background bar
    ctx.fillStyle = COLORS.HUD_BG;
    ctx.fillRect(0, y, CANVAS_WIDTH, hudHeight);

    // Bottom border
    ctx.fillStyle = '#333333';
    ctx.fillRect(0, hudHeight - 1, CANVAS_WIDTH, 1);

    ctx.font = 'bold 14px monospace';
    ctx.textBaseline = 'middle';
    const cy = y + hudHeight / 2;

    // Player 1 (left)
    ctx.fillStyle = TANK_COLORS[p1Color].main;
    ctx.textAlign = 'left';
    ctx.fillText(`${p1Name}`, 12, cy);

    // Player 1 score
    ctx.fillStyle = COLORS.HUD_TEXT;
    ctx.fillText(`${p1Score}`, 12 + ctx.measureText(p1Name).width + 12, cy);

    // Round info (center)
    ctx.textAlign = 'center';
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '12px monospace';
    ctx.fillText(`Round ${round} · First to ${roundsToWin}`, CANVAS_WIDTH / 2, cy);

    // Player 2 (right)
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'right';

    // Player 2 score first (so it's to the left of name)
    ctx.fillStyle = COLORS.HUD_TEXT;
    const p2NameWidth = ctx.measureText(p2Name).width;
    ctx.fillText(`${p2Score}`, CANVAS_WIDTH - 12 - p2NameWidth - 12, cy);

    // Player 2 name
    ctx.fillStyle = TANK_COLORS[p2Color].main;
    ctx.fillText(`${p2Name}`, CANVAS_WIDTH - 12, cy);
  }

  renderCountdown(ctx: CanvasRenderingContext2D, countdown: number, canvasHeight: number): void {
    const num = Math.ceil(countdown);
    if (num <= 0) return;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, canvasHeight);

    const scale = 1 + (countdown - Math.floor(countdown)) * 0.3;
    ctx.save();
    ctx.translate(CANVAS_WIDTH / 2, canvasHeight / 2);
    ctx.scale(scale, scale);
    ctx.font = 'bold 80px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ffdd44';
    ctx.fillText(`${num}`, 0, 0);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  renderRoundOver(
    ctx: CanvasRenderingContext2D,
    canvasHeight: number,
    winnerName: string | null,
  ): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, canvasHeight);

    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffdd44';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ffdd44';
    ctx.fillText(winnerName ? `${winnerName} scores!` : 'Draw!', CANVAS_WIDTH / 2, canvasHeight / 2);
    ctx.shadowBlur = 0;
  }

  renderMatchOver(
    ctx: CanvasRenderingContext2D,
    canvasHeight: number,
    winnerName: string,
    p1Name: string,
    p2Name: string,
    p1Score: number,
    p2Score: number,
  ): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, canvasHeight);

    const cx = CANVAS_WIDTH / 2;
    const cy = canvasHeight / 2;

    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffdd44';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ffdd44';
    ctx.fillText('GAME OVER', cx, cy - 60);
    ctx.shadowBlur = 0;

    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${winnerName} wins!`, cx, cy);

    ctx.font = '20px monospace';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText(`${p1Name} ${p1Score} - ${p2Score} ${p2Name}`, cx, cy + 45);

    ctx.font = '14px monospace';
    ctx.fillStyle = '#666666';
    ctx.fillText('Press ESC to return to lobby', cx, cy + 90);
  }

  renderWaiting(ctx: CanvasRenderingContext2D, canvasHeight: number): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, canvasHeight);

    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Waiting for opponent...', CANVAS_WIDTH / 2, canvasHeight / 2);
  }

  renderDisconnect(ctx: CanvasRenderingContext2D, canvasHeight: number): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, canvasHeight);

    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff4444';
    ctx.fillText('Opponent disconnected', CANVAS_WIDTH / 2, canvasHeight / 2 - 20);

    ctx.font = '14px monospace';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText('Press ESC to return to lobby', CANVAS_WIDTH / 2, canvasHeight / 2 + 20);
  }
}
