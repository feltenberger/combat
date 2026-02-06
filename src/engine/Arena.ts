import { TileType, ARENA_COLS, ARENA_ROWS, TILE_SIZE, ROCK_MAX_HP } from '../config/constants';
import { ArenaDefinition } from '../types/arena';
import { tileToPixel } from '../utils/math';

// Arena definitions
const W = TileType.WALL;
const R = TileType.ROCK;
const F = TileType.FLOOR;
const S1 = TileType.SPAWN_1;
const S2 = TileType.SPAWN_2;

function createEmptyGrid(): TileType[][] {
  const grid: TileType[][] = [];
  for (let row = 0; row < ARENA_ROWS; row++) {
    grid[row] = [];
    for (let col = 0; col < ARENA_COLS; col++) {
      // Border walls
      if (row === 0 || row === ARENA_ROWS - 1 || col === 0 || col === ARENA_COLS - 1) {
        grid[row][col] = W;
      } else {
        grid[row][col] = F;
      }
    }
  }
  return grid;
}

function createOpenField(): ArenaDefinition {
  const tiles = createEmptyGrid();
  // A few scattered rocks
  const rocks = [
    [5, 5], [5, 14], [10, 10], [15, 5], [15, 14],
    [24, 5], [24, 14], [10, 8], [10, 12], [20, 10],
    [7, 10], [13, 7], [13, 13], [22, 7], [22, 13],
  ];
  for (const [c, r] of rocks) {
    if (tiles[r] && tiles[r][c] !== undefined) tiles[r][c] = R;
  }
  tiles[3][3] = S1;
  tiles[16][26] = S2;
  return {
    name: 'Open Field',
    tiles,
    spawn1: { col: 3, row: 3 },
    spawn2: { col: 26, row: 16 },
    spawn3: { col: 26, row: 3 },
    spawn4: { col: 3, row: 16 },
  };
}

function createSimpleMaze(): ArenaDefinition {
  const tiles = createEmptyGrid();
  // Vertical wall segments
  for (let r = 3; r <= 8; r++) { tiles[r][10] = W; }
  for (let r = 11; r <= 16; r++) { tiles[r][10] = W; }
  for (let r = 3; r <= 8; r++) { tiles[r][20] = W; }
  for (let r = 11; r <= 16; r++) { tiles[r][20] = W; }
  // Horizontal wall segments
  for (let c = 12; c <= 18; c++) { tiles[5][c] = W; }
  for (let c = 12; c <= 18; c++) { tiles[14][c] = W; }
  // Rocks near corridors
  const rocks = [
    [8, 5], [8, 14], [22, 5], [22, 14],
    [15, 9], [15, 10], [5, 10], [25, 10],
  ];
  for (const [c, r] of rocks) {
    if (tiles[r] && tiles[r][c] !== undefined) tiles[r][c] = R;
  }
  tiles[10][3] = S1;
  tiles[10][26] = S2;
  return {
    name: 'Simple Maze',
    tiles,
    spawn1: { col: 3, row: 10 },
    spawn2: { col: 26, row: 10 },
    spawn3: { col: 15, row: 3 },
    spawn4: { col: 15, row: 16 },
  };
}

function createComplexMaze(): ArenaDefinition {
  const tiles = createEmptyGrid();
  // More intricate wall pattern
  // L-shapes in each quadrant
  for (let r = 3; r <= 7; r++) tiles[r][6] = W;
  for (let c = 6; c <= 10; c++) tiles[7][c] = W;

  for (let r = 3; r <= 7; r++) tiles[r][23] = W;
  for (let c = 19; c <= 23; c++) tiles[7][c] = W;

  for (let r = 12; r <= 16; r++) tiles[r][6] = W;
  for (let c = 6; c <= 10; c++) tiles[12][c] = W;

  for (let r = 12; r <= 16; r++) tiles[r][23] = W;
  for (let c = 19; c <= 23; c++) tiles[12][c] = W;

  // Center cross
  for (let c = 13; c <= 16; c++) tiles[10][c] = W;
  for (let r = 8; r <= 11; r++) tiles[r][15] = W;

  // Rocks
  const rocks = [
    [3, 10], [26, 10], [10, 3], [10, 16], [19, 3], [19, 16],
    [13, 5], [16, 14], [8, 9], [21, 9],
  ];
  for (const [c, r] of rocks) {
    if (tiles[r] && tiles[r][c] !== undefined) tiles[r][c] = R;
  }
  tiles[3][3] = S1;
  tiles[16][26] = S2;
  return {
    name: 'Complex Maze',
    tiles,
    spawn1: { col: 3, row: 3 },
    spawn2: { col: 26, row: 16 },
    spawn3: { col: 26, row: 3 },
    spawn4: { col: 3, row: 16 },
  };
}

function createFortress(): ArenaDefinition {
  const tiles = createEmptyGrid();
  // P1 fortress (left)
  for (let r = 6; r <= 13; r++) tiles[r][8] = W;
  for (let c = 3; c <= 8; c++) { tiles[6][c] = W; tiles[13][c] = W; }
  tiles[9][8] = F; // entrance
  tiles[10][8] = F;

  // P2 fortress (right)
  for (let r = 6; r <= 13; r++) tiles[r][21] = W;
  for (let c = 21; c <= 26; c++) { tiles[6][c] = W; tiles[13][c] = W; }
  tiles[9][21] = F; // entrance
  tiles[10][21] = F;

  // Center obstacles (rocks)
  const rocks = [
    [13, 8], [13, 11], [16, 8], [16, 11],
    [14, 9], [15, 10], [14, 10], [15, 9],
  ];
  for (const [c, r] of rocks) {
    if (tiles[r] && tiles[r][c] !== undefined) tiles[r][c] = R;
  }
  tiles[10][5] = S1;
  tiles[10][24] = S2;
  return {
    name: 'Fortress',
    tiles,
    spawn1: { col: 5, row: 10 },
    spawn2: { col: 24, row: 10 },
    spawn3: { col: 15, row: 3 },
    spawn4: { col: 15, row: 16 },
  };
}

export const ARENAS: ArenaDefinition[] = [
  createOpenField(),
  createSimpleMaze(),
  createComplexMaze(),
  createFortress(),
];

// Spawn angles: face right, left, down, up
const SPAWN_ANGLES = [0, Math.PI, Math.PI / 2, -Math.PI / 2];

export class Arena {
  definition: ArenaDefinition;
  rockHP: Map<string, number>;

  constructor(arenaIndex: number) {
    this.definition = ARENAS[arenaIndex % ARENAS.length];
    this.rockHP = new Map();
    this.initRocks();
  }

  private initRocks(): void {
    for (let row = 0; row < ARENA_ROWS; row++) {
      for (let col = 0; col < ARENA_COLS; col++) {
        if (this.definition.tiles[row][col] === TileType.ROCK) {
          this.rockHP.set(`${col},${row}`, ROCK_MAX_HP);
        }
      }
    }
  }

  resetRocks(): void {
    this.rockHP.clear();
    this.initRocks();
  }

  getTile(col: number, row: number): TileType {
    if (col < 0 || col >= ARENA_COLS || row < 0 || row >= ARENA_ROWS) return TileType.WALL;
    return this.definition.tiles[row][col];
  }

  isSolid(col: number, row: number): boolean {
    const tile = this.getTile(col, row);
    if (tile === TileType.WALL) return true;
    if (tile === TileType.ROCK) {
      const hp = this.rockHP.get(`${col},${row}`);
      return hp !== undefined && hp > 0;
    }
    return false;
  }

  damageRock(col: number, row: number): boolean {
    const key = `${col},${row}`;
    const hp = this.rockHP.get(key);
    if (hp !== undefined && hp > 0) {
      this.rockHP.set(key, hp - 1);
      return true;
    }
    return false;
  }

  getSpawnPosition(playerIndex: number): { x: number; y: number; angle: number } {
    const spawns = [
      this.definition.spawn1,
      this.definition.spawn2,
      this.definition.spawn3,
      this.definition.spawn4,
    ];
    const spawn = spawns[playerIndex % spawns.length];
    const pos = tileToPixel(spawn.col, spawn.row, TILE_SIZE);
    return {
      x: pos.x,
      y: pos.y,
      angle: SPAWN_ANGLES[playerIndex % SPAWN_ANGLES.length],
    };
  }

  getRockHPMap(): Record<string, number> {
    const map: Record<string, number> = {};
    this.rockHP.forEach((hp, key) => {
      map[key] = hp;
    });
    return map;
  }

  setRockHPFromMap(map: Record<string, number>): void {
    this.rockHP.clear();
    for (const [key, hp] of Object.entries(map)) {
      this.rockHP.set(key, hp);
    }
  }
}
