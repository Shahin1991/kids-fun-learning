// Nokia-style Bounce: a ball that is always bouncing, collects rings, dodges spikes and leaves by the door.
// Units are tiles. Y grows downward.

export const ROWS = 10;
const R = 0.42;
const GRAVITY = 30;
const BOUNCE = 8.2;
const JUMP = 14.2;
const ACCEL = 34;
const FRICTION = 7;
const MAX_VX = 6.5;
const JUMP_BUFFER = 0.18;

class Grid {
  cells: string[][];
  constructor(public w: number, public h = ROWS) {
    this.cells = Array.from({ length: h }, () => Array(w).fill("."));
  }
  put(ch: string, c: number, r: number) {
    if (this.cells[r]?.[c] !== undefined) this.cells[r][c] = ch;
    return this;
  }
  rect(c0: number, r0: number, c1: number, r1: number, ch: string) {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) this.put(ch, c, r);
    return this;
  }
  rows() {
    return this.cells.map((r) => r.join(""));
  }
}

function level1(): string[] {
  const g = new Grid(36).rect(0, 9, 35, 9, "#");
  g.put("S", 1, 8).put("E", 34, 8);
  g.rect(8, 4, 12, 4, "#").rect(23, 4, 27, 4, "#").rect(2, 6, 5, 6, "#").rect(15, 6, 18, 6, "#");
  for (const [c, r] of [[10, 3], [25, 3], [3, 5], [16, 5], [11, 8], [28, 8], [32, 8]]) g.put("o", c, r);
  for (const c of [20, 21, 30]) g.put("^", c, 8);
  return g.rows();
}

function level2(): string[] {
  const g = new Grid(46).rect(0, 9, 45, 9, "#");
  g.put("S", 1, 8).put("E", 44, 8);
  g.rect(5, 7, 8, 7, "#").rect(11, 5, 14, 5, "#").rect(18, 7, 21, 7, "#").rect(25, 5, 29, 5, "#").rect(33, 6, 37, 6, "#").rect(40, 4, 43, 4, "#");
  for (const [c, r] of [[6, 6], [12, 4], [19, 6], [27, 4], [35, 5], [41, 3], [16, 8], [31, 8]]) g.put("o", c, r);
  for (const c of [9, 10, 23, 24, 38, 39]) g.put("^", c, 8);
  return g.rows();
}

function level3(): string[] {
  const g = new Grid(54).rect(0, 9, 53, 9, "#");
  g.rect(14, 9, 16, 9, "."); // a pit
  g.rect(31, 9, 34, 9, ".");
  g.put("S", 1, 8).put("E", 52, 8);
  g.rect(13, 6, 17, 6, "#").rect(22, 5, 25, 5, "#").rect(30, 6, 35, 6, "#").rect(41, 5, 45, 5, "#").rect(3, 6, 7, 6, "#");
  for (const [c, r] of [[5, 5], [15, 5], [23, 4], [32, 5], [43, 4], [20, 8], [38, 8], [48, 8]]) g.put("o", c, r);
  for (const c of [10, 11, 27, 28, 37, 49]) g.put("^", c, 8);
  return g.rows();
}

export const LEVELS: string[][] = [level1(), level2(), level3()];

export interface BounceInput {
  left: boolean;
  right: boolean;
  /** true while the jump button is held; a fresh press queues a jump for the next bounce */
  jump: boolean;
}

export type BounceEvent = "bounce" | "jump" | "ring" | "die" | "complete" | "won" | "over";

export interface BounceState {
  level: number;
  map: string[];
  cols: number;
  ball: { x: number; y: number; vx: number; vy: number };
  start: { x: number; y: number };
  collected: Set<string>;
  totalRings: number;
  lives: number;
  score: number;
  status: "playing" | "complete" | "won" | "over";
  jumpBuf: number;
  prevJump: boolean;
}

export function newBounce(level = 0, lives = 3, score = 0): BounceState {
  const map = LEVELS[level];
  let start = { x: 1.5, y: 8.5 };
  let rings = 0;
  map.forEach((row, r) =>
    [...row].forEach((ch, c) => {
      if (ch === "S") start = { x: c + 0.5, y: r + 0.5 };
      if (ch === "o") rings++;
    }),
  );
  return {
    level, map, cols: map[0].length, ball: { x: start.x, y: start.y, vx: 0, vy: 0 }, start,
    collected: new Set(), totalRings: rings, lives, score, status: "playing", jumpBuf: 0, prevJump: false,
  };
}

const cell = (s: BounceState, c: number, r: number) => (r < 0 || r >= ROWS ? "." : c < 0 || c >= s.cols ? "#" : s.map[r][c]);
export const isSolid = (s: BounceState, c: number, r: number) => cell(s, c, r) === "#";
export const ringsLeft = (s: BounceState) => s.totalRings - s.collected.size;

function respawn(s: BounceState) {
  s.ball = { x: s.start.x, y: s.start.y, vx: 0, vy: 0 };
  s.jumpBuf = 0;
}

function die(s: BounceState, ev: BounceEvent[]) {
  s.lives -= 1;
  if (s.lives <= 0) {
    s.status = "over";
    ev.push("over");
  } else {
    ev.push("die");
    respawn(s);
  }
}

function collide(s: BounceState, ev: BounceEvent[]) {
  const b = s.ball;
  for (let r = Math.floor(b.y - R); r <= Math.floor(b.y + R); r++) {
    for (let c = Math.floor(b.x - R); c <= Math.floor(b.x + R); c++) {
      if (!isSolid(s, c, r)) continue;
      const nx = Math.max(c, Math.min(c + 1, b.x));
      const ny = Math.max(r, Math.min(r + 1, b.y));
      let dx = b.x - nx;
      let dy = b.y - ny;
      let d = Math.hypot(dx, dy);
      if (d >= R) continue;
      if (d < 1e-6) {
        dx = 0;
        dy = -1;
        d = 1;
      }
      const ux = dx / d;
      const uy = dy / d;
      b.x += ux * (R - d);
      b.y += uy * (R - d);
      if (uy < -0.6 && b.vy > 0) {
        // Landing: always bounce a little; a queued jump makes it a big one.
        if (s.jumpBuf > 0) {
          b.vy = -JUMP;
          s.jumpBuf = 0;
          ev.push("jump");
        } else {
          b.vy = -BOUNCE;
          ev.push("bounce");
        }
      } else if (uy > 0.6 && b.vy < 0) {
        b.vy = 0;
      } else if (Math.abs(ux) > 0.6) {
        b.vx = -b.vx * 0.3;
      }
    }
  }
}

function step1(s: BounceState, input: BounceInput, dt: number, ev: BounceEvent[]) {
  const b = s.ball;
  if (input.jump && !s.prevJump) s.jumpBuf = JUMP_BUFFER;
  s.prevJump = input.jump;
  s.jumpBuf = Math.max(0, s.jumpBuf - dt);

  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (dir) b.vx += dir * ACCEL * dt;
  else b.vx -= Math.sign(b.vx) * Math.min(Math.abs(b.vx), FRICTION * dt);
  b.vx = Math.max(-MAX_VX, Math.min(MAX_VX, b.vx));
  b.vy += GRAVITY * dt;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  collide(s, ev);

  // Rings
  s.map.forEach((row, r) => {
    for (let c = Math.max(0, Math.floor(b.x - 1)); c <= Math.min(s.cols - 1, Math.floor(b.x + 1)); c++) {
      if (row[c] !== "o") continue;
      const key = `${c},${r}`;
      if (s.collected.has(key)) continue;
      if (Math.hypot(b.x - (c + 0.5), b.y - (r + 0.5)) < R + 0.35) {
        s.collected.add(key);
        s.score += 10;
        ev.push("ring");
      }
    }
  });

  // Spikes and the exit
  const r0 = Math.floor(b.y);
  const c0 = Math.floor(b.x);
  for (let r = r0 - 1; r <= r0 + 1; r++) {
    for (let c = c0 - 1; c <= c0 + 1; c++) {
      const ch = cell(s, c, r);
      if (ch === "^") {
        const nx = Math.max(c + 0.15, Math.min(c + 0.85, b.x));
        const ny = Math.max(r + 0.5, Math.min(r + 1, b.y));
        if (Math.hypot(b.x - nx, b.y - ny) < R * 0.85) {
          die(s, ev);
          return;
        }
      }
      if (ch === "E" && ringsLeft(s) === 0 && Math.abs(b.x - (c + 0.5)) < 0.7 && Math.abs(b.y - (r + 0.5)) < 0.9) {
        s.score += 50;
        if (s.level + 1 >= LEVELS.length) {
          s.status = "won";
          ev.push("won");
        } else {
          s.status = "complete";
          ev.push("complete");
        }
        return;
      }
    }
  }
  if (b.y > ROWS + 2) die(s, ev);
}

export function stepBounce(s: BounceState, input: BounceInput, dt: number): BounceEvent[] {
  const ev: BounceEvent[] = [];
  if (s.status !== "playing") return ev;
  // Small fixed sub-steps keep the ball from tunnelling through floors.
  const n = Math.max(1, Math.ceil(dt / (1 / 120)));
  for (let i = 0; i < n && s.status === "playing"; i++) step1(s, input, dt / n, ev);
  return ev;
}
