import type { Position, Range } from '../types';

export class Buffer {
  lines: string[];
  cursor: Position;

  constructor(lines: string[] = ['']) {
    this.lines = lines.length ? lines : [''];
    this.cursor = { row: 0, col: 0 };
  }

  // ── Getters ──

  get lineCount(): number {
    return this.lines.length;
  }

  get currentLine(): string {
    return this.lines[this.cursor.row] ?? '';
  }

  get currentChar(): string {
    return this.currentLine[this.cursor.col] ?? '';
  }

  lineAt(row: number): string {
    return this.lines[row] ?? '';
  }

  charAt(pos: Position): string {
    return (this.lines[pos.row] ?? '')[pos.col] ?? '';
  }

  // ── Cursor Movement ──

  clampCursor(mode: 'NORMAL' | 'INSERT' | 'COMMAND_LINE' = 'NORMAL'): void {
    this.cursor.row = Math.max(0, Math.min(this.cursor.row, this.lineCount - 1));
    const maxCol = mode === 'INSERT'
      ? this.currentLine.length
      : Math.max(0, this.currentLine.length - 1);
    this.cursor.col = Math.max(0, Math.min(this.cursor.col, maxCol));
  }

  moveLeft(): Position {
    const prev = { ...this.cursor };
    if (this.cursor.col > 0) this.cursor.col--;
    return prev;
  }

  moveRight(mode: 'NORMAL' | 'INSERT' | 'COMMAND_LINE' = 'NORMAL'): Position {
    const prev = { ...this.cursor };
    const maxCol = mode === 'INSERT'
      ? this.currentLine.length
      : Math.max(0, this.currentLine.length - 1);
    if (this.cursor.col < maxCol) this.cursor.col++;
    return prev;
  }

  moveUp(): Position {
    const prev = { ...this.cursor };
    if (this.cursor.row > 0) {
      this.cursor.row--;
      this.clampCursor();
    }
    return prev;
  }

  moveDown(): Position {
    const prev = { ...this.cursor };
    if (this.cursor.row < this.lineCount - 1) {
      this.cursor.row++;
      this.clampCursor();
    }
    return prev;
  }

  moveToLineStart(): Position {
    const prev = { ...this.cursor };
    this.cursor.col = 0;
    return prev;
  }

  moveToLineEnd(): Position {
    const prev = { ...this.cursor };
    this.cursor.col = Math.max(0, this.currentLine.length - 1);
    return prev;
  }

  moveToTop(): Position {
    const prev = { ...this.cursor };
    this.cursor.row = 0;
    this.cursor.col = 0;
    return prev;
  }

  moveToBottom(): Position {
    const prev = { ...this.cursor };
    this.cursor.row = this.lineCount - 1;
    this.cursor.col = 0;
    return prev;
  }

  // ── Word Motions ──

  wordForward(): Position {
    const prev = { ...this.cursor };
    const line = this.currentLine;
    let col = this.cursor.col;

    // Skip current word chars
    while (col < line.length && !isWordBoundary(line, col)) col++;
    // Skip whitespace
    while (col < line.length && line[col] === ' ') col++;

    if (col >= line.length && this.cursor.row < this.lineCount - 1) {
      // Move to next line
      this.cursor.row++;
      this.cursor.col = 0;
      // Skip leading whitespace on next line
      const nextLine = this.currentLine;
      let nc = 0;
      while (nc < nextLine.length && nextLine[nc] === ' ') nc++;
      this.cursor.col = nc;
    } else {
      this.cursor.col = Math.min(col, Math.max(0, line.length - 1));
    }

    return prev;
  }

  wordBackward(): Position {
    const prev = { ...this.cursor };
    const line = this.currentLine;
    let col = this.cursor.col;

    if (col === 0 && this.cursor.row > 0) {
      this.cursor.row--;
      this.cursor.col = Math.max(0, this.currentLine.length - 1);
      return prev;
    }

    // Move back one
    if (col > 0) col--;
    // Skip whitespace backwards
    while (col > 0 && line[col] === ' ') col--;
    // Skip word chars backwards
    while (col > 0 && !isWordBoundary(line, col - 1)) col--;

    this.cursor.col = col;
    return prev;
  }

  wordEnd(): Position {
    const prev = { ...this.cursor };
    const line = this.currentLine;
    let col = this.cursor.col;

    // Move forward one
    if (col < line.length - 1) col++;
    // Skip whitespace
    while (col < line.length && line[col] === ' ') col++;
    // Move to end of word
    while (col < line.length - 1 && !isWordBoundary(line, col)) col++;

    if (col >= line.length && this.cursor.row < this.lineCount - 1) {
      this.cursor.row++;
      const nextLine = this.currentLine;
      let nc = 0;
      while (nc < nextLine.length && nextLine[nc] === ' ') nc++;
      while (nc < nextLine.length - 1 && !isWordBoundary(nextLine, nc)) nc++;
      this.cursor.col = nc;
    } else {
      this.cursor.col = Math.min(col, Math.max(0, line.length - 1));
    }

    return prev;
  }

  // ── Editing ──

  deleteChar(): string {
    const line = this.currentLine;
    if (line.length === 0) return '';
    const ch = line[this.cursor.col] ?? '';
    this.lines[this.cursor.row] = line.slice(0, this.cursor.col) + line.slice(this.cursor.col + 1);
    this.clampCursor();
    return ch;
  }

  deleteLine(): string {
    const deleted = this.lines[this.cursor.row];
    if (this.lineCount === 1) {
      this.lines[0] = '';
    } else {
      this.lines.splice(this.cursor.row, 1);
    }
    this.clampCursor();
    return deleted;
  }

  deleteWord(): string {
    const line = this.currentLine;
    const startCol = this.cursor.col;
    let endCol = startCol;

    // Delete word chars
    while (endCol < line.length && !isWordBoundary(line, endCol)) endCol++;
    // Also delete trailing whitespace
    while (endCol < line.length && line[endCol] === ' ') endCol++;

    const deleted = line.slice(startCol, endCol);
    this.lines[this.cursor.row] = line.slice(0, startCol) + line.slice(endCol);
    this.clampCursor();
    return deleted;
  }

  changeWord(): string {
    const line = this.currentLine;
    const startCol = this.cursor.col;
    let endCol = startCol;

    // Delete word chars (don't delete trailing space for change)
    while (endCol < line.length && !isWordBoundary(line, endCol)) endCol++;

    const deleted = line.slice(startCol, endCol);
    this.lines[this.cursor.row] = line.slice(0, startCol) + line.slice(endCol);
    // Don't clamp — we're going into insert mode at startCol
    return deleted;
  }

  insertChar(ch: string): void {
    const line = this.currentLine;
    this.lines[this.cursor.row] = line.slice(0, this.cursor.col) + ch + line.slice(this.cursor.col);
    this.cursor.col++;
  }

  insertNewlineBelow(): void {
    this.lines.splice(this.cursor.row + 1, 0, '');
    this.cursor.row++;
    this.cursor.col = 0;
  }

  insertNewlineAbove(): void {
    this.lines.splice(this.cursor.row, 0, '');
    this.cursor.col = 0;
  }

  splitLine(): void {
    const line = this.currentLine;
    const before = line.slice(0, this.cursor.col);
    const after = line.slice(this.cursor.col);
    this.lines[this.cursor.row] = before;
    this.lines.splice(this.cursor.row + 1, 0, after);
    this.cursor.row++;
    this.cursor.col = 0;
  }

  backspace(): string {
    if (this.cursor.col > 0) {
      const line = this.currentLine;
      const ch = line[this.cursor.col - 1];
      this.lines[this.cursor.row] = line.slice(0, this.cursor.col - 1) + line.slice(this.cursor.col);
      this.cursor.col--;
      return ch;
    } else if (this.cursor.row > 0) {
      // Join with previous line
      const prevLine = this.lines[this.cursor.row - 1];
      const curLine = this.currentLine;
      this.lines[this.cursor.row - 1] = prevLine + curLine;
      this.lines.splice(this.cursor.row, 1);
      this.cursor.row--;
      this.cursor.col = prevLine.length;
      return '\n';
    }
    return '';
  }

  // ── Yank (read-only copy) ──

  yankLine(): string {
    return this.currentLine;
  }

  yankWord(): string {
    const line = this.currentLine;
    const startCol = this.cursor.col;
    let endCol = startCol;
    while (endCol < line.length && !isWordBoundary(line, endCol)) endCol++;
    return line.slice(startCol, endCol);
  }

  pasteBelowLine(text: string): void {
    this.lines.splice(this.cursor.row + 1, 0, text);
    this.cursor.row++;
    this.cursor.col = 0;
  }

  pasteAboveLine(text: string): void {
    this.lines.splice(this.cursor.row, 0, text);
    this.cursor.col = 0;
  }

  pasteAfterCursor(text: string): void {
    const line = this.currentLine;
    this.lines[this.cursor.row] = line.slice(0, this.cursor.col + 1) + text + line.slice(this.cursor.col + 1);
    this.cursor.col += text.length;
  }

  pasteBeforeCursor(text: string): void {
    const line = this.currentLine;
    this.lines[this.cursor.row] = line.slice(0, this.cursor.col) + text + line.slice(this.cursor.col);
    this.cursor.col += text.length - 1;
  }

  // ── Search ──

  search(term: string, forward: boolean = true): Position | null {
    if (!term) return null;

    const startRow = this.cursor.row;
    const startCol = this.cursor.col + (forward ? 1 : -1);
    const totalLines = this.lineCount;

    for (let i = 0; i < totalLines; i++) {
      const rowOffset = forward ? i : -i;
      const row = ((startRow + rowOffset) % totalLines + totalLines) % totalLines;
      const line = this.lineAt(row);

      let searchStart: number;
      if (i === 0) {
        searchStart = forward ? Math.max(0, startCol) : Math.min(line.length - 1, startCol);
      } else {
        searchStart = forward ? 0 : line.length - 1;
      }

      if (forward) {
        const idx = line.indexOf(term, searchStart);
        if (idx !== -1) return { row, col: idx };
      } else {
        const idx = line.lastIndexOf(term, searchStart);
        if (idx !== -1) return { row, col: idx };
      }
    }

    return null;
  }

  findAllMatches(term: string): Range[] {
    if (!term) return [];
    const matches: Range[] = [];
    for (let row = 0; row < this.lineCount; row++) {
      const line = this.lineAt(row);
      let idx = 0;
      while ((idx = line.indexOf(term, idx)) !== -1) {
        matches.push({
          start: { row, col: idx },
          end: { row, col: idx + term.length - 1 },
        });
        idx++;
      }
    }
    return matches;
  }

  // ── Utilities ──

  setLines(lines: string[]): void {
    this.lines = lines.length ? lines : [''];
    this.cursor = { row: 0, col: 0 };
  }

  clone(): Buffer {
    const b = new Buffer([...this.lines]);
    b.cursor = { ...this.cursor };
    return b;
  }
}

// ── Helpers ──

function isWordBoundary(line: string, col: number): boolean {
  if (col < 0 || col >= line.length) return true;
  const ch = line[col];
  const isWord = /\w/.test(ch);
  const nextCh = line[col + 1];
  if (nextCh === undefined) return true;
  const nextIsWord = /\w/.test(nextCh);
  return isWord !== nextIsWord || ch === ' ' || nextCh === ' ';
}
