// ── Positions & Ranges ──

export interface Position {
  row: number;
  col: number;
}

export interface Range {
  start: Position;
  end: Position;
}

// ── Vim Modes ──

export type VimMode = 'NORMAL' | 'INSERT' | 'COMMAND_LINE';

// ── Vim Commands ──

export type VimCommandType =
  // Movement
  | 'h' | 'j' | 'k' | 'l'
  | 'w' | 'b' | 'e'
  | '0' | '$'
  | 'gg' | 'G'
  // Insert mode entry
  | 'i' | 'a' | 'o' | 'O' | 'I' | 'A'
  // Editing
  | 'x' | 'dd' | 'dw'
  | 'cw'
  // Yank/Paste
  | 'yy' | 'yw' | 'p' | 'P'
  // Search
  | '/' | 'n' | 'N'
  // Mode exit
  | 'Escape'
  // Insert mode typing
  | 'insert_char'
  | 'backspace'
  | 'enter';

export interface VimCommand {
  type: VimCommandType;
  count?: number;
  char?: string;       // for insert_char
  searchTerm?: string; // for / command
}

// ── Vim Events (emitted by VimEngine) ──

export type VimEventType =
  | 'cursor_move'
  | 'mode_change'
  | 'line_delete'
  | 'word_delete'
  | 'char_delete'
  | 'char_insert'
  | 'line_insert'
  | 'word_change'
  | 'yank'
  | 'paste'
  | 'search'
  | 'search_next'
  | 'buffer_change';

export interface VimEvent {
  type: VimEventType;
  cursor: Position;
  prevCursor?: Position;
  mode: VimMode;
  prevMode?: VimMode;
  deletedText?: string;
  insertedText?: string;
  yankedText?: string;
  pastedText?: string;
  searchTerm?: string;
  range?: Range;
}

// ── Game Screens ──

export type GameScreen =
  | 'title'
  | 'level_select'
  | 'level_intro'
  | 'gameplay'
  | 'score';

// ── Levels ──

export interface LevelDef {
  id: string;
  name: string;
  subtitle: string;
  commands: VimCommandType[];
  subLevels: number;
  storyIntro: string[];
  tutorialHints: string[];
}

export interface SubLevelConfig {
  bufferLines: string[];
  objectives: Objective[];
  timeLimit?: number; // seconds, 0 = no limit
  description: string;
}

export interface Objective {
  id: string;
  description: string;
  check: (event: VimEvent, state: LevelState) => boolean;
  completed?: boolean;
}

export interface LevelState {
  subLevel: number;
  score: number;
  objectives: Objective[];
  startTime: number;
  timeLimit: number;
  timeRemaining: number;
  customData: Record<string, unknown>;
}

export interface LevelResult {
  levelId: string;
  subLevel: number;
  score: number;
  maxScore: number;
  stars: number; // 0-3
  timeElapsed: number;
}

// ── Cell Overrides (for level-specific rendering) ──

export interface CellOverride {
  char?: string;
  className?: string;
}

// ── Terminal Cell ──

export interface CellState {
  char: string;
  className: string;
}

// ── Game State (persistence) ──

export interface SaveData {
  version: number;
  levels: Record<string, LevelSaveData>;
  totalScore: number;
}

export interface LevelSaveData {
  unlocked: boolean;
  subLevelsCompleted: number;
  bestScore: number;
  bestStars: number;
}

// ── Event emitter helper ──

export type EventHandler<T = unknown> = (data: T) => void;
