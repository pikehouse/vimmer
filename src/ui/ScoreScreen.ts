import type { LevelResult } from '../types';

export class ScoreScreen {
  private el: HTMLElement;
  private onContinue: () => void;

  constructor(parent: HTMLElement, result: LevelResult, onContinue: () => void) {
    this.onContinue = onContinue;
    this.el = document.createElement('div');
    this.el.className = 'screen-overlay score-screen fade-in';

    const starStr = Array.from({ length: 3 }, (_, i) =>
      i < result.stars ? '<span>*</span>' : '<span class="empty">*</span>'
    ).join(' ');

    const header = result.stars >= 2 ? 'MISSION COMPLETE' : result.stars >= 1 ? 'MISSION PASSED' : 'MISSION FAILED';
    const timeStr = result.timeElapsed.toFixed(1);

    this.el.innerHTML = `
      <div class="result-header">// ${header}</div>
      <div class="big-stars">${starStr}</div>
      <div class="score-value">${result.score} / ${result.maxScore}</div>
      <div class="score-breakdown">
        TIME: ${timeStr}s<br>
        RATING: ${result.stars}/3 STARS
      </div>
      <div class="continue-prompt">[PRESS ENTER TO CONTINUE]</div>
    `;

    parent.appendChild(this.el);
  }

  handleKey(key: string): void {
    if (key === 'Enter') {
      this.onContinue();
    }
  }

  destroy(): void {
    this.el.remove();
  }
}
