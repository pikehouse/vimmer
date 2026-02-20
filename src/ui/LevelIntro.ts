export class LevelIntro {
  private el: HTMLElement;
  private lines: string[];
  private hints: string[];
  private levelName: string;
  private currentLine: number = 0;
  private typeTimer: number = 0;
  private onReady: () => void;
  private ready: boolean = false;

  constructor(
    parent: HTMLElement,
    levelName: string,
    storyLines: string[],
    hints: string[],
    onReady: () => void
  ) {
    this.levelName = levelName;
    this.lines = storyLines;
    this.hints = hints;
    this.onReady = onReady;

    this.el = document.createElement('div');
    this.el.className = 'screen-overlay level-intro fade-in';
    parent.appendChild(this.el);

    this.renderFrame();
    this.startTypewriter();
  }

  private renderFrame(): void {
    const visibleLines = this.lines
      .slice(0, this.currentLine + 1)
      .map(l => `<div class="story-line">${l}</div>`)
      .join('');

    const hintsHtml = this.ready
      ? this.hints.map(h => `<div class="tutorial-hint">${h}</div>`).join('')
      : '';

    const prompt = this.ready
      ? '<div class="start-prompt">[PRESS ENTER TO BEGIN]</div>'
      : '';

    this.el.innerHTML = `
      <div class="level-intro-content">
        <div class="mission-header">// INCOMING TRANSMISSION</div>
        <div class="mission-name">${this.levelName}</div>
        ${visibleLines}
        ${hintsHtml}
        ${prompt}
      </div>
    `;
  }

  private startTypewriter(): void {
    this.typeTimer = window.setInterval(() => {
      this.currentLine++;
      if (this.currentLine >= this.lines.length) {
        clearInterval(this.typeTimer);
        this.ready = true;
      }
      this.renderFrame();
    }, 600);
  }

  handleKey(key: string): boolean {
    if (key === 'Enter' && this.ready) {
      this.onReady();
      return true;
    }
    // Skip animation
    if (key === ' ' || key === 'Enter') {
      clearInterval(this.typeTimer);
      this.currentLine = this.lines.length;
      this.ready = true;
      this.renderFrame();
      return false;
    }
    return false;
  }

  destroy(): void {
    clearInterval(this.typeTimer);
    this.el.remove();
  }
}
