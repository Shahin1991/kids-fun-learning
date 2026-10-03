import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GLYPHS, type Stroke } from "./glyphs";

export const TUBE_RADIUS = 0.11;

/** Inserts points so straight runs stay straight when the curve is smoothed; drops repeats. */
function densify(stroke: Stroke, step = 0.08): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  const push = (x: number, y: number) => {
    const last = out[out.length - 1];
    if (!last || Math.hypot(last.x - x, last.y - y) > 1e-4) out.push(new THREE.Vector3(x, y, 0));
  };
  for (let i = 0; i < stroke.length - 1; i++) {
    const [x0, y0] = stroke[i];
    const [x1, y1] = stroke[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let k = 0; k < n; k++) push(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n);
  }
  const [lx, ly] = stroke[stroke.length - 1];
  push(lx, ly);
  return out;
}

/** One chunky, rounded-tube mesh per character. */
export function buildGlyphGeometry(ch: string): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (const stroke of GLYPHS[ch] ?? GLYPHS.O) {
    const pts = densify(stroke);
    if (pts.length < 2) continue;
    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    parts.push(new THREE.TubeGeometry(curve, pts.length * 2, TUBE_RADIUS, 10, false));
    for (const p of [pts[0], pts[pts.length - 1]]) parts.push(new THREE.SphereGeometry(TUBE_RADIUS, 12, 10).translate(p.x, p.y, 0));
  }
  const merged = mergeGeometries(parts);
  parts.forEach((g) => g.dispose());
  return merged;
}
