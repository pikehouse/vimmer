import type { VimMode } from '../types';

export class ModeManager {
  private _mode: VimMode = 'NORMAL';
  private _onModeChange: ((mode: VimMode, prev: VimMode) => void) | null = null;

  get mode(): VimMode {
    return this._mode;
  }

  set onModeChange(handler: (mode: VimMode, prev: VimMode) => void) {
    this._onModeChange = handler;
  }

  switchTo(mode: VimMode): VimMode {
    const prev = this._mode;
    if (prev === mode) return prev;
    this._mode = mode;
    this._onModeChange?.(mode, prev);
    return prev;
  }

  isNormal(): boolean {
    return this._mode === 'NORMAL';
  }

  isInsert(): boolean {
    return this._mode === 'INSERT';
  }

  isCommandLine(): boolean {
    return this._mode === 'COMMAND_LINE';
  }
}
