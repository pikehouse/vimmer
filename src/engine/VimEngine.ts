import type { VimCommand, VimCommandType, VimEvent, Position } from '../types';
import { Buffer } from './Buffer';
import { ModeManager } from './ModeManager';
import { CommandParser } from './CommandParser';
import { Registers } from './Registers';

export type VimEventHandler = (event: VimEvent) => void;

export class VimEngine {
  readonly buffer: Buffer;
  readonly modeManager: ModeManager;
  readonly parser: CommandParser;
  readonly registers: Registers;

  private eventHandlers: VimEventHandler[] = [];
  private lastSearchTerm: string = '';
  private lastSearchForward: boolean = true;

  constructor() {
    this.buffer = new Buffer();
    this.modeManager = new ModeManager();
    this.parser = new CommandParser();
    this.registers = new Registers();
  }

  // ── Configuration ──

  setEnabledCommands(cmds: VimCommandType[]): void {
    // Always allow Escape, insert_char, backspace, enter in addition to level commands
    const all = new Set(cmds);
    all.add('Escape');
    all.add('insert_char');
    all.add('backspace');
    all.add('enter');
    this.parser.setEnabledCommands([...all]);
  }

  setBuffer(lines: string[]): void {
    this.buffer.setLines(lines);
    this.registers.clear();
    this.parser.reset();
    this.modeManager.switchTo('NORMAL');
  }

  // ── Event handling ──

  onEvent(handler: VimEventHandler): void {
    this.eventHandlers.push(handler);
  }

  clearEventHandlers(): void {
    this.eventHandlers = [];
  }

  private emit(event: VimEvent): void {
    for (const handler of this.eventHandlers) {
      handler(event);
    }
  }

  // ── Key input ──

  handleKey(key: string): void {
    const cmd = this.parser.parse(key, this.modeManager.mode);
    if (!cmd) return;
    this.executeCommand(cmd);
  }

  private executeCommand(cmd: VimCommand): void {
    const mode = this.modeManager.mode;

    if (mode === 'INSERT') {
      this.executeInsertCommand(cmd);
    } else {
      this.executeNormalCommand(cmd);
    }
  }

  // ── Normal mode commands ──

  private executeNormalCommand(cmd: VimCommand): void {
    const prevCursor: Position = { ...this.buffer.cursor };

    switch (cmd.type) {
      // Movement
      case 'h': this.buffer.moveLeft(); break;
      case 'j': this.buffer.moveDown(); break;
      case 'k': this.buffer.moveUp(); break;
      case 'l': this.buffer.moveRight(); break;
      case 'w': this.buffer.wordForward(); break;
      case 'b': this.buffer.wordBackward(); break;
      case 'e': this.buffer.wordEnd(); break;
      case '0': this.buffer.moveToLineStart(); break;
      case '$': this.buffer.moveToLineEnd(); break;
      case 'gg': this.buffer.moveToTop(); break;
      case 'G': this.buffer.moveToBottom(); break;

      // Insert mode entry
      case 'i':
        this.modeManager.switchTo('INSERT');
        this.emit(this.makeEvent('mode_change', prevCursor));
        return;
      case 'a':
        this.buffer.moveRight('INSERT');
        this.modeManager.switchTo('INSERT');
        this.emit(this.makeEvent('mode_change', prevCursor));
        return;
      case 'I':
        this.buffer.moveToFirstNonBlank();
        this.modeManager.switchTo('INSERT');
        this.emit(this.makeEvent('mode_change', prevCursor));
        return;
      case 'A':
        this.buffer.cursor.col = this.buffer.currentLine.length;
        this.modeManager.switchTo('INSERT');
        this.emit(this.makeEvent('mode_change', prevCursor));
        return;
      case 'o':
        this.buffer.insertNewlineBelow();
        this.modeManager.switchTo('INSERT');
        this.emit(this.makeEvent('line_insert', prevCursor));
        return;
      case 'O':
        this.buffer.insertNewlineAbove();
        this.modeManager.switchTo('INSERT');
        this.emit(this.makeEvent('line_insert', prevCursor));
        return;

      // Editing
      case 'x': {
        const deleted = this.buffer.deleteChar();
        if (deleted) {
          this.registers.delete(deleted, 'charwise');
          this.emit({ ...this.makeEvent('char_delete', prevCursor), deletedText: deleted });
        }
        return;
      }
      case 'dd': {
        const deleted = this.buffer.deleteLine();
        this.registers.delete(deleted, 'linewise');
        this.emit({ ...this.makeEvent('line_delete', prevCursor), deletedText: deleted });
        return;
      }
      case 'dw': {
        const deleted = this.buffer.deleteWord();
        this.registers.delete(deleted, 'charwise');
        this.emit({ ...this.makeEvent('word_delete', prevCursor), deletedText: deleted });
        return;
      }
      case 'cw': {
        const deleted = this.buffer.changeWord();
        this.registers.delete(deleted, 'charwise');
        this.modeManager.switchTo('INSERT');
        this.emit({ ...this.makeEvent('word_change', prevCursor), deletedText: deleted });
        return;
      }

      // Yank
      case 'yy': {
        const text = this.buffer.yankLine();
        this.registers.yank(text, 'linewise');
        this.emit({ ...this.makeEvent('yank', prevCursor), yankedText: text });
        return;
      }
      case 'yw': {
        const text = this.buffer.yankWord();
        this.registers.yank(text, 'charwise');
        this.emit({ ...this.makeEvent('yank', prevCursor), yankedText: text });
        return;
      }

      // Paste
      case 'p': {
        const reg = this.registers.get();
        if (reg.type === 'linewise') {
          this.buffer.pasteBelowLine(reg.text);
        } else {
          this.buffer.pasteAfterCursor(reg.text);
        }
        this.emit({ ...this.makeEvent('paste', prevCursor), pastedText: reg.text });
        return;
      }
      case 'P': {
        const reg = this.registers.get();
        if (reg.type === 'linewise') {
          this.buffer.pasteAboveLine(reg.text);
        } else {
          this.buffer.pasteBeforeCursor(reg.text);
        }
        this.emit({ ...this.makeEvent('paste', prevCursor), pastedText: reg.text });
        return;
      }

      // Search
      case '/': {
        if (cmd.searchTerm) {
          this.lastSearchTerm = cmd.searchTerm;
          this.lastSearchForward = true;
          const pos = this.buffer.search(cmd.searchTerm, true);
          if (pos) {
            this.buffer.cursor = pos;
          }
          this.emit({ ...this.makeEvent('search', prevCursor), searchTerm: cmd.searchTerm });
        }
        return;
      }
      case 'n': {
        if (this.lastSearchTerm) {
          const pos = this.buffer.search(this.lastSearchTerm, this.lastSearchForward);
          if (pos) {
            this.buffer.cursor = pos;
          }
          this.emit({ ...this.makeEvent('search_next', prevCursor), searchTerm: this.lastSearchTerm });
        }
        return;
      }
      case 'N': {
        if (this.lastSearchTerm) {
          const pos = this.buffer.search(this.lastSearchTerm, !this.lastSearchForward);
          if (pos) {
            this.buffer.cursor = pos;
          }
          this.emit({ ...this.makeEvent('search_next', prevCursor), searchTerm: this.lastSearchTerm });
        }
        return;
      }

      case 'Escape':
        return;

      default:
        return;
    }

    // Movement commands emit cursor_move
    this.emit(this.makeEvent('cursor_move', prevCursor));
  }

  // ── Insert mode commands ──

  private executeInsertCommand(cmd: VimCommand): void {
    const prevCursor: Position = { ...this.buffer.cursor };

    switch (cmd.type) {
      case 'Escape':
        // Move cursor back one (Vim behavior)
        if (this.buffer.cursor.col > 0) this.buffer.cursor.col--;
        this.modeManager.switchTo('NORMAL');
        this.emit(this.makeEvent('mode_change', prevCursor));
        return;

      case 'insert_char':
        if (cmd.char) {
          this.buffer.insertChar(cmd.char);
          this.emit({ ...this.makeEvent('char_insert', prevCursor), insertedText: cmd.char });
        }
        return;

      case 'backspace': {
        const deleted = this.buffer.backspace();
        if (deleted) {
          this.emit({ ...this.makeEvent('char_delete', prevCursor), deletedText: deleted });
        }
        return;
      }

      case 'enter':
        this.buffer.splitLine();
        this.emit(this.makeEvent('line_insert', prevCursor));
        return;
    }
  }

  // ── Event builder ──

  private makeEvent(type: VimEvent['type'], prevCursor: Position): VimEvent {
    return {
      type,
      cursor: { ...this.buffer.cursor },
      prevCursor,
      mode: this.modeManager.mode,
    };
  }
}
