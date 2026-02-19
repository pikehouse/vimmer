import type { VimEvent, VimCommandType, LevelState, CellOverride, SubLevelConfig } from '../types';
import type { VimEngine } from '../engine/VimEngine';

export abstract class LevelBase {
  protected engine: VimEngine;
  protected state: LevelState;

  constructor(engine: VimEngine) {
    this.engine = engine;
    this.state = {
      subLevel: 0,
      score: 0,
      objectives: [],
      startTime: Date.now(),
      timeLimit: 0,
      timeRemaining: 0,
      customData: {},
    };
  }

  abstract get id(): string;
  abstract get name(): string;
  abstract get subtitle(): string;
  abstract get storyIntro(): string[];
  abstract get tutorialHints(): string[];
  abstract get commands(): VimCommandType[];
  abstract get totalSubLevels(): number;

  abstract getSubLevelConfig(subLevel: number): SubLevelConfig;

  // ── Lifecycle ──

  setup(subLevel: number): void {
    this.state.subLevel = subLevel;
    const config = this.getSubLevelConfig(subLevel);

    this.engine.setBuffer(config.bufferLines);
    this.engine.setEnabledCommands(this.commands);

    this.state.objectives = config.objectives.map(o => ({ ...o, completed: false }));
    this.state.timeLimit = config.timeLimit ?? 0;
    this.state.timeRemaining = this.state.timeLimit;
    this.state.startTime = Date.now();
    this.state.score = 0;
    this.state.customData = {};

    this.onSetup();
  }

  protected onSetup(): void {
    // Override in subclasses for additional setup
  }

  onVimEvent(event: VimEvent): void {
    this.checkObjectives(event);
  }

  protected checkObjectives(event: VimEvent): void {
    for (const obj of this.state.objectives) {
      if (!obj.completed && obj.check(event, this.state)) {
        obj.completed = true;
        this.state.score += 10; // bonus for completing objectives
      }
    }
  }

  isComplete(): boolean {
    return this.state.objectives.every(o => o.completed);
  }

  getState(): LevelState {
    return this.state;
  }

  // ── Timer ──

  tick(deltaMs: number): void {
    if (this.state.timeLimit > 0) {
      this.state.timeRemaining = Math.max(
        0,
        this.state.timeRemaining - deltaMs / 1000
      );
    }
  }

  isTimedOut(): boolean {
    return this.state.timeLimit > 0 && this.state.timeRemaining <= 0;
  }

  // ── Rendering overrides ──

  getCellOverrides(): Map<string, CellOverride> {
    return new Map();
  }

  getObjectiveText(): string {
    const incomplete = this.state.objectives.find(o => !o.completed);
    return incomplete?.description ?? 'All objectives complete!';
  }

  // ── Cleanup ──

  teardown(): void {
    // Override for cleanup
  }
}
