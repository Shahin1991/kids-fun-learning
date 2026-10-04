/** City Bloxx: a crane swings a block; drop it so it lands on the tower. Pure logic, no DOM. */
export const W = 120;
export const H = 150;
export const GROUND = 142;
export const BW = 26;
export const BH = 10;
export const LIVES = 3;
/** Distance above the tower top where the block hangs. */
const HANG = 56;
const GRAVITY = 260;

export interface Block {
  x: number; // centre
  kind: number; // look of the building floor
}

export interface Falling {
  x: number;
  y: number; // top edge
  vy: number;
}

export interface BloxxState {
  tower: Block[];
  base: number;
  falling: Falling | null;
  /** Crane swing phase in radians. */
  phase: number;
  /** Crane swing amplitude (px) */
  amp: number;
  speed: number;
  score: number;
  lives: number;
  combo: number;
  cam: number;
  /** Sideways wobble of the tower, decays to 0 */
  wobble: number;
  /** Blocks that fell off the tower (for a little animation) */
  lost: { x: number; y: number; vx: number; vy: number; rot: number }[];
  over: boolean;
}

export type BloxxEvent = "land" | "perfect" | "miss" | "over" | null;

export const topY = (s: BloxxState) => GROUND - s.tower.length * BH;
export const hookX = (s: BloxxState) => W / 2 + Math.sin(s.phase) * s.amp;
export const hookY = (s: BloxxState) => topY(s) - HANG;

export function newBloxx(): BloxxState {
  return { tower: [], base: W / 2, falling: null, phase: 0, amp: 30, speed: 1.6, score: 0, lives: LIVES, combo: 0, cam: 0, wobble: 0, lost: [], over: false };
}

/** The x the next block must land near: the previous block, or the foundation. */
export const targetX = (s: BloxxState) => (s.tower.length ? s.tower[s.tower.length - 1].x : s.base);

export function drop(s: BloxxState): boolean {
  if (s.over || s.falling) return false;
  s.falling = { x: hookX(s), y: hookY(s), vy: 0 };
  return true;
}

function harder(s: BloxxState) {
  const n = s.tower.length;
  s.speed = Math.min(3.4, 1.6 + n * 0.07);
  s.amp = Math.min(46, 30 + n * 1.2);
}

export function update(s: BloxxState, dt: number): BloxxEvent {
  if (!s.over) s.phase += s.speed * dt;
  s.wobble *= Math.pow(0.02, dt);
  // camera follows the tower upwards
  const want = Math.min(0, topY(s) - 84);
  s.cam += (want - s.cam) * Math.min(1, dt * 4);

  for (const l of s.lost) {
    l.vy += GRAVITY * dt;
    l.x += l.vx * dt;
    l.y += l.vy * dt;
    l.rot += l.vx * dt * 0.05;
  }
  s.lost = s.lost.filter((l) => l.y < GROUND + 200);

  const f = s.falling;
  if (!f) return null;
  f.vy += GRAVITY * dt;
  f.y += f.vy * dt;
  const landY = topY(s) - BH;
  if (f.y < landY) return null;

  s.falling = null;
  const off = f.x - targetX(s);
  const overlap = BW - Math.abs(off);
  if (overlap < BW * 0.4) {
    // Too far off: the block topples away.
    s.lives -= 1;
    s.combo = 0;
    s.lost.push({ x: f.x, y: landY, vx: off >= 0 ? 40 : -40, vy: -30, rot: 0 });
    if (s.lives <= 0) {
      s.over = true;
      return "over";
    }
    return "miss";
  }
  s.tower.push({ x: f.x, kind: s.tower.length % 5 });
  const perfect = Math.abs(off) <= 2.5;
  s.combo = perfect ? s.combo + 1 : 0;
  s.score += 1 + (perfect ? 1 + Math.min(s.combo, 5) : 0);
  s.wobble = Math.min(6, Math.abs(off) * 0.5 + (perfect ? 0 : 1));
  if (perfect) s.tower[s.tower.length - 1].x = targetXBefore(s, f.x);
  harder(s);
  return perfect ? "perfect" : "land";
}

/** A perfect drop snaps to the block below so towers can stand straight. */
function targetXBefore(s: BloxxState, fallback: number): number {
  const n = s.tower.length;
  return n >= 2 ? s.tower[n - 2].x : n === 1 ? s.base : fallback;
}
