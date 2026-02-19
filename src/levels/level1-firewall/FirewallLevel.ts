import type { VimCommandType, VimEvent, SubLevelConfig, CellOverride } from '../../types';
import { LevelBase } from '../LevelBase';
import type { VimEngine } from '../../engine/VimEngine';
import { registerLevel } from '../LevelRegistry';
import { COLS, PLAY_ROWS } from '../../constants';

// Grid-based level: navigate to collect data nodes (@), avoid firewalls (#)

interface GridCell {
  type: 'empty' | 'firewall' | 'data' | 'collected';
}

const SUB_LEVELS = getSubLevelMaps();

export class FirewallLevel extends LevelBase {
  private grid: GridCell[][] = [];
  private totalNodes: number = 0;
  private collectedNodes: number = 0;

  constructor(engine: VimEngine) {
    super(engine);
  }

  get id() { return 'level1'; }
  get name() { return 'Firewall Grid'; }
  get subtitle() { return 'Navigate the grid, collect data nodes'; }
  get commands(): VimCommandType[] { return ['h', 'j', 'k', 'l']; }
  get totalSubLevels() { return 5; }

  get storyIntro(): string[] {
    return [
      'Agent, we have located a vulnerable system.',
      'Your first mission: breach the outer firewall.',
      'Navigate the grid and extract all data nodes.',
      'Avoid the firewall barriers — they will cost you.',
      'Use h/j/k/l to move: left/down/up/right.',
    ];
  }

  get tutorialHints(): string[] {
    return [
      'h = left, j = down, k = up, l = right',
      'Collect all @ nodes to complete the mission',
    ];
  }

  getSubLevelConfig(subLevel: number): SubLevelConfig {
    const map = SUB_LEVELS[subLevel] ?? SUB_LEVELS[0];
    return {
      bufferLines: map.lines,
      objectives: [
        {
          id: 'collect_all',
          description: 'Collect all data nodes (@)',
          check: () => this.collectedNodes >= this.totalNodes,
        },
      ],
      timeLimit: map.timeLimit,
      description: map.description,
    };
  }

  protected onSetup(): void {
    this.parseGrid();
  }

  private parseGrid(): void {
    this.grid = [];
    this.totalNodes = 0;
    this.collectedNodes = 0;

    for (let row = 0; row < this.engine.buffer.lineCount; row++) {
      const line = this.engine.buffer.lineAt(row);
      const gridRow: GridCell[] = [];
      for (let col = 0; col < line.length; col++) {
        const ch = line[col];
        if (ch === '#') {
          gridRow.push({ type: 'firewall' });
        } else if (ch === '@') {
          gridRow.push({ type: 'data' });
          this.totalNodes++;
        } else {
          gridRow.push({ type: 'empty' });
        }
      }
      this.grid.push(gridRow);
    }
  }

  onVimEvent(event: VimEvent): void {
    if (event.type === 'cursor_move') {
      const { row, col } = event.cursor;
      const cell = this.grid[row]?.[col];

      if (cell?.type === 'data') {
        cell.type = 'collected';
        this.collectedNodes++;
        this.state.score += 20;
        // Update buffer to show collection
        const line = this.engine.buffer.lineAt(row);
        this.engine.buffer.lines[row] = line.slice(0, col) + ' ' + line.slice(col + 1);
      } else if (cell?.type === 'firewall') {
        this.state.score = Math.max(0, this.state.score - 10);
        // Push cursor back
        if (event.prevCursor) {
          this.engine.buffer.cursor = { ...event.prevCursor };
        }
      }
    }

    this.checkObjectives(event);
  }

  getCellOverrides(): Map<string, CellOverride> {
    const overrides = new Map<string, CellOverride>();

    for (let row = 0; row < this.grid.length; row++) {
      for (let col = 0; col < this.grid[row].length; col++) {
        const cell = this.grid[row][col];
        if (cell.type === 'firewall') {
          overrides.set(`${row},${col}`, { className: 'cell-firewall' });
        } else if (cell.type === 'data') {
          overrides.set(`${row},${col}`, { className: 'cell-data-node' });
        } else if (cell.type === 'collected') {
          overrides.set(`${row},${col}`, { className: 'cell-collected' });
        }
      }
    }

    return overrides;
  }
}

function getSubLevelMaps(): { lines: string[]; timeLimit: number; description: string }[] {
  return [
    // Sub-level 1: Open grid, easy
    {
      description: 'Open grid — collect all data nodes',
      timeLimit: 0,
      lines: padLines([
        '.......@..........@.......',
        '...........................',
        '...@.............@.........',
        '...........................',
        '..........@................',
        '...........................',
        '.@..............@..........',
        '...........................',
        '..............@............',
        '...........................',
        '....@...........@..........',
      ]),
    },
    // Sub-level 2: Simple walls
    {
      description: 'Navigate around walls',
      timeLimit: 0,
      lines: padLines([
        '..@...#.........@..........',
        '......#....................',
        '......#....@...............',
        '...........................',
        '####.......####............',
        '...........................',
        '...@.......#......@........',
        '...........#...............',
        '..@........#.......@.......',
        '...........................',
        '......@....................',
      ]),
    },
    // Sub-level 3: Maze
    {
      description: 'Navigate the maze',
      timeLimit: 60,
      lines: padLines([
        '..@..#..@..#..@..#..@......',
        '.....#.....#.....#.........',
        '##.###.#####.###.#.########',
        '..........@................',
        '.####.###.#.###.####.......',
        '.....@....#..........@.....',
        '.#########.####.###.####...',
        '...........................',
        '.##.###.####.#.####.###....',
        '...@........@..........@...',
        '...........................',
      ]),
    },
    // Sub-level 4: Tighter maze
    {
      description: 'Dense firewall maze',
      timeLimit: 45,
      lines: padLines([
        '@.#...#.@.#...#.@..........',
        '..#.#.#...#.#.#............',
        '..#.#.#.#.#.#.#.#.........',
        '..#.#...#.#.#...#..........',
        '..#.#####.#.#####..........',
        '..#.......#.........@......',
        '..#.#####.#.#####..........',
        '..#.#...#.#.#...#..........',
        '..#.#.@.#.#.#.@.#.........',
        '..#...#...#...#............',
        '..#####.@.#####............',
      ]),
    },
    // Sub-level 5: Big challenge
    {
      description: 'Final firewall challenge',
      timeLimit: 40,
      lines: padLines([
        '@.#.@.#.@.#.@.#.@.........',
        '..#...#...#...#............',
        '###.###.###.###.###........',
        '.....@.....@...............',
        '#.###.###.###.###.#........',
        '#.#.@.#.@.#.@.#.#.........',
        '#.#...#...#...#.#.........',
        '#.###.###.###.###.#........',
        '.....@.....@...............',
        '###.###.###.###.###........',
        '@.#.@.#.@.#.@.#.@.........',
      ]),
    },
  ];
}

function padLines(lines: string[]): string[] {
  // Replace '.' with space for walkable cells, pad with spaces
  const result: string[] = [];
  for (let i = 0; i < PLAY_ROWS; i++) {
    if (i < lines.length) {
      result.push(lines[i].replace(/\./g, ' ').padEnd(COLS));
    } else {
      result.push(' '.repeat(COLS));
    }
  }
  return result;
}

registerLevel('level1', (engine) => new FirewallLevel(engine));
