import type { GameScreen, SaveData } from '../types';
import { loadSave, writeSave } from './Persistence';

export class GameState {
  currentScreen: GameScreen = 'title';
  currentLevelId: string = 'level1';
  currentSubLevel: number = 0;
  save: SaveData;

  constructor() {
    this.save = loadSave();
  }

  persist(): void {
    writeSave(this.save);
  }
}
