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

/** Wind for an end, by level: none for easy. */
export function rollWind(level: SportLevel, rand: () => number = Math.random): number {
  const max = level === "easy" ? 0 : level === "medium" ? 2 : 4;
  return Math.round((rand() * 2 - 1) * max * 2) / 2;
}

export const ARCHERY_SWAY: Record<SportLevel, number> = { easy: 0.012, medium: 0.03, hard: 0.05 };

/** Robot aims at the centre, mostly corrects for wind, and wobbles by level. */
export function robotArrow(level: SportLevel, wind: number, rand: () => number = Math.random): { x: number; y: number } {
  const sd = level === "easy" ? 0.16 : level === "medium" ? 0.09 : 0.045;
  const correction = level === "hard" ? 0.95 : 0.7;
  return { x: gaussian(rand) * sd + windDrift(wind) * (1 - correction), y: gaussian(rand) * sd };
}
