import type { VimCommandType, VimEvent, SubLevelConfig, CellOverride } from '../../types';
import { LevelBase } from '../LevelBase';
import type { VimEngine } from '../../engine/VimEngine';
import { registerLevel } from '../LevelRegistry';

// Navigate data streams using word motions (w/b/e) to reach target words

interface Target {
  row: number;
  col: number;
  word: string;
  captured: boolean;
}

const SUB_LEVELS = getSubLevels();

export class PacketLevel extends LevelBase {
  private targets: Target[] = [];
  private capturedCount: number = 0;
  private totalTargets: number = 0;

  constructor(engine: VimEngine) {
    super(engine);
  }

  get id() { return 'level2'; }
  get name() { return 'Packet Surfer'; }
  get subtitle() { return 'Intercept data packets with word jumps'; }
  get commands(): VimCommandType[] { return ['h', 'j', 'k', 'l', 'w', 'b', 'e']; }
  get totalSubLevels() { return 5; }

  get storyIntro(): string[] {
    return [
      'Data streams are flowing through the network.',
      'Target packets have been marked for interception.',
      'Use word motions to jump between words quickly.',
      'Intercept all highlighted targets to proceed.',
    ];
  }

  get tutorialHints(): string[] {
    return [
      'w = jump to next word start',
      'b = jump to previous word start',
      'e = jump to current/next word end',
    ];
  }

  getSubLevelConfig(subLevel: number): SubLevelConfig {
    const config = SUB_LEVELS[subLevel] ?? SUB_LEVELS[0];
    return {
      bufferLines: config.lines,
      objectives: [{
        id: 'capture_all',
        description: `Capture all ${config.targetWords.length} target packets`,
        check: () => this.capturedCount >= this.totalTargets,
      }],
      timeLimit: config.timeLimit,
      description: config.description,
    };
  }

  protected onSetup(): void {
    const config = SUB_LEVELS[this.state.subLevel] ?? SUB_LEVELS[0];
    this.targets = [];
    this.capturedCount = 0;

    // Find target words in the buffer
    for (const targetWord of config.targetWords) {
      for (let row = 0; row < this.engine.buffer.lineCount; row++) {
        const line = this.engine.buffer.lineAt(row);
        let idx = 0;
        while ((idx = line.indexOf(targetWord, idx)) !== -1) {
          this.targets.push({ row, col: idx, word: targetWord, captured: false });
          idx += targetWord.length;
        }
      }
    }
    this.totalTargets = this.targets.length;
  }

  onVimEvent(event: VimEvent): void {
    if (event.type === 'cursor_move') {
      const { row, col } = event.cursor;
      for (const target of this.targets) {
        if (!target.captured && target.row === row &&
            col >= target.col && col < target.col + target.word.length) {
          target.captured = true;
          this.capturedCount++;
          this.state.score += 25;
        }
      }
    }
    this.checkObjectives(event);
  }

  getCellOverrides(): Map<string, CellOverride> {
    const overrides = new Map<string, CellOverride>();
    for (const target of this.targets) {
      for (let c = 0; c < target.word.length; c++) {
        const key = `${target.row},${target.col + c}`;
        overrides.set(key, {
          className: target.captured ? 'cell-collected' : 'cell-target',
        });
      }
    }
    return overrides;
  }
}

function getSubLevels() {
  return [
    // Sub-level 1: w only, simple
    {
      description: 'Use w to jump to targets',
      timeLimit: 0,
      targetWords: ['PACKET', 'DATA'],
      lines: [
        'stream flow PACKET burst signal DATA relay',
        'noise buffer PACKET queue stack DATA pipe',
        'route DATA switch PACKET bridge tunnel hop',
        'frame sync PACKET pulse DATA clock tick',
        'signal DATA relay stream PACKET flow burst',
        '',
      ],
    },
    // Sub-level 2: b introduced
    {
      description: 'Use w and b to navigate streams',
      timeLimit: 0,
      targetWords: ['TARGET', 'GRAB'],
      lines: [
        'miss miss TARGET miss miss GRAB miss miss',
        'skip GRAB skip skip TARGET skip skip miss',
        'miss skip TARGET skip GRAB skip miss skip',
        'GRAB miss skip miss TARGET miss skip GRAB',
        'skip TARGET miss GRAB miss miss TARGET end',
        '',
      ],
    },
    // Sub-level 3: e introduced
    {
      description: 'Use w, b, and e to intercept',
      timeLimit: 0,
      targetWords: ['INTERCEPT', 'EXTRACT'],
      lines: [
        'noise INTERCEPT static noise EXTRACT noise static',
        'data EXTRACT noise INTERCEPT stream noise data',
        'static INTERCEPT data EXTRACT static noise flow',
        'EXTRACT noise stream INTERCEPT data static end',
        'noise INTERCEPT EXTRACT noise INTERCEPT EXTRACT fin',
        '',
      ],
    },
    // Sub-level 4: Multi-line, more targets
    {
      description: 'Multi-line interception',
      timeLimit: 45,
      targetWords: ['PAYLOAD', 'CIPHER'],
      lines: [
        'stream PAYLOAD noise CIPHER buffer PAYLOAD signal',
        'CIPHER relay PAYLOAD static noise CIPHER burst',
        'buffer PAYLOAD static CIPHER stream PAYLOAD pipe',
        'noise CIPHER signal PAYLOAD relay CIPHER data',
        'PAYLOAD burst CIPHER noise PAYLOAD stream CIPHER',
        'static CIPHER PAYLOAD relay noise CIPHER PAYLOAD',
        'PAYLOAD CIPHER data stream static CIPHER buffer',
        'noise PAYLOAD CIPHER relay PAYLOAD CIPHER end',
        '',
      ],
    },
    // Sub-level 5: Timed challenge
    {
      description: 'Speed interception challenge',
      timeLimit: 30,
      targetWords: ['HACK', 'KEY', 'CODE'],
      lines: [
        'data HACK noise KEY signal CODE buffer HACK relay KEY',
        'CODE stream HACK noise KEY burst CODE signal HACK pipe',
        'KEY noise CODE relay HACK stream KEY buffer CODE data',
        'HACK signal KEY noise CODE relay HACK burst KEY stream',
        'CODE HACK KEY noise CODE HACK KEY signal CODE HACK end',
        'noise KEY HACK CODE relay HACK KEY CODE signal buffer',
        'HACK CODE KEY noise stream HACK relay CODE KEY buffer',
        '',
      ],
    },
  ];
}

registerLevel('level2', (engine) => new PacketLevel(engine));
