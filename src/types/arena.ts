import { TileType } from '../config/constants';

export interface ArenaDefinition {
  name: string;
  tiles: TileType[][];   // [row][col]
  spawn1: { col: number; row: number };
  spawn2: { col: number; row: number };
}
