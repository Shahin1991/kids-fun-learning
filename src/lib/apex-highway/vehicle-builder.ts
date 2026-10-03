import * as THREE from "three";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { BoxSpec, VehicleSpec } from "./vehicle-specs";

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
export function disposeGlowTexture() {
  labelTextures.forEach((t) => t.dispose());
  labelTextures.clear();
  glowTexture?.dispose();
  glowTexture = null;
}

const labelTextures = new Map<string, THREE.CanvasTexture>();
function getLabelTexture(text: string): THREE.CanvasTexture {
  let t = labelTextures.get(text);
  if (!t) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 80;
    const g = c.getContext("2d")!;
    g.font = "bold 62px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = "#ffffff";
    g.fillText(text, 256, 44);
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    labelTextures.set(text, t);
  }
  return t;
}

type Pt = [number, number];
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

/** Lower body: rounded profile with semicircular wheel arches cut into the bottom edge. */
function bodyShape(pts: Pt[], radius: number, arches: { u: number; r: number; cy: number }[]): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  roundedChain(shape, pts, radius);
  const y0 = pts[0][1];
  for (const a of [...arches].sort((m, n) => n.u - m.u)) {
    const a0 = Math.asin(Math.max(-1, Math.min(1, (y0 - a.cy) / a.r)));
    shape.lineTo(a.u + a.r * Math.cos(a0), y0);
    shape.absarc(a.u, a.cy, a.r, a0, Math.PI - a0, false);
  }
  shape.closePath();
  return shape;
}

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
  /** Flashes the light bar (no-op for vehicles without one) */
  tick: (timeSec: number, flashing: boolean) => void;
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
  const glass = mat(new THREE.MeshPhysicalMaterial({ color: 0x0b1620, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.8 }));
  const chrome = mat(new THREE.MeshStandardMaterial({ color: 0xdfe6ea, metalness: 1, roughness: 0.15 }));
  const dark = mat(new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.8 }));
  const tyre = mat(new THREE.MeshStandardMaterial({ color: 0x1b1b1f, roughness: 0.9 }));
  const rim = mat(new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.9, roughness: 0.25 }));
  const interior = mat(new THREE.MeshStandardMaterial({ color: 0x2b2d33, roughness: 0.9 }));
  const headMat = mat(new THREE.MeshStandardMaterial({ color: 0xfff4d0, emissive: 0xfff0b0, emissiveIntensity: 1.2 }));
  const tailMat = mat(new THREE.MeshStandardMaterial({ color: 0x661111, emissive: 0xff1111, emissiveIntensity: 0.6 }));

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
  const bodyYs = spec.body.map((p) => p[1]);
  const bodyBottom = Math.min(...bodyYs);
  const bodyTop = Math.max(...bodyYs);
  const R = spec.wheelRadius;
  const archR = Math.min(R * 1.22, bodyTop - 0.05 - R);
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
    const plan = 1 - 0.16 * Math.pow(Math.min(1, Math.abs(v.z) / halfL), 3);
    v.x *= (1 - 0.06 * smooth(0.5, 1, t)) * plan;
    if (t > 0.9) v.y += 0.04 * (1 - Math.min(1, (v.x / hw) ** 2));
  };
  const cabin0 = spec.cabin;
  const roofTop = cabin0 ? cabin0[1][1] : 0;
  const cabinTaper = (y: number) => (shaped && cabin0 ? 1 - 0.2 * clamp01((y - cabin0[0][1]) / (roofTop - cabin0[0][1])) : 1);
  const cabinDeform = (v: THREE.Vector3) => {
    const plan = 1 - 0.1 * Math.pow(Math.min(1, Math.abs(v.z) / halfL), 3);
    v.x *= cabinTaper(v.y) * plan;
  };

  const archSpec = hasArches ? [-1, 1].map((sz) => ({ u: sz * (spec.wheelbase / 2), r: archR, cy: R })) : [];
  add(extrude("body", () => bodyShape(spec.body, shaped ? 0.2 : 0.08, archSpec), W - 0.1, 0.06, shaped ? bodyDeform : undefined), paint, 0, 0, 0, true);
  for (const b of spec.boxes ?? []) add(box(`box${b.x0}`, W - 0.05, b.y1 - b.y0, b.x1 - b.x0), paint, 0, (b.y0 + b.y1) / 2, -(b.x0 + b.x1) / 2, true);

  const cabin = spec.cabin;
  if (cabin) {
    add(extrude("cabin", () => roundedClosed(cabin, shaped ? 0.32 : 0.05), W - 0.22, 0.03, shaped ? cabinDeform : undefined), glass, 0, 0, 0);
    // Roof slab and pillars
    const roofLen = cabin[2][0] - cabin[1][0];
    const roofY = cabin[1][1];
    add(box("roof", (W - 0.2) * cabinTaper(roofY) * 0.97, 0.06, shaped ? roofLen - 0.1 : roofLen + 0.1), paint, 0, roofY + 0.02, -(cabin[1][0] + cabin[2][0]) / 2, true);
    const bar = (a: [number, number], b: [number, number], x0: number) => {
      const x = x0 * cabinTaper((a[1] + b[1]) / 2);
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const m = add(box(`bar${a}${b}`, 0.07, len, 0.07), paint, x, (a[1] + b[1]) / 2, -(a[0] + b[0]) / 2);
      m.rotation.x = Math.atan2(-(b[0] - a[0]), b[1] - a[1]);
    };
    for (const s of [-1, 1]) {
      const x = s * (W / 2 - 0.1);
      if (!shaped) {
        bar(cabin[3], cabin[2], x);
        bar(cabin[0], cabin[1], x);
      }
      const midU = (cabin[1][0] + cabin[2][0]) / 2;
      bar([midU, cabin[0][1]], [midU, roofY], x);
    }
    if (spec.features.roofRack) {
      for (const s of [-1, 1]) add(box("rackr", 0.05, 0.05, roofLen), chrome, s * 0.7, roofY + 0.1, -(cabin[1][0] + cabin[2][0]) / 2);
      for (let i = 0; i < 3; i++) add(box("rackb", 1.4, 0.04, 0.05), chrome, 0, roofY + 0.1, -(cabin[1][0] + 0.3 + i * (roofLen - 0.6) / 2));
    }
  }
  for (const w of spec.windows ?? []) {
    for (const s of [-1, 1]) add(box(`win${w.x0}`, 0.02, w.y1 - w.y0, w.x1 - w.x0), glass, s * (W / 2 + 0.02), (w.y0 + w.y1) / 2, -(w.x0 + w.x1) / 2);
  }
  if (spec.frontGlass) {
    const g = spec.frontGlass;
    add(box("frontglass", g.w, g.h, 0.03), glass, 0, g.y, -(g.u + 0.02));
  }
  if (spec.id === "bus") add(box("busrear", W - 0.6, 0.6, 0.03), glass, 0, 2.2, 4.5 + 0.02);

  // Trim, door seams, handles, mirrors
  const beltY = Math.max(...spec.body.map((p) => p[1])) - 0.06;
  for (const s of [-1, 1]) {
    const x = s * (W / 2 + 0.01);
    add(box("trim", 0.02, 0.03, L * 0.82), chrome, x, beltY, 0);
    if (detailed) {
      const seams = spec.id === "bus" ? [-1.5, 1.5] : [-0.2, 0.9];
      for (const u of seams) add(box("seam", 0.012, beltY - 0.45, 0.012), dark, x, (beltY + 0.45) / 2, -u);
      for (const u of spec.id === "bus" ? [] : [0.1, 1.2]) add(box("handle", 0.03, 0.04, 0.16), chrome, x + s * 0.01, beltY - 0.1, -u);
      add(box("mirror", 0.14, 0.1, 0.1), paint, s * (W / 2 + 0.08), beltY + 0.2, -(cabin ? cabin[3][0] - 0.2 : spec.length / 2 - 1.2));
    }
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

  // Lights with additive glow
  const glowMats: THREE.SpriteMaterial[] = [];
  const headGlows: THREE.Sprite[] = [];
  const tailGlows: THREE.Sprite[] = [];
  const poolMat = mat(new THREE.MeshBasicMaterial({ map: getGlowTexture(), color: 0xfff1c0, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
  const poolGeo = cache.get("beampool", () => new THREE.PlaneGeometry(3.4, 18).rotateX(-Math.PI / 2));
  const headAnchors: THREE.Object3D[] = [];
  const frontZ = -L / 2;
  const lightY = Math.min(beltY - 0.12, 0.85);
  for (const s of [-1, 1]) {
    add(box("head", 0.38, 0.12, 0.06), headMat, s * (W / 2 - 0.4), lightY, frontZ - 0.02);
    add(box("tail", 0.4, 0.12, 0.06), tailMat, s * (W / 2 - 0.35), lightY, -frontZ + 0.02);
    const a = new THREE.Object3D();
    a.position.set(s * (W / 2 - 0.4), lightY, frontZ);
    group.add(a);
    headAnchors.push(a);
    for (const [z, c, size] of [[frontZ - 0.1, 0xfff1c0, 1.1], [-frontZ + 0.1, 0xff2a2a, 0.9]] as const) {
      const sm = new THREE.SpriteMaterial({ map: getGlowTexture(), color: c, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.8 });
      glowMats.push(sm);
      const sp = new THREE.Sprite(sm);
      sp.scale.setScalar(size);
      sp.position.set(s * (W / 2 - (z < 0 ? 0.4 : 0.35)), lightY, z);
      group.add(sp);
      (z < 0 ? headGlows : tailGlows).push(sp);
    }
    // Light cast on the road ahead
    const pool = add(poolGeo, poolMat, s * (W / 2 - 0.5), 0.07, frontZ - 9.5);
    pool.renderOrder = 2;
  }

  // Bumpers, grille and number plates
  if (detailed) {
    const bumperY = bodyBottom + 0.16;
    add(box("bumpf", W - 0.14, 0.2, 0.14), dark, 0, bumperY, frontZ - 0.03);
    add(box("bumpr", W - 0.14, 0.2, 0.14), dark, 0, bumperY, -frontZ + 0.03);
    add(box("grille", W * 0.4, 0.16, 0.05), dark, 0, lightY - 0.02, frontZ - 0.04);
    add(box("grilleframe", W * 0.4 + 0.04, 0.02, 0.05), chrome, 0, lightY + 0.08, frontZ - 0.045);
    const plate = mat(new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.6 }));
    add(box("plater", 0.5, 0.12, 0.02), plate, 0, bumperY + 0.2, -frontZ + 0.1);
    add(box("platef", 0.5, 0.12, 0.02), plate, 0, bumperY + 0.2, frontZ - 0.1);
  }

  // Emergency liveries and light bar
  let tick: (t: number, on: boolean) => void = () => {};
  const accent = (c: number) => mat(new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 }));
  if (f.livery === "police") {
    const blue = accent(0x1d4ed8);
    for (const s of [-1, 1]) {
      add(box("pstripe", 0.012, 0.26, L * 0.72), blue, s * (W / 2 + 0.012), 0.74, 0);
      const label = new THREE.Mesh(
        cache.get("policelabel", () => new THREE.PlaneGeometry(1.7, 0.27)),
        mat(new THREE.MeshBasicMaterial({ map: getLabelTexture("POLICE"), transparent: true, depthWrite: false })),
      );
      label.position.set(s * (W / 2 + 0.022), 0.74, -0.3);
      label.rotation.y = s * (Math.PI / 2);
      group.add(label);
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
  const tyreGeo = cache.get(`${spec.id}:tyre`, () => new THREE.CylinderGeometry(R, R, tyreW, 28).rotateZ(Math.PI / 2));
  const rimGeo = cache.get(`${spec.id}:rim`, () => new THREE.CylinderGeometry(R * 0.62, R * 0.62, tyreW + 0.02, 20).rotateZ(Math.PI / 2));
  const spokeGeo = cache.get(`${spec.id}:spoke`, () => new THREE.BoxGeometry(tyreW + 0.04, 0.05, R * 1.2));
  const wellR = hasArches ? archR * 0.97 : R * 1.18;
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

  // Interior
  let steeringWheel: THREE.Object3D | null = null;
  if (detailed && cabin) {
    const seatGeo = box("seat", 0.5, 0.14, 0.5);
    const backGeo = box("seatback", 0.5, 0.55, 0.1);
    const mid = -(cabin[0][0] + cabin[3][0]) / 2;
    const seatY = cabin[0][1] - 0.2;
    for (const s of [-1, 1]) {
      for (const dz of [0.15, 0.95]) {
        add(seatGeo, interior, s * 0.45, seatY, mid + dz);
        add(backGeo, interior, s * 0.45, seatY + 0.3, mid + dz + 0.28);
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
    tick: (t, on) => tick(t, on),
    setLights: (night, braking) => {
      const on = Math.min(1, Math.max(0, (night - 0.15) / 0.5));
      headMat.emissiveIntensity = 0.25 + 3.2 * on;
      poolMat.opacity = on * 0.55;
      for (const g of headGlows) {
        (g.material as THREE.SpriteMaterial).opacity = 0.08 + 0.9 * on;
        g.scale.setScalar(1.1 + 1.2 * on);
      }
      tailMat.emissiveIntensity = braking ? 5 : 0.35 + 0.9 * on;
      for (const g of tailGlows) {
        (g.material as THREE.SpriteMaterial).opacity = braking ? 1 : 0.12 + 0.5 * on;
        g.scale.setScalar(braking ? 2.1 : 0.9);
      }
    },
    dispose: () => {
      mats.forEach((m) => m.dispose());
      glowMats.forEach((m) => m.dispose());
    },
  };
}

export type { BoxSpec };
