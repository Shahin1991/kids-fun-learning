/**
 * Tiny deterministic 2D physics for sliding discs and rolling balls (carrom, snooker).
 *
 * A general 3D engine (cannon-es) tunnels and loses contacts at cue-ball speeds and makes
 * friction against the table surface awkward, so table games use their own circle solver:
 * sub-stepped so nothing moves more than a fraction of a radius per step, surface friction as a
 * constant deceleration plus a little speed-proportional drag, impulse collisions with
 * restitution, axis-aligned cushions, and circular pocket capture areas. Pure data in, pure data
 * out, so the robot can run whole shots ahead of time to choose what to play.
 */

export interface Disc {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  m: number;
  /** False once potted. */
  active: boolean;
}

export interface Pocket {
  x: number;
  y: number;
  r: number;
}

export interface Table {
  halfW: number;
  halfH: number;
  pockets: Pocket[];
  /** Restitution against the cushions. */
  cushionE: number;
  /** Restitution between discs. */
  discE: number;
  /** Constant surface deceleration (units/s²). */
  decel: number;
  /** Speed-proportional drag (1/s), shortens the long slow tail. */
  drag: number;
  /** Below this speed a disc stops. */
  stopSpeed: number;
}

export interface SimEvents {
  hits: { a: number; b: number; speed: number }[];
  cushions: { a: number; speed: number }[];
  pots: { a: number; pocket: number }[];
}

export const emptyEvents = (): SimEvents => ({ hits: [], cushions: [], pots: [] });

export function cloneDiscs(discs: Disc[]): Disc[] {
  return discs.map((d) => ({ ...d }));
}

export function anyMoving(discs: Disc[]): boolean {
  return discs.some((d) => d.active && (d.vx !== 0 || d.vy !== 0));
}

/** Advances the simulation by dt seconds, appending what happened to `ev`. */
export function simStep(discs: Disc[], table: Table, dt: number, ev: SimEvents = emptyEvents()): SimEvents {
  let vmax = 0;
  let rmin = Infinity;
  for (const d of discs) {
    if (!d.active) continue;
    vmax = Math.max(vmax, Math.hypot(d.vx, d.vy));
    rmin = Math.min(rmin, d.r);
  }
  if (vmax === 0) return ev;
  const steps = Math.min(200, Math.max(1, Math.ceil((vmax * dt) / (rmin * 0.25))));
  const h = dt / steps;
  for (let s = 0; s < steps; s++) subStep(discs, table, h, ev);
  return ev;
}

function subStep(discs: Disc[], t: Table, h: number, ev: SimEvents) {
  // Surface friction and movement.
  for (const d of discs) {
    if (!d.active) continue;
    const speed = Math.hypot(d.vx, d.vy);
    if (speed === 0) continue;
    const next = speed - (t.decel + t.drag * speed) * h;
    if (next <= t.stopSpeed) {
      d.vx = 0;
      d.vy = 0;
      continue;
    }
    const k = next / speed;
    d.vx *= k;
    d.vy *= k;
    d.x += d.vx * h;
    d.y += d.vy * h;
  }

  // Pockets come before cushions so a disc running into a pocket mouth drops instead of bouncing.
  for (const d of discs) {
    if (!d.active) continue;
    for (let p = 0; p < t.pockets.length; p++) {
      const pk = t.pockets[p];
      if (Math.hypot(d.x - pk.x, d.y - pk.y) < pk.r) {
        d.active = false;
        d.vx = 0;
        d.vy = 0;
        d.x = pk.x;
        d.y = pk.y;
        ev.pots.push({ a: d.id, pocket: p });
        break;
      }
    }
  }

  // Cushions.
  for (const d of discs) {
    if (!d.active) continue;
    if (d.x - d.r < -t.halfW && d.vx < 0) {
      d.x = -t.halfW + d.r;
      ev.cushions.push({ a: d.id, speed: -d.vx });
      d.vx = -d.vx * t.cushionE;
    } else if (d.x + d.r > t.halfW && d.vx > 0) {
      d.x = t.halfW - d.r;
      ev.cushions.push({ a: d.id, speed: d.vx });
      d.vx = -d.vx * t.cushionE;
    }
    if (d.y - d.r < -t.halfH && d.vy < 0) {
      d.y = -t.halfH + d.r;
      ev.cushions.push({ a: d.id, speed: -d.vy });
      d.vy = -d.vy * t.cushionE;
    } else if (d.y + d.r > t.halfH && d.vy > 0) {
      d.y = t.halfH - d.r;
      ev.cushions.push({ a: d.id, speed: d.vy });
      d.vy = -d.vy * t.cushionE;
    }
  }

  // Disc–disc impulses.
  for (let i = 0; i < discs.length; i++) {
    const a = discs[i];
    if (!a.active) continue;
    for (let j = i + 1; j < discs.length; j++) {
      const b = discs[j];
      if (!b.active) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const min = a.r + b.r;
      const d2 = dx * dx + dy * dy;
      if (d2 >= min * min) continue;
      const dist = Math.sqrt(d2) || 1e-9;
      const nx = dx / dist;
      const ny = dy / dist;
      // Push apart in proportion to the other's mass.
      const overlap = min - dist;
      const inv = 1 / a.m + 1 / b.m;
      a.x -= nx * overlap * (1 / a.m / inv);
      a.y -= ny * overlap * (1 / a.m / inv);
      b.x += nx * overlap * (1 / b.m / inv);
      b.y += ny * overlap * (1 / b.m / inv);
      const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (vn >= 0) continue;
      const jImp = (-(1 + t.discE) * vn) / inv;
      a.vx -= (jImp / a.m) * nx;
      a.vy -= (jImp / a.m) * ny;
      b.vx += (jImp / b.m) * nx;
      b.vy += (jImp / b.m) * ny;
      ev.hits.push({ a: a.id, b: b.id, speed: -vn });
    }
  }
}

/** Runs a whole shot to rest on a copy (or for at most maxT seconds) and returns the final discs and events. */
export function simulateShot(discs: Disc[], table: Table, maxT = 20, dt = 1 / 60): { discs: Disc[]; events: SimEvents } {
  const copy = cloneDiscs(discs);
  const events = emptyEvents();
  for (let t = 0; t < maxT && anyMoving(copy); t += dt) simStep(copy, table, dt, events);
  return { discs: copy, events };
}

/** First disc the given disc touched in a list of events, or null. */
export function firstContact(events: SimEvents, id: number): number | null {
  for (const h of events.hits) {
    if (h.a === id) return h.b;
    if (h.b === id) return h.a;
  }
  return null;
}

export interface RayHit {
  /** Distance travelled by the moving disc's centre. */
  dist: number;
  /** Disc hit, or null for a cushion. */
  disc: number | null;
  /** Unit direction the struck disc will leave in (disc hits only). */
  nx: number;
  ny: number;
}

/** Where a disc rolling from (x, y) in direction (dx, dy) first touches another disc or a cushion. Used for the aim guide. */
export function castDisc(discs: Disc[], table: Table, from: Disc, dx: number, dy: number): RayHit {
  let best: RayHit = { dist: Infinity, disc: null, nx: 0, ny: 0 };
  for (const d of discs) {
    if (!d.active || d.id === from.id) continue;
    const R = d.r + from.r;
    const ox = d.x - from.x;
    const oy = d.y - from.y;
    const proj = ox * dx + oy * dy;
    if (proj <= 0) continue;
    const perp2 = ox * ox + oy * oy - proj * proj;
    if (perp2 > R * R) continue;
    const dist = proj - Math.sqrt(R * R - perp2);
    if (dist < best.dist && dist >= -1e-6) {
      const cx = from.x + dx * dist;
      const cy = from.y + dy * dist;
      const len = Math.hypot(d.x - cx, d.y - cy) || 1;
      best = { dist: Math.max(0, dist), disc: d.id, nx: (d.x - cx) / len, ny: (d.y - cy) / len };
    }
  }
  // Cushions.
  const walls: number[] = [];
  if (dx > 0) walls.push((table.halfW - from.r - from.x) / dx);
  if (dx < 0) walls.push((-table.halfW + from.r - from.x) / dx);
  if (dy > 0) walls.push((table.halfH - from.r - from.y) / dy);
  if (dy < 0) walls.push((-table.halfH + from.r - from.y) / dy);
  const wall = Math.max(0, Math.min(...walls));
  if (wall < best.dist) best = { dist: wall, disc: null, nx: 0, ny: 0 };
  return best;
}

/** How far a disc starting at speed v slides before stopping: v' = -(a + k v). */
export function stopDistance(table: Table, v: number): number {
  const a = table.decel;
  const k = table.drag;
  return k === 0 ? (v * v) / (2 * a) : v / k - (a / (k * k)) * Math.log(1 + (k * v) / a);
}

/** Initial speed so a disc slides exactly `dist` before stopping. */
export function speedForDistance(table: Table, dist: number): number {
  let lo = 0;
  let hi = 100;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (stopDistance(table, mid) < dist) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
