import { COLS, ROWS, PLAY_ROWS } from '../constants';
import type { CellOverride, CellState, VimMode } from '../types';
import type { Buffer } from '../engine/Buffer';

export class Terminal {
  private container: HTMLElement;
  private cells: HTMLSpanElement[][] = [];
  private prevState: CellState[][] = [];
  private viewportRow: number = 0;

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.className = 'terminal scanlines crt-glow flicker';
    parent.appendChild(this.container);
    this.createGrid();
  }

  private createGrid(): void {
    for (let row = 0; row < ROWS; row++) {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'terminal-row';
      const rowCells: HTMLSpanElement[] = [];
      const rowState: CellState[] = [];

      for (let col = 0; col < COLS; col++) {
        const cell = document.createElement('span');
        cell.className = 'terminal-cell';
        cell.textContent = ' ';
        rowDiv.appendChild(cell);
        rowCells.push(cell);
        rowState.push({ char: ' ', className: 'terminal-cell' });
      }

      this.container.appendChild(rowDiv);
      this.cells.push(rowCells);
      this.prevState.push(rowState);
    }
  }

  // ── Rendering ──

  render(
    buffer: Buffer,
    mode: VimMode,
    overrides: Map<string, CellOverride> | null = null,
    statusContent?: string[]
  ): void {
    this.updateViewport(buffer);

    // Render buffer lines (rows 0 to PLAY_ROWS-1)
    for (let screenRow = 0; screenRow < PLAY_ROWS; screenRow++) {
      const bufRow = screenRow + this.viewportRow;
      const line = buffer.lineAt(bufRow);

      for (let col = 0; col < COLS; col++) {
        const ch = col < line.length ? line[col] : ' ';
        let className = 'terminal-cell';

        // Cursor
        const isCursorHere = bufRow === buffer.cursor.row && col === buffer.cursor.col;
        if (isCursorHere) {
          className += mode === 'INSERT' ? ' cell-cursor-insert' : ' cell-cursor';
        }

        // Level overrides
        const key = `${bufRow},${col}`;
        const override = overrides?.get(key);
        if (override?.className) {
          className += ' ' + override.className;
        }

        const displayChar = override?.char ?? ch;
        this.setCell(screenRow, col, displayChar, className);
      }
    }

    // Render status bar (last row)
    this.renderStatusBar(buffer, mode, statusContent);
  }

  private renderStatusBar(buffer: Buffer, mode: VimMode, statusContent?: string[]): void {
    const row = ROWS - 1;

    // Build status line text
    let left = '';
    let right = `${buffer.cursor.row + 1}:${buffer.cursor.col + 1}`;

    if (statusContent && statusContent.length > 0) {
      left = statusContent[0];
    } else {
      const modeLabel = mode === 'NORMAL' ? 'NORMAL' : mode === 'INSERT' ? '-- INSERT --' : ':';
      left = modeLabel;
    }

    const totalWidth = COLS;
    const padding = totalWidth - left.length - right.length;
    const statusLine = left + ' '.repeat(Math.max(1, padding)) + right;

    for (let col = 0; col < COLS; col++) {
      const ch = col < statusLine.length ? statusLine[col] : ' ';
      this.setCell(row, col, ch, 'terminal-cell cell-status');
    }
  }

  private setCell(row: number, col: number, char: string, className: string): void {
    const prev = this.prevState[row][col];
    if (prev.char === char && prev.className === className) return;

    this.cells[row][col].textContent = char;
    this.cells[row][col].className = className;
    this.prevState[row][col] = { char, className };
  }

  // ── Viewport ──

  private updateViewport(buffer: Buffer): void {
    const cursorRow = buffer.cursor.row;
    const margin = 3;

    if (cursorRow < this.viewportRow + margin) {
      this.viewportRow = Math.max(0, cursorRow - margin);
    } else if (cursorRow >= this.viewportRow + PLAY_ROWS - margin) {
      this.viewportRow = cursorRow - PLAY_ROWS + margin + 1;
    }

    // Clamp
    const maxViewport = Math.max(0, buffer.lineCount - PLAY_ROWS);
    this.viewportRow = Math.min(this.viewportRow, maxViewport);
  }

  getViewportRow(): number {
    return this.viewportRow;
  }

  // ── Utilities ──

  clear(): void {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        this.setCell(row, col, ' ', 'terminal-cell');
      }
    }
    this.viewportRow = 0;
  }

  destroy(): void {
    this.container.remove();
  }

  getElement(): HTMLElement {
    return this.container;
  }
}
