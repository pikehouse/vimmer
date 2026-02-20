export class TitleScreen {
  private el: HTMLElement;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'screen-overlay title-screen fade-in';
    this.el.innerHTML = `
      <div class="title-art">
 __   __  ___  __   __  __   __  _______  ______
|  | |  ||   ||  |_|  ||  |_|  ||       ||    _ |
|  |_|  ||   ||       ||       ||    ___||   | ||
|       ||   ||       ||       ||   |___ |   |_||_
|       ||   ||       ||       ||    ___||    __  |
 |     | |   || ||_|| || ||_|| ||   |___ |   |  | |
  |___|  |___||_|   |_||_|   |_||_______||___|  |_|
      </div>
      <div class="subtitle">S Y S T E M &nbsp; B R E A C H</div>
      <div class="prompt">[PRESS ANY KEY TO INITIATE]</div>
      <div class="mute-hint">[M] Toggle Sound</div>
    `;
    parent.appendChild(this.el);
  }

  destroy(): void {
    this.el.remove();
  }
}
