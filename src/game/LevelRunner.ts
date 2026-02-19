import type { VimEvent, LevelResult } from '../types';
import type { VimEngine } from '../engine/VimEngine';
import type { LevelBase } from '../levels/LevelBase';
import type { Terminal } from '../renderer/Terminal';
import { StatusBar } from '../renderer/StatusBar';
import { ScoreManager } from './ScoreManager';
import { RENDER_INTERVAL } from '../constants';

export type LevelRunnerCallback = (result: LevelResult) => void;

export class LevelRunner {
  private engine: VimEngine;
  private terminal: Terminal;
  private level: LevelBase;
  private statusBar: StatusBar;
  private scoreManager: ScoreManager;
  private onComplete: LevelRunnerCallback;

  private renderTimer: number = 0;
  private lastTick: number = 0;
  private running: boolean = false;
  private _subLevel: number = 0;

  constructor(
    engine: VimEngine,
    terminal: Terminal,
    level: LevelBase,
    onComplete: LevelRunnerCallback
  ) {
    this.engine = engine;
    this.terminal = terminal;
    this.level = level;
    this.statusBar = new StatusBar();
    this.scoreManager = new ScoreManager();
    this.onComplete = onComplete;
  }

  start(subLevel: number): void {
    this._subLevel = subLevel;
    this.level.setup(subLevel);
    this.running = true;
    this.lastTick = performance.now();

    // Wire up vim events to level
    this.engine.onEvent((event: VimEvent) => {
      if (!this.running) return;
      this.level.onVimEvent(event);

      // Check completion after each event
      if (this.level.isComplete()) {
        this.finish();
      }
    });

    // Start render loop
    this.renderLoop();
  }

  stop(): void {
    this.running = false;
    this.engine.clearEventHandlers();
    if (this.renderTimer) {
      cancelAnimationFrame(this.renderTimer);
    }
  }

  handleKey(key: string): void {
    if (!this.running) return;
    this.engine.handleKey(key);
  }

  isRunning(): boolean {
    return this.running;
  }

  getLevel(): LevelBase {
    return this.level;
  }

  // ── HUD Data ──

  getHUDData(): { level: string; objective: string; score: number; time: number; timeLimit: number } {
    const state = this.level.getState();
    return {
      level: `${this.level.name} ${this._subLevel + 1}/${this.level.totalSubLevels}`,
      objective: this.level.getObjectiveText(),
      score: state.score,
      time: state.timeRemaining,
      timeLimit: state.timeLimit,
    };
  }

  private renderLoop(): void {
    if (!this.running) return;

    const now = performance.now();
    const delta = now - this.lastTick;
    this.lastTick = now;

    // Update timer
    this.level.tick(delta);

    // Check timeout
    if (this.level.isTimedOut()) {
      this.finish();
      return;
    }

    // Render
    const overrides = this.level.getCellOverrides();
    const statusContent = this.statusBar.formatStatus(
      this.engine.modeManager.mode,
      this.engine.parser
    );

    this.terminal.render(
      this.engine.buffer,
      this.engine.modeManager.mode,
      overrides,
      statusContent
    );

    this.renderTimer = requestAnimationFrame(() => {
      setTimeout(() => this.renderLoop(), RENDER_INTERVAL);
    });
  }

  private finish(): void {
    this.running = false;
    this.engine.clearEventHandlers();
    if (this.renderTimer) {
      cancelAnimationFrame(this.renderTimer);
    }

    const state = this.level.getState();
    const maxObjectives = state.objectives.length;
    const result = this.scoreManager.calculateResult(
      this.level.id,
      state,
      maxObjectives
    );

    this.level.teardown();
    this.onComplete(result);
  }
}
