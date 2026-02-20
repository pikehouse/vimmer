const STORAGE_KEY = 'vimmer_muted';

// ── Note frequencies (A minor scale) ──
const NOTE: Record<string, number> = {
  // Octave 2
  A2: 110.00, B2: 123.47, C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00,
  // Octave 3
  A3: 220.00, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00,
  // Octave 4
  A4: 440.00, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.26,
  // Rest
  _: 0,
};

// BPM and step duration
const BPM = 140;
const STEP_DUR = 60 / BPM / 2; // sixteenth-note feel

// ── Melody pattern (dark cyberpunk theme in A minor) ──
const MELODY: (keyof typeof NOTE)[] = [
  'A4', '_',  'E4', '_',  'A4', 'G4', 'E4', '_',
  'F4', '_',  'E4', 'D4', 'E4', '_',  '_',  '_',
  'A4', '_',  'E4', '_',  'A4', 'B4', 'C5', '_',
  'B4', '_',  'A4', 'G4', 'A4', '_',  '_',  '_',
  'E5', '_',  'D5', '_',  'C5', '_',  'B4', '_',
  'A4', '_',  'G4', '_',  'E4', '_',  '_',  '_',
  'F4', '_',  'E4', '_',  'D4', '_',  'E4', '_',
  'A4', '_',  '_',  '_',  '_',  '_',  '_',  '_',
];

// ── Bass pattern ──
const BASS: (keyof typeof NOTE)[] = [
  'A2', '_',  '_',  '_',  'A2', '_',  '_',  '_',
  'F3', '_',  '_',  '_',  'E3', '_',  '_',  '_',
  'A2', '_',  '_',  '_',  'A2', '_',  '_',  '_',
  'G3', '_',  '_',  '_',  'E3', '_',  '_',  '_',
  'C3', '_',  '_',  '_',  'C3', '_',  '_',  '_',
  'D3', '_',  '_',  '_',  'E3', '_',  '_',  '_',
  'F3', '_',  '_',  '_',  'D3', '_',  '_',  '_',
  'A2', '_',  '_',  '_',  'E3', '_',  '_',  '_',
];

// ── Arpeggio pattern (fast arpeggiated chords) ──
const ARP: (keyof typeof NOTE)[] = [
  'A3', 'C4', 'E4', 'A3', 'C4', 'E4', 'A3', 'C4',
  'F3', 'A3', 'C4', 'F3', 'A3', 'C4', 'E3', 'G3',
  'A3', 'C4', 'E4', 'A3', 'C4', 'E4', 'A3', 'C4',
  'G3', 'B3', 'D4', 'G3', 'E3', 'G3', 'B3', 'E3',
  'C4', 'E4', 'G4', 'C4', 'E4', 'G4', 'C4', 'E4',
  'D4', 'F4', 'A4', 'D4', 'E4', 'G4', 'B4', 'E4',
  'F3', 'A3', 'C4', 'F3', 'D4', 'F4', 'A4', 'D4',
  'A3', 'C4', 'E4', 'A3', 'E3', 'A3', 'C4', 'E3',
];

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted: boolean;
  private started = false;
  private stepTimer: number = 0;
  private step = 0;

  // Indicator element
  private indicator: HTMLElement | null = null;

  constructor() {
    this.muted = localStorage.getItem(STORAGE_KEY) === '1';
  }

  /** Must be called from a user gesture (click/keydown) to unlock AudioContext */
  ensureStarted(): void {
    if (this.started) return;
    this.started = true;

    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 1;
    this.masterGain.connect(this.ctx.destination);

    this.scheduleLoop();
  }

  toggle(): void {
    this.muted = !this.muted;
    localStorage.setItem(STORAGE_KEY, this.muted ? '1' : '0');

    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        this.muted ? 0 : 1,
        this.ctx!.currentTime,
        0.02
      );
    }

    this.updateIndicator();
  }

  isMuted(): boolean {
    return this.muted;
  }

  /** Create and mount the persistent mute indicator */
  mountIndicator(parent: HTMLElement): void {
    this.indicator = document.createElement('div');
    this.indicator.className = 'mute-indicator';
    this.updateIndicator();
    parent.appendChild(this.indicator);
  }

  private updateIndicator(): void {
    if (!this.indicator) return;
    if (this.muted) {
      this.indicator.textContent = '[M] SOUND: OFF';
      this.indicator.classList.add('muted');
    } else {
      this.indicator.textContent = '[M] SOUND: ON';
      this.indicator.classList.remove('muted');
    }
  }

  // ── Sequencer ──

  private scheduleLoop(): void {
    if (!this.ctx) return;

    const stepTime = this.ctx.currentTime;

    this.playStep(stepTime);

    this.stepTimer = window.setTimeout(() => {
      this.step = (this.step + 1) % MELODY.length;
      this.scheduleLoop();
    }, STEP_DUR * 1000);
  }

  private playStep(time: number): void {
    if (!this.ctx || !this.masterGain) return;

    const melodyNote = NOTE[MELODY[this.step]];
    const bassNote = NOTE[BASS[this.step % BASS.length]];
    const arpNote = NOTE[ARP[this.step % ARP.length]];

    // Melody: square wave, short envelope
    if (melodyNote > 0) {
      this.playTone(melodyNote, 'square', STEP_DUR * 0.8, 0.12, time);
    }

    // Bass: square wave, longer sustain, lower volume
    if (bassNote > 0) {
      this.playTone(bassNote, 'square', STEP_DUR * 1.5, 0.10, time);
    }

    // Arpeggio: triangle wave, very short, quiet
    if (arpNote > 0) {
      this.playTone(arpNote, 'triangle', STEP_DUR * 0.4, 0.04, time);
    }
  }

  private playTone(
    freq: number,
    type: OscillatorType,
    duration: number,
    volume: number,
    startTime: number
  ): void {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    // 8-bit envelope: quick attack, sustain, quick release
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.005);
    gain.gain.setValueAtTime(volume, startTime + duration * 0.6);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  destroy(): void {
    if (this.stepTimer) clearTimeout(this.stepTimer);
    this.ctx?.close();
    this.indicator?.remove();
  }
}
