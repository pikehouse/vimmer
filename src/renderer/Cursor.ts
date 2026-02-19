// Cursor visual logic is handled inline by Terminal.render()
// This module exists as a namespace for cursor-related utilities.

import type { Position } from '../types';

export function positionKey(pos: Position): string {
  return `${pos.row},${pos.col}`;
}

export function parsePositionKey(key: string): Position {
  const [row, col] = key.split(',').map(Number);
  return { row, col };
}
