import { gaussian, type SportLevel } from "./types";

/** Dartboard geometry (metres, standard board) and scoring. x is right, y is up, origin at the bull. */

export const SEGMENTS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

export const RINGS = {
  bull: 0.00635,
  outerBull: 0.0159,
  trebleIn: 0.099,
  trebleOut: 0.107,
  doubleIn: 0.162,
  doubleOut: 0.17,
  board: 0.225,
};

export interface DartScore {
  points: number;
  label: string;
  /** Segment number (25 for the bull, 0 for a miss). */
  segment: number;
  multiplier: 0 | 1 | 2 | 3;
}

/** Index into SEGMENTS of the wedge containing angle (from straight up, clockwise). */
export function segmentAt(x: number, y: number): number {
  const deg = ((Math.atan2(x, y) * 180) / Math.PI + 360 + 9) % 360;
  return SEGMENTS[Math.floor(deg / 18) % 20];
}

export function dartScore(x: number, y: number): DartScore {
  const r = Math.hypot(x, y);
  if (r <= RINGS.bull) return { points: 50, label: "Bullseye!", segment: 25, multiplier: 2 };
  if (r <= RINGS.outerBull) return { points: 25, label: "Bull 25", segment: 25, multiplier: 1 };
  if (r > RINGS.doubleOut) return { points: 0, label: "Missed", segment: 0, multiplier: 0 };
  const seg = segmentAt(x, y);
  if (r >= RINGS.doubleIn) return { points: seg * 2, label: `Double ${seg}`, segment: seg, multiplier: 2 };
  if (r >= RINGS.trebleIn && r <= RINGS.trebleOut) return { points: seg * 3, label: `Treble ${seg}`, segment: seg, multiplier: 3 };
  return { points: seg, label: String(seg), segment: seg, multiplier: 1 };
}

/** "20 + 5 + 60 = 85": the sum is the maths practice. */
export function sumLine(points: number[]): string {
  if (points.length < 2) return "";
  return `${points.join(" + ")} = ${points.reduce((a, b) => a + b, 0)}`;
}

/** Where the robot's dart lands: it aims at the bull (easy) or treble 20 and wobbles by level. */
export function robotDart(level: SportLevel, rand: () => number = Math.random): { x: number; y: number } {
  const aim = level === "easy" ? { x: 0, y: 0 } : { x: 0, y: (RINGS.trebleIn + RINGS.trebleOut) / 2 };
  const sd = level === "easy" ? 0.075 : level === "medium" ? 0.045 : 0.022;
  return { x: aim.x + gaussian(rand) * sd, y: aim.y + gaussian(rand) * sd };
}

/** Hand wobble on the reticle while aiming: radius (m) by level. */
export const SWAY: Record<SportLevel, number> = { easy: 0.006, medium: 0.014, hard: 0.024 };
