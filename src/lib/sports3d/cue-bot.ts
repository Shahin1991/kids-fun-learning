import { simulateShot, speedForDistance, stopDistance, type Disc, type SimEvents, type Table } from "./physics2d";
import { gaussian, type SportLevel } from "./types";

/**
 * Robot player for the table games. It lists "ghost ball" shots (aim so the object ball is
 * sent straight at a pocket) plus a few plain direct hits, then actually simulates each one with
 * the same physics the table uses and keeps the one the game's rules score best. Work is split
 * into small slices so the frame rate holds while Robo "thinks".
 */

export interface Shot {
  /** Cue/striker start position (carrom may slide it along the baseline). */
  x: number;
  y: number;
  angle: number;
  speed: number;
}

export interface CandidateInput {
  discs: Disc[];
  table: Table;
  cueId: number;
  /** Disc ids the rules want hit. */
  targets: number[];
  /** Cue start positions to try. */
  starts: { x: number; y: number }[];
  maxSpeed: number;
}

export function candidateShots({ discs, table, cueId, targets, starts, maxSpeed }: CandidateInput): Shot[] {
  const cue = discs.find((d) => d.id === cueId)!;
  const out: { shot: Shot; cost: number }[] = [];
  for (const start of starts) {
    for (const id of targets) {
      const t = discs.find((d) => d.id === id && d.active);
      if (!t) continue;
      const toT = Math.hypot(t.x - start.x, t.y - start.y);
      for (const p of table.pockets) {
        const px = p.x - t.x;
        const py = p.y - t.y;
        const dp = Math.hypot(px, py);
        const gx = t.x - (px / dp) * (cue.r + t.r);
        const gy = t.y - (py / dp) * (cue.r + t.r);
        const dx = gx - start.x;
        const dy = gy - start.y;
        const dc = Math.hypot(dx, dy);
        if (dc < 1e-6) continue;
        const cos = (dx * px + dy * py) / (dc * dp);
        if (cos < 0.3) continue; // cuts thinner than ~72° are too hard
        const vObj = speedForDistance(table, dp + t.r * 3) * 1.15;
        const transfer = cos * ((1 + table.discE) / 2) * ((2 * cue.m) / (cue.m + t.m));
        const vHit = vObj / Math.max(0.2, transfer);
        const speed = Math.min(maxSpeed, speedForDistance(table, dc + stopDistance(table, vHit)));
        out.push({ shot: { x: start.x, y: start.y, angle: Math.atan2(dy, dx), speed }, cost: (1 - cos) * 3 + dc + dp });
      }
      // Plain direct hits as a fallback (safe contact, maybe a lucky pot).
      for (const f of [0.35, 0.6]) {
        out.push({ shot: { x: start.x, y: start.y, angle: Math.atan2(t.y - start.y, t.x - start.x), speed: maxSpeed * f }, cost: 6 + toT });
      }
    }
  }
  out.sort((a, b) => a.cost - b.cost);
  return out.map((o) => o.shot);
}

export interface PlanResult {
  shot: Shot;
  value: number;
}

/** Incrementally evaluates candidate shots; call `work()` once per frame until it returns a result. */
export class BotPlanner {
  private i = 0;
  private best: PlanResult | null = null;

  constructor(
    private discs: Disc[],
    private table: Table,
    private cueId: number,
    private candidates: Shot[],
    private evaluate: (final: Disc[], events: SimEvents, shot: Shot) => number,
    private limit = 48,
  ) {}

  work(budget = 6): PlanResult | null {
    const end = Math.min(this.candidates.length, this.limit, this.i + budget);
    for (; this.i < end; this.i++) {
      const shot = this.candidates[this.i];
      const start = this.discs.map((d) => (d.id === this.cueId ? { ...d, x: shot.x, y: shot.y, vx: Math.cos(shot.angle) * shot.speed, vy: Math.sin(shot.angle) * shot.speed } : d));
      const { discs, events } = simulateShot(start, this.table, 16);
      const value = this.evaluate(discs, events, shot);
      if (!this.best || value > this.best.value) this.best = { shot, value };
    }
    if (this.i >= Math.min(this.candidates.length, this.limit)) return this.best ?? { shot: this.candidates[0] ?? { x: 0, y: 0, angle: Math.PI / 2, speed: 1 }, value: 0 };
    return null;
  }
}

/** Human-like error on the chosen shot. */
export function wobbleShot(shot: Shot, level: SportLevel, rand: () => number = Math.random): Shot {
  const deg = level === "easy" ? 3.2 : level === "medium" ? 1.4 : 0.45;
  return { ...shot, angle: shot.angle + (gaussian(rand) * deg * Math.PI) / 180, speed: shot.speed * (1 + gaussian(rand) * (level === "hard" ? 0.03 : 0.07)) };
}
