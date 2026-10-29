/** Pure rules for Train Track Builder: a grid with two stations, scenery in the way, and laying track cell by cell. */

export interface Cell {
  x: number;
  y: number;
}

export type Scenery = "tree" | "rock" | "pond" | "house";

export interface TrackLevel {
  cols: number;
  rows: number;
  from: Cell;
  to: Cell;
  /** Where the train is going, e.g. "the farm" */
  place: { name: string; emoji: string };
  blocked: (Cell & { kind: Scenery })[];
  /** A passenger waiting by the line, who must be picked up on the way */
  stop?: Cell & { emoji: string; name: string };
}

export const PLACES = [
  { name: "the farm", emoji: "🐄" },
  { name: "the zoo", emoji: "🦁" },
  { name: "the beach", emoji: "🏖️" },
  { name: "school", emoji: "🏫" },
  { name: "the castle", emoji: "🏰" },
  { name: "the fair", emoji: "🎡" },
];

export const PASSENGERS = [
  { name: "Panda", emoji: "🐼" },
  { name: "Bunny", emoji: "🐰" },
  { name: "Fox", emoji: "🦊" },
  { name: "Koala", emoji: "🐨" },
];

const SCENERY: Scenery[] = ["tree", "tree", "rock", "pond", "house"];

export const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;
export const adjacent = (a: Cell, b: Cell) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
const inside = (lv: Pick<TrackLevel, "cols" | "rows">, c: Cell) => c.x >= 0 && c.y >= 0 && c.x < lv.cols && c.y < lv.rows;
const isBlocked = (lv: TrackLevel, c: Cell) => lv.blocked.some((b) => same(b, c));

/** A finished track ends at the station and has passed the passenger, if there is one. */
export const isComplete = (lv: TrackLevel, path: Cell[]) => same(path[path.length - 1], lv.to) && (!lv.stop || path.some((c) => same(c, lv.stop!)));

export type LayResult = "ok" | "blocked" | "notNext" | "used" | "done" | "needStop";

/** Can a piece go on `cell`? `path` starts at the first station and grows one neighbour at a time. */
export function canLay(lv: TrackLevel, path: Cell[], cell: Cell): LayResult {
  const end = path[path.length - 1];
  if (same(end, lv.to)) return "done";
  if (path.some((c) => same(c, cell))) return "used";
  if (isBlocked(lv, cell)) return "blocked";
  if (!adjacent(end, cell)) return "notNext";
  if (same(cell, lv.to) && lv.stop && !path.some((c) => same(c, lv.stop!))) return "needStop";
  return "ok";
}

/** Cells the next piece could go on: shown as soft hints. */
export const nextCells = (lv: TrackLevel, path: Cell[]): Cell[] =>
  [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ]
    .map((d) => ({ x: path[path.length - 1].x + d.x, y: path[path.length - 1].y + d.y }))
    .filter((c) => inside(lv, c) && canLay(lv, path, c) === "ok");

/** Tapping a laid piece picks the track back up to it (the first station always stays). */
export function pickUpTo(path: Cell[], cell: Cell): Cell[] {
  const i = path.findIndex((c) => same(c, cell));
  return i <= 0 ? path.slice(0, 1) : path.slice(0, i);
}

function bfs(lv: TrackLevel, from: Cell, to: Cell, avoid: Cell[]): Cell[] | null {
  const key = (c: Cell) => c.y * lv.cols + c.x;
  const prev = new Map<number, Cell | null>([[key(from), null]]);
  const queue = [from];
  while (queue.length) {
    const c = queue.shift()!;
    if (same(c, to)) {
      const out = [c];
      for (let p = prev.get(key(c)); p; p = prev.get(key(p))) out.unshift(p);
      return out;
    }
    for (const d of [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 0, y: -1 },
    ]) {
      const n = { x: c.x + d.x, y: c.y + d.y };
      if (!inside(lv, n) || prev.has(key(n)) || isBlocked(lv, n) || avoid.some((a) => same(a, n))) continue;
      prev.set(key(n), c);
      queue.push(n);
    }
  }
  return null;
}

/** A shortest track (through the passenger, if any), or null if the scenery blocks every way. */
export function shortestTrack(lv: TrackLevel): Cell[] | null {
  if (!lv.stop) return bfs(lv, lv.from, lv.to, []);
  const a = bfs(lv, lv.from, lv.stop, [lv.to]);
  if (!a) return null;
  const b = bfs(lv, lv.stop, lv.to, a.slice(0, -1));
  return b ? [...a, ...b.slice(1)] : null;
}

/** A new map: stations on the left and right edges, more scenery and a passenger as the levels go up. */
export function makeLevel(level: number, r: () => number = Math.random): TrackLevel {
  const cols = level >= 3 ? 6 : 5;
  const rows = 4;
  const pick = <T>(list: T[]) => list[Math.floor(r() * list.length)];
  for (let attempt = 0; attempt < 300; attempt++) {
    const from = { x: 0, y: Math.floor(r() * rows) };
    const to = { x: cols - 1, y: Math.floor(r() * rows) };
    const lv: TrackLevel = { cols, rows, from, to, place: pick(PLACES), blocked: [] };
    const count = Math.min(7, 2 + level);
    while (lv.blocked.length < count) {
      const c = { x: Math.floor(r() * cols), y: Math.floor(r() * rows) };
      if (same(c, from) || same(c, to) || isBlocked(lv, c)) continue;
      lv.blocked.push({ ...c, kind: pick(SCENERY) });
    }
    if (level >= 2) {
      const free: Cell[] = [];
      for (let y = 0; y < rows; y++) for (let x = 1; x < cols - 1; x++) if (!isBlocked(lv, { x, y })) free.push({ x, y });
      lv.stop = { ...pick(free), ...pick(PASSENGERS) };
    }
    const best = shortestTrack(lv);
    // Not a plain straight line once there is scenery to go round
    if (best && (level === 0 || best.length > cols)) return lv;
  }
  return { cols, rows, from: { x: 0, y: 1 }, to: { x: cols - 1, y: 1 }, place: PLACES[0], blocked: [] };
}
