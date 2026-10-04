import type { Stroke } from "@/lib/parade/glyphs";

export interface Bead {
  x: number;
  y: number;
  /** index of the stroke this bead belongs to */
  stroke: number;
}

/** Evenly spaced beads along every stroke, in drawing order, always including both ends. */
export function sampleStrokes(strokes: Stroke[], step = 0.14): Bead[] {
  const beads: Bead[] = [];
  strokes.forEach((stroke, si) => {
    let carry = 0;
    let last: [number, number] | null = null;
    const push = (x: number, y: number) => {
      beads.push({ x, y, stroke: si });
      last = [x, y];
    };
    push(stroke[0][0], stroke[0][1]);
    for (let i = 1; i < stroke.length; i++) {
      const [x0, y0] = stroke[i - 1];
      const [x1, y1] = stroke[i];
      const len = Math.hypot(x1 - x0, y1 - y0);
      let d = step - carry;
      while (d <= len) {
        push(x0 + ((x1 - x0) * d) / len, y0 + ((y1 - y0) * d) / len);
        d += step;
      }
      carry = len - (d - step);
    }
    const end = stroke[stroke.length - 1];
    if (last && Math.hypot(end[0] - last[0], end[1] - last[1]) > step * 0.4) push(end[0], end[1]);
  });
  return beads;
}
