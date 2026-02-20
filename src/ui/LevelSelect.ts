import type { SaveData } from '../types';

export interface LevelSelectChoice {
  levelId: string;
  subLevel: number;
}

const LEVEL_INFO = [
  { id: 'level1', num: 1, name: 'Firewall Grid', keys: 'h/j/k/l' },
  { id: 'level2', num: 2, name: 'Packet Surfer', keys: 'w/b/e' },
  { id: 'level3', num: 3, name: 'Code Injection', keys: 'i/a/o/I/A/O' },
  { id: 'level4', num: 4, name: 'Virus Purge', keys: 'x/dd/dw/cw' },
  { id: 'level5', num: 5, name: 'Data Heist', keys: 'yy/yw/p/P' },
  { id: 'level6', num: 6, name: 'Speed Run', keys: 'gg/G/0/$///n/N' },
];

export class LevelSelect {
  private el: HTMLElement;
  private selectedIdx: number = 0;
  private onSelect: (choice: LevelSelectChoice) => void;
  private save: SaveData;

  constructor(parent: HTMLElement, save: SaveData, onSelect: (choice: LevelSelectChoice) => void) {
    this.save = save;
    this.onSelect = onSelect;
    this.el = document.createElement('div');
    this.el.className = 'screen-overlay level-select fade-in';
    this.render();
    parent.appendChild(this.el);
  }

  private render(): void {
    const cards = LEVEL_INFO.map((info, idx) => {
      const data = this.save.levels[info.id];
      const unlocked = data?.unlocked ?? false;
      const stars = data?.bestStars ?? 0;
      const completed = data?.subLevelsCompleted ?? 0;
      const selected = idx === this.selectedIdx;

      const starStr = Array.from({ length: 3 }, (_, i) =>
        i < stars ? '<span>*</span>' : '<span class="empty">*</span>'
      ).join('');

      return `
        <div class="level-card ${unlocked ? '' : 'locked'} ${selected ? 'selected' : ''}"
             data-idx="${idx}" style="${selected ? 'border-color: var(--c-green); box-shadow: 0 0 8px rgba(51,255,51,0.3);' : ''}">
          <div class="level-num">${String(info.num).padStart(2, '0')}</div>
          <div class="level-name">${info.name}</div>
          <div style="color: var(--c-dim); font-size: 0.75em; margin-bottom: 0.25em;">${info.keys}</div>
          <div class="stars">${starStr}</div>
          ${completed > 0 ? `<div style="color: var(--c-dim); font-size: 0.75em; margin-top: 0.25em;">${completed} cleared</div>` : ''}
        </div>
      `;
    }).join('');

    this.el.innerHTML = `
      <h2>// SELECT MISSION</h2>
      <div class="level-grid">${cards}</div>
      <div class="nav-hint">[h/j/k/l] navigate &nbsp; [ENTER] select &nbsp; [ESC] back</div>
    `;
  }

  handleKey(key: string): void {
    const cols = 3;
    const total = LEVEL_INFO.length;

    switch (key) {
      case 'h':
      case 'ArrowLeft':
        if (this.selectedIdx % cols > 0) this.selectedIdx--;
        break;
      case 'l':
      case 'ArrowRight':
        if (this.selectedIdx % cols < cols - 1 && this.selectedIdx < total - 1) this.selectedIdx++;
        break;
      case 'k':
      case 'ArrowUp':
        if (this.selectedIdx >= cols) this.selectedIdx -= cols;
        break;
      case 'j':
      case 'ArrowDown':
        if (this.selectedIdx + cols < total) this.selectedIdx += cols;
        break;
      case 'Enter': {
        const info = LEVEL_INFO[this.selectedIdx];
        const data = this.save.levels[info.id];
        if (data?.unlocked) {
          this.onSelect({ levelId: info.id, subLevel: data.subLevelsCompleted });
        }
        return;
      }
    }

    this.render();
  }

  destroy(): void {
    this.el.remove();
  }
}
