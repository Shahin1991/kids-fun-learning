import * as THREE from "three";

/** Pure maths for magnetic tiles: shapes, hinge frames and which edges are still free. */
export type TileShape = "square" | "triangle" | "rect";
export type P2 = [number, number];

export const SHAPE_DEFS: Record<TileShape, { label: string; verts: P2[] }> = {
  square: { label: "Square", verts: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]] },
  triangle: { label: "Triangle", verts: [[-0.5, 0], [0.5, 0], [0, 0.866]] },
  rect: { label: "Big rectangle", verts: [[-0.5, -1], [0.5, -1], [0.5, 1], [-0.5, 1]] },
};

/** Fold choices, as the inside angle between the two panels. */
export const FOLDS = [
  { id: "flat", label: "Flat", angle: 180 },
  { id: "open", label: "Open", angle: 120 },
  { id: "wall", label: "Wall", angle: 90 },
  { id: "tent", label: "Tent", angle: 70 },
  { id: "pyramid", label: "Pyramid", angle: 55 },
] as const;
export type FoldId = (typeof FOLDS)[number]["id"];

export interface Frame {
  origin: THREE.Vector3;
  x: THREE.Vector3;
  y: THREE.Vector3;
  z: THREE.Vector3;
}

export interface Edge {
  a: THREE.Vector3;
  b: THREE.Vector3;
  mid: THREE.Vector3;
  len: number;
  /** In-plane direction pointing away from the tile */
  out: THREE.Vector3;
}

/** The polygon rewritten so edge `k` lies on the x axis, centred, with the tile at +y. */
export function edgePolygon(shape: TileShape, k: number): P2[] {
  const v = SHAPE_DEFS[shape].verts;
  const n = v.length;
  const a = v[k % n];
  const b = v[(k + 1) % n];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const e: P2 = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  const inward: P2 = [-e[1], e[0]];
  const mid: P2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const out: P2[] = [];
  for (let i = 0; i < n; i++) {
    const p = v[(k + i) % n];
    const rx = p[0] - mid[0];
    const ry = p[1] - mid[1];
    out.push([rx * e[0] + ry * e[1], rx * inward[0] + ry * inward[1]]);
  }
  return out;
}

export function edgeLength(shape: TileShape, k: number): number {
  const v = SHAPE_DEFS[shape].verts;
  const a = v[k % v.length];
  const b = v[(k + 1) % v.length];
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

/** Which of a shape's edges best matches a hinge of length `len` (first on ties). */
export function bestEdge(shape: TileShape, len: number): number {
  let best = 0;
  let bd = Infinity;
  for (let k = 0; k < SHAPE_DEFS[shape].verts.length; k++) {
    const d = Math.abs(edgeLength(shape, k) - len);
    if (d < bd - 1e-6) {
      bd = d;
      best = k;
    }
  }
  return best;
}

export function frameMatrix(f: Frame): THREE.Matrix4 {
  return new THREE.Matrix4().makeBasis(f.x, f.y, f.z).setPosition(f.origin);
}

/** A tile lying flat on the floor with its polygon's +y pointing away from the viewer. */
export function floorFrame(x: number, z: number, lift = 0.03): Frame {
  return { origin: new THREE.Vector3(x, lift, z), x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 0, -1), z: new THREE.Vector3(0, 1, 0) };
}

export function worldEdges(poly: P2[], f: Frame): Edge[] {
  const pts = poly.map(([px, py]) => f.origin.clone().addScaledVector(f.x, px).addScaledVector(f.y, py));
  return pts.map((a, i) => {
    const b = pts[(i + 1) % pts.length];
    const dir = b.clone().sub(a);
    const len = dir.length();
    dir.divideScalar(len);
    return { a, b, mid: a.clone().add(b).multiplyScalar(0.5), len, out: dir.clone().cross(f.z).normalize() };
  });
}

/**
 * Frame for a tile hinged on `edge` of a tile whose normal is `parentNormal`.
 * `foldDeg` is the inside angle between panels (180 = flat); `side` flips which way it folds.
 */
export function hingeFrame(edge: Edge, parentNormal: THREE.Vector3, foldDeg: number, side: 1 | -1): Frame {
  const phi = ((180 - foldDeg) * Math.PI) / 180 * side;
  const d = edge.out.clone().multiplyScalar(Math.cos(phi)).addScaledVector(parentNormal, Math.sin(phi)).normalize();
  const x = edge.out.clone().cross(parentNormal).normalize();
  const z = x.clone().cross(d).normalize();
  return { origin: edge.mid.clone(), x, y: d, z };
}

/** True when two edges are the same hinge line (so the edge is already used). */
export function sameEdge(a: Edge, b: Edge): boolean {
  if (a.mid.distanceTo(b.mid) > 0.1) return false;
  return Math.abs(a.b.clone().sub(a.a).normalize().dot(b.b.clone().sub(b.a).normalize())) > 0.95;
}

/** Inset a convex polygon by `t` on every side (for the tile's frame border). */
export function insetPolygon(poly: P2[], t: number): P2[] {
  const n = poly.length;
  // signed area to know the winding
  let area = 0;
  for (let i = 0; i < n; i++) area += poly[i][0] * poly[(i + 1) % n][1] - poly[(i + 1) % n][0] * poly[i][1];
  const s = area >= 0 ? 1 : -1;
  const lines = poly.map((p, i) => {
    const q = poly[(i + 1) % n];
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const dx = (q[0] - p[0]) / len;
    const dy = (q[1] - p[1]) / len;
    const nx = -dy * s;
    const ny = dx * s;
    return { px: p[0] + nx * t, py: p[1] + ny * t, dx, dy };
  });
  return poly.map((_, i) => {
    const l0 = lines[(i + n - 1) % n];
    const l1 = lines[i];
    const det = l0.dx * l1.dy - l0.dy * l1.dx;
    const u = ((l1.px - l0.px) * l1.dy - (l1.py - l0.py) * l1.dx) / det;
    return [l0.px + l0.dx * u, l0.py + l0.dy * u] as P2;
  });
}
