export class HUD {
  private el: HTMLElement;
  private terminalEl: HTMLElement | null = null;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'hud';
    this.el.innerHTML = `
      <span class="hud-level"></span>
      <span class="hud-objective"></span>
      <span class="hud-score"></span>
      <span class="hud-timer"></span>
    `;
    parent.appendChild(this.el);
  }

  setTerminalEl(el: HTMLElement): void {
    this.terminalEl = el;
  }

  update(data: { level: string; objective: string; score: number; time: number; timeLimit: number }): void {
    const levelEl = this.el.querySelector('.hud-level') as HTMLElement;
    const objEl = this.el.querySelector('.hud-objective') as HTMLElement;
    const scoreEl = this.el.querySelector('.hud-score') as HTMLElement;
    const timerEl = this.el.querySelector('.hud-timer') as HTMLElement;

    levelEl.textContent = data.level;
    objEl.textContent = data.objective;
    scoreEl.textContent = `SCORE: ${data.score}`;

    if (data.timeLimit > 0) {
      const secs = Math.ceil(data.time);
      timerEl.textContent = `${secs}s`;
      timerEl.className = data.time < 10 ? 'hud-timer warning' : 'hud-timer';
    } else {
      timerEl.textContent = '';
    }
  }

  show(): void {
    this.el.style.display = 'flex';
    this.terminalEl?.classList.add('hud-active');
  }

  hide(): void {
    this.el.style.display = 'none';
    this.terminalEl?.classList.remove('hud-active');
  }

  destroy(): void {
    this.el.remove();
  }
}
