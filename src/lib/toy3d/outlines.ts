import * as THREE from "three";

type Pt = [number, number];

/** Polygon outlines in a [-1, 1] box, one per sorter shape id. */
export const OUTLINES: Record<string, Pt[] | "circle"> = {
  circle: "circle",
  square: [[-0.82, -0.82], [0.82, -0.82], [0.82, 0.82], [-0.82, 0.82]],
  triangle: [[-1, -0.78], [1, -0.78], [0, 0.95]],
  star: Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? 0.45 : 1;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    return [Math.cos(a) * r, -Math.sin(a) * r] as Pt;
  }),
  diamond: [[0, 1], [0.78, 0], [0, -1], [-0.78, 0]],
};

/** Closed shape with rounded corners (quadratic fillets); `scale` grows or shrinks the outline. */
export function outlineShape(id: string, scale = 1, radius = 0.16): THREE.Shape {
  const o = OUTLINES[id] ?? OUTLINES.circle;
  const shape = new THREE.Shape();
  if (o === "circle") {
    shape.absarc(0, 0, 0.95 * scale, 0, Math.PI * 2, false);
    return shape;
  }
  const pts = o.map(([x, y]) => [x * scale, y * scale] as Pt);
  const n = pts.length;
  const r = radius * scale;
  const toward = (a: Pt, b: Pt, d: number): Pt => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const k = Math.min(d, len * 0.45) / len;
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  };
  const start = toward(pts[0], pts[1], r);
  shape.moveTo(start[0], start[1]);
  for (let i = 1; i <= n; i++) {
    const p = pts[i % n];
    const before = toward(p, pts[(i - 1) % n], r);
    const after = toward(p, pts[(i + 1) % n], r);
    shape.lineTo(before[0], before[1]);
    shape.quadraticCurveTo(p[0], p[1], after[0], after[1]);
  }
  shape.closePath();
  return shape;
}
