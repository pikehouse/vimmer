import type { VimMode } from '../types';
import type { CommandParser } from '../engine/CommandParser';

export class StatusBar {
  formatStatus(mode: VimMode, parser: CommandParser): string[] {
    if (parser.isSearching) {
      return [`/${parser.searchBuffer}_`];
    }

    const pending = parser.pendingKeys;
    if (pending) {
      return [`${this.modeLabel(mode)}  ${pending}`];
    }

    return [this.modeLabel(mode)];
  }

  private modeLabel(mode: VimMode): string {
    switch (mode) {
      case 'NORMAL': return 'NORMAL';
      case 'INSERT': return '-- INSERT --';
      case 'COMMAND_LINE': return ':';
    }
  }
}
