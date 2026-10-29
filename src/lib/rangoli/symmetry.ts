/** Pure helpers for Rangoli Maker: every stroke is repeated around the centre, kaleidoscope style. */

export interface Pt {
  x: number;
  y: number;
}

/**
 * The point and its copies: rotated into each of `n` equal parts around the centre, and (with `mirror`)
 * reflected inside each part too, so one stroke draws 2n matching petals.
 */
export function symmetricPoints(p: Pt, c: Pt, n: number, mirror: boolean): Pt[] {
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  const r = Math.hypot(dx, dy);
  const a = Math.atan2(dy, dx);
  const out: Pt[] = [];
  for (let k = 0; k < n; k++) {
    const turn = (k * 2 * Math.PI) / n;
    out.push({ x: c.x + r * Math.cos(a + turn), y: c.y + r * Math.sin(a + turn) });
    if (mirror) out.push({ x: c.x + r * Math.cos(-a + turn), y: c.y + r * Math.sin(-a + turn) });
  }
  return out;
}

export const SYMMETRY = [4, 6, 8] as const;

/** Traditional rangoli colours: marigold, vermilion, turmeric, rose, leaf, peacock, white chalk. */
export const RANGOLI_COLORS = ["#ff9f1c", "#e63946", "#ffd23f", "#ff5fa2", "#38b000", "#118ab2", "#7b2cbf", "#ffffff"];

/** Kolam-style guide dots: rings of dots around the centre, in a square box of `size`. */
export function guideDots(size: number, rings = 4): Pt[] {
  const c = size / 2;
  const out: Pt[] = [{ x: c, y: c }];
  for (let ring = 1; ring <= rings; ring++) {
    const n = ring * 8;
    const r = (ring * size * 0.45) / rings;
    for (let k = 0; k < n; k++) out.push({ x: c + r * Math.cos((k * 2 * Math.PI) / n), y: c + r * Math.sin((k * 2 * Math.PI) / n) });
  }
  return out;
}
