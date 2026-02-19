import type { VimCommandType, VimEvent, SubLevelConfig, CellOverride } from '../../types';
import { LevelBase } from '../LevelBase';
import type { VimEngine } from '../../engine/VimEngine';
import { registerLevel } from '../LevelRegistry';

// Race through a massive buffer finding targets before lockout

interface SpeedTarget {
  row: number;
  col: number;
  word: string;
  reached: boolean;
}

const SUB_LEVELS = getSubLevels();

export class SpeedrunLevel extends LevelBase {
  private targets: SpeedTarget[] = [];
  private reachedCount: number = 0;
  private totalTargets: number = 0;

  constructor(engine: VimEngine) {
    super(engine);
  }

  get id() { return 'level6'; }
  get name() { return 'Speed Run'; }
  get subtitle() { return 'Race through the system before lockout'; }
  get commands(): VimCommandType[] {
    return ['h', 'j', 'k', 'l', 'w', 'b', 'e', 'gg', 'G', '0', '$', '/', 'n', 'N'];
  }
  get totalSubLevels() { return 3; }

  get storyIntro(): string[] {
    return [
      'ALERT: System lockout detected!',
      'The security countermeasures are activating.',
      'Navigate through the massive codebase FAST.',
      'Find and reach all marked targets before time runs out.',
      'Use search and navigation to move efficiently.',
    ];
  }

  get tutorialHints(): string[] {
    return [
      'gg = go to first line, G = go to last line',
      '0 = go to line start, $ = go to line end',
      '/ = search forward, n = next match, N = prev match',
    ];
  }

  getSubLevelConfig(subLevel: number): SubLevelConfig {
    const config = SUB_LEVELS[subLevel] ?? SUB_LEVELS[0];
    return {
      bufferLines: config.lines,
      objectives: [{
        id: 'reach_all',
        description: `Reach all ${config.targetWords.length} targets before lockout`,
        check: () => this.reachedCount >= this.totalTargets,
      }],
      timeLimit: config.timeLimit,
      description: config.description,
    };
  }

  protected onSetup(): void {
    const config = SUB_LEVELS[this.state.subLevel] ?? SUB_LEVELS[0];
    this.targets = [];
    this.reachedCount = 0;

    // Find all target words in the buffer
    for (const targetWord of config.targetWords) {
      for (let row = 0; row < this.engine.buffer.lineCount; row++) {
        const line = this.engine.buffer.lineAt(row);
        const idx = line.indexOf(targetWord);
        if (idx >= 0) {
          this.targets.push({ row, col: idx, word: targetWord, reached: false });
        }
      }
    }
    this.totalTargets = this.targets.length;
  }

  onVimEvent(event: VimEvent): void {
    if (event.type === 'cursor_move' || event.type === 'search' || event.type === 'search_next') {
      const { row, col } = event.cursor;
      for (const target of this.targets) {
        if (!target.reached && target.row === row &&
            col >= target.col && col < target.col + target.word.length) {
          target.reached = true;
          this.reachedCount++;
          this.state.score += 30;
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
          className: target.reached ? 'cell-collected' : 'cell-target',
        });
      }
    }
    // Also highlight search matches
    const searchTerm = this.engine.parser.searchBuffer;
    if (searchTerm) {
      const matches = this.engine.buffer.findAllMatches(searchTerm);
      for (const match of matches) {
        for (let col = match.start.col; col <= match.end.col; col++) {
          const key = `${match.start.row},${col}`;
          if (!overrides.has(key)) {
            overrides.set(key, { className: 'cell-search-match' });
          }
        }
      }
    }
    return overrides;
  }
}

function generateCodeLines(count: number): string[] {
  const templates = [
    'function process_{0}(data) {{ return transform(data); }}',
    'const config_{0} = {{ host: "10.0.{1}.{2}", port: {3} }};',
    'export class Handler_{0} extends BaseHandler {{ }}',
    'if (status_{0} === "active") {{ notify(admin); }}',
    '// Module {0}: network traffic analysis v{1}.{2}',
    'let buffer_{0} = allocate({1}, {2});',
    'async function fetch_{0}() {{ await request("/api/{0}"); }}',
    'const SECRET_{0} = decrypt(vault[{1}]);',
    'import {{ module_{0} }} from "./core/{0}";',
    'router.get("/{0}", auth, handler_{0});',
    'db.query("SELECT * FROM {0} WHERE id = {1}");',
    'socket.on("{0}", (data) => process(data));',
    'logger.info("System {0} initialized at port {1}");',
    'cache.set("{0}", payload, TTL_{1});',
    'validate(input_{0}, schema_{1});',
  ];

  const lines: string[] = [];
  for (let i = 0; i < count; i++) {
    const template = templates[i % templates.length];
    const line = template
      .replace(/\{0\}/g, String(i).padStart(3, '0'))
      .replace(/\{1\}/g, String((i * 7) % 256))
      .replace(/\{2\}/g, String((i * 13) % 256))
      .replace(/\{3\}/g, String(3000 + (i * 11) % 9000));
    lines.push(line);
  }
  return lines;
}

function insertTargets(lines: string[], targets: string[]): void {
  const spacing = Math.floor(lines.length / (targets.length + 1));
  for (let i = 0; i < targets.length; i++) {
    const row = spacing * (i + 1);
    if (row < lines.length) {
      lines[row] = `// >>> ${targets[i]} <<< CRITICAL TARGET`;
    }
  }
}

function getSubLevels() {
  // Sub-level 1: gg/G/0/$ navigation
  const lines1 = generateCodeLines(50);
  const targets1 = ['ALPHA_KEY', 'BETA_KEY', 'GAMMA_KEY'];
  insertTargets(lines1, targets1);

  // Sub-level 2: / search with n/N
  const lines2 = generateCodeLines(100);
  const targets2 = ['BREACH_POINT', 'VAULT_ACCESS', 'EXTRACT_NODE', 'ESCAPE_HATCH'];
  insertTargets(lines2, targets2);

  // Sub-level 3: All combined, aggressive timer
  const lines3 = generateCodeLines(200);
  const targets3 = ['TARGET_01', 'TARGET_02', 'TARGET_03', 'TARGET_04', 'TARGET_05', 'TARGET_06'];
  insertTargets(lines3, targets3);

  return [
    {
      description: 'Navigate a 50-line system (gg/G/0/$)',
      timeLimit: 45,
      targetWords: targets1,
      lines: lines1,
    },
    {
      description: 'Search through 100 lines (/search, n/N)',
      timeLimit: 40,
      targetWords: targets2,
      lines: lines2,
    },
    {
      description: 'Full speed run — 200 lines, 6 targets',
      timeLimit: 35,
      targetWords: targets3,
      lines: lines3,
    },
  ];
}

registerLevel('level6', (engine) => new SpeedrunLevel(engine));
