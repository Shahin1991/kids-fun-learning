import type { SportLevel } from "@/lib/sports3d/types";

/**
 * Catapult: pull back a slingshot and knock down block towers. Side view; x across, y up from the
 * ground. Pure layout and rules, shared by the engine and the tests.
 */

export type BlockKind = "cube" | "plank" | "post" | "star";

export interface TowerBlock {
  kind: BlockKind;
  /** Centre */
  x: number;
  y: number;
  w: number;
  h: number;
}

export const SIZES: Record<BlockKind, { w: number; h: number }> = {
  cube: { w: 0.9, h: 0.9 },
  plank: { w: 2.4, h: 0.3 },
  post: { w: 0.35, h: 1.4 },
  star: { w: 0.7, h: 0.7 },
};

export const SLING = { x: -7, restY: 2.2, ballR: 0.35, maxPull: 2.4, power: 8.5 };
export const SHOTS_PER_TOWER = 3;
export const POINTS: Record<BlockKind, number> = { cube: 1, plank: 1, post: 1, star: 5 };

/** Tower distance from the slingshot by level: further is harder to hit. */
export const TOWER_X: Record<SportLevel, number> = { easy: 3.5, medium: 5, hard: 6.5 };

/** How many dots of the flight path are shown while aiming. */
export const PREVIEW_DOTS: Record<SportLevel, number> = { easy: 28, medium: 12, hard: 5 };

type Row = { kind: BlockKind; dx: number }[];

/** Each design is a list of rows from the ground up; every row sits on the tallest block of the row below. */
const DESIGNS: Row[][] = [
  // Simple stack
  [[{ kind: "cube", dx: 0 }], [{ kind: "cube", dx: 0 }], [{ kind: "cube", dx: 0 }]],
  // Gate: two posts, a plank across, a cube on top
  [[{ kind: "post", dx: -0.9 }, { kind: "post", dx: 0.9 }], [{ kind: "plank", dx: 0 }], [{ kind: "cube", dx: 0 }]],
  // Pyramid
  [
    [{ kind: "cube", dx: -0.95 }, { kind: "cube", dx: 0 }, { kind: "cube", dx: 0.95 }],
    [{ kind: "cube", dx: -0.475 }, { kind: "cube", dx: 0.475 }],
    [{ kind: "cube", dx: 0 }],
  ],
  // Two-storey gate
  [
    [{ kind: "post", dx: -0.9 }, { kind: "post", dx: 0.9 }],
    [{ kind: "plank", dx: 0 }],
    [{ kind: "post", dx: -0.9 }, { kind: "post", dx: 0.9 }],
    [{ kind: "plank", dx: 0 }],
  ],
  // Wall
  [
    [{ kind: "cube", dx: -0.475 }, { kind: "cube", dx: 0.475 }],
    [{ kind: "cube", dx: -0.475 }, { kind: "cube", dx: 0.475 }],
    [{ kind: "cube", dx: -0.475 }, { kind: "cube", dx: 0.475 }],
  ],
];

export const DESIGN_COUNT = DESIGNS.length;

/** Blocks of tower `index` (cycles through the designs), resting exactly on each other, with a star on top. */
export function towerLayout(index: number, level: SportLevel): TowerBlock[] {
  const rows = DESIGNS[index % DESIGNS.length];
  const cx = TOWER_X[level];
  const out: TowerBlock[] = [];
  let base = 0;
  for (const row of rows) {
    let top = base;
    for (const b of row) {
      const s = SIZES[b.kind];
      out.push({ kind: b.kind, x: cx + b.dx, y: base + s.h / 2, w: s.w, h: s.h });
      top = Math.max(top, base + s.h);
    }
    base = top;
  }
  const st = SIZES.star;
  out.push({ kind: "star", x: cx, y: base + st.h / 2, w: st.w, h: st.h });
  return out;
}

/** Launch velocity for a pull-back (pouch rest minus finger), clamped to the band's stretch. */
export function launchVelocity(pullX: number, pullY: number): { vx: number; vy: number; pull: number } {
  const len = Math.hypot(pullX, pullY);
  const k = len > SLING.maxPull ? SLING.maxPull / len : 1;
  return { vx: pullX * k * SLING.power, vy: pullY * k * SLING.power, pull: Math.min(len, SLING.maxPull) };
}

/** Points along a thrown ball's path (no air drag), stopping at the ground. */
export function trajectory(x: number, y: number, vx: number, vy: number, g: number, count: number, dt = 0.06): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 1; i <= count; i++) {
    const t = i * dt;
    const py = y + vy * t - 0.5 * g * t * t;
    if (py < 0) break;
    pts.push({ x: x + vx * t, y: py });
  }
  return pts;
}

/** A block counts as knocked down once it has dropped well below where it started or tipped over. */
export function isDown(startY: number, y: number, tilt: number): boolean {
  return y < startY - 0.4 || Math.abs(tilt) > 0.6;
}
