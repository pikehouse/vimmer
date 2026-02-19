import type { VimCommandType, VimEvent, SubLevelConfig, CellOverride } from '../../types';
import { LevelBase } from '../LevelBase';
import type { VimEngine } from '../../engine/VimEngine';
import { registerLevel } from '../LevelRegistry';

// Fill in blanks (____) in vulnerable code using insert mode variants

interface Blank {
  row: number;
  col: number;
  expected: string;
  filled: boolean;
}

const SUB_LEVELS = getSubLevels();

export class InjectionLevel extends LevelBase {
  private blanks: Blank[] = [];
  private filledCount: number = 0;

  constructor(engine: VimEngine) {
    super(engine);
  }

  get id() { return 'level3'; }
  get name() { return 'Code Injection'; }
  get subtitle() { return 'Inject exploit code into vulnerable systems'; }
  get commands(): VimCommandType[] {
    return ['h', 'j', 'k', 'l', 'w', 'b', 'e', 'i', 'a', 'o', 'O', 'I', 'A'];
  }
  get totalSubLevels() { return 5; }

  get storyIntro(): string[] {
    return [
      'We found a vulnerability in the target system.',
      'Blank injection points have been identified.',
      'Insert the correct exploit code at each point.',
      'Use various insert commands to enter text efficiently.',
    ];
  }

  get tutorialHints(): string[] {
    return [
      'i = insert before cursor, a = insert after cursor',
      'I = insert at line start, A = insert at line end',
      'o = open line below, O = open line above',
      'ESC = return to normal mode when done typing',
    ];
  }

  getSubLevelConfig(subLevel: number): SubLevelConfig {
    const config = SUB_LEVELS[subLevel] ?? SUB_LEVELS[0];
    return {
      bufferLines: config.lines.map(l => l.text),
      objectives: [{
        id: 'fill_blanks',
        description: `Fill all ${config.lines.filter(l => l.expected).length} injection points`,
        check: () => this.filledCount >= this.blanks.length,
      }],
      timeLimit: config.timeLimit,
      description: config.description,
    };
  }

  protected onSetup(): void {
    const config = SUB_LEVELS[this.state.subLevel] ?? SUB_LEVELS[0];
    this.blanks = [];
    this.filledCount = 0;

    for (let row = 0; row < config.lines.length; row++) {
      const lineDef = config.lines[row];
      if (lineDef.expected) {
        const col = lineDef.text.indexOf('____');
        if (col >= 0) {
          this.blanks.push({
            row,
            col,
            expected: lineDef.expected,
            filled: false,
          });
        }
      }
    }
  }

  onVimEvent(event: VimEvent): void {
    // Check if any blanks have been filled after text changes
    if (event.type === 'char_insert' || event.type === 'buffer_change' || event.type === 'mode_change') {
      this.checkBlanks();
    }
    this.checkObjectives(event);
  }

  private checkBlanks(): void {
    for (const blank of this.blanks) {
      if (blank.filled) continue;
      const line = this.engine.buffer.lineAt(blank.row);
      if (line.includes(blank.expected)) {
        blank.filled = true;
        this.filledCount++;
        this.state.score += 30;
      }
    }
  }

  getCellOverrides(): Map<string, CellOverride> {
    const overrides = new Map<string, CellOverride>();
    for (const blank of this.blanks) {
      if (!blank.filled) {
        for (let c = blank.col; c < blank.col + 4; c++) {
          overrides.set(`${blank.row},${c}`, { className: 'cell-blank' });
        }
      } else {
        const line = this.engine.buffer.lineAt(blank.row);
        const idx = line.indexOf(blank.expected);
        if (idx >= 0) {
          for (let c = idx; c < idx + blank.expected.length; c++) {
            overrides.set(`${blank.row},${c}`, { className: 'cell-collected' });
          }
        }
      }
    }
    return overrides;
  }
}

interface LineDef {
  text: string;
  expected?: string;
}

function getSubLevels(): { lines: LineDef[]; timeLimit: number; description: string }[] {
  return [
    // Sub-level 1: i only
    {
      description: 'Use i to insert text before cursor',
      timeLimit: 0,
      lines: [
        { text: '// Exploit payload v1' },
        { text: 'function ____() {', expected: 'hack' },
        { text: '  const key = "____";', expected: 'root' },
        { text: '  return ____;', expected: 'true' },
        { text: '}' },
        { text: '' },
      ],
    },
    // Sub-level 2: a introduced
    {
      description: 'Use i and a to insert at different positions',
      timeLimit: 0,
      lines: [
        { text: '// Injecting shell commands' },
        { text: 'exec("____");', expected: 'sudo' },
        { text: 'chmod("____");', expected: '0777' },
        { text: 'user = "____";', expected: 'root' },
        { text: 'pass = "____";', expected: 'open' },
        { text: '' },
      ],
    },
    // Sub-level 3: o/O
    {
      description: 'Use o and O to insert new lines',
      timeLimit: 0,
      lines: [
        { text: '// Missing exploit steps' },
        { text: 'step1: scan_ports();' },
        { text: 'step2: ____();', expected: 'find_vuln' },
        { text: 'step3: escalate();' },
        { text: 'step4: ____();', expected: 'exfil_data' },
        { text: '' },
      ],
    },
    // Sub-level 4: I/A
    {
      description: 'Use I and A for line-start and line-end insertion',
      timeLimit: 0,
      lines: [
        { text: '// Complete the exploit chain' },
        { text: '____ backdoor.install();', expected: 'await' },
        { text: '____ keylogger.start();', expected: 'await' },
        { text: 'exfil.send(____);', expected: 'data' },
        { text: 'cleanup.run(____);', expected: 'logs' },
        { text: '' },
      ],
    },
    // Sub-level 5: Mixed challenge
    {
      description: 'Mixed insert mode challenge',
      timeLimit: 60,
      lines: [
        { text: '// FULL EXPLOIT PAYLOAD' },
        { text: '____ initPayload();', expected: 'async' },
        { text: 'const target = "____";', expected: 'db01' },
        { text: 'const method = "____";', expected: 'sqli' },
        { text: 'inject(target, ____);', expected: 'method' },
        { text: 'if (____) {', expected: 'success' },
        { text: '  exfil("____");', expected: 'dump' },
        { text: '}' },
        { text: '' },
      ],
    },
  ];
}

registerLevel('level3', (engine) => new InjectionLevel(engine));
