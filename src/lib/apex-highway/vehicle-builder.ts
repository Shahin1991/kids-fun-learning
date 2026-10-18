import * as THREE from "three";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { BoxSpec, ShapeSpec, VehicleKind, VehicleSpec } from "./vehicle-specs";

/** Geometry shared between all vehicles of the same spec. */
export class GeometryCache {
  private map = new Map<string, THREE.BufferGeometry>();
  get(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
    let g = this.map.get(key);
    if (!g) {
      g = make();
      this.map.set(key, g);
    }
    return g;
  }
  dispose() {
    this.map.forEach((g) => g.dispose());
    this.map.clear();
  }
}

let glowTexture: THREE.CanvasTexture | null = null;
export function getGlowTexture(): THREE.CanvasTexture {
  if (!glowTexture) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.3, "rgba(255,255,255,0.4)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    glowTexture = new THREE.CanvasTexture(c);
  }
  return glowTexture;
}
/** Soft rounded-rectangle shadow that grounds a vehicle on the road. */
let shadowTexture: THREE.CanvasTexture | null = null;
function getShadowTexture(): THREE.CanvasTexture {
  if (!shadowTexture) {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 128;
    const g = c.getContext("2d")!;
    // Dense core under the body fading to a soft halo that peeks out around it
    g.filter = "blur(7px)";
    g.fillStyle = "rgba(0,0,0,0.55)";
    g.beginPath();
    g.roundRect(7, 8, 50, 112, 18);
    g.fill();
    g.fillStyle = "#000";
    g.beginPath();
    g.roundRect(14, 16, 36, 96, 12);
    g.fill();
    shadowTexture = new THREE.CanvasTexture(c);
  }
  return shadowTexture;
}

/**
 * Lamp flare: a white-hot core, an exponential halo, a thin horizontal streak and a few faint rays,
 * which reads as a bright light seen through a camera lens rather than a fuzzy dot. Tinted per sprite.
 */
let flareTexture: THREE.CanvasTexture | null = null;
function getFlareTexture(): THREE.CanvasTexture {
  if (!flareTexture) {
    const S = 256;
    const c = document.createElement("canvas");
    c.width = c.height = S;
    const g = c.getContext("2d")!;
    const m = S / 2;
    g.globalCompositeOperation = "lighter";
    const halo = g.createRadialGradient(m, m, 0, m, m, m);
    halo.addColorStop(0, "rgba(255,255,255,0.8)");
    halo.addColorStop(0.07, "rgba(255,255,255,0.32)");
    halo.addColorStop(0.25, "rgba(255,255,255,0.07)");
    halo.addColorStop(0.6, "rgba(255,255,255,0.015)");
    halo.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = halo;
    g.fillRect(0, 0, S, S);
    // Anamorphic streak
    g.save();
    g.translate(m, m);
    g.scale(1, 0.035);
    const streak = g.createRadialGradient(0, 0, 0, 0, 0, m);
    streak.addColorStop(0, "rgba(255,255,255,0.55)");
    streak.addColorStop(0.5, "rgba(255,255,255,0.12)");
    streak.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = streak;
    g.beginPath();
    g.arc(0, 0, m, 0, Math.PI * 2);
    g.fill();
    g.restore();
    // Faint star rays
    for (const a of [Math.PI / 4, -Math.PI / 4, Math.PI / 2]) {
      g.save();
      g.translate(m, m);
      g.rotate(a);
      g.scale(1, 0.012);
      const ray = g.createRadialGradient(0, 0, 0, 0, 0, m * 0.45);
      ray.addColorStop(0, "rgba(255,255,255,0.12)");
      ray.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = ray;
      g.beginPath();
      g.arc(0, 0, m * 0.45, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    // Hot core
    const core = g.createRadialGradient(m, m, 0, m, m, S * 0.045);
    core.addColorStop(0, "rgba(255,255,255,1)");
    core.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = core;
    g.fillRect(0, 0, S, S);
    flareTexture = new THREE.CanvasTexture(c);
  }
  return flareTexture;
}

/** Headlight beam: bright near the lamp, fading with distance and toward the edges. */
let beamTexture: THREE.CanvasTexture | null = null;
function getBeamTexture(): THREE.CanvasTexture {
  if (!beamTexture) {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 256;
    const g = c.getContext("2d")!;
    const img = g.createImageData(64, 256);
    for (let y = 0; y < 256; y++) {
      // The canvas bottom (v = 0) sits at the lamp; the far end of the beam is at the top
      const along = Math.pow(y / 255, 1.6);
      for (let x = 0; x < 64; x++) {
        const across = 1 - Math.abs(x / 63 - 0.5) * 2;
        const a = along * Math.pow(Math.max(0, across), 1.8);
        const i = (y * 64 + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
        img.data[i + 3] = Math.round(a * 255);
      }
    }
    g.putImageData(img, 0, 0);
    beamTexture = new THREE.CanvasTexture(c);
  }
  return beamTexture;
}

export function disposeGlowTexture() {
  flareTexture?.dispose();
  flareTexture = null;
  beamTexture?.dispose();
  beamTexture = null;
  shadowTexture?.dispose();
  shadowTexture = null;
  labelTextures.forEach((t) => t.dispose());
  labelTextures.clear();
  glowTexture?.dispose();
  glowTexture = null;
}

const labelTextures = new Map<string, THREE.CanvasTexture>();
function getLabelTexture(text: string, color = "#ffffff"): THREE.CanvasTexture {
  const key = `${text}|${color}`;
  let t = labelTextures.get(key);
  if (!t) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 80;
    const g = c.getContext("2d")!;
    g.font = "bold 62px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = color;
    g.fillText(text, 256, 44);
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    labelTextures.set(key, t);
  }
  return t;
}

type Pt = [number, number];

/** Lamp colours for the unlit (light-emitting) parts, off and fully on. */
const LAMP = {
  projOff: new THREE.Color(0x2b2f36),
  projOn: new THREE.Color(0xffffff),
  tailOff: new THREE.Color(0x4a070b),
  tailOn: new THREE.Color(0xff2a22),
  brakeOff: new THREE.Color(0x24040a),
  brakeOn: new THREE.Color(0xff1a10),
};
/**
 * Headlamp design follows what each kind of vehicle really uses: sports cars a slim LED blade,
 * saloons a wide lamp with an LED brow, SUVs a running-light bar over the beams, pickups a big
 * C-clamp, vans tall upright lamps, and buses and fire engines twin round lamps with a big amber.
 */
type HeadStyle = "blade" | "slim" | "swept" | "split" | "rect" | "clamp" | "tall" | "round";
const HEAD_STYLE: Record<VehicleKind, HeadStyle> = {
  coupe: "blade",
  sedan: "swept",
  "exec-saloon": "slim",
  "family-suv": "blade",
  "big-4x4": "rect",
  police: "swept",
  "police-uae": "swept",
  suv: "split",
  pickup: "clamp",
  van: "tall",
  ambulance: "tall",
  bus: "round",
  fire: "round",
};
const HEAD_SIZE: Record<HeadStyle, { w: number; h: number }> = {
  blade: { w: 0.6, h: 0.075 },
  slim: { w: 0.62, h: 0.1 },
  swept: { w: 0.5, h: 0.14 },
  split: { w: 0.5, h: 0.2 },
  rect: { w: 0.36, h: 0.17 },
  clamp: { w: 0.48, h: 0.2 },
  tall: { w: 0.3, h: 0.26 },
  round: { w: 0.56, h: 0.2 },
};
/** Where each vehicle's headlamps sit on its nose (found by probing the body once per kind). */
const headMounts = new Map<VehicleKind, { x: number; y: number; z: number; w: number; h: number; toe: number; tilt: number }>();

/** Headlamp outline (x outward, y up), evenly sampled so light guides can follow any stretch of it. */
function headOutlineFor(style: HeadStyle, w: number, h: number): Pt[] {
  // Level top edges (a falling inner edge reads as an angry frown); the outer lower corner is cut back on cars.
  const pts: Pt[] =
    style === "blade" ? [[-w / 2, -h / 2], [-w / 2, h / 2], [w / 2, h / 2], [w / 2, h * 0.1], [w * 0.3, -h / 2]]
    : style === "swept" ? [[-w / 2, -h / 2], [-w / 2, h / 2], [w / 2, h / 2], [w / 2, -h * 0.05], [w * 0.25, -h / 2]]
    : style === "slim" ? [[-w / 2, -h / 2], [-w / 2, h / 2], [w / 2, h / 2], [w / 2, -h * 0.1], [w * 0.35, -h / 2]]
    : [[-w / 2, -h / 2], [-w / 2, h / 2], [w / 2, h / 2], [w / 2, -h / 2]];
  const r = style === "blade" ? h * 0.4 : style === "slim" ? h * 0.35 : style === "swept" ? h * 0.3 : style === "tall" ? 0.07 : 0.04;
  return roundedClosed(pts, r).getSpacedPoints(96).map((p) => [p.x, p.y] as Pt);
}

const _dir = new THREE.Vector3();
const _pos = new THREE.Vector3();
const _toCam = new THREE.Vector3();

/** The longest run of consecutive outline points (wrapping round the closed outline) that pass `keep`. */
function longestRun(pts: Pt[], keep: (p: Pt) => boolean): Pt[] {
  // drop repeated points (a closed outline repeats its first point), which would break a tube's frames
  const uniq = pts.filter((p, i) => {
    const q = pts[(i + 1) % pts.length];
    return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-4;
  });
  const n = uniq.length;
  let best: Pt[] = [];
  for (let s = 0; s < n; s++) {
    if (!keep(uniq[s]) || keep(uniq[(s - 1 + n) % n])) continue;
    const run: Pt[] = [];
    for (let i = 0; i < n && keep(uniq[(s + i) % n]); i++) run.push(uniq[(s + i) % n]);
    if (run.length > best.length) best = run;
  }
  return best.length >= 2 ? best : uniq;
}
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Appends an open chain of points with rounded interior corners (quadratic fillets). */
function roundedChain(shape: THREE.Shape, pts: Pt[], radius: number) {
  for (let i = 1; i < pts.length - 1; i++) {
    const [p0, p1, p2] = [pts[i - 1], pts[i], pts[i + 1]];
    const d0 = Math.hypot(p0[0] - p1[0], p0[1] - p1[1]);
    const d2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const r = Math.min(radius, d0 * 0.45, d2 * 0.45);
    shape.lineTo(p1[0] + ((p0[0] - p1[0]) / d0) * r, p1[1] + ((p0[1] - p1[1]) / d0) * r);
    shape.quadraticCurveTo(p1[0], p1[1], p1[0] + ((p2[0] - p1[0]) / d2) * r, p1[1] + ((p2[1] - p1[1]) / d2) * r);
  }
  shape.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
}

/** Closed polygon with every corner rounded. */
function roundedClosed(pts: Pt[], radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const n = pts.length;
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = mid(pts[n - 1], pts[0]);
  shape.moveTo(start[0], start[1]);
  roundedChain(shape, [start, ...pts, start].map((p) => p as Pt), radius);
  shape.closePath();
  return shape;
}

interface Arch {
  u: number;
  r: number;
  cy: number;
  /** Flat-topped trapezoid (modern SUVs) instead of a semicircle */
  square?: boolean;
}

/** Arch opening from its front foot on the line y0 to its rear foot (front is +u). */
function archOutline(a: Arch, y0: number): Pt[] {
  if (a.square) {
    // Angular trapezoid: steep sides, a long flat top and chamfered top corners
    return [
      [a.u + a.r * 1.04, y0],
      [a.u + a.r * 0.98, a.cy + a.r * 0.45],
      [a.u + a.r * 0.62, a.cy + a.r * 0.98],
      [a.u - a.r * 0.62, a.cy + a.r * 0.98],
      [a.u - a.r * 0.98, a.cy + a.r * 0.45],
      [a.u - a.r * 1.04, y0],
    ];
  }
  const a0 = Math.asin(Math.max(-1, Math.min(1, (y0 - a.cy) / a.r)));
  const pts: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = a0 + ((Math.PI - 2 * a0) * i) / 16;
    pts.push([a.u + a.r * Math.cos(t), a.cy + a.r * Math.sin(t)]);
  }
  return pts;
}

/** Appends an arch opening to a shape that is running along its bottom edge toward the rear. */
function cutArch(shape: THREE.Shape, a: Arch, y0: number) {
  if (!a.square) {
    const a0 = Math.asin(Math.max(-1, Math.min(1, (y0 - a.cy) / a.r)));
    shape.lineTo(a.u + a.r * Math.cos(a0), y0);
    shape.absarc(a.u, a.cy, a.r, a0, Math.PI - a0, false);
    return;
  }
  const pts = archOutline(a, y0);
  shape.lineTo(pts[0][0], pts[0][1]);
  roundedChain(shape, pts, a.r * 0.18);
}

/** Lower body: rounded profile with wheel arches cut into the bottom edge. */
function bodyShape(pts: Pt[], radius: number, arches: Arch[]): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  roundedChain(shape, pts, radius);
  const y0 = pts[0][1];
  for (const a of [...arches].sort((m, n) => n.u - m.u)) cutArch(shape, a, y0);
  shape.closePath();
  return shape;
}

/** A band of width `t` hugging an arch opening (the black plastic surround on SUVs). */
function archSurround(a: Arch, y0: number, t: number): THREE.Shape {
  const inner = archOutline(a, y0);
  const outer = archOutline({ ...a, r: a.r + t }, y0);
  const shape = new THREE.Shape();
  // Round arches are already finely sampled; square ones get the same fillets as the opening
  const run = (pts: Pt[], r: number) => (a.square ? roundedChain(shape, pts, r) : pts.slice(1).forEach(([x, y]) => shape.lineTo(x, y)));
  shape.moveTo(outer[0][0], outer[0][1]);
  run(outer, (a.r + t) * 0.18);
  const back = [...inner].reverse();
  shape.lineTo(back[0][0], back[0][1]);
  run(back, a.r * 0.18);
  shape.closePath();
  return shape;
}

/** Body-narrowing settings with the original values as defaults. */
function shapeOf(spec: VehicleSpec): Required<ShapeSpec> {
  const s = spec.shape ?? {};
  return {
    planTaper: s.planTaper ?? 0.16,
    planPower: s.planPower ?? 3,
    tumblehome: s.tumblehome ?? 0.06,
    cabinTaper: s.cabinTaper ?? 0.2,
    cabinPlan: s.cabinPlan ?? 0.1,
    bodyRadius: s.bodyRadius ?? 0.2,
    cabinRadius: s.cabinRadius ?? 0.32,
  };
}

/** Turn signals: one side, or both (hazard lights). */
export type Signal = "off" | "left" | "right" | "hazard";

export interface BuiltVehicle {
  group: THREE.Group;
  spec: VehicleSpec;
  spinGroups: THREE.Group[];
  steerGroups: THREE.Group[];
  steeringWheel: THREE.Object3D | null;
  headAnchors: THREE.Object3D[];
  setPaint: (hex: string) => void;
  /** night 0..1 switches headlights on as it gets dark; braking flares the tail lights */
  setLights: (night: number, braking: boolean) => void;
  /** Flashes the light bar (no-op for vehicles without one) and blinks the indicators */
  tick: (timeSec: number, flashing: boolean) => void;
  /** Which indicators blink (the blinking itself happens in tick) */
  setIndicator: (s: Signal) => void;
  dispose: () => void;
}

// Local space: forward is -Z, lateral is X, up is Y. Profile x maps to -z.
export function buildVehicle(spec: VehicleSpec, color: string, cache: GeometryCache, detailed = true): BuiltVehicle {
  const group = new THREE.Group();
  const mats: THREE.Material[] = [];
  const mat = <T extends THREE.Material>(m: T): T => {
    mats.push(m);
    return m;
  };
  const paint = mat(new THREE.MeshPhysicalMaterial({ color, metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 }));
  // Tinted, reflective glass: the cabin reads as glass from outside without showing bare interior boxes.
  const glass = mat(new THREE.MeshPhysicalMaterial({ color: 0x0e1a24, metalness: 0.35, roughness: 0.04, transparent: true, opacity: 0.9, envMapIntensity: 1.6 }));
  const chrome = mat(new THREE.MeshStandardMaterial({ color: 0xdfe6ea, metalness: 1, roughness: 0.15 }));
  const dark = mat(new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.8 }));
  const tyre = mat(new THREE.MeshStandardMaterial({ color: 0x1b1b1f, roughness: 0.85 }));
  const rim = mat(new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.9, roughness: 0.25 }));
  const interior = mat(new THREE.MeshStandardMaterial({ color: 0x2b2d33, roughness: 0.9 }));

  const L = spec.length;
  const W = spec.width;
  const box = (key: string, w: number, h: number, d: number) => cache.get(`${spec.id}:${key}`, () => new THREE.BoxGeometry(w, h, d));
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, shadow = false) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = shadow;
    group.add(mesh);
    return mesh;
  };

  const hw = W / 2;
  const halfL = L / 2;
  const shaped = !spec.boxes;
  const sh = shapeOf(spec);
  const st = spec.style ?? {};
  /** Nose/tail narrowing of the body at z (1 = full width) */
  const bodyPlan = (z: number) => 1 - sh.planTaper * Math.pow(Math.min(1, Math.abs(z) / halfL), sh.planPower);
  const bodyYs = spec.body.map((p) => p[1]);
  const bodyBottom = Math.min(...bodyYs);
  const bodyTop = Math.max(...bodyYs);
  const R = spec.wheelRadius;
  // Square arches hug the tyre more closely than round ones (their corners already add room)
  const archR = Math.min(R * (spec.style?.arches === "square" ? 1.12 : 1.22), bodyTop - 0.05 - R);
  const hasArches = archR >= R * 1.05;

  const extrude = (key: string, shape: () => THREE.Shape, width: number, bevel: number, deform?: (v: THREE.Vector3) => void) =>
    cache.get(`${spec.id}:${key}`, () => {
      const geo = new THREE.ExtrudeGeometry(shape(), { depth: width - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 10 });
      geo.translate(0, 0, -(width - bevel * 2) / 2);
      geo.rotateY(Math.PI / 2);
      if (deform) {
        const pos = geo.getAttribute("position");
        const v = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i);
          deform(v);
          pos.setXYZ(i, v.x, v.y, v.z);
        }
      }
      return toCreasedNormals(geo, Math.PI / 4);
    });

  // Real bodies narrow toward the roof and the nose/tail and have a slightly crowned hood.
  const bodyDeform = (v: THREE.Vector3) => {
    const t = clamp01((v.y - bodyBottom) / (bodyTop - bodyBottom));
    v.x *= (1 - sh.tumblehome * smooth(0.5, 1, t)) * bodyPlan(v.z);
    if (t > 0.9) v.y += 0.04 * (1 - Math.min(1, (v.x / hw) ** 2));
  };
  const cabin0 = spec.cabin;
  const roofTop = cabin0 ? cabin0[1][1] : 0;
  const cabinTaper = (y: number) => (shaped && cabin0 ? 1 - sh.cabinTaper * clamp01((y - cabin0[0][1]) / (roofTop - cabin0[0][1])) : 1);
  const cabinPlan = (z: number) => 1 - sh.cabinPlan * Math.pow(Math.min(1, Math.abs(z) / halfL), 3);
  const cabinDeform = (v: THREE.Vector3) => {
    const plan = cabinPlan(v.z);
    v.x *= cabinTaper(v.y) * plan;
  };

  const archSpec: Arch[] = hasArches ? [-1, 1].map((sz) => ({ u: sz * (spec.wheelbase / 2), r: archR, cy: R, square: st.arches === "square" })) : [];
  const bodyMesh = add(extrude("body", () => bodyShape(spec.body, shaped ? sh.bodyRadius : 0.14, archSpec), W - 0.1, 0.06, shaped ? bodyDeform : undefined), paint, 0, 0, 0, true);
  // Upper bodies (van, bus, ambulance, fire engine): rounded, raked profiles that lean in
  // toward the roof, taper at the ends and have a slightly crowned roof.
  const boxInset = (b: BoxSpec, y: number) => 0.07 * smooth(0.4, 1, clamp01((y - b.y0) / (b.y1 - b.y0)));
  for (const b of spec.boxes ?? []) {
    const fr = b.rakeFront ?? 0;
    const rr = b.rakeRear ?? 0;
    const prof: Pt[] = [[b.x0, b.y0], [b.x1, b.y0], [b.x1 - fr, b.y1], [b.x0 + rr, b.y1]];
    const bh = b.y1 - b.y0;
    const bl = b.x1 - b.x0;
    const mid = (b.x0 + b.x1) / 2;
    const deform = (v: THREE.Vector3) => {
      const t = clamp01((v.y - b.y0) / bh);
      const end = Math.min(1, Math.abs(v.z + mid) / (bl / 2));
      v.x *= (1 - boxInset(b, v.y)) * (1 - 0.1 * Math.pow(end, 3));
      if (t > 0.85) v.y += 0.07 * (1 - Math.min(1, (v.x / hw) ** 2)) * smooth(0.85, 1, t);
    };
    add(extrude(`upper${b.x0}`, () => roundedClosed(prof, Math.min(0.5, bh * 0.28)), W - 0.05, 0.08, deform), paint, 0, 0, 0, true);
  }

  const cabin = spec.cabin;
  if (cabin) {
    add(extrude("cabin", () => roundedClosed(cabin, shaped ? sh.cabinRadius : 0.2), W - 0.22, 0.03, shaped ? cabinDeform : undefined), glass, 0, 0, 0);
    const roofLen = cabin[2][0] - cabin[1][0];
    const roofY = cabin[1][1];
    // Painted roof skin: the top band of the glasshouse profile, a touch wider, so it wraps the glass like a real roof panel.
    const along = (a: Pt, b: Pt, y: number): Pt => [a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]), y];
    const capY = roofY - Math.min(0.16, (roofY - cabin[0][1]) * 0.3);
    const roofProf: Pt[] = [along(cabin[0], cabin[1], capY), [cabin[1][0], roofY + 0.025], [cabin[2][0], roofY + 0.025], along(cabin[3], cabin[2], capY)];
    const glassHalf = (W - 0.22) / 2;
    // Corner rounding follows the glasshouse, so a rounded fastback roof does not overhang its glass like a lid
    const roofR = shaped && spec.shape?.cabinRadius ? Math.max(0.12, sh.cabinRadius * 0.55) : 0.12;
    add(extrude("roofskin", () => roundedClosed(roofProf, roofR), W - 0.18, 0.03, shaped ? cabinDeform : undefined), paint, 0, 0, 0, true);
    // Pillars are painted strips lying on the glass surface (following its taper), not free-standing bars.
    const onGlass = (u: number, y: number, s: number) => {
      const z = -u;
      const plan = shaped ? cabinPlan(z) : 1;
      return new THREE.Vector3(s * ((glassHalf + 0.03) * cabinTaper(y) * plan + 0.005), y, z);
    };
    // `inset` moves the strip along the car so it lies inside the glass outline rather than overhanging its edge
    const strut = (a: Pt, b: Pt, s: number, width: number, inset = 0, m0: THREE.Material = paint) => {
      const p0 = onGlass(a[0] + inset, a[1], s);
      const p1 = onGlass(b[0] + inset, b[1], s);
      const len = p0.distanceTo(p1);
      const m = add(box(`strut${width}`, 0.035, 1, width), m0, (p0.x + p1.x) / 2, (p0.y + p1.y) / 2, (p0.z + p1.z) / 2);
      m.scale.y = len;
      // Basis: length along the pillar, thickness along the outward normal, width lying in the glass surface
      const dir = p1.clone().sub(p0).normalize();
      const across = new THREE.Vector3(s, 0, 0).cross(dir).normalize();
      const out = dir.clone().cross(across);
      m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(out, dir, across));
    };
    const lerpPt = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    for (const s of [-1, 1]) {
      // A- and C-pillars along the sloping edges, and a B-pillar between the doors
      const aw = shaped ? 0.09 : 0.12;
      const cw = shaped ? 0.16 : 0.12;
      strut(lerpPt(cabin[3], cabin[2], 0.15), along(cabin[3], cabin[2], capY), s, aw, -(aw / 2 + 0.1));
      strut(lerpPt(cabin[0], cabin[1], 0.15), along(cabin[0], cabin[1], capY), s, cw, cw / 2 + 0.1);
      const midU = (cabin[1][0] + cabin[2][0]) / 2 + 0.05;
      strut([midU, cabin[0][1] + 0.03], [midU, capY], s, 0.1);
      if (st.chromeWindowTrim) {
        // Bright strips framing the side glass: along its base and under the roof line
        const baseY = cabin[0][1] + 0.035;
        strut(along(cabin[0], cabin[1], baseY), along(cabin[3], cabin[2], baseY), s, 0.022, 0, chrome);
        const topY = capY - 0.012;
        strut(along(cabin[0], cabin[1], topY), along(cabin[3], cabin[2], topY), s, 0.018, 0, chrome);
      }
    }
    if (st.roofRails) {
      // Two slim rails standing on little feet near the roof edges
      const u0 = cabin[1][0] + 0.12;
      const u1 = cabin[2][0] - 0.08;
      const railY = roofY + 0.025;
      const railMat = mat(new THREE.MeshStandardMaterial({ color: 0xb0b8bf, metalness: 0.85, roughness: 0.35 }));
      for (const s of [-1, 1]) {
        const x = s * (onGlass((u0 + u1) / 2, roofY, 1).x - 0.12);
        add(box("rail", 0.045, 0.035, u1 - u0), railMat, x, railY + 0.07, -(u0 + u1) / 2);
        for (const u of [u0 + 0.04, u1 - 0.04]) add(box("railfoot", 0.05, 0.06, 0.09), dark, x, railY + 0.03, -u);
      }
    }
    if (spec.features.roofRack) {
      for (const s of [-1, 1]) add(box("rackr", 0.05, 0.05, roofLen), chrome, s * 0.7, roofY + 0.1, -(cabin[1][0] + cabin[2][0]) / 2);
      for (let i = 0; i < 3; i++) add(box("rackb", 1.4, 0.04, 0.05), chrome, 0, roofY + 0.1, -(cabin[1][0] + 0.3 + i * (roofLen - 0.6) / 2));
    }
  }
  for (const w of spec.windows ?? []) {
    const ub = (spec.boxes ?? []).find((b) => w.y0 >= b.y0 && w.y1 <= b.y1 + 1e-6 && w.x0 >= b.x0 && w.x1 <= b.x1);
    const half = (W - 0.05) / 2;
    const inAt = (y: number) => (ub ? boxInset(ub, y) : 0);
    const yMid = (w.y0 + w.y1) / 2;
    for (const s of [-1, 1]) {
      const m = add(box(`win${w.x0}`, 0.02, w.y1 - w.y0, w.x1 - w.x0), glass, s * (half * (1 - inAt(yMid)) + 0.012), yMid, -(w.x0 + w.x1) / 2);
      // Lean with the tumblehome so the glass sits flush on the curved side
      m.rotation.z = s * Math.atan((half * (inAt(w.y1) - inAt(w.y0))) / (w.y1 - w.y0));
    }
  }
  if (spec.frontGlass) {
    const g = spec.frontGlass;
    const fb = (spec.boxes ?? []).reduce<BoxSpec | null>((a, b) => (!a || b.x1 > a.x1 ? b : a), null);
    const rake = fb?.rakeFront ?? 0;
    const frac = fb ? (g.y - fb.y0) / (fb.y1 - fb.y0) : 0;
    const gm = add(box("frontglass", g.w, g.h, 0.03), glass, 0, g.y, -(g.u - rake * frac + 0.02));
    if (fb && rake) gm.rotation.x = Math.atan(rake / (fb.y1 - fb.y0));
  }
  if (spec.id === "bus") add(box("busrear", W - 0.6, 0.6, 0.03), glass, 0, 2.2, 4.5 + 0.02);

  // Where the side profile crosses height y at the nose (+1) or tail (-1); lights are mounted on that skin
  const endU = (dir: 1 | -1, y: number): number => {
    let best: number | null = null;
    const pts = spec.body;
    for (let i = 0; i < pts.length - 1; i++) {
      const [a, b] = [pts[i], pts[i + 1]];
      if ((a[1] - y) * (b[1] - y) > 0 || a[1] === b[1]) continue;
      const u = a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]);
      if (best === null || u * dir > best * dir) best = u;
    }
    // + the 0.06 bevel the extruded body adds around its outline
    return (best ?? dir * halfL) + dir * 0.06;
  };
  // Trim, door seams, handles, mirrors
  const beltY = Math.max(...spec.body.map((p) => p[1])) - 0.06;
  // Half-width of the painted body at height y / position z, mirroring bodyDeform so details sit on the skin
  const bodyHalf = (W - 0.1) / 2 + 0.06;
  const skinX = (y: number, z: number) => {
    if (!shaped) return W / 2 + 0.01;
    const t = clamp01((y - bodyBottom) / (bodyTop - bodyBottom));
    return bodyHalf * (1 - sh.tumblehome * smooth(0.5, 1, t)) * bodyPlan(z);
  };
  // Tumblehome lean so thin details lie flat against the curved flank
  const skinLean = (y: number, z: number) => Math.atan((skinX(y + 0.1, z) - skinX(y - 0.1, z)) / 0.2);
  const lowY = bodyBottom + 0.12;
  for (const s of [-1, 1]) {
    if (!shaped) add(box("trim", 0.02, 0.03, L * 0.82), chrome, s * (W / 2 + 0.01), beltY, 0);
    else {
      // Follow the narrowing at nose and tail with segments instead of one straight bar
      const zFront = -endU(1, beltY - 0.08) + 0.35;
      const zRear = -endU(-1, beltY - 0.08) - 0.35;
      const n = 8;
      const segLen = (zRear - zFront) / n;
      for (let i = 0; i < n; i++) {
        const z = zFront + (i + 0.5) * segLen;
        const seg = add(box(`trimseg${i}`, 0.02, 0.03, segLen + 0.01), chrome, s * (skinX(beltY, z) + 0.002), beltY, z);
        seg.rotation.y = s * Math.atan2(skinX(beltY, z + 0.1) - skinX(beltY, z - 0.1), 0.2);
      }
    }
    if (!detailed) continue;
    if (shaped && cabin) {
      // Door cuts: front edge under the A-pillar, rear edge under the C-pillar, optional B-pillar split
      const fu = cabin[3][0] - 0.25;
      const ru = cabin[0][0] + 0.2;
      const twoDoor = spec.id === "coupe";
      const seams = twoDoor ? [fu, ru] : [fu, (fu + ru) / 2 + 0.1, ru];
      const archTop = R + archR + 0.04;
      for (const u of seams) {
        const z = -u;
        const inArch = hasArches && spec.wheelbase / 2 - archR - 0.03 < Math.abs(u) && Math.abs(u) < spec.wheelbase / 2 + archR + 0.03;
        const y0 = inArch ? archTop : lowY;
        const h = beltY - y0;
        const m = add(box(`seam${u.toFixed(2)}`, 0.012, h, 0.014), dark, s * (skinX((y0 + beltY) / 2, z) - 0.002), (y0 + beltY) / 2, z);
        m.rotation.z = -s * skinLean((y0 + beltY) / 2, z);
      }
      // Handles sit near the rear edge of each door
      const doorRears = twoDoor ? [ru] : [seams[1], ru];
      for (const d1 of doorRears) {
        const u = d1 + 0.22;
        const z = -u;
        const y = beltY - 0.1;
        const m = add(box("handle", 0.03, 0.035, 0.18), chrome, s * (skinX(y, z) + 0.008), y, z);
        m.rotation.z = -s * skinLean(y, z);
      }
    } else {
      const seams = spec.id === "bus" ? [-1.5, 1.5] : [-0.2, 0.9];
      for (const u of seams) add(box("seam", 0.012, beltY - 0.45, 0.012), dark, s * (W / 2 + 0.01), (beltY + 0.45) / 2, -u);
      for (const u of spec.id === "bus" ? [] : [0.1, 1.2]) add(box("handle", 0.03, 0.04, 0.16), chrome, s * (W / 2 + 0.02), beltY - 0.1, -u);
    }
    add(box("mirror", 0.14, 0.1, 0.1), paint, s * (skinX(beltY + 0.2, cabin ? -(cabin[3][0] - 0.2) : 0) + 0.06), beltY + 0.2, -(cabin ? cabin[3][0] - 0.2 : spec.length / 2 - 1.2));
  }

  // Black plastic lower body and arch surrounds, a touch proud of the paint (modern SUVs)
  const plastic = mat(new THREE.MeshStandardMaterial({ color: 0x24272c, roughness: 0.92 }));
  if (st.cladding && shaped) {
    const top = bodyBottom + 0.17;
    const rearU = endU(-1, top) + 0.06;
    const frontU = endU(1, top) - 0.06;
    const prof: Pt[] = [[rearU, bodyBottom], [rearU, top], [frontU, top], [frontU, bodyBottom]];
    add(extrude("clad", () => bodyShape(prof, 0.05, archSpec), W - 0.07, 0.07, bodyDeform), plastic, 0, 0, 0, true);
    archSpec.forEach((a, i) => add(extrude(`cladarch${i}`, () => archSurround(a, bodyBottom, 0.08), W - 0.06, 0.065, bodyDeform), plastic, 0, 0, 0, true));
  }
  if (st.sideSteps && hasArches) {
    const len = spec.wheelbase - archR * 2.2 - 0.1;
    for (const s of [-1, 1]) add(box("step", 0.2, 0.05, len), dark, s * (skinX(bodyBottom, 0) - 0.02), bodyBottom - 0.04, 0, true);
  }

  // Features
  const f = spec.features;
  if (f.spoiler) {
    add(box("spoil", W - 0.3, 0.05, 0.4), paint, 0, spec.body[1][1] + 0.28, -(spec.body[1][0] + 0.25), true);
    for (const s of [-1, 1]) add(box("spoilleg", 0.06, 0.28, 0.1), dark, s * 0.6, spec.body[1][1] + 0.12, -(spec.body[1][0] + 0.25));
  }
  if (f.bed) {
    const y0 = 1.1;
    const bedBack = -spec.body[0][0] - 0; // z of tailgate (positive = rear)
    for (const s of [-1, 1]) add(box("bedside", 0.07, 0.4, 1.8), paint, s * (W / 2 - 0.05), y0 + 0.2, 1.8, true);
    add(box("bedgate", W - 0.1, 0.4, 0.07), paint, 0, y0 + 0.2, bedBack - 0.03, true);
    add(box("bedfront", W - 0.1, 0.4, 0.07), paint, 0, y0 + 0.2, 0.92);
    add(box("bedfloor", W - 0.2, 0.03, 1.8), dark, 0, y0 + 0.01, 1.8);
  }
  if (f.cargo) {
    for (const u of [-1.4, 0.0]) add(box("cargoline", W - 0.04, 0.02, 0.03), dark, 0, 1.75, -u);
    add(box("cargodoor", 0.02, 1.2, 0.02), dark, 0, 1.75, 2.66);
  }
  if (f.busUnits) {
    for (const u of [-2.4, 0, 2.4]) add(box("busunit", 1.2, 0.3, 1.4), chrome, 0, 3.25, -u);
  }
  if (f.stripe) {
    add(box("stripe", W + 0.02, 0.18, L - 0.4), mat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })), 0, 1.35, 0);
  }

  // ---- Lights ----
  // The parts that emit light are unlit and skip tone mapping, so a lit lamp burns pure white or red
  // whatever the exposure, the way real lamps look on camera. Lenses and housings stay physical so they
  // still catch reflections in daylight.
  const glowMats: THREE.SpriteMaterial[] = [];
  const headGlows: THREE.Sprite[] = [];
  const tailGlows: THREE.Sprite[] = [];
  const lightMat = (c: THREE.ColorRepresentation) => mat(new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));
  const drlMat = lightMat(0xf2f7ff); // LED daytime running light: always on
  const projMat = lightMat(LAMP.projOff); // projector cores light up with the headlights
  const tailLedMat = lightMat(LAMP.tailOff); // tail light guide
  const brakeMat = lightMat(LAMP.brakeOff); // brake panel behind the tail lens
  const tailLens = mat(new THREE.MeshPhysicalMaterial({ color: 0xa00a14, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04, transparent: true, opacity: 0.5, depthWrite: false }));
  const beamMat = mat(new THREE.MeshBasicMaterial({ map: getBeamTexture(), color: 0xfff6e0, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0, side: THREE.DoubleSide }));
  const poolMat = mat(new THREE.MeshBasicMaterial({ map: getGlowTexture(), color: 0xfff1c0, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
  const poolGeo = cache.get("beampool", () => new THREE.PlaneGeometry(3.4, 18).rotateX(-Math.PI / 2));
  const headAnchors: THREE.Object3D[] = [];
  const frontZ = -L / 2;
  const noseTop = Math.max(...spec.body.filter((p) => p[0] > halfL - 0.01).map((p) => p[1]), 0);
  const tailTop = Math.max(...spec.body.filter((p) => p[0] < -halfL + 0.01).map((p) => p[1]), 0);
  const tailY = shaped ? tailTop - 0.12 : Math.min(beltY - 0.12, 0.85);
  const planAt = (z: number) => (shaped ? bodyPlan(z) : 1);
  const tailZ = -endU(-1, tailY) + 0.02;
  // Car lamps wrap the corner; upright clusters sit right at the rear corners
  const tailX = shaped ? (W / 2 - 0.42) * planAt(tailZ) : W / 2 - 0.2;
  // Headlamps sit flush in the nose: the top just under the hood line, the outer edge clear of the
  // rounded corner, the inner edge clear of the grille, and turned to match the skin under them.
  const headStyle = HEAD_STYLE[spec.id];
  let mount = headMounts.get(spec.id);
  if (!mount) {
    const h = HEAD_SIZE[headStyle].h;
    const y = noseTop - h / 2 - 0.03;
    const outer = (shaped ? skinX(y, frontZ + 0.3) : W / 2) - 0.1;
    const w = Math.min(HEAD_SIZE[headStyle].w, outer - (W * 0.12 + 0.02) - 0.04);
    const x = outer - w / 2;
    const ray = new THREE.Raycaster();
    const surfZ = (px: number, py: number) => {
      ray.set(new THREE.Vector3(px, py, frontZ - 2), new THREE.Vector3(0, 0, 1));
      return ray.intersectObject(bodyMesh, false)[0]?.point.z ?? -endU(1, py);
    };
    mount = {
      x, y, w, h,
      z: surfZ(x, y) + 0.004,
      toe: Math.atan2(surfZ(x + w * 0.45, y) - surfZ(x - w * 0.45, y), w * 0.9),
      tilt: Math.atan2(surfZ(x, y + h * 0.45) - surfZ(x, y - h * 0.45), h * 0.9),
    };
    headMounts.set(spec.id, mount);
  }
  const { x: headX, y: headY, z: headZ, w: headW, h: headH } = mount;
  // Clear cover glass: almost invisible, but its clearcoat throws a sharp highlight
  const glassLens = mat(new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.16, depthWrite: false }));
  const reverseMat = mat(new THREE.MeshStandardMaterial({ color: 0xf4f4f4, emissive: 0xffffff, emissiveIntensity: 0.15, roughness: 0.3 }));
  // Indicators: unlit amber, one material per side so each blinks on its own (dark amber when off, like a real lens)
  const AMBER_OFF = new THREE.Color(0x4a2e00);
  const AMBER_ON = new THREE.Color(0xffa31a);
  const amberSide = [lightMat(AMBER_OFF), lightMat(AMBER_OFF)]; // [left, right]
  let sideAmber = amberSide[0];

  const lampShape = (pts: Pt[], k: number, hole = 0): THREE.Shape => {
    const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x * k, y * k)));
    if (hole) sh.holes.push(new THREE.Path(pts.map(([x, y]) => new THREE.Vector2(x * hole, y * hole)).reverse()));
    return sh;
  };
  // Lamp geometry points out along +z with its front face at z = front
  const lampGeo = (key: string, shape: THREE.Shape, depth: number, front: number, bevel = 0.012) =>
    cache.get(`${spec.id}:${key}`, () => {
      const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 6 });
      g.translate(0, 0, front - depth - bevel);
      return g;
    });
  const headOutline = headOutlineFor(headStyle, headW, headH);
  // Cars: a wide, calm LED lamp (level top, inner end tapered) that wraps round the corner.
  // Vans, buses and fire engines: an upright cluster with stacked red, amber and white segments.
  const TW = shaped ? 0.62 : 0.26;
  const TH = shaped ? 0.16 : 0.66;
  const tailOutline: Pt[] = (
    shaped
      ? roundedClosed([[-TW / 2, -TH * 0.5], [-TW / 2, TH * 0.25], [-TW * 0.3, TH * 0.5], [TW / 2, TH * 0.5], [TW / 2, -TH * 0.5]], TH * 0.28)
      : roundedClosed([[-TW / 2, -TH / 2], [-TW / 2, TH / 2], [TW / 2, TH / 2], [TW / 2, -TH / 2]], 0.06)
  )
    .getPoints(8)
    .map((p) => [p.x, p.y] as Pt);
  const bulbGeo = cache.get("bulb", () => new THREE.CylinderGeometry(1, 1, 1, 16).rotateX(Math.PI / 2));
  const part = (g: THREE.Object3D, geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  };
  // LED light guide: a thin glowing tube following part of the lamp outline
  const guide = (key: string, pts: Pt[], k: number, keep: (p: Pt) => boolean, z: number, r: number) =>
    cache.get(`${spec.id}:${key}`, () => {
      const run = longestRun(pts, keep).map(([x, y]) => new THREE.Vector3(x * k, y * k, z));
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(run), Math.max(12, run.length * 4), r, 6, false);
    });
  // Gunmetal lamp interior, so chrome cups and the lit parts stand out behind the clear glass
  const housing = mat(new THREE.MeshStandardMaterial({ color: 0x3a3f46, metalness: 0.8, roughness: 0.35 }));
  // Projector: chrome cup, dark iris and a lens core that lights up with the headlights
  const projector = (g: THREE.Group, x: number, y: number, r: number) => {
    part(g, bulbGeo, chrome, x, y, 0.002).scale.set(r * 1.35, r * 1.35, 0.008);
    part(g, bulbGeo, dark, x, y, 0.0065).scale.set(r, r, 0.002);
    part(g, bulbGeo, projMat, x, y, 0.008).scale.set(r * 0.72, r * 0.72, 0.002);
  };
  // Reflector lamp (older and heavy vehicles): a big chrome bowl around a bulb
  const reflector = (g: THREE.Group, x: number, y: number, r: number) => {
    part(g, bulbGeo, chrome, x, y, 0.002).scale.set(r, r, 0.008);
    part(g, bulbGeo, projMat, x, y, 0.0065).scale.set(r * 0.4, r * 0.4, 0.004);
  };
  const drl = (g: THREE.Group, keep: (p: Pt) => boolean, k = 0.84) => part(g, guide("hl-drl", headOutline, k, keep, 0.002, 0.011), drlMat);
  const indicator = (g: THREE.Group, x: number, y: number, w: number, h: number) => part(g, box(`hl-ind${w.toFixed(3)}`, w, h, 0.006), sideAmber, x, y, 0.004);
  const w = headW;
  const h = headH;
  const makeHeadlamp = () => {
    const g = new THREE.Group();
    part(g, lampGeo("hl-bezel", lampShape(headOutline, 1, 0.95), 0.05, 0.012, 0.006), dark);
    part(g, lampGeo("hl-refl", lampShape(headOutline, 0.95), 0.01, 0.0, 0), housing);
    switch (headStyle) {
      case "blade": // sports car: a thin LED blade over one small projector
        drl(g, ([, y]) => y > h * 0.1, 0.86);
        projector(g, -w * 0.28, -h * 0.1, h * 0.3);
        break;
      case "slim": // executive saloon: a wide, thin lamp with an LED brow and three small projectors
        drl(g, ([, y]) => y > h * 0.15, 0.85);
        projector(g, -w * 0.3, -h * 0.12, h * 0.26);
        projector(g, -w * 0.12, -h * 0.12, h * 0.26);
        projector(g, w * 0.06, -h * 0.12, h * 0.26);
        break;
      case "swept": // family saloon: LED brow over twin projectors, amber at the outer corner
        drl(g, ([, y]) => y > h * 0.2);
        projector(g, -w * 0.3, -h * 0.1, h * 0.28);
        projector(g, -w * 0.08, -h * 0.1, h * 0.24);
        indicator(g, w * 0.27, -h * 0.02, w * 0.17, h * 0.3);
        break;
      case "split": // SUV: a full-width running-light bar above the main beams
        drl(g, ([, y]) => y > h * 0.3, 0.82);
        projector(g, -w * 0.26, -h * 0.12, h * 0.25);
        projector(g, -w * 0.02, -h * 0.12, h * 0.25);
        indicator(g, w * 0.3, -h * 0.12, w * 0.14, h * 0.3);
        break;
      case "rect": // big 4x4: compact upright lamp beside a wide grille, L-shaped running light
        drl(g, ([x, y]) => y > h * 0.3 || x > w * 0.38, 0.84);
        projector(g, -w * 0.22, -h * 0.08, h * 0.26);
        projector(g, w * 0.08, -h * 0.08, h * 0.26);
        break;
      case "clamp": // pickup: C-shaped running light hugging a big projector
        drl(g, ([x]) => x > -w * 0.15);
        projector(g, w * 0.1, 0, h * 0.3);
        reflector(g, -w * 0.3, 0, h * 0.24);
        break;
      case "tall": // van: an upright lamp with stacked beams and a running light down the outer edge
        drl(g, ([x]) => x > w * 0.28, 0.82);
        reflector(g, -w * 0.08, h * 0.17, w * 0.26);
        projector(g, -w * 0.08, -h * 0.22, w * 0.15);
        break;
      case "round": // bus and fire engine: twin round lamps in one housing and a big amber indicator
        reflector(g, -w * 0.27, 0, h * 0.36);
        reflector(g, w * 0.02, 0, h * 0.36);
        indicator(g, w * 0.33, 0, w * 0.18, h * 0.5);
        break;
    }
    // Lamps without a built-in indicator get a slim amber strip just under them
    if (headStyle === "blade" || headStyle === "slim" || headStyle === "rect" || headStyle === "clamp" || headStyle === "tall") indicator(g, w * 0.12, -h / 2 - 0.032, w * 0.55, 0.03);
    part(g, lampGeo("hl-glass", lampShape(headOutline, 0.95), 0.004, 0.012, 0), glassLens);
    return g;
  };
  // Tail lamp (x is outward). Cars: a glowing LED outline and a light bar over the brake panel, the
  // indicator at the outer end and the reverse light at the inner end, under a smoked red lens.
  // Boxy vehicles: a stacked cluster, red tail/brake on top, then amber, then white reverse.
  const makeTaillamp = () => {
    const g = new THREE.Group();
    part(g, lampGeo("tl-bezel", lampShape(tailOutline, 1, 0.9), 0.06, 0.03), dark);
    part(g, lampGeo("tl-back", lampShape(tailOutline, 0.92), 0.01, -0.004, 0), housing);
    if (shaped) {
      part(g, lampGeo("tl-fill", lampShape(tailOutline, 0.55), 0.004, 0.004, 0), brakeMat).position.x = -TW * 0.08;
      part(g, guide("tl-led", tailOutline, 0.8, () => true, 0.012, 0.012), tailLedMat);
      part(g, box("tl-bar", TW * 0.5, 0.014, 0.006), tailLedMat, -TW * 0.12, TH * 0.08, 0.013);
      part(g, lampGeo("tl-lens", lampShape(tailOutline, 0.92), 0.012, 0.03, 0.006), tailLens);
      // In front of the red lens, so they read as true amber and white rather than pink
      part(g, box("tl-ind", TW * 0.24, TH * 0.5, 0.006), sideAmber, TW * 0.3, -TH * 0.02, 0.045);
      part(g, box("tl-rev", TW * 0.13, TH * 0.24, 0.006), reverseMat, -TW * 0.31, -TH * 0.12, 0.045);
    } else {
      part(g, box("tl-brake", TW * 0.78, TH * 0.4, 0.006), brakeMat, 0, TH * 0.24, 0.006);
      part(g, box("tl-tail", TW * 0.62, TH * 0.06, 0.006), tailLedMat, 0, TH * 0.24, 0.011);
      part(g, box("tl-ind", TW * 0.78, TH * 0.22, 0.006), sideAmber, 0, -TH * 0.1, 0.006);
      part(g, box("tl-rev", TW * 0.78, TH * 0.16, 0.006), reverseMat, 0, -TH * 0.32, 0.006);
      part(g, lampGeo("tl-lens", lampShape(tailOutline, 0.92), 0.008, 0.03, 0.004), glassLens);
    }
    return g;
  };
  const indGlows: THREE.Sprite[][] = [[], []];
  // Night beam: a fan of light spreading forward from each headlamp (one flat, one upright plane)
  const beamGeo = cache.get("beam", () => {
    const g = new THREE.PlaneGeometry(1, 1, 1, 8);
    const p = g.getAttribute("position");
    for (let i = 0; i < p.count; i++) {
      const t = p.getY(i) + 0.5; // 0 at the lamp, 1 at the far end
      p.setXY(i, p.getX(i) * (0.25 + t * 2.8), t * 12);
    }
    return g.rotateX(-Math.PI / 2);
  });
  /** Flares fade when a lamp turns away from the camera, like real lamps seen off-axis. */
  const facing = (sp: THREE.Sprite, lamp: THREE.Object3D) => {
    sp.onBeforeRender = (_r, _s, camera) => {
      lamp.getWorldDirection(_dir);
      sp.getWorldPosition(_pos);
      const f = THREE.MathUtils.smoothstep(_dir.dot(_toCam.subVectors(camera.position, _pos).normalize()), -0.15, 0.75);
      (sp.material as THREE.SpriteMaterial).opacity = sp.userData.opacity * f;
      sp.scale.setScalar(sp.userData.size * (0.5 + 0.5 * f));
    };
  };
  for (const s of [-1, 1]) {
    // Parts built in this pass (headlamp and tail indicators, side repeater) use this side's amber
    sideAmber = amberSide[s < 0 ? 0 : 1];
    const head = makeHeadlamp();
    head.position.set(s * headX, headY, headZ);
    head.rotation.set(mount.tilt, Math.PI - s * mount.toe, 0);
    head.scale.x = -s;
    group.add(head);
    const tail = makeTaillamp();
    tail.position.set(s * tailX, tailY, tailZ);
    tail.rotation.y = shaped ? s * 0.22 : 0;
    tail.scale.x = s;
    group.add(tail);
    const a = new THREE.Object3D();
    a.position.set(s * headX, headY, headZ);
    group.add(a);
    headAnchors.push(a);
    for (const [lamp, z, c, x, y, list] of [
      [head, headZ - 0.1, 0xf4f8ff, headX, headY, headGlows],
      // On upright clusters the red glow belongs to the red top segment, clear of the amber one
      [tail, tailZ + 0.08, 0xff2418, tailX, shaped ? tailY : tailY + TH * 0.24, tailGlows],
    ] as const) {
      const sm = new THREE.SpriteMaterial({ map: getFlareTexture(), color: c, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 });
      glowMats.push(sm);
      const sp = new THREE.Sprite(sm);
      sp.position.set(s * x, y, z);
      sp.userData = { opacity: 0, size: 1 };
      facing(sp, lamp);
      group.add(sp);
      list.push(sp);
    }
    // Amber flares at the front and rear indicators, shown only while they blink
    for (const [lamp, x, y, z] of [
      [head, headX + headW * 0.3, headY - headH * 0.2, headZ - 0.08],
      [tail, shaped ? tailX + TW * 0.25 : tailX, shaped ? tailY - TH * 0.08 : tailY - TH * 0.1, tailZ + 0.07],
    ] as const) {
      const sm = new THREE.SpriteMaterial({ map: getFlareTexture(), color: 0xffa31a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 });
      glowMats.push(sm);
      const sp = new THREE.Sprite(sm);
      sp.position.set(s * x, y, z);
      sp.userData = { opacity: 0, size: 0.6 };
      facing(sp, lamp);
      group.add(sp);
      indGlows[s < 0 ? 0 : 1].push(sp);
    }
    for (const upright of [false, true]) {
      const beam = add(beamGeo, beamMat, s * headX, headY - 0.03, headZ - 0.08);
      beam.rotation.y = -s * 0.03;
      if (upright) {
        beam.rotation.z = Math.PI / 2;
        beam.scale.x = 0.45;
      }
      beam.renderOrder = 3;
    }
    // Amber side repeater on the front fender
    if (shaped) {
      const ry = beltY - 0.14;
      const rz = -(spec.wheelbase / 2 + archR + 0.12);
      const rep = add(box("repeater", 0.014, 0.03, 0.1), sideAmber, s * (skinX(ry, rz) + 0.003), ry, rz);
      rep.rotation.z = -s * skinLean(ry, rz);
    }
    // Light cast on the road ahead
    const pool = add(poolGeo, poolMat, s * (W / 2 - 0.5), 0.07, headZ - 9.5);
    pool.renderOrder = 2;
  }

  // High-mounted third brake light along the top of the rear window
  if (shaped && cabin) {
    const [p0, p1] = [cabin[0], cabin[1]];
    const y = p1[1] - Math.min(0.16, (p1[1] - p0[1]) * 0.3) - 0.04; // just under the roof panel
    const du = p1[0] - p0[0];
    const dy = p1[1] - p0[1];
    const u = p0[0] + ((y - p0[1]) / dy) * du;
    const hm = add(box("hmsl", Math.min(0.6, W * 0.3), 0.035, 0.03), brakeMat, 0, y, -u + 0.035);
    hm.rotation.x = -Math.atan2(du, dy); // lies on the sloping glass
  }

  if (st.tailBar) {
    // One light strip right across the tail, joining the two lamps
    const by = tailY + 0.06; // clear of the number plate below
    const bz = -endU(-1, by) + 0.016;
    add(box("tailbarbg", tailX * 2 + 0.02, 0.06, 0.02), dark, 0, by, bz - 0.006);
    add(box("tailbar", tailX * 2, 0.026, 0.02), tailLedMat, 0, by, bz);
  }

  // Styled grilles: flat plates laid on the nose (found by probing the body), tilted to its slope
  if (st.grille) {
    const ray = new THREE.Raycaster();
    const noseZ = (y: number) => {
      ray.set(new THREE.Vector3(0.05, y, frontZ - 2), new THREE.Vector3(0, 0, 1));
      return ray.intersectObject(bodyMesh, false)[0]?.point.z ?? -endU(1, y);
    };
    const grilleMat = mat(new THREE.MeshStandardMaterial({ color: 0x0b0c0f, metalness: 0.5, roughness: 0.3 }));
    const barMat = mat(new THREE.MeshStandardMaterial({ color: 0x5b6168, metalness: 0.8, roughness: 0.35 }));
    // A plate whose outline `pts` is centred on (0, y); its front face sits just proud of the skin
    const plate = (key: string, pts: Pt[], radius: number, y: number, m: THREE.Material, depth = 0.03, proud = 0.008) => {
      const geo = cache.get(`${spec.id}:${key}`, () => new THREE.ExtrudeGeometry(roundedClosed(pts, radius), { depth, bevelEnabled: false, curveSegments: 4 }).translate(0, 0, -depth));
      const ys = pts.map((p) => p[1]);
      const top = y + Math.max(...ys);
      const bot = y + Math.min(...ys);
      const zt = noseZ(top - 0.01);
      const zb = noseZ(bot + 0.01);
      const mesh = add(geo, m, 0, y, (zt + zb) / 2 - proud);
      mesh.rotation.set(Math.atan2(zt - zb, top - bot), Math.PI, 0);
      return mesh;
    };
    // Horizontal bars in front of a plate (children, so they share its tilt)
    const bars = (on: THREE.Mesh, key: string, n: number, w: number, h: number, t: number, m: THREE.Material) => {
      for (let i = 0; i < n; i++) part(on, box(`${key}`, w, t, 0.02), m, 0, -h / 2 + ((i + 1) * h) / (n + 1), 0.008);
    };
    const between = 2 * (headX - headW / 2) - 0.06; // room between the headlamps
    if (st.grille === "hex") {
      // Big single-frame grille: fits between the lamps at the top, then widens below them, chamfered base
      const top = headY + headH / 2 - 0.01;
      const bot = bodyBottom + 0.08;
      const h = top - bot;
      const wt = Math.min(0.72, between);
      const wm = Math.min(wt * 1.35, W * 0.5);
      const wb = wm * 0.92;
      const shoulder = headY - headH / 2 - 0.03 - (top + bot) / 2; // just under the lamps
      const pts: Pt[] = [[-wt / 2, h / 2], [wt / 2, h / 2], [wm / 2, shoulder], [wb / 2, -h / 2 + 0.06], [wb / 2 - 0.06, -h / 2], [-wb / 2 + 0.06, -h / 2], [-wb / 2, -h / 2 + 0.06], [-wm / 2, shoulder]];
      const cy = (top + bot) / 2;
      plate("grillerim", pts.map(([x, y]) => [x * 1.07, y * 1.05] as Pt), 0.04, cy, chrome, 0.03, 0.004);
      const g = plate("grille", pts, 0.035, cy, grilleMat, 0.03, 0.01);
      bars(g, "grillebar", 6, wb * 0.92, h * 0.9, 0.012, barMat);
    } else if (st.grille === "trapezoid") {
      // Slim slot between the lamps and a big low trapezoid in the bumper
      const slotW = Math.max(0.2, between);
      plate("grilleslot", [[-slotW / 2, 0.03], [slotW / 2, 0.03], [slotW / 2 - 0.04, -0.03], [-slotW / 2 + 0.04, -0.03]], 0.02, headY - headH * 0.15, grilleMat);
      const wt = Math.min(1.05, W * 0.55);
      const wb = wt * 0.8;
      const h = 0.22;
      const g = plate("grillelow", [[-wt / 2, h / 2], [wt / 2, h / 2], [wb / 2, -h / 2], [-wb / 2, -h / 2]], 0.04, bodyBottom + 0.22, grilleMat);
      bars(g, "grillelowbar", 3, wb * 0.9, h * 0.85, 0.014, barMat);
    } else {
      // Wide chrome-barred grille filling the space between the lamps
      const top = headY + headH / 2;
      const bot = Math.max(bodyBottom + 0.2, top - 0.38);
      const h = top - bot;
      const w = Math.max(0.5, between + 0.02);
      const cy = (top + bot) / 2;
      const rect: Pt[] = [[-w / 2, h / 2], [w / 2, h / 2], [w / 2, -h / 2], [-w / 2, -h / 2]];
      plate("grillerim", rect.map(([x, y]) => [x + Math.sign(x) * 0.035, y + Math.sign(y) * 0.03] as Pt), 0.04, cy, chrome, 0.03, 0.004);
      const g = plate("grille", rect, 0.03, cy, grilleMat, 0.03, 0.01);
      bars(g, "grillebar", 3, w * 0.96, h * 0.92, 0.04, chrome);
    }
  }

  // Bumpers, grille and number plates
  if (detailed) {
    const bumperY = bodyBottom + 0.07;
    const bumpFZ = -endU(1, bumperY);
    const bumpRZ = -endU(-1, bumperY);
    add(box("bumpf", (W - 0.6) * planAt(bumpFZ), 0.1, 0.1), dark, 0, bumperY, bumpFZ - 0.01);
    add(box("bumpr", (W - 0.6) * planAt(bumpRZ), 0.1, 0.1), dark, 0, bumperY, bumpRZ + 0.01);
    if (!st.grille) {
      const grilleY = Math.max(bodyBottom + 0.19, headY - 0.1);
      const grilleZ = -endU(1, grilleY) - 0.015;
      add(box("grille", W * 0.24, 0.09, 0.05), dark, 0, grilleY, grilleZ);
      add(box("grilleframe", W * 0.24 + 0.04, 0.014, 0.055), chrome, 0, grilleY + 0.052, grilleZ - 0.003);
      add(box("grilleframeb", W * 0.24 + 0.04, 0.014, 0.055), chrome, 0, grilleY - 0.052, grilleZ - 0.003);
    }
    const plate = mat(new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.6 }));
    add(box("plater", 0.5, 0.12, 0.02), plate, 0, bumperY + 0.2, -endU(-1, bumperY + 0.22) + 0.015);
  }

  // Emergency liveries and light bar
  let tick: (t: number, on: boolean) => void = () => {};
  // Indicators blink about 85 times a minute (a real car's rate); amber flares grow at night
  let signal: Signal = "off";
  let nightLevel = 0;
  const blink = (t: number) => {
    const phaseOn = t % 0.7 < 0.38;
    for (let i = 0; i < 2; i++) {
      const lit = phaseOn && (signal === "hazard" || signal === (i === 0 ? "left" : "right"));
      amberSide[i].color.copy(lit ? AMBER_ON : AMBER_OFF);
      for (const sp of indGlows[i]) {
        sp.userData.opacity = lit ? 0.75 + 0.25 * nightLevel : 0;
        sp.userData.size = 0.8 + 0.6 * nightLevel;
      }
    }
  };
  const accent = (c: number) => mat(new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 }));
  if (f.livery === "police" || f.livery === "police-uae") {
    const uae = f.livery === "police-uae";
    // US: black car with white lettering. UAE: white car with dark green bands and lettering.
    const ink = uae ? "#0b5d3b" : "#ffffff";
    const band = accent(uae ? 0x0b5d3b : 0xffffff);
    const textY = uae ? 0.84 : 0.74;
    for (const s of [-1, 1]) {
      if (uae) {
        add(box("pband1", 0.012, 0.1, L * 0.72), band, s * (W / 2 + 0.012), 0.62, 0);
        add(box("pband2", 0.012, 0.03, L * 0.72), band, s * (W / 2 + 0.012), 0.5, 0);
      } else {
        add(box("pband1", 0.012, 0.025, L * 0.72), band, s * (W / 2 + 0.012), 0.6, 0);
      }
      const label = (text: string, w: number, z: number, y: number) => {
        const m = new THREE.Mesh(
          cache.get(`policelabel${w}`, () => new THREE.PlaneGeometry(w, w * 0.158)),
          mat(new THREE.MeshBasicMaterial({ map: getLabelTexture(text, ink), transparent: true, depthWrite: false })),
        );
        m.position.set(s * (W / 2 + 0.022), y, z);
        m.rotation.y = s * (Math.PI / 2);
        group.add(m);
      };
      label("POLICE", 1.5, -0.6, textY);
      if (uae) label("شرطة", 0.9, 0.85, textY);
    }
    // Push bar on the front bumper
    add(box("pushbar", W - 0.5, 0.1, 0.1), dark, 0, bodyBottom + 0.42, frontZ - 0.16);
    for (const s of [-1, 1]) add(box("pushpost", 0.08, 0.34, 0.08), dark, s * (W / 2 - 0.35), bodyBottom + 0.3, frontZ - 0.12);
  } else if (f.livery === "ambulance") {
    const red = accent(0xd32f2f);
    for (const s of [-1, 1]) {
      add(box("astripe", 0.012, 0.2, 3.7), red, s * (W / 2 + 0.012), 1.3, 0.95);
      add(box("across1", 0.012, 0.8, 0.22), red, s * (W / 2 + 0.013), 1.95, 1.2);
      add(box("across2", 0.012, 0.22, 0.8), red, s * (W / 2 + 0.013), 1.95, 1.2);
    }
  } else if (f.livery === "fire") {
    const white = accent(0xf5f5f5);
    for (const s of [-1, 1]) {
      add(box("fstripe", 0.012, 0.16, L - 0.6), white, s * (W / 2 + 0.012), 1.4, 0);
      for (const u of [-3.1, -1.7]) add(box("shutter", 0.012, 0.85, 1.2), dark, s * (W / 2 + 0.013), 1.85, -u);
    }
  }
  if (f.ladder) {
    for (const s of [-1, 1]) add(box("ladderrail", 0.06, 0.08, 7.2), chrome, s * 0.4, 2.85, 0.4);
    for (const s of [-1, 1]) for (const z of [-2.5, 0.4, 3.3]) add(box("ladderpost", 0.06, 0.4, 0.06), dark, s * 0.4, 2.65, z);
    for (let i = 0; i < 15; i++) add(box("rung", 0.8, 0.04, 0.04), chrome, 0, 2.85, -3 + i * 0.5);
  }
  if (f.lightbar) {
    const lb = f.lightbar;
    const redMat = mat(new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff1111, emissiveIntensity: 0.2 }));
    const blueMat = mat(new THREE.MeshStandardMaterial({ color: 0x000055, emissive: 0x1144ff, emissiveIntensity: 0.2 }));
    add(box("lbbase", 1.3, 0.08, 0.34), dark, 0, lb.y, -lb.u);
    add(box("lbred", 0.6, 0.12, 0.3), redMat, -0.33, lb.y + 0.09, -lb.u);
    add(box("lbblue", 0.6, 0.12, 0.3), blueMat, 0.33, lb.y + 0.09, -lb.u);
    const glow = (color: number, x: number) => {
      const sm = new THREE.SpriteMaterial({ map: getGlowTexture(), color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 });
      glowMats.push(sm);
      const sp = new THREE.Sprite(sm);
      sp.scale.setScalar(2.6);
      sp.position.set(x, lb.y + 0.2, -lb.u);
      group.add(sp);
      return sm;
    };
    const redGlow = glow(0xff2020, -0.4);
    const blueGlow = glow(0x2a63ff, 0.4);
    tick = (time, on) => {
      const phase = Math.floor(time * 8) % 4;
      const red = on && phase < 2;
      const blue = on && phase >= 2;
      redMat.emissiveIntensity = red ? 5 : 0.2;
      blueMat.emissiveIntensity = blue ? 5 : 0.2;
      redGlow.opacity = red ? 0.95 : 0;
      blueGlow.opacity = blue ? 0.95 : 0;
    };
  }

  // Wheels with arches
  const spinGroups: THREE.Group[] = [];
  const steerGroups: THREE.Group[] = [];
  const tyreW = 0.26;
  // Lathed tyre with rounded shoulders and a sidewall that steps in to the rim
  const tyreGeo = cache.get(`${spec.id}:tyre`, () => {
    const h = tyreW / 2;
    const pts = [
      [R * 0.6, -h * 0.9], [R * 0.8, -h], [R * 0.93, -h * 0.97], [R * 0.985, -h * 0.82], [R, -h * 0.55],
      [R, h * 0.55], [R * 0.985, h * 0.82], [R * 0.93, h * 0.97], [R * 0.8, h], [R * 0.6, h * 0.9],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 32).rotateZ(Math.PI / 2);
  });
  const rimGeo = cache.get(`${spec.id}:rim`, () => new THREE.CylinderGeometry(R * 0.62, R * 0.62, tyreW + 0.02, 20).rotateZ(Math.PI / 2));
  const spokeGeo = cache.get(`${spec.id}:spoke`, () => new THREE.BoxGeometry(tyreW + 0.04, 0.05, R * 1.2));
  // A square arch's corners reach further from the hub, so its dark well is a little bigger
  const wellR = hasArches ? archR * (st.arches === "square" ? 1.16 : 0.97) : R * 1.18;
  const wellGeo = cache.get(`${spec.id}:well`, () => new THREE.CylinderGeometry(wellR, wellR, hasArches ? 0.7 : 0.05, 24).rotateZ(Math.PI / 2));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const wx = sx * (W / 2 - 0.12);
      const wz = sz * (spec.wheelbase / 2);
      add(wellGeo, dark, sx * (hasArches ? W / 2 - 0.4 : W / 2 - 0.02), R, wz);
      const steer = new THREE.Group();
      steer.position.set(wx, R, wz);
      const spin = new THREE.Group();
      spin.add(new THREE.Mesh(tyreGeo, tyre), new THREE.Mesh(rimGeo, rim));
      for (let i = 0; i < 5; i++) {
        const sp = new THREE.Mesh(spokeGeo, dark);
        sp.rotation.x = (i / 5) * Math.PI;
        spin.add(sp);
      }
      steer.add(spin);
      group.add(steer);
      spinGroups.push(spin);
      if (sz === -1) steerGroups.push(steer);
    }
  }

  // Soft contact shadow so the vehicle sits on the road instead of floating
  const shadowMat = mat(new THREE.MeshBasicMaterial({ map: getShadowTexture(), color: 0x000000, transparent: true, opacity: 0.75, depthWrite: false }));
  const shadow = add(cache.get(`${spec.id}:shadow`, () => new THREE.PlaneGeometry(W * 1.5, L * 1.15).rotateX(-Math.PI / 2)), shadowMat, 0, 0.03, 0);
  shadow.renderOrder = 1;

  // Interior
  let steeringWheel: THREE.Object3D | null = null;
  if (detailed && cabin) {
    const seatGeo = box("seat", 0.5, 0.14, 0.5);
    const backGeo = box("seatback", 0.5, 0.5, 0.1);
    const seatY = cabin[0][1] - 0.2;
    // Rear edge of the glasshouse (as z, +back) at height y, so seats stay inside the sloping rear window
    const cabinRear = (y: number) => {
      const [p0, p1] = [cabin[0], cabin[1]];
      return -(p0[0] + clamp01((y - p0[1]) / (p1[1] - p0[1])) * (p1[0] - p0[0]));
    };
    const backTop = seatY + 0.07 + 0.5;
    const rearBackZ = Math.min(cabinRear(backTop), cabinRear(seatY)) - 0.2;
    const frontMax = -cabin[3][0] + 0.75;
    const rowGap = Math.min(0.85, rearBackZ - 0.05 - frontMax);
    const rows = [rearBackZ - rowGap, rearBackZ];
    for (const s of [-1, 1]) {
      for (const bz of rows) {
        add(seatGeo, interior, s * 0.45, seatY, bz - 0.3);
        add(backGeo, interior, s * 0.45, seatY + 0.3, bz);
      }
    }
    add(box("dash", W - 0.3, 0.3, 0.4), interior, 0, cabin[3][1] + 0.05, -cabin[3][0] + 0.45);
    const sw = new THREE.Group();
    sw.position.set(-0.45, cabin[3][1] + 0.3, -cabin[3][0] + 0.75);
    sw.rotation.x = -0.9;
    const ring = new THREE.Mesh(cache.get(`${spec.id}:swring`, () => new THREE.TorusGeometry(0.17, 0.02, 8, 20)), dark);
    const hub = new THREE.Mesh(cache.get(`${spec.id}:swhub`, () => new THREE.CylinderGeometry(0.04, 0.04, 0.02, 12).rotateX(Math.PI / 2)), chrome);
    sw.add(ring, hub);
    for (const a of [0, 2.1, 4.2]) {
      const spoke = new THREE.Mesh(cache.get(`${spec.id}:swspoke`, () => new THREE.BoxGeometry(0.16, 0.02, 0.02)), dark);
      spoke.position.set(Math.cos(a) * 0.08, Math.sin(a) * 0.08, 0);
      spoke.rotation.z = a;
      sw.add(spoke);
    }
    group.add(sw);
    steeringWheel = sw;
  }

  group.traverse((o) => {
    if (o instanceof THREE.Mesh) o.receiveShadow = false;
  });

  return {
    group,
    spec,
    spinGroups,
    steerGroups,
    steeringWheel,
    headAnchors,
    setPaint: (hex) => paint.color.set(hex),
    tick: (t, on) => {
      tick(t, on);
      blink(t);
    },
    setIndicator: (sig) => {
      signal = sig;
      if (sig === "off") blink(0);
    },
    setLights: (night, braking) => {
      const on = Math.min(1, Math.max(0, (night - 0.15) / 0.5));
      nightLevel = on;
      projMat.color.lerpColors(LAMP.projOff, LAMP.projOn, on);
      beamMat.opacity = on * 0.1;
      poolMat.opacity = on * 0.55;
      for (const g of headGlows) {
        // a faint glint from the running light by day, a full flare at night
        g.userData.opacity = 0.12 + 0.88 * on;
        g.userData.size = 0.6 + 1.7 * on;
      }
      const tailOn = braking ? 1 : 0.25 + 0.6 * on;
      tailLedMat.color.lerpColors(LAMP.tailOff, LAMP.tailOn, tailOn);
      brakeMat.color.lerpColors(LAMP.brakeOff, LAMP.brakeOn, braking ? 1 : 0.25 * on);
      for (const g of tailGlows) {
        g.userData.opacity = braking ? 1 : 0.6 * on;
        g.userData.size = braking ? 2.6 : 0.6 + 0.9 * on;
      }
    },
    dispose: () => {
      mats.forEach((m) => m.dispose());
      glowMats.forEach((m) => m.dispose());
    },
  };
}

export type { BoxSpec };
