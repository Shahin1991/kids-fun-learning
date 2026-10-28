/**
 * "Paint the letter" tracing for scripts without hand-made stroke skeletons (Hindi, Arabic).
 * The letter and the child's paint are both read as alpha masks on the same small grid.
 */

/** Grid cells per side that coverage is measured on: fine enough for Arabic dots, cheap to read. */
export const GRID = 96;

/** How much of the letter must be painted before it counts as traced. */
export const DONE_AT = 0.8;

const on = (alpha: ArrayLike<number>, i: number) => alpha[i] >= 128;

/** Fraction (0..1) of letter cells that are painted. `letter` and `paint` are alpha values per cell. */
export function coverage(letter: ArrayLike<number>, paint: ArrayLike<number>): number {
  let inside = 0;
  let painted = 0;
  for (let i = 0; i < letter.length; i++) {
    if (!on(letter, i)) continue;
    inside++;
    if (on(paint, i)) painted++;
  }
  return inside ? painted / inside : 0;
}

/**
 * Where to point the child next: the unpainted letter cell nearest the middle of everything still unpainted,
 * so the hint sits on the biggest gap and always on the letter itself. Null when nothing is left.
 */
export function hintCell(letter: ArrayLike<number>, paint: ArrayLike<number>, size = GRID): { x: number; y: number } | null {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (let i = 0; i < letter.length; i++) {
    if (on(letter, i) && !on(paint, i)) {
      sx += i % size;
      sy += Math.floor(i / size);
      n++;
    }
  }
  if (!n) return null;
  const cx = sx / n;
  const cy = sy / n;
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < letter.length; i++) {
    if (!on(letter, i) || on(paint, i)) continue;
    const d = (i % size - cx) ** 2 + (Math.floor(i / size) - cy) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return { x: best % size, y: Math.floor(best / size) };
}

/** Alpha channel of RGBA pixel data. */
export function alphaOf(rgba: ArrayLike<number>): Uint8Array {
  const out = new Uint8Array(rgba.length / 4);
  for (let i = 0; i < out.length; i++) out[i] = rgba[i * 4 + 3];
  return out;
}
