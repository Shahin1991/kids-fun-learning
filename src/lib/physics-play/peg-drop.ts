import type { SportLevel } from "@/lib/sports3d/types";

/**
 * Peg Drop (a kids' Plinko): balls bounce down through rows of pegs into numbered cups, and the
 * cups add up. Board units are metres-ish: x across (centre 0), y up from the floor.
 */

export const BOARD = {
  halfW: 4,
  height: 12.5,
  ballR: 0.3,
  pegR: 0.14,
  /** Height of the dividers between cups */
  slotH: 1.5,
  /** Where the dropper holds the next ball */
  dropY: 11.6,
};

/** Cup values from left to right: small numbers in the middle (where most balls land), bigger at the edges. */
export const SLOT_VALUES: Record<SportLevel, number[]> = {
  easy: [3, 2, 2, 1, 2, 2, 3],
  medium: [5, 3, 2, 1, 2, 3, 5],
  hard: [10, 5, 2, 1, 2, 5, 10],
};

const ROWS: Record<SportLevel, number> = { easy: 6, medium: 8, hard: 10 };

/** Peg centres: staggered rows, 1 apart, so a ball always fits between two pegs but not past the outer wall. */
export function pegLayout(level: SportLevel): { x: number; y: number }[] {
  const rows = ROWS[level];
  const bottom = BOARD.slotH + 1.0;
  const top = BOARD.dropY - 1.6;
  const gap = (top - bottom) / (rows - 1);
  const pegs: { x: number; y: number }[] = [];
  for (let r = 0; r < rows; r++) {
    const y = top - r * gap;
    const odd = r % 2 === 1;
    for (let x = odd ? -3 : -3.5; x <= (odd ? 3 : 3.5) + 1e-6; x += 1) pegs.push({ x, y });
  }
  return pegs;
}

export const slotWidth = () => (BOARD.halfW * 2) / SLOT_VALUES.easy.length;

/** Which cup (index) an x position falls in. */
export function slotAt(x: number): number {
  const n = SLOT_VALUES.easy.length;
  return Math.max(0, Math.min(n - 1, Math.floor((x + BOARD.halfW) / slotWidth())));
}

/** x of each divider between cups (not the outer walls). */
export function dividerXs(): number[] {
  const n = SLOT_VALUES.easy.length;
  return Array.from({ length: n - 1 }, (_, i) => -BOARD.halfW + (i + 1) * slotWidth());
}

/** Keeps the dropper inside the walls. */
export function clampDrop(x: number): number {
  const lim = BOARD.halfW - BOARD.ballR - 0.05;
  return Math.max(-lim, Math.min(lim, x));
}
