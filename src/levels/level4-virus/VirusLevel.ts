import type { VimCommandType, VimEvent, SubLevelConfig, CellOverride } from '../../types';
import { LevelBase } from '../LevelBase';
import type { VimEngine } from '../../engine/VimEngine';
import { registerLevel } from '../LevelRegistry';

// Delete malware from infected code while preserving clean code

interface MalwareEntry {
  row: number;
  text: string;      // The malware text to look for
  type: 'char' | 'word' | 'line';
  removed: boolean;
}

const SUB_LEVELS = getSubLevels();

export class VirusLevel extends LevelBase {
  private malware: MalwareEntry[] = [];
  private removedCount: number = 0;
  private totalMalware: number = 0;


  constructor(engine: VimEngine) {
    super(engine);
  }

  get id() { return 'level4'; }
  get name() { return 'Virus Purge'; }
  get subtitle() { return 'Surgically remove malware from infected code'; }
  get commands(): VimCommandType[] {
    return ['h', 'j', 'k', 'l', 'w', 'b', 'e', 'x', 'dd', 'dw', 'cw', 'i', 'a'];
  }
  get totalSubLevels() { return 5; }

  get storyIntro(): string[] {
    return [
      'The system has been infected with malware.',
      'Highlighted code segments contain viral payloads.',
      'Surgically remove ONLY the malware code.',
      'Preserve all clean code — mistakes cost points.',
    ];
  }

  get tutorialHints(): string[] {
    return [
      'x = delete single character under cursor',
      'dd = delete entire line',
      'dw = delete word',
      'cw = change word (delete word + enter insert mode)',
    ];
  }

  getSubLevelConfig(subLevel: number): SubLevelConfig {
    const config = SUB_LEVELS[subLevel] ?? SUB_LEVELS[0];
    return {
      bufferLines: config.lines,
      objectives: [{
        id: 'purge_all',
        description: `Remove all ${config.malwareItems.length} malware segments`,
        check: () => this.removedCount >= this.totalMalware,
      }],
      timeLimit: config.timeLimit,
      description: config.description,
    };
  }

  protected onSetup(): void {
    const config = SUB_LEVELS[this.state.subLevel] ?? SUB_LEVELS[0];
    this.malware = config.malwareItems.map(m => ({ ...m, removed: false }));
    this.removedCount = 0;
    this.totalMalware = this.malware.length;
  }

  onVimEvent(event: VimEvent): void {
    // After any edit, check if malware was removed
    if (['char_delete', 'word_delete', 'line_delete', 'word_change', 'char_insert'].includes(event.type)) {
      this.checkMalwareRemoval();
    }
    this.checkObjectives(event);
  }

  private checkMalwareRemoval(): void {
    for (const m of this.malware) {
      if (m.removed) continue;

      // Check if the malware text is still present in the buffer
      let found = false;
      for (let row = 0; row < this.engine.buffer.lineCount; row++) {
        const line = this.engine.buffer.lineAt(row);
        if (line.includes(m.text)) {
          found = true;
          break;
        }
      }

      if (!found) {
        m.removed = true;
        this.removedCount++;
        this.state.score += 25;
      }
    }
  }

  getCellOverrides(): Map<string, CellOverride> {
    const overrides = new Map<string, CellOverride>();

    for (const m of this.malware) {
      if (m.removed) continue;
      // Find current position of malware text
      for (let row = 0; row < this.engine.buffer.lineCount; row++) {
        const line = this.engine.buffer.lineAt(row);
        let idx = 0;
        while ((idx = line.indexOf(m.text, idx)) !== -1) {
          for (let c = idx; c < idx + m.text.length; c++) {
            overrides.set(`${row},${c}`, { className: 'cell-malware' });
          }
          idx += m.text.length;
        }
      }
    }

    return overrides;
  }
}

function getSubLevels() {
  return [
    // Sub-level 1: x (single char deletion)
    {
      description: 'Use x to delete virus characters',
      timeLimit: 0,
      malwareItems: [
        { row: 1, text: 'X', type: 'char' as const },
        { row: 2, text: 'X', type: 'char' as const },
        { row: 3, text: 'X', type: 'char' as const },
      ],
      lines: [
        '// Clean up infected variables',
        'let port = X8080;',
        'let host = "localXhost";',
        'let safe = trXue;',
        'connect(host, port);',
        '',
      ],
    },
    // Sub-level 2: dd (line deletion)
    {
      description: 'Use dd to delete infected lines',
      timeLimit: 0,
      malwareItems: [
        { row: 2, text: 'VIRUS.spread(network);', type: 'line' as const },
        { row: 5, text: 'VIRUS.replicate(self);', type: 'line' as const },
        { row: 7, text: 'VIRUS.encrypt(files);', type: 'line' as const },
      ],
      lines: [
        'function cleanSystem() {',
        '  scan(drives);',
        '  VIRUS.spread(network);',
        '  quarantine(threats);',
        '  updateDefs();',
        '  VIRUS.replicate(self);',
        '  restoreBackup();',
        '  VIRUS.encrypt(files);',
        '  verify(integrity);',
        '}',
        '',
      ],
    },
    // Sub-level 3: dw (word deletion)
    {
      description: 'Use dw to delete malware words',
      timeLimit: 0,
      malwareItems: [
        { row: 1, text: 'TROJAN', type: 'word' as const },
        { row: 2, text: 'WORM', type: 'word' as const },
        { row: 3, text: 'ROOTKIT', type: 'word' as const },
        { row: 4, text: 'KEYLOG', type: 'word' as const },
      ],
      lines: [
        '// Remove malware identifiers',
        'module TROJAN auth_service {',
        '  import WORM crypto_lib;',
        '  fn ROOTKIT validate(token) {',
        '    log KEYLOG (token.user);',
        '    return verified;',
        '  }',
        '}',
        '',
      ],
    },
    // Sub-level 4: cw (change word)
    {
      description: 'Use cw to replace corrupted words',
      timeLimit: 0,
      malwareItems: [
        { row: 1, text: 'CORRUPT', type: 'word' as const },
        { row: 2, text: 'CORRUPT', type: 'word' as const },
        { row: 3, text: 'CORRUPT', type: 'word' as const },
      ],
      lines: [
        '// Fix corrupted function names',
        'function CORRUPT() {',
        '  return CORRUPT;',
        '  log(CORRUPT);',
        '}',
        '// Replace CORRUPT with "clean"',
        '',
      ],
    },
    // Sub-level 5: Mixed challenge with timer
    {
      description: 'Full virus purge — mixed operations',
      timeLimit: 45,
      malwareItems: [
        { row: 1, text: 'MALWARE', type: 'word' as const },
        { row: 3, text: '  PAYLOAD.deploy(all);', type: 'line' as const },
        { row: 5, text: 'INFECTED', type: 'word' as const },
        { row: 7, text: 'Z', type: 'char' as const },
        { row: 8, text: '  BACKDOOR.open(port);', type: 'line' as const },
      ],
      lines: [
        'function secureSystem() {',
        '  init(MALWARE config);',
        '  loadModules();',
        '  PAYLOAD.deploy(all);',
        '  startFirewall();',
        '  monitor(INFECTED traffic);',
        '  updateRules();',
        '  port = Z443;',
        '  BACKDOOR.open(port);',
        '  log("System secured");',
        '}',
        '',
      ],
    },
  ];
}

registerLevel('level4', (engine) => new VirusLevel(engine));
