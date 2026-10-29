/** Pure rules for Treasure Map: a grid island, compass clues, and walking them. */

export type Dir = "N" | "E" | "S" | "W";
export type Tile = "sand" | "water" | "palm" | "rock" | "hut";

export interface Cell {
  x: number;
  y: number;
}

export interface Clue {
  dir: Dir;
  steps: number;
}

export interface TreasureMap {
  size: number;
  tiles: Tile[][];
  start: Cell;
  treasure: Cell;
  clues: Clue[];
}

export const DIRS: Record<Dir, { dx: number; dy: number; name: string }> = {
  N: { dx: 0, dy: -1, name: "North" },
  E: { dx: 1, dy: 0, name: "East" },
  S: { dx: 0, dy: 1, name: "South" },
  W: { dx: -1, dy: 0, name: "West" },
};

export const step = (c: Cell, d: Dir): Cell => ({ x: c.x + DIRS[d].dx, y: c.y + DIRS[d].dy });

export const walkable = (m: Pick<TreasureMap, "size" | "tiles">, c: Cell) => c.x >= 0 && c.y >= 0 && c.x < m.size && c.y < m.size && m.tiles[c.y][c.x] !== "water";

/** Where following the clues from `from` ends up, or null if they leave the land. */
export function follow(m: Pick<TreasureMap, "size" | "tiles">, from: Cell, clues: Clue[]): Cell | null {
  let c = from;
  for (const clue of clues) {
    for (let i = 0; i < clue.steps; i++) {
      c = step(c, clue.dir);
      if (!walkable(m, c)) return null;
    }
  }
  return c;
}

/** "Go 2 steps North" */
export const clueText = (c: Clue) => `Go ${c.steps} ${c.steps === 1 ? "step" : "steps"} ${DIRS[c.dir].name}`;

const DIR_LIST: Dir[] = ["N", "E", "S", "W"];
const OPPOSITE: Record<Dir, Dir> = { N: "S", S: "N", E: "W", W: "E" };

/**
 * A new island: water around some edges and a pond, landmarks to look at, and 1-3 clues (by level) that
 * lead from the start to the treasure over land, each clue turning a corner.
 */
export function makeMap(level: number, r: () => number = Math.random): TreasureMap {
  const size = level >= 2 ? 7 : 6;
  const count = Math.min(3, 1 + level);
  for (let attempt = 0; attempt < 200; attempt++) {
    const tiles: Tile[][] = Array.from({ length: size }, () => Array.from({ length: size }, () => "sand" as Tile));
    // Sea along two edges, a small pond, and landmarks
    for (let i = 0; i < size; i++) {
      if (r() < 0.6) tiles[0][i] = "water";
      if (r() < 0.6) tiles[size - 1][i] = "water";
    }
    const px = 1 + Math.floor(r() * (size - 2));
    const py = 1 + Math.floor(r() * (size - 2));
    tiles[py][px] = "water";
    for (const t of ["palm", "palm", "rock", "hut"] as Tile[]) {
      const x = Math.floor(r() * size);
      const y = Math.floor(r() * size);
      if (tiles[y][x] === "sand") tiles[y][x] = t;
    }
    const land: Cell[] = [];
    tiles.forEach((row, y) => row.forEach((t, x) => t !== "water" && land.push({ x, y })));
    const start = land[Math.floor(r() * land.length)];
    const clues: Clue[] = [];
    let at = start;
    let last: Dir | null = null;
    let ok = true;
    for (let k = 0; k < count && ok; k++) {
      const options = DIR_LIST.filter((d) => d !== last && (last === null || d !== OPPOSITE[last]));
      const tries = options.flatMap((d) => [1, 2, 3, 4].map((s) => ({ dir: d, steps: s }))).filter((c) => follow({ size, tiles }, at, [c]));
      if (!tries.length) ok = false;
      else {
        const c = tries[Math.floor(r() * tries.length)];
        clues.push(c);
        at = follow({ size, tiles }, at, [c])!;
        last = c.dir;
      }
    }
    if (ok && (at.x !== start.x || at.y !== start.y)) return { size, tiles, start, treasure: at, clues };
  }
  // Fallback: open sand, one clue
  const tiles: Tile[][] = Array.from({ length: size }, () => Array.from({ length: size }, () => "sand" as Tile));
  return { size, tiles, start: { x: 0, y: size - 1 }, treasure: { x: 0, y: size - 3 }, clues: [{ dir: "N", steps: 2 }] };
}

/** Which clue the explorer is on, given the steps taken so far that match the clues in order. */
export function clueProgress(clues: Clue[], taken: Dir[]): { clue: number; stepInClue: number } {
  let i = 0;
  let s = 0;
  for (const d of taken) {
    if (i >= clues.length || d !== clues[i].dir) break;
    s++;
    if (s === clues[i].steps) {
      i++;
      s = 0;
    }
  }
  return { clue: i, stepInClue: s };
}
