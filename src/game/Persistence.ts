import { SAVE_KEY, SAVE_VERSION } from '../constants';
import type { SaveData, LevelSaveData } from '../types';

const DEFAULT_SAVE: SaveData = {
  version: SAVE_VERSION,
  levels: {
    'level1': { unlocked: true, subLevelsCompleted: 0, bestScore: 0, bestStars: 0 },
    'level2': { unlocked: false, subLevelsCompleted: 0, bestScore: 0, bestStars: 0 },
    'level3': { unlocked: false, subLevelsCompleted: 0, bestScore: 0, bestStars: 0 },
    'level4': { unlocked: false, subLevelsCompleted: 0, bestScore: 0, bestStars: 0 },
    'level5': { unlocked: false, subLevelsCompleted: 0, bestScore: 0, bestStars: 0 },
    'level6': { unlocked: false, subLevelsCompleted: 0, bestScore: 0, bestStars: 0 },
  },
  totalScore: 0,
};

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return structuredClone(DEFAULT_SAVE);
    const data = JSON.parse(raw) as SaveData;
    if (data.version !== SAVE_VERSION) return structuredClone(DEFAULT_SAVE);
    return data;
  } catch {
    return structuredClone(DEFAULT_SAVE);
  }
}

export function writeSave(data: SaveData): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function updateLevelSave(
  save: SaveData,
  levelId: string,
  update: Partial<LevelSaveData>
): void {
  if (!save.levels[levelId]) {
    save.levels[levelId] = { unlocked: false, subLevelsCompleted: 0, bestScore: 0, bestStars: 0 };
  }
  Object.assign(save.levels[levelId], update);

  // Recalculate total score
  save.totalScore = Object.values(save.levels).reduce((sum, l) => sum + l.bestScore, 0);
}

export function unlockNextLevel(save: SaveData, currentLevelId: string): void {
  const levels = ['level1', 'level2', 'level3', 'level4', 'level5', 'level6'];
  const idx = levels.indexOf(currentLevelId);
  if (idx >= 0 && idx < levels.length - 1) {
    const nextId = levels[idx + 1];
    if (save.levels[nextId]) {
      save.levels[nextId].unlocked = true;
    }
  }
}
