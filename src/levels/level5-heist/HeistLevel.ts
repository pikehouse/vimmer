import type { VimCommandType, VimEvent, SubLevelConfig, CellOverride } from '../../types';
import { LevelBase } from '../LevelBase';
import type { VimEngine } from '../../engine/VimEngine';
import { registerLevel } from '../LevelRegistry';

// Yank data from vault (top section), paste into extraction zone (bottom section)

interface ExtractionTarget {
  row: number;
  expected: string;
  filled: boolean;
}

const SUB_LEVELS = getSubLevels();

export class HeistLevel extends LevelBase {
  private targets: ExtractionTarget[] = [];
  private filledCount: number = 0;
  private dividerRow: number = 0;

  constructor(engine: VimEngine) {
    super(engine);
  }

  get id() { return 'level5'; }
  get name() { return 'Data Heist'; }
  get subtitle() { return 'Yank data from the vault, paste to extraction'; }
  get commands(): VimCommandType[] {
    return ['h', 'j', 'k', 'l', 'w', 'b', 'e', 'yy', 'yw', 'p', 'P'];
  }
  get totalSubLevels() { return 4; }

  get storyIntro(): string[] {
    return [
      'We have gained access to the data vault.',
      'Critical intel is stored in the upper section.',
      'Copy the data and paste it into the extraction zone below.',
      'Use yank and paste to transfer data precisely.',
    ];
  }

  get tutorialHints(): string[] {
    return [
      'yy = yank (copy) entire line',
      'yw = yank (copy) word',
      'p = paste after/below, P = paste before/above',
    ];
  }

  getSubLevelConfig(subLevel: number): SubLevelConfig {
    const config = SUB_LEVELS[subLevel] ?? SUB_LEVELS[0];
    return {
      bufferLines: config.lines,
      objectives: [{
        id: 'extract_all',
        description: `Extract all ${config.targets.length} data items`,
        check: () => this.filledCount >= this.targets.length,
      }],
      timeLimit: config.timeLimit,
      description: config.description,
    };
  }

  protected onSetup(): void {
    const config = SUB_LEVELS[this.state.subLevel] ?? SUB_LEVELS[0];
    this.targets = config.targets.map(t => ({ ...t, filled: false }));
    this.filledCount = 0;

    // Find the divider row
    for (let row = 0; row < this.engine.buffer.lineCount; row++) {
      if (this.engine.buffer.lineAt(row).startsWith('---')) {
        this.dividerRow = row;
        break;
      }
    }
  }

  onVimEvent(event: VimEvent): void {
    if (event.type === 'paste' || event.type === 'char_insert' || event.type === 'buffer_change') {
      this.checkExtractions();
    }
    this.checkObjectives(event);
  }

  private checkExtractions(): void {
    for (const target of this.targets) {
      if (target.filled) continue;

      // Check if the expected text appears anywhere in the extraction zone
      for (let row = this.dividerRow + 1; row < this.engine.buffer.lineCount; row++) {
        const line = this.engine.buffer.lineAt(row);
        if (line.includes(target.expected)) {
          target.filled = true;
          this.filledCount++;
          this.state.score += 30;
          break;
        }
      }
    }
  }

  getCellOverrides(): Map<string, CellOverride> {
    const overrides = new Map<string, CellOverride>();

    for (let row = 0; row < this.engine.buffer.lineCount; row++) {
      const line = this.engine.buffer.lineAt(row);

      if (row < this.dividerRow) {
        // Vault section
        for (let col = 0; col < line.length; col++) {
          overrides.set(`${row},${col}`, { className: 'cell-vault' });
        }
      } else if (line.startsWith('---')) {
        for (let col = 0; col < line.length; col++) {
          overrides.set(`${row},${col}`, { className: 'cell-dim' });
        }
      } else if (row > this.dividerRow) {
        // Extraction zone
        for (let col = 0; col < line.length; col++) {
          overrides.set(`${row},${col}`, { className: 'cell-extraction' });
        }
      }
    }

    // Highlight filled targets
    for (const target of this.targets) {
      if (!target.filled) continue;
      for (let row = this.dividerRow + 1; row < this.engine.buffer.lineCount; row++) {
        const line = this.engine.buffer.lineAt(row);
        const idx = line.indexOf(target.expected);
        if (idx >= 0) {
          for (let c = idx; c < idx + target.expected.length; c++) {
            overrides.set(`${row},${c}`, { className: 'cell-collected' });
          }
        }
      }
    }

    return overrides;
  }
}

function getSubLevels() {
  return [
    // Sub-level 1: yy/p — copy whole lines
    {
      description: 'Yank lines from vault, paste below divider',
      timeLimit: 0,
      targets: [
        { row: -1, expected: 'SECRET_KEY=alpha-7749', filled: false },
        { row: -1, expected: 'ACCESS_TOKEN=bravo-3312', filled: false },
      ],
      lines: [
        '// === DATA VAULT ===',
        'SECRET_KEY=alpha-7749',
        'ACCESS_TOKEN=bravo-3312',
        '',
        '--- EXTRACTION ZONE ---',
        '// Paste data below:',
        '',
        '',
        '',
      ],
    },
    // Sub-level 2: Multiple targets
    {
      description: 'Extract multiple data records',
      timeLimit: 0,
      targets: [
        { row: -1, expected: 'DB_HOST=10.0.0.42', filled: false },
        { row: -1, expected: 'DB_PASS=x9k2m#p1', filled: false },
        { row: -1, expected: 'API_KEY=zz-top-9001', filled: false },
      ],
      lines: [
        '// === DATA VAULT ===',
        'DB_HOST=10.0.0.42',
        'DB_USER=admin',
        'DB_PASS=x9k2m#p1',
        'API_KEY=zz-top-9001',
        'LOG_LEVEL=debug',
        '',
        '--- EXTRACTION ZONE ---',
        '// Extract DB_HOST, DB_PASS, API_KEY:',
        '',
        '',
        '',
        '',
      ],
    },
    // Sub-level 3: yw for partial data
    {
      description: 'Use yw to yank specific words',
      timeLimit: 0,
      targets: [
        { row: -1, expected: 'classified', filled: false },
        { row: -1, expected: 'omega', filled: false },
        { row: -1, expected: 'uranium', filled: false },
      ],
      lines: [
        '// === DATA VAULT ===',
        'project: classified aurora',
        'codename: omega sunrise',
        'resource: uranium deposit',
        'status: active monitoring',
        '',
        '--- EXTRACTION ZONE ---',
        '// Yank key words (yw) and paste:',
        '',
        '',
        '',
        '',
      ],
    },
    // Sub-level 4: Mixed with timer
    {
      description: 'Full heist — timed extraction',
      timeLimit: 60,
      targets: [
        { row: -1, expected: 'MASTER_KEY=phoenix-00', filled: false },
        { row: -1, expected: 'VAULT_CODE=99-red-99', filled: false },
        { row: -1, expected: 'nuclear', filled: false },
        { row: -1, expected: 'ESCAPE_ROUTE=tunnel-7', filled: false },
      ],
      lines: [
        '// === DATA VAULT ===',
        'MASTER_KEY=phoenix-00',
        'VAULT_CODE=99-red-99',
        'target: nuclear reactor',
        'DECOY_DATA=fake-value',
        'ESCAPE_ROUTE=tunnel-7',
        'NOISE=ignore-this',
        '',
        '--- EXTRACTION ZONE ---',
        '// Extract MASTER_KEY, VAULT_CODE,',
        '// the word "nuclear", ESCAPE_ROUTE:',
        '',
        '',
        '',
        '',
        '',
      ],
    },
  ];
}

registerLevel('level5', (engine) => new HeistLevel(engine));
