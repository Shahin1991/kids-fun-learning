export type Mark = "X" | "O";
export type Cell = Mark | null;
export type Level = "easy" | "medium" | "hard";

export const LINES: number[][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function winnerOf(b: Cell[]): { mark: Mark; line: number[] } | null {
  for (const line of LINES) {
    const [x, y, z] = line;
    if (b[x] && b[x] === b[y] && b[x] === b[z]) return { mark: b[x]!, line };
  }
  return null;
}

export const isFull = (b: Cell[]) => b.every(Boolean);
export const other = (m: Mark): Mark => (m === "X" ? "O" : "X");
const empties = (b: Cell[]) => b.flatMap((c, i) => (c ? [] : [i]));

function winningMove(b: Cell[], m: Mark): number | null {
  for (const i of empties(b)) {
    const t = [...b];
    t[i] = m;
    if (winnerOf(t)) return i;
  }
  return null;
}

const memo = new Map<string, number>();

/** Perfect play: +1 if `bot` wins, 0 draw, -1 loses; faster wins and slower losses score better. */
function minimax(b: Cell[], turn: Mark, bot: Mark, depth: number): number {
  const key = `${b.map((c) => c ?? "-").join("")}${turn}${bot}${depth}`;
  const hit = memo.get(key);
  if (hit !== undefined) return hit;
  let result: number;
  const w = winnerOf(b);
  if (w) result = (w.mark === bot ? 1 : -1) * (10 - depth);
  else if (isFull(b)) result = 0;
  else {
    const scores = empties(b).map((i) => {
      const t = [...b];
      t[i] = turn;
      return minimax(t, other(turn), bot, depth + 1);
    });
    result = turn === bot ? Math.max(...scores) : Math.min(...scores);
  }
  memo.set(key, result);
  return result;
}

const pick = <T,>(list: T[], rand: () => number) => list[Math.floor(rand() * list.length)];

/**
 * Easy: mostly wanders about, sometimes spots a win. Medium: wins, blocks, otherwise sensible squares.
 * Hard: never loses (minimax), but picks randomly among equally good moves so games differ.
 */
export function botMove(b: Cell[], bot: Mark, level: Level, rand: () => number = Math.random): number {
  const free = empties(b);
  if (level === "easy") {
    const win = winningMove(b, bot);
    if (win !== null && rand() < 0.4) return win;
    return pick(free, rand);
  }
  if (level === "medium") {
    const win = winningMove(b, bot);
    if (win !== null) return win;
    const block = winningMove(b, other(bot));
    if (block !== null && rand() < 0.9) return block;
    if (b[4] === null && rand() < 0.7) return 4;
    const corners = [0, 2, 6, 8].filter((i) => b[i] === null);
    if (corners.length && rand() < 0.6) return pick(corners, rand);
    return pick(free, rand);
  }
  const scored = free.map((i) => {
    const t = [...b];
    t[i] = bot;
    return { i, s: minimax(t, other(bot), bot, 1) };
  });
  const best = Math.max(...scored.map((x) => x.s));
  return pick(scored.filter((x) => x.s === best).map((x) => x.i), rand);
}
