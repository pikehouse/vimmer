import type { LevelResult, GameScreen } from '../types';
import { VimEngine } from '../engine/VimEngine';
import { Terminal } from '../renderer/Terminal';
import { GameState } from './GameState';
import { LevelRunner } from './LevelRunner';
import { updateLevelSave, unlockNextLevel, writeSave } from './Persistence';
import { createLevel } from '../levels/LevelRegistry';
import { TitleScreen } from '../ui/TitleScreen';
import { LevelSelect } from '../ui/LevelSelect';
import { LevelIntro } from '../ui/LevelIntro';
import { ScoreScreen } from '../ui/ScoreScreen';
import { HUD } from '../ui/HUD';
import { AudioManager } from '../audio/AudioManager';

// Import all levels to trigger registration
import '../levels/level1-firewall/FirewallLevel';
import '../levels/level2-packets/PacketLevel';
import '../levels/level3-injection/InjectionLevel';
import '../levels/level4-virus/VirusLevel';
import '../levels/level5-heist/HeistLevel';
import '../levels/level6-speedrun/SpeedrunLevel';

export class GameManager {
  private root: HTMLElement;
  private engine: VimEngine;
  private terminal: Terminal;
  private gameState: GameState;
  private hud: HUD;
  private audio: AudioManager;

  // Current screen instances
  private titleScreen: TitleScreen | null = null;
  private levelSelect: LevelSelect | null = null;
  private levelIntro: LevelIntro | null = null;
  private scoreScreen: ScoreScreen | null = null;
  private levelRunner: LevelRunner | null = null;

  private hudRafId: number = 0;

  constructor(root: HTMLElement) {
    this.root = root;
    this.engine = new VimEngine();
    this.gameState = new GameState();
    this.hud = new HUD(root);
    this.terminal = new Terminal(root);
    this.hud.setTerminalEl(this.terminal.getElement());
    this.hud.hide();
    this.audio = new AudioManager();
    this.audio.mountIndicator(root);
  }

  start(): void {
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
    this.switchScreen('title');
  }

  private switchScreen(screen: GameScreen): void {
    // Cleanup previous screen
    this.titleScreen?.destroy();
    this.titleScreen = null;
    this.levelSelect?.destroy();
    this.levelSelect = null;
    this.levelIntro?.destroy();
    this.levelIntro = null;
    this.scoreScreen?.destroy();
    this.scoreScreen = null;
    this.levelRunner?.stop();
    this.levelRunner = null;
    this.hud.hide();
    if (this.hudRafId) cancelAnimationFrame(this.hudRafId);

    this.gameState.currentScreen = screen;

    switch (screen) {
      case 'title':
        this.terminal.clear();
        this.titleScreen = new TitleScreen(this.root);
        break;

      case 'level_select':
        this.terminal.clear();
        this.levelSelect = new LevelSelect(this.root, this.gameState.save, (choice) => {
          this.gameState.currentLevelId = choice.levelId;
          this.gameState.currentSubLevel = choice.subLevel;
          this.switchScreen('level_intro');
        });
        break;

      case 'level_intro': {
        this.terminal.clear();
        const level = createLevel(this.gameState.currentLevelId, this.engine);
        if (!level) {
          this.switchScreen('level_select');
          return;
        }
        this.levelIntro = new LevelIntro(
          this.root,
          level.name,
          level.storyIntro,
          level.tutorialHints,
          () => this.switchScreen('gameplay')
        );
        break;
      }

      case 'gameplay': {
        const level = createLevel(this.gameState.currentLevelId, this.engine);
        if (!level) {
          this.switchScreen('level_select');
          return;
        }

        this.hud.show();
        this.levelRunner = new LevelRunner(
          this.engine,
          this.terminal,
          level,
          (result) => this.onLevelComplete(result)
        );
        this.levelRunner.start(this.gameState.currentSubLevel);
        this.startHUDLoop();
        break;
      }

      case 'score':
        // Score screen is created by onLevelComplete
        break;
    }
  }

  private onLevelComplete(result: LevelResult): void {
    this.hud.hide();
    if (this.hudRafId) cancelAnimationFrame(this.hudRafId);

    const save = this.gameState.save;
    const levelId = this.gameState.currentLevelId;
    const levelData = save.levels[levelId];

    // Update save data
    const newCompleted = Math.max(
      levelData?.subLevelsCompleted ?? 0,
      result.subLevel + 1
    );
    updateLevelSave(save, levelId, {
      subLevelsCompleted: newCompleted,
      bestScore: Math.max(levelData?.bestScore ?? 0, result.score),
      bestStars: Math.max(levelData?.bestStars ?? 0, result.stars),
    });

    // Unlock next level if all sub-levels completed
    const level = createLevel(levelId, this.engine);
    if (level && newCompleted >= level.totalSubLevels) {
      unlockNextLevel(save, levelId);
    }

    writeSave(save);

    this.gameState.currentScreen = 'score';
    this.scoreScreen = new ScoreScreen(this.root, result, () => {
      // Check if there's a next sub-level
      if (level && result.subLevel + 1 < level.totalSubLevels) {
        this.gameState.currentSubLevel = result.subLevel + 1;
        this.switchScreen('gameplay');
      } else {
        this.switchScreen('level_select');
      }
    });
  }

  private startHUDLoop(): void {
    const loop = () => {
      if (!this.levelRunner?.isRunning()) return;
      this.hud.update(this.levelRunner.getHUDData());
      this.hudRafId = requestAnimationFrame(loop);
    };
    loop();
  }

  private onKeyDown(e: KeyboardEvent): void {
    // Prevent default for game keys
    if (this.shouldPreventDefault(e)) {
      e.preventDefault();
    }

    // Start audio on first user interaction (browser autoplay policy)
    this.audio.ensureStarted();

    // Global mute toggle — skip during gameplay when typing text
    if (e.key === 'm' || e.key === 'M') {
      const inTextMode =
        this.gameState.currentScreen === 'gameplay' &&
        !this.engine.modeManager.isNormal();
      if (!inTextMode) {
        this.audio.toggle();
        return;
      }
    }

    const key = this.normalizeKey(e);
    const screen = this.gameState.currentScreen;

    switch (screen) {
      case 'title':
        this.switchScreen('level_select');
        break;

      case 'level_select':
        if (key === 'Escape') {
          this.switchScreen('title');
        } else {
          this.levelSelect?.handleKey(key);
        }
        break;

      case 'level_intro':
        this.levelIntro?.handleKey(key);
        break;

      case 'gameplay':
        this.levelRunner?.handleKey(key);
        break;

      case 'score':
        this.scoreScreen?.handleKey(key);
        break;
    }
  }

  private normalizeKey(e: KeyboardEvent): string {
    if (e.key === ' ') return ' ';
    if (e.key.length === 1) return e.key;
    return e.key; // 'Escape', 'Enter', 'Backspace', 'ArrowUp', etc.
  }

  private shouldPreventDefault(e: KeyboardEvent): boolean {
    // Prevent scrolling with arrow keys, space, slash, etc.
    const preventKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', '/', 'Tab'];
    return preventKeys.includes(e.key);
  }
}
