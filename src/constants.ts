// ── Terminal Grid ──
export const COLS = 80;
export const ROWS = 24;

// ── Status Bar ──
export const STATUS_ROW = ROWS - 1; // row 23 is status bar

// ── Playable area ──
export const PLAY_ROWS = ROWS - 1; // rows 0-22

// ── Timing ──
export const RENDER_FPS = 30;
export const RENDER_INTERVAL = 1000 / RENDER_FPS;

// ── Scoring ──
export const SCORE_PER_OBJECTIVE = 100;
export const TIME_BONUS_MAX = 50;
export const STAR_THRESHOLDS = [0.4, 0.7, 0.9]; // % of max score for 1/2/3 stars

// ── Persistence ──
export const SAVE_KEY = 'vimmer_save';
export const SAVE_VERSION = 1;

// ── Colors (CSS custom property names) ──
export const COLORS = {
  bg: '--c-bg',
  fg: '--c-fg',
  green: '--c-green',
  brightGreen: '--c-bright-green',
  cyan: '--c-cyan',
  magenta: '--c-magenta',
  red: '--c-red',
  yellow: '--c-yellow',
  dim: '--c-dim',
} as const;
