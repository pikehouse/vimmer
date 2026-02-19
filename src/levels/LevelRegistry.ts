import type { LevelBase } from './LevelBase';
import type { VimEngine } from '../engine/VimEngine';

export type LevelFactory = (engine: VimEngine) => LevelBase;

const registry = new Map<string, LevelFactory>();

export function registerLevel(id: string, factory: LevelFactory): void {
  registry.set(id, factory);
}

export function createLevel(id: string, engine: VimEngine): LevelBase | null {
  const factory = registry.get(id);
  return factory ? factory(engine) : null;
}

export function getAllLevelIds(): string[] {
  return [...registry.keys()];
}
