import * as THREE from "three";
import type { PipeShape } from "./recipe";

/** Tier sizes, bottom to top. */
export const TIER_R = [1.05, 0.8, 0.58];
export const TIER_H = 0.55;

const SIDE_W = 512;
const SIDE_H = 128;
const SIDE_COLS = 16;
const SIDE_ROWS = 4;
const TOP_SIZE = 256;
const TOP_N = 8;

/** Shared geometries and materials, all disposed together. */
export class Assets {
  private geos = new Map<string, THREE.BufferGeometry>();
  private mats = new Map<string, THREE.Material>();
  geo<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
    let g = this.geos.get(key);
    if (!g) this.geos.set(key, (g = make()));
    return g as T;
  }
  mat(color: string | number, opts: { rough?: number; emissive?: number; metal?: number } = {}): THREE.MeshStandardMaterial {
    const key = `${color}|${opts.rough ?? ""}|${opts.emissive ?? ""}|${opts.metal ?? ""}`;
    let m = this.mats.get(key) as THREE.MeshStandardMaterial | undefined;
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.55, metalness: opts.metal ?? 0 });
      if (opts.emissive !== undefined) {
        m.emissive = new THREE.Color(opts.emissive);
        m.emissiveIntensity = 1;
      }
      this.mats.set(key, m);
    }
    return m;
  }
  dispose() {
    this.geos.forEach((g) => g.dispose());
    this.mats.forEach((m) => m.dispose());
    this.geos.clear();
    this.mats.clear();
  }
}

/** One round layer: a cylinder whose side and top are canvases that frosting is painted on. */
export class Tier {
  readonly group = new THREE.Group();
  readonly mesh: THREE.Mesh;
  readonly radius: number;
  private side: HTMLCanvasElement;
  private top: HTMLCanvasElement;
  private sideTex: THREE.CanvasTexture;
  private topTex: THREE.CanvasTexture;
  private sideCells = new Int8Array(SIDE_COLS * SIDE_ROWS).fill(-1);
  private topCells = new Int8Array(TOP_N * TOP_N).fill(-1);
  private topInside: boolean[];
  private mats: THREE.MeshStandardMaterial[];
  private geo: THREE.CylinderGeometry;

  constructor(readonly index: number, private sponge: string) {
    this.radius = TIER_R[index];
    this.side = this.canvas(SIDE_W, SIDE_H);
    this.top = this.canvas(TOP_SIZE, TOP_SIZE);
    this.sideTex = this.texture(this.side);
    this.topTex = this.texture(this.top);
    this.sideTex.wrapS = THREE.RepeatWrapping;
    this.fill(this.side, SIDE_W, SIDE_H);
    this.fill(this.top, TOP_SIZE, TOP_SIZE);
    this.topInside = Array.from({ length: TOP_N * TOP_N }, (_, i) => {
      const x = ((i % TOP_N) + 0.5) / TOP_N - 0.5;
      const y = (Math.floor(i / TOP_N) + 0.5) / TOP_N - 0.5;
      return Math.hypot(x, y) <= 0.5;
    });
    this.mats = [
      new THREE.MeshStandardMaterial({ map: this.sideTex, roughness: 0.7 }),
      new THREE.MeshStandardMaterial({ map: this.topTex, roughness: 0.7 }),
      new THREE.MeshStandardMaterial({ color: sponge, roughness: 0.8 }),
    ];
    this.geo = new THREE.CylinderGeometry(this.radius, this.radius, TIER_H, 56, 1);
    this.mesh = new THREE.Mesh(this.geo, this.mats);
    this.mesh.position.y = TIER_H / 2;
    this.group.add(this.mesh);
  }

  private canvas(w: number, h: number) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }
  private texture(c: HTMLCanvasElement) {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  /** Sponge colour with a few crumbs so bare cake does not look flat. */
  private fill(c: HTMLCanvasElement, w: number, h: number) {
    const g = c.getContext("2d")!;
    g.fillStyle = this.sponge;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(0,0,0,0.07)";
    for (let i = 0; i < 70; i++) {
      g.beginPath();
      g.arc(Math.abs(Math.sin(i * 91.3)) * w, Math.abs(Math.sin(i * 17.7)) * h, 1.5 + Math.abs(Math.sin(i * 3.1)) * 2.5, 0, Math.PI * 2);
      g.fill();
    }
  }

  /** Paint one brush dab at a ray hit; `face` is the geometry material index (0 side, 1 top). */
  paint(face: number, uv: THREE.Vector2, color: string, colorIndex: number) {
    if (face === 0) {
      const x = uv.x * SIDE_W;
      const y = (1 - uv.y) * SIDE_H;
      this.dab(this.side, x, y, 30, color, SIDE_W);
      this.mark(this.sideCells, SIDE_COLS, SIDE_ROWS, uv.x, 1 - uv.y, colorIndex, 0.05, 0.2, true);
      this.sideTex.needsUpdate = true;
    } else if (face === 1) {
      const x = uv.x * TOP_SIZE;
      const y = (1 - uv.y) * TOP_SIZE;
      this.dab(this.top, x, y, 26, color, TOP_SIZE);
      this.mark(this.topCells, TOP_N, TOP_N, uv.x, 1 - uv.y, colorIndex, 0.1, 0.1, false);
      this.topTex.needsUpdate = true;
    }
  }

  private dab(c: HTMLCanvasElement, x: number, y: number, r: number, color: string, wrapW: number) {
    const g = c.getContext("2d")!;
    const draw = (cx: number) => {
      g.fillStyle = color;
      g.beginPath();
      g.arc(cx, y, r, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "rgba(255,255,255,0.22)";
      g.beginPath();
      g.arc(cx - r * 0.25, y - r * 0.3, r * 0.55, 0, Math.PI * 2);
      g.fill();
    };
    draw(x);
    if (x < r) draw(x + wrapW);
    if (x > wrapW - r) draw(x - wrapW);
  }

  private mark(cells: Int8Array, cols: number, rows: number, u: number, v: number, idx: number, du: number, dv: number, wrap: boolean) {
    for (const ox of [-du, 0, du]) {
      for (const oy of [-dv, 0, dv]) {
        let uu = u + ox;
        if (wrap) uu = ((uu % 1) + 1) % 1;
        const vv = v + oy;
        if (uu < 0 || uu >= 1 || vv < 0 || vv >= 1) continue;
        cells[Math.floor(vv * rows) * cols + Math.floor(uu * cols)] = idx;
      }
    }
  }

  /** Share of the frostable surface that is covered, 0..1. */
  coverage(): number {
    let inside = 0;
    let done = 0;
    for (const c of this.sideCells) {
      inside++;
      if (c >= 0) done++;
    }
    this.topCells.forEach((c, i) => {
      if (!this.topInside[i]) return;
      inside++;
      if (c >= 0) done++;
    });
    return inside ? done / inside : 0;
  }

  /** How many cells each frosting colour index covers. */
  tally(into: Map<number, number>) {
    const add = (c: number) => c >= 0 && into.set(c, (into.get(c) ?? 0) + 1);
    this.sideCells.forEach(add);
    this.topCells.forEach((c, i) => this.topInside[i] && add(c));
  }

  coverAll(color: string, colorIndex: number) {
    for (const [c, w, h] of [[this.side, SIDE_W, SIDE_H], [this.top, TOP_SIZE, TOP_SIZE]] as const) {
      const g = c.getContext("2d")!;
      g.fillStyle = color;
      g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(255,255,255,0.14)";
      g.fillRect(0, 0, w, h * 0.18);
    }
    this.sideCells.fill(colorIndex);
    this.topCells.fill(colorIndex);
    this.sideTex.needsUpdate = true;
    this.topTex.needsUpdate = true;
  }

  dispose() {
    this.geo.dispose();
    this.mats.forEach((m) => m.dispose());
    this.sideTex.dispose();
    this.topTex.dispose();
  }
}

const starShape = (outer: number, inner: number, points = 5) => {
  const s = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i) s.lineTo(x, y);
    else s.moveTo(x, y);
  }
  s.closePath();
  return s;
};

const heartShape = () => {
  const s = new THREE.Shape();
  s.moveTo(0, -0.12);
  s.bezierCurveTo(-0.2, 0.02, -0.12, 0.17, 0, 0.08);
  s.bezierCurveTo(0.12, 0.17, 0.2, 0.02, 0, -0.12);
  return s;
};

const flatExtrude = (shape: THREE.Shape, depth: number) => {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 });
  g.rotateX(-Math.PI / 2); // lie flat, facing +Y
  return g;
};

/** Low-poly toppings. Each stands on +Y (the surface normal is aligned to it by the caller). */
export function makeTopping(id: string, a: Assets): THREE.Group {
  const g = new THREE.Group();
  const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  switch (id) {
    case "strawberry": {
      const b = mesh(a.geo("sb", () => new THREE.SphereGeometry(0.13, 16, 12)), a.mat("#f2384f"), 0, 0.12);
      b.scale.set(1, 1.2, 1);
      mesh(a.geo("sbleaf", () => new THREE.ConeGeometry(0.09, 0.05, 6)), a.mat("#3fae4a"), 0, 0.27).rotation.x = Math.PI;
      for (let i = 0; i < 6; i++) mesh(a.geo("seed", () => new THREE.SphereGeometry(0.012, 5, 4)), a.mat("#ffe9a0"), Math.cos(i * 1.05) * 0.11, 0.08 + (i % 3) * 0.05, Math.sin(i * 1.05) * 0.11);
      break;
    }
    case "cherry": {
      mesh(a.geo("ch", () => new THREE.SphereGeometry(0.1, 16, 12)), a.mat("#c4122f", { rough: 0.25 }), 0, 0.1);
      const stem = mesh(a.geo("chstem", () => new THREE.CylinderGeometry(0.01, 0.01, 0.2, 5)), a.mat("#3a7a34"), 0.03, 0.27);
      stem.rotation.z = -0.3;
      break;
    }
    case "star":
      mesh(a.geo("star", () => flatExtrude(starShape(0.17, 0.08), 0.05)), a.mat("#ffcf33", { metal: 0.4, rough: 0.3 }), 0, 0.02);
      break;
    case "heart":
      mesh(a.geo("heart", () => flatExtrude(heartShape(), 0.06)), a.mat("#ff4f8b"), 0, 0.02);
      break;
    case "flower":
      for (let i = 0; i < 5; i++) {
        const p = mesh(a.geo("petal", () => new THREE.SphereGeometry(0.07, 10, 8)), a.mat("#ffa6c9"), Math.cos((i / 5) * 6.283) * 0.09, 0.04, Math.sin((i / 5) * 6.283) * 0.09);
        p.scale.set(1, 0.5, 1);
      }
      mesh(a.geo("fcenter", () => new THREE.SphereGeometry(0.05, 10, 8)), a.mat("#ffd84a"), 0, 0.06);
      break;
    case "candy": {
      mesh(a.geo("candy", () => new THREE.SphereGeometry(0.08, 12, 10)), a.mat("#ff5da2"), 0, 0.09);
      for (const s of [-1, 1]) {
        const w = mesh(a.geo("wrap", () => new THREE.ConeGeometry(0.06, 0.1, 6)), a.mat("#7fd6ff"), s * 0.12, 0.09);
        w.rotation.z = (s * Math.PI) / 2;
      }
      break;
    }
    case "candle": {
      mesh(a.geo("candle", () => new THREE.CylinderGeometry(0.04, 0.04, 0.4, 10)), a.mat("#7fd6ff"), 0, 0.2);
      for (let i = 0; i < 3; i++) mesh(a.geo("cstripe", () => new THREE.TorusGeometry(0.041, 0.008, 4, 10)), a.mat("#ffffff"), 0, 0.1 + i * 0.1).rotation.x = Math.PI / 2;
      const flame = mesh(a.geo("flame", () => new THREE.ConeGeometry(0.05, 0.14, 8)), a.mat("#ffb347", { emissive: 0xffa630 }), 0, 0.47);
      flame.name = "flame";
      break;
    }
    case "sprinkles": {
      const cols = ["#ff5a6e", "#ffd93d", "#4cd97b", "#3ab7ff", "#a66cff", "#ffffff"];
      for (let i = 0; i < 12; i++) {
        const m = mesh(a.geo("sprk", () => new THREE.BoxGeometry(0.1, 0.025, 0.025)), a.mat(cols[i % cols.length]), Math.cos(i * 2.4) * 0.28 * Math.sqrt((i + 1) / 12), 0.02, Math.sin(i * 2.4) * 0.28 * Math.sqrt((i + 1) / 12));
        m.rotation.y = i * 1.3;
      }
      break;
    }
  }
  return g;
}

/** A piped blob of icing. */
export function makePipe(shape: PipeShape, color: string, a: Assets): THREE.Group {
  const g = new THREE.Group();
  const mat = a.mat(color, { rough: 0.35 });
  if (shape === "dot") {
    const m = new THREE.Mesh(a.geo("pdot", () => new THREE.SphereGeometry(0.075, 12, 10)), mat);
    m.scale.set(1, 0.8, 1);
    m.position.y = 0.04;
    g.add(m);
  } else if (shape === "star") {
    const m = new THREE.Mesh(a.geo("pstar", () => flatExtrude(starShape(0.1, 0.055, 6), 0.08)), mat);
    m.position.y = 0.01;
    g.add(m);
  } else {
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(a.geo("pswirl", () => new THREE.ConeGeometry(0.1, 0.12, 10)), mat);
      m.scale.setScalar(1 - i * 0.28);
      m.position.y = 0.05 + i * 0.07;
      m.rotation.y = i * 0.8;
      g.add(m);
    }
  }
  return g;
}
