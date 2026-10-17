import { gaussian, type SportLevel } from "./types";

/** Archery target (122 cm World Archery face) scoring, wind and robot shots. Metres, origin at the centre. */

export const FACE_R = 0.61;
export const RING_W = 0.061;
export const DISTANCE = 18; // a kids' indoor-ish distance
export const ARROW_SPEED = 45; // m/s
export const GRAVITY = 9.81;

/** Ring colours from the outside in, two rings per colour. */
export const RING_COLOURS = [0xf4f4f4, 0xf4f4f4, 0x222222, 0x222222, 0x2f8ee6, 0x2f8ee6, 0xe8423a, 0xe8423a, 0xffd23f, 0xffd23f];

export function arrowScore(x: number, y: number): { points: number; inner: boolean; label: string } {
  const r = Math.hypot(x, y);
  if (r > FACE_R) return { points: 0, inner: false, label: "Missed" };
  const points = Math.min(10, 10 - Math.floor(r / RING_W));
  const inner = r <= RING_W / 2;
  return { points, inner, label: inner ? "Perfect 10! ✨" : points === 10 ? "Ten!" : String(points) };
}

export const flightTime = (distance = DISTANCE, speed = ARROW_SPEED) => distance / speed;

/** Sideways push on the arrow from a crosswind (m/s, + is to the right) over its flight. */
export function windDrift(wind: number, distance = DISTANCE): number {
  // Tuned for play, not ballistics: a strong 4 m/s wind moves the arrow about two rings.
  return wind * 0.03 * (distance / DISTANCE);
}

/** Wind for an end, by level: a gentle breeze on easy, up to a strong 4 m/s on hard. Never quite still. */
export function rollWind(level: SportLevel, rand: () => number = Math.random): number {
  const max = level === "easy" ? 1 : level === "medium" ? 2.5 : 4;
  const w = Math.round((rand() * 2 - 1) * max * 2) / 2;
  return w === 0 ? (rand() < 0.5 ? -0.5 : 0.5) : w;
}

/** Gusts: how much the wind can change (m/s, sd) between arrows and while an arrow flies. */
export const GUST: Record<SportLevel, number> = { easy: 0.15, medium: 0.35, hard: 0.6 };

/** The wind for the next arrow: drifts a little from the end's wind, kept within ±1 m/s of it. */
export function nextGust(base: number, level: SportLevel, rand: () => number = Math.random): number {
  const g = Math.max(-1, Math.min(1, gaussian(rand) * GUST[level] * 1.5));
  return Math.round((base + g) * 10) / 10;
}

export const ARCHERY_SWAY: Record<SportLevel, number> = { easy: 0.012, medium: 0.03, hard: 0.05 };

/** Unseen release error (m, sd) on top of the visible sway: no two arrows fly quite the same. */
export const ARCHERY_SCATTER: Record<SportLevel, number> = { easy: 0.012, medium: 0.025, hard: 0.04 };

/** Where an arrow lands for a given sight point: sway, release error, the wind (with a gust during flight) and drop. */
export function arrowLanding(
  sight: { x: number; y: number },
  draw: number,
  wind: number,
  level: SportLevel,
  rand: () => number = Math.random,
): { x: number; y: number; drift: number } {
  const clamp2 = (g: number) => Math.max(-2, Math.min(2, g));
  const sd = ARCHERY_SCATTER[level];
  const drift = windDrift(wind + clamp2(gaussian(rand)) * GUST[level]);
  const drop = (1 - draw * draw) * 0.9; // an early release flies slower and drops below the sight
  return { x: sight.x + clamp2(gaussian(rand)) * sd + drift, y: sight.y + clamp2(gaussian(rand)) * sd - drop, drift };
}

/** Aim-off help: where to put the sight so the wind carries the arrow to the gold. */
export function aimOff(wind: number): { x: number; y: number } {
  return { x: -windDrift(wind), y: 0 };
}

/** Robot aims at the centre, mostly corrects for wind, and wobbles by level. */
export function robotArrow(level: SportLevel, wind: number, rand: () => number = Math.random): { x: number; y: number } {
  const sd = level === "easy" ? 0.16 : level === "medium" ? 0.09 : 0.045;
  const correction = level === "hard" ? 0.95 : 0.7;
  return { x: gaussian(rand) * sd + windDrift(wind) * (1 - correction), y: gaussian(rand) * sd };
}
