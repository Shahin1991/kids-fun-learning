export const COLS = 7;
export const ROWS = 6;
export type Disc = 1 | 2;
export type Cell = Disc | 0;
export type Level = "easy" | "medium" | "hard";

/** Flat board, index = row * COLS + col, row 0 is the bottom. */
export type Board = Cell[];

export const emptyBoard = (): Board => Array<Cell>(COLS * ROWS).fill(0);
export const idx = (row: number, col: number) => row * COLS + col;
export const other = (d: Disc): Disc => (d === 1 ? 2 : 1);

/** Lowest empty row in a column, or -1 when full. */
export function landingRow(b: Board, col: number): number {
  for (let r = 0; r < ROWS; r++) if (b[idx(r, col)] === 0) return r;
  return -1;
}

export function drop(b: Board, col: number, d: Disc): Board | null {
  const row = landingRow(b, col);
  if (row < 0) return null;
  const next = [...b];
  next[idx(row, col)] = d;
  return next;
}

const DIRS: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];

/** The four cells of a winning line (as indices), if any. */
export function findWin(b: Board): { disc: Disc; cells: number[] } | null {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const d = b[idx(r, c)];
      if (!d) continue;
      for (const [dr, dc] of DIRS) {
        const cells = [idx(r, c)];
        for (let k = 1; k < 4; k++) {
          const rr = r + dr * k;
          const cc = c + dc * k;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || b[idx(rr, cc)] !== d) break;
          cells.push(idx(rr, cc));
        }
        if (cells.length === 4) return { disc: d, cells };
      }
    }
  }
  return null;
}

export const isFull = (b: Board) => b.slice((ROWS - 1) * COLS).every(Boolean);
const open = (b: Board) => Array.from({ length: COLS }, (_, c) => c).filter((c) => landingRow(b, c) >= 0);
/** Centre columns first: better pruning and better play. */
const ORDER = [3, 2, 4, 1, 5, 0, 6];

function windowScore(cells: Cell[], me: Disc): number {
  const mine = cells.filter((x) => x === me).length;
  const theirs = cells.filter((x) => x === other(me)).length;
  const empty = 4 - mine - theirs;
  if (mine && theirs) return 0;
  if (mine === 3 && empty === 1) return 5;
  if (mine === 2 && empty === 2) return 2;
  if (theirs === 3 && empty === 1) return -4;
  return 0;
}

function evaluate(b: Board, me: Disc): number {
  let s = 0;
  for (let r = 0; r < ROWS; r++) if (b[idx(r, 3)] === me) s += 3;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const [dr, dc] of DIRS) {
        const er = r + dr * 3;
        const ec = c + dc * 3;
        if (er < 0 || er >= ROWS || ec < 0 || ec >= COLS) continue;
        s += windowScore([0, 1, 2, 3].map((k) => b[idx(r + dr * k, c + dc * k)]), me);
      }
    }
  }
  return s;
}

function negamax(b: Board, d: Disc, me: Disc, depth: number, alpha: number, beta: number): number {
  const w = findWin(b);
  if (w) return (w.disc === me ? 1 : -1) * (100000 + depth);
  if (isFull(b)) return 0;
  if (depth === 0) return evaluate(b, me) * (d === me ? 1 : -1);
  let best = -Infinity;
  for (const c of ORDER) {
    const nb = drop(b, c, d);
    if (!nb) continue;
    const v = -negamax(nb, other(d), me, depth - 1, -beta, -alpha);
    best = Math.max(best, v);
    alpha = Math.max(alpha, v);
    if (alpha >= beta) break;
  }
  return best;
}

const immediateWin = (b: Board, d: Disc): number | null => {
  for (const c of open(b)) {
    const nb = drop(b, c, d)!;
    if (findWin(nb)) return c;
  }
  return null;
};

/**
 * Easy: random (spots a win about half the time). Medium: takes wins, blocks, searches 3 moves ahead.
 * Hard: searches 6 moves ahead with alpha-beta pruning.
 */
export function botColumn(b: Board, bot: Disc, level: Level, rand: () => number = Math.random): number {
  const cols = open(b);
  if (level === "easy") {
    const win = immediateWin(b, bot);
    if (win !== null && rand() < 0.5) return win;
    return cols[Math.floor(rand() * cols.length)];
  }
  const win = immediateWin(b, bot);
  if (win !== null) return win;
  const block = immediateWin(b, other(bot));
  if (block !== null) return block;
  const depth = level === "medium" ? 3 : 6;
  let best = cols[0];
  let bestScore = -Infinity;
  for (const c of ORDER.filter((x) => cols.includes(x))) {
    const nb = drop(b, c, bot)!;
    const v = -negamax(nb, other(bot), bot, depth - 1, -Infinity, Infinity) + (level === "medium" ? rand() * 2 : 0);
    if (v > bestScore) {
      bestScore = v;
      best = c;
    }
  }
  return best;
}
