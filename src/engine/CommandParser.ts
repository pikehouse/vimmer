import type { VimCommand, VimCommandType, VimMode } from '../types';

export class CommandParser {
  private pending: string = '';
  private _enabledCommands: Set<VimCommandType> = new Set();
  private _searchBuffer: string = '';
  private _isSearching: boolean = false;

  get searchBuffer(): string {
    return this._searchBuffer;
  }

  get isSearching(): boolean {
    return this._isSearching;
  }

  get pendingKeys(): string {
    return this.pending;
  }

  setEnabledCommands(cmds: VimCommandType[]): void {
    this._enabledCommands = new Set(cmds);
  }

  isEnabled(cmd: VimCommandType): boolean {
    return this._enabledCommands.has(cmd);
  }

  parse(key: string, mode: VimMode): VimCommand | null {
    // ── Search mode ──
    if (this._isSearching) {
      return this.parseSearchKey(key);
    }

    // ── Insert mode ──
    if (mode === 'INSERT') {
      return this.parseInsertKey(key);
    }

    // ── Normal mode ──
    return this.parseNormalKey(key);
  }

  private parseSearchKey(key: string): VimCommand | null {
    if (key === 'Escape') {
      this._isSearching = false;
      this._searchBuffer = '';
      return { type: 'Escape' };
    }
    if (key === 'Enter') {
      this._isSearching = false;
      const term = this._searchBuffer;
      this._searchBuffer = '';
      return { type: '/', searchTerm: term };
    }
    if (key === 'Backspace') {
      this._searchBuffer = this._searchBuffer.slice(0, -1);
      return null; // No command yet — just updating search buffer
    }
    if (key.length === 1) {
      this._searchBuffer += key;
      return null;
    }
    return null;
  }

  private parseInsertKey(key: string): VimCommand | null {
    if (key === 'Escape') {
      return this.enabled('Escape') ? { type: 'Escape' } : null;
    }
    if (key === 'Backspace') {
      return this.enabled('backspace') ? { type: 'backspace' } : null;
    }
    if (key === 'Enter') {
      return this.enabled('enter') ? { type: 'enter' } : null;
    }
    if (key.length === 1) {
      return this.enabled('insert_char') ? { type: 'insert_char', char: key } : null;
    }
    return null;
  }

  private parseNormalKey(key: string): VimCommand | null {
    this.pending += key;

    // Single-key commands
    const singleMap: Record<string, VimCommandType> = {
      'h': 'h', 'j': 'j', 'k': 'k', 'l': 'l',
      'w': 'w', 'b': 'b', 'e': 'e',
      '0': '0', '$': '$',
      'i': 'i', 'a': 'a', 'o': 'o', 'O': 'O', 'I': 'I', 'A': 'A',
      'x': 'x',
      'p': 'p', 'P': 'P',
      'n': 'n', 'N': 'N',
      'G': 'G',
      'Escape': 'Escape',
    };

    // Check single key
    if (this.pending.length === 1) {
      const mapped = singleMap[this.pending];
      if (mapped && this.enabled(mapped)) {
        this.pending = '';
        return { type: mapped };
      }

      // Search initiation
      if (this.pending === '/' && this.enabled('/')) {
        this.pending = '';
        this._isSearching = true;
        this._searchBuffer = '';
        return null; // No command yet — search mode started
      }

      // Could be start of multi-key: d, c, y, g
      if ('dcyg'.includes(this.pending)) {
        return null; // Wait for next key
      }

      // Unknown single key
      this.pending = '';
      return null;
    }

    // Two-key commands
    if (this.pending.length === 2) {
      const cmd = this.pending;
      this.pending = '';

      if (cmd === 'dd' && this.enabled('dd')) return { type: 'dd' };
      if (cmd === 'dw' && this.enabled('dw')) return { type: 'dw' };
      if (cmd === 'cw' && this.enabled('cw')) return { type: 'cw' };
      if (cmd === 'yy' && this.enabled('yy')) return { type: 'yy' };
      if (cmd === 'yw' && this.enabled('yw')) return { type: 'yw' };
      if (cmd === 'gg' && this.enabled('gg')) return { type: 'gg' };

      return null; // Unknown two-key combo
    }

    // Anything longer — discard
    this.pending = '';
    return null;
  }

  private enabled(cmd: VimCommandType): boolean {
    return this._enabledCommands.has(cmd);
  }

  reset(): void {
    this.pending = '';
    this._searchBuffer = '';
    this._isSearching = false;
  }
}
