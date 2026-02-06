import { PlayerInput, BulletState, TankState, GameState } from '../types/game';
import { Arena } from '../engine/Arena';
import { TILE_SIZE, ARENA_COLS, ARENA_ROWS, BULLET_SPEED } from '../config/constants';

/**
 * Angle from point A to point B in radians.
 */
export function angleTo(ax: number, ay: number, bx: number, by: number): number {
  return Math.atan2(by - ay, bx - ax);
}

/**
 * Signed angle difference normalized to [-PI, PI].
 */
export function angleDiff(current: number, target: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return diff;
}

/**
 * Check if angle is aimed within tolerance of target angle.
 */
export function isAimingAt(angle: number, target: number, tolerance: number): boolean {
  return Math.abs(angleDiff(angle, target)) <= tolerance;
}

/**
 * DDA raycast through tile grid. Returns true if line of sight is clear.
 */
export function hasLineOfSight(
  x1: number, y1: number,
  x2: number, y2: number,
  arena: Arena
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return true;

  const steps = Math.ceil(dist / (TILE_SIZE / 2));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = x1 + dx * t;
    const py = y1 + dy * t;
    const col = Math.floor(px / TILE_SIZE);
    const row = Math.floor(py / TILE_SIZE);
    if (arena.isSolid(col, row)) return false;
  }
  return true;
}

/**
 * Detect if a bullet is threatening the tank position.
 * Returns the bullet's travel angle if threatening, null otherwise.
 */
export function getBulletThreat(
  bullet: BulletState,
  tankX: number, tankY: number,
  corridor: number
): number | null {
  // Vector from bullet to tank
  const dx = tankX - bullet.x;
  const dy = tankY - bullet.y;

  // Bullet direction vector
  const bDirX = Math.cos(bullet.angle);
  const bDirY = Math.sin(bullet.angle);

  // Project tank position onto bullet trajectory
  const dot = dx * bDirX + dy * bDirY;

  // Bullet must be heading toward the tank (positive projection)
  if (dot < 0) return null;

  // Perpendicular distance from trajectory to tank
  const perpDist = Math.abs(dx * bDirY - dy * bDirX);

  if (perpDist < corridor) {
    return bullet.angle;
  }
  return null;
}

/**
 * Get perpendicular dodge direction that avoids walls.
 * Returns angle to move toward, or null if no safe dodge.
 */
export function getDodgeDirection(
  bulletAngle: number,
  x: number, y: number,
  arena: Arena
): number | null {
  // Two perpendicular directions
  const perp1 = bulletAngle + Math.PI / 2;
  const perp2 = bulletAngle - Math.PI / 2;

  const checkDist = TILE_SIZE * 1.5;

  const x1 = x + Math.cos(perp1) * checkDist;
  const y1 = y + Math.sin(perp1) * checkDist;
  const col1 = Math.floor(x1 / TILE_SIZE);
  const row1 = Math.floor(y1 / TILE_SIZE);
  const safe1 = !arena.isSolid(col1, row1);

  const x2 = x + Math.cos(perp2) * checkDist;
  const y2 = y + Math.sin(perp2) * checkDist;
  const col2 = Math.floor(x2 / TILE_SIZE);
  const row2 = Math.floor(y2 / TILE_SIZE);
  const safe2 = !arena.isSolid(col2, row2);

  if (safe1 && !safe2) return perp1;
  if (safe2 && !safe1) return perp2;
  if (safe1 && safe2) return perp1; // Default to first option
  return null;
}

/**
 * Convert desired angle into PlayerInput for tank rotation/movement.
 */
export function angleToInput(
  currentAngle: number,
  desiredAngle: number,
  moveForward: boolean,
  moveBackward: boolean,
  fire: boolean
): PlayerInput {
  const diff = angleDiff(currentAngle, desiredAngle);
  const deadZone = 0.05; // Small dead zone to prevent jittering

  return {
    left: diff < -deadZone,
    right: diff > deadZone,
    up: moveForward,
    down: moveBackward,
    fire,
    timestamp: Date.now(),
  };
}

/**
 * Find positions behind walls/rocks relative to a threat.
 * Returns tile positions sorted by distance from 'from'.
 */
export function findCoverPositions(
  fromX: number, fromY: number,
  threatX: number, threatY: number,
  arena: Arena,
  max: number
): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number; dist: number }> = [];
  const threatAngle = angleTo(fromX, fromY, threatX, threatY);

  for (let row = 1; row < ARENA_ROWS - 1; row++) {
    for (let col = 1; col < ARENA_COLS - 1; col++) {
      if (arena.isSolid(col, row)) continue;

      const px = col * TILE_SIZE + TILE_SIZE / 2;
      const py = row * TILE_SIZE + TILE_SIZE / 2;

      // Check if this position has a solid tile between it and the threat
      if (!hasLineOfSight(px, py, threatX, threatY, arena)) {
        const dx = px - fromX;
        const dy = py - fromY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        positions.push({ x: px, y: py, dist });
      }
    }
  }

  positions.sort((a, b) => a.dist - b.dist);
  return positions.slice(0, max).map(p => ({ x: p.x, y: p.y }));
}

/**
 * A* pathfinding on tile grid. Returns array of pixel positions from start to goal.
 * Returns empty array if no path found.
 */
export function findPath(
  startX: number, startY: number,
  goalX: number, goalY: number,
  arena: Arena
): Array<{ x: number; y: number }> {
  const startCol = Math.floor(startX / TILE_SIZE);
  const startRow = Math.floor(startY / TILE_SIZE);
  const goalCol = Math.floor(goalX / TILE_SIZE);
  const goalRow = Math.floor(goalY / TILE_SIZE);

  if (startCol === goalCol && startRow === goalRow) return [];

  interface Node {
    col: number;
    row: number;
    g: number;
    h: number;
    f: number;
    parent: Node | null;
  }

  const heuristic = (c: number, r: number) =>
    Math.abs(c - goalCol) + Math.abs(r - goalRow);

  const open: Node[] = [{
    col: startCol, row: startRow,
    g: 0, h: heuristic(startCol, startRow),
    f: heuristic(startCol, startRow),
    parent: null,
  }];
  const closed = new Set<string>();

  const directions = [
    { dc: 0, dr: -1 }, { dc: 0, dr: 1 },
    { dc: -1, dr: 0 }, { dc: 1, dr: 0 },
  ];

  let iterations = 0;
  const maxIterations = 500;

  while (open.length > 0 && iterations < maxIterations) {
    iterations++;

    // Find node with lowest f
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bestIdx].f) bestIdx = i;
    }
    const current = open.splice(bestIdx, 1)[0];
    const key = `${current.col},${current.row}`;

    if (closed.has(key)) continue;
    closed.add(key);

    if (current.col === goalCol && current.row === goalRow) {
      // Reconstruct path
      const path: Array<{ x: number; y: number }> = [];
      let node: Node | null = current;
      while (node) {
        path.unshift({
          x: node.col * TILE_SIZE + TILE_SIZE / 2,
          y: node.row * TILE_SIZE + TILE_SIZE / 2,
        });
        node = node.parent;
      }
      // Skip start position
      return path.slice(1);
    }

    for (const dir of directions) {
      const nc = current.col + dir.dc;
      const nr = current.row + dir.dr;
      const nKey = `${nc},${nr}`;

      if (closed.has(nKey)) continue;
      if (nc < 0 || nc >= ARENA_COLS || nr < 0 || nr >= ARENA_ROWS) continue;
      if (arena.isSolid(nc, nr)) continue;

      const g = current.g + 1;
      const h = heuristic(nc, nr);
      open.push({
        col: nc, row: nr,
        g, h, f: g + h,
        parent: current,
      });
    }
  }

  return []; // No path found
}

/**
 * Calculate leading angle to hit a moving target.
 */
export function getLeadingAngle(
  shooterX: number, shooterY: number,
  targetX: number, targetY: number,
  targetVx: number, targetVy: number,
  bulletSpeed: number = BULLET_SPEED
): number {
  const dx = targetX - shooterX;
  const dy = targetY - shooterY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 1) return angleTo(shooterX, shooterY, targetX, targetY);

  // Time for bullet to reach target's current position
  const t = dist / bulletSpeed;

  // Predict where target will be
  const predictedX = targetX + targetVx * t;
  const predictedY = targetY + targetVy * t;

  return angleTo(shooterX, shooterY, predictedX, predictedY);
}

/**
 * Create a no-op input (no buttons pressed).
 */
export function noInput(): PlayerInput {
  return {
    left: false, right: false, up: false, down: false,
    fire: false, timestamp: Date.now(),
  };
}

/**
 * Get distance between two points.
 */
export function distanceBetween(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Find the nearest alive (non-eliminated) opponent from a list of UIDs.
 * Returns null if no alive opponents found.
 */
export function findNearestAliveOpponent(
  myUid: string,
  opponentUids: string[],
  gameState: GameState,
): string | null {
  const myTank = gameState.tanks[myUid];
  if (!myTank) return opponentUids[0] || null;

  let nearest: string | null = null;
  let nearestDist = Infinity;

  for (const uid of opponentUids) {
    const tank = gameState.tanks[uid];
    if (!tank || !tank.alive || tank.eliminated) continue;
    const dist = distanceBetween(myTank.x, myTank.y, tank.x, tank.y);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = uid;
    }
  }

  return nearest;
}
