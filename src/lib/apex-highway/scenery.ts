import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Small deterministic random generator so the scenery looks the same on every visit. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const vnoise = (x: number) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i) * (1 - u) + hash(i + 1) * u;
};
/** Ridged fractal noise 0..1: sharp peaks and valleys like real mountain ranges. */
function ridged(x: number, seed: number): number {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < 4; o++) {
    sum += amp * (1 - Math.abs(2 * vnoise(x * freq + seed * 17.3) - 1));
    norm += amp;
    amp *= 0.5;
    freq *= 2.0;
  }
  return sum / norm;
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mix3 = (a: number[], b: number[], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Heights of a mountain range along x (shared by the mesh and by tests). */
export function ridgeHeights(width: number, maxH: number, seed: number, step: number): number[] {
  const cols = Math.floor(width / step) + 1;
  return Array.from({ length: cols }, (_, i) => {
    const x = -width / 2 + i * step;
    const envelope = 0.4 + 0.6 * vnoise(x / 320 + seed * 3.1);
    return maxH * 0.1 + maxH * envelope * Math.pow(ridged(x / 200, seed), 1.3) * 1.2;
  });
}

/**
 * A mountain range as a vertex-coloured strip: forest at the foot, bare rock above, snow on the high peaks,
 * with the sunny side of each ridge lighter than the shaded side. Colours are multipliers for the material colour.
 */
export function ridgeGeometry(width: number, maxH: number, seed: number, snowAt: number, step = 4): THREE.BufferGeometry {
  const hs = ridgeHeights(width, maxH, seed, step);
  const rows = 9;
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const forest = [0.36, 0.5, 0.34];
  const scrub = [0.5, 0.52, 0.42];
  const rock = [0.7, 0.68, 0.66];
  const snow = [1.4, 1.43, 1.5];
  for (let i = 0; i < hs.length; i++) {
    const x = -width / 2 + i * step;
    // Slope over a wide window: per-column slopes alternate sharply and would stripe the ridge.
    const wnd = 5;
    const slope = (hs[Math.min(hs.length - 1, i + wnd)] - hs[Math.max(0, i - wnd)]) / (2 * wnd * step);
    const light = clamp(0.88 - slope * 0.9, 0.62, 1.12);
    for (let r = 0; r < rows; r++) {
      const t = Math.pow(r / (rows - 1), 0.85);
      const y = -14 + (hs[i] + 14) * t;
      let c = mix3(forest, scrub, clamp(y / (maxH * 0.25)));
      c = mix3(c, rock, clamp((y - maxH * 0.22) / (maxH * 0.2)));
      c = mix3(c, snow, clamp((y - snowAt) / (maxH * 0.07)));
      pos.push(x, y, 0);
      col.push(c[0] * light, c[1] * light, c[2] * light);
    }
  }
  for (let i = 0; i < hs.length - 1; i++) {
    for (let r = 0; r < rows - 1; r++) {
      const a = i * rows + r;
      const b = (i + 1) * rows + r;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

const ni = (g: THREE.BufferGeometry) => (g.index ? g.toNonIndexed() : g);

function jitter(g: THREE.BufferGeometry, amount: number, seed: number): THREE.BufferGeometry {
  const r = rng(seed);
  const p = g.attributes.position as THREE.BufferAttribute;
  // Same offset for vertices at the same place, so the shape stays closed.
  const seen = new Map<string, [number, number, number]>();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    let o = seen.get(key);
    if (!o) {
      o = [(r() - 0.5) * amount, (r() - 0.5) * amount * 0.6, (r() - 0.5) * amount];
      seen.set(key, o);
    }
    p.setXYZ(i, p.getX(i) + o[0], p.getY(i) + o[1], p.getZ(i) + o[2]);
  }
  g.computeVertexNormals();
  return g;
}

export interface TreeKit {
  pine: THREE.BufferGeometry;
  oak: THREE.BufferGeometry;
  poplar: THREE.BufferGeometry;
  bush: THREE.BufferGeometry;
  trunk: THREE.BufferGeometry;
}

/** Low-poly but irregular trees: layered pines, lumpy oaks, slim poplars, bushes. */
export function makeTreeKit(): TreeKit {
  const cone = (r: number, h: number, y: number, seed: number) => jitter(ni(new THREE.ConeGeometry(r, h, 9, 1).translate(0, y + h / 2, 0)), r * 0.22, seed);
  const blob = (r: number, x: number, y: number, z: number, seed: number) => jitter(new THREE.IcosahedronGeometry(r, 1).translate(x, y, z), r * 0.28, seed);
  const pine = mergeGeometries([cone(2.2, 2.9, 1.9, 1), cone(1.8, 2.7, 3.4, 2), cone(1.4, 2.4, 4.9, 3), cone(0.95, 2.1, 6.3, 4), cone(0.5, 1.4, 7.6, 5)])!;
  const oak = mergeGeometries([blob(2.0, 0, 4.2, 0, 7), blob(1.5, 1.3, 3.5, 0.6, 8), blob(1.55, -1.2, 3.6, -0.7, 9), blob(1.3, 0.2, 5.4, 0.2, 10), blob(1.2, -0.4, 3.4, 1.4, 11)])!;
  const poplar = jitter(ni(new THREE.IcosahedronGeometry(1.35, 1).scale(0.72, 3.1, 0.72).translate(0, 5.0, 0)), 0.3, 12);
  const bush = mergeGeometries([blob(0.9, 0, 0.55, 0, 13), blob(0.65, 0.8, 0.4, 0.2, 14), blob(0.6, -0.7, 0.4, -0.2, 15)])!;
  const trunk = new THREE.CylinderGeometry(0.2, 0.36, 3.4, 6).translate(0, 1.7, 0);
  return { pine, oak, poplar, bush, trunk };
}

const PINE_GREENS = [0x1f5d34, 0x24663a, 0x2c7040, 0x1b5530];
const OAK_GREENS = [0x3e8e41, 0x4a9a43, 0x56a548, 0x35803c, 0x6aa84f];
const AUTUMN = [0xd9822b, 0xe0a030, 0xc4552b];
const POPLAR_GREENS = [0x5faa45, 0x6db84c, 0x4e9a3e];

export interface NatureOptions {
  /** Distance after which the layout repeats */
  period: number;
  copies: number;
  /** z of the first copy's start */
  origin: number;
}

/** Trees, bushes and rocks for the countryside, laid out over one period and repeated. Returns the group and the materials to tint at night. */
export function buildNature(opts: NatureOptions): { group: THREE.Group; materials: THREE.MeshStandardMaterial[] } {
  const { period, copies, origin } = opts;
  const kit = makeTreeKit();
  const r = rng(2024);
  const group = new THREE.Group();
  const mats: THREE.MeshStandardMaterial[] = [];
  const mk = (color: number, flat = true) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: flat });
    mats.push(m);
    return m;
  };
  const trunkMat = mk(0x5d4037, false);
  const leafMat = mk(0xffffff);
  const rockMat = mk(0x7b7f86);

  interface Item { x: number; z: number; s: number; rot: number; color: number }
  const side = (count: number, xMin: number, xMax: number, sMin: number, sMax: number, colors: number[], autumn = 0): Item[] =>
    Array.from({ length: count }, () => ({
      x: xMin + r() * (xMax - xMin),
      z: r() * period,
      s: sMin + r() * (sMax - sMin),
      rot: r() * Math.PI * 2,
      color: r() < autumn ? AUTUMN[Math.floor(r() * AUTUMN.length)] : colors[Math.floor(r() * colors.length)],
    }));

  const species: { name: keyof TreeKit; items: Item[]; hasTrunk: boolean }[] = [
    { name: "pine", items: side(7, 12, 42, 0.8, 1.55, PINE_GREENS), hasTrunk: true },
    { name: "oak", items: side(5, 13, 46, 0.8, 1.5, OAK_GREENS, 0.12), hasTrunk: true },
    { name: "poplar", items: side(3, 14, 38, 0.8, 1.4, POPLAR_GREENS), hasTrunk: true },
    { name: "pine", items: side(16, 60, 140, 1.6, 3.0, PINE_GREENS), hasTrunk: false },
    { name: "bush", items: side(6, 7.4, 11, 0.7, 1.4, OAK_GREENS), hasTrunk: false },
  ];

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const place = (mesh: THREE.InstancedMesh, k: number, x: number, y: number, z: number, s: number, rot: number, squash = 1) => {
    q.setFromEuler(e.set(0, rot, 0));
    m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s * squash, s));
    mesh.setMatrixAt(k, m4);
  };

  for (const sp of species) {
    const n = sp.items.length * 2 * copies;
    const leaves = new THREE.InstancedMesh(kit[sp.name], leafMat, n);
    const trunks = sp.hasTrunk ? new THREE.InstancedMesh(kit.trunk, trunkMat, n) : null;
    let k = 0;
    const c = new THREE.Color();
    for (let copy = 0; copy < copies; copy++) {
      for (const sd of [-1, 1]) {
        for (const it of sp.items) {
          const z = origin - copy * period - it.z;
          const squash = 0.85 + ((it.rot * 7) % 1) * 0.35;
          place(leaves, k, sd * it.x, 0, z, it.s, it.rot, squash);
          if (trunks) place(trunks, k, sd * it.x, 0, z, it.s, it.rot);
          c.setHex(it.color).offsetHSL(0, 0, (((it.rot * 13) % 1) - 0.5) * 0.06);
          leaves.setColorAt(k, c);
          k++;
        }
      }
    }
    leaves.instanceMatrix.needsUpdate = true;
    if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
    leaves.frustumCulled = false;
    group.add(leaves);
    if (trunks) {
      trunks.frustumCulled = false;
      group.add(trunks);
    }
  }

  // Rocks
  const rockItems = side(4, 9, 32, 0.4, 1.3, [0x7b7f86]);
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), rockMat, rockItems.length * 2 * copies);
  let k = 0;
  for (let copy = 0; copy < copies; copy++) {
    for (const sd of [-1, 1]) {
      for (const it of rockItems) {
        place(rocks, k++, sd * it.x, 0.3 * it.s, origin - copy * period - it.z, it.s, it.rot, 0.7);
      }
    }
  }
  rocks.frustumCulled = false;
  group.add(rocks);
  return { group, materials: mats };
}

// ---------------------------------------------------------------- city

export interface Archetype { w: number; d: number; h: number; row: "near" | "mid" | "far" }
export const ARCHETYPES: Archetype[] = [
  { w: 9, d: 12, h: 12, row: "near" },
  { w: 12, d: 14, h: 18, row: "near" },
  { w: 10, d: 16, h: 25, row: "near" },
  { w: 14, d: 18, h: 38, row: "mid" },
  { w: 16, d: 20, h: 54, row: "mid" },
  { w: 18, d: 22, h: 84, row: "far" },
  { w: 20, d: 24, h: 116, row: "far" },
];

/** Window pattern tile: 3 columns x 3 floors, drawn twice (glass and lit windows) from the same grid. */
export function makeFacadeTextures(): { map: THREE.CanvasTexture; emissive: THREE.CanvasTexture } {
  const S = 256;
  const draw = (lit: boolean) => {
    const c = document.createElement("canvas");
    c.width = c.height = S;
    const g = c.getContext("2d")!;
    const r = rng(lit ? 99 : 98);
    const rl = rng(5); // same lit/unlit pattern for both
    g.fillStyle = lit ? "#000" : "#cbc5b8";
    g.fillRect(0, 0, S, S);
    const cw = S / 3;
    const ch = S / 3;
    for (let cx = 0; cx < 3; cx++) {
      for (let cy = 0; cy < 3; cy++) {
        const on = rl() < 0.45;
        const x = cx * cw + cw * 0.17;
        const y = cy * ch + ch * 0.2;
        const w = cw * 0.66;
        const h = ch * 0.56;
        if (lit) {
          if (!on) continue;
          g.fillStyle = r() < 0.2 ? "#bfe3ff" : "#ffd27a";
        } else {
          g.fillStyle = on ? "#9fc4de" : "#3d5468";
        }
        g.fillRect(x, y, w, h);
        if (!lit) {
          g.fillStyle = "rgba(255,255,255,0.25)";
          g.fillRect(x, y, w * 0.35, h);
          g.strokeStyle = "#b9b3a6";
          g.lineWidth = 4;
          g.strokeRect(x, y, w, h);
        }
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  };
  return { map: draw(false), emissive: draw(true) };
}

/** A box whose window texture tiles at a constant real-world size, and whose roof is flat. */
export function buildingGeometry(a: Archetype): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(a.w, a.h, a.d);
  g.translate(0, a.h / 2, 0);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  // Face order: +x, -x, +y, -y, +z, -z; four vertices each.
  const faces: [number, number, number][] = [[0, a.d, a.h], [1, a.d, a.h], [4, a.w, a.h], [5, a.w, a.h]];
  for (const [f, width, height] of faces) {
    for (let i = f * 4; i < f * 4 + 4; i++) uv.setXY(i, (uv.getX(i) * width) / 12, (uv.getY(i) * height) / 10.5);
  }
  return g;
}

export interface CityPieces {
  group: THREE.Group;
  facade: THREE.MeshStandardMaterial;
  textures: THREE.Texture[];
}

/** Streets lined with shops and towers, laid out over one period and repeated. */
export function buildCity(opts: NatureOptions): CityPieces {
  const { period, copies, origin } = opts;
  const r = rng(7);
  const group = new THREE.Group();
  const { map, emissive } = makeFacadeTextures();
  const facade = new THREE.MeshStandardMaterial({ map, emissiveMap: emissive, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.75 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x70747a, roughness: 1 });
  const mats = [facade, facade, roof, roof, facade, facade];
  const TINTS = [0xf4f1ea, 0xe9d2b8, 0xcddbe8, 0xdcc7b0, 0xc4c7cc, 0xe3c0b3, 0xb9c9bd];

  interface B { arch: number; x: number; z: number; sx: number; tint: number }
  const placed: B[] = [];
  // Fill each row along z without overlaps.
  const fill = (row: Archetype["row"], xBase: number, gapMin: number, gapMax: number) => {
    const options = ARCHETYPES.map((a, i) => ({ a, i })).filter((o) => o.a.row === row);
    for (const sd of [-1, 1]) {
      let z = r() * 6;
      while (z < period) {
        const o = options[Math.floor(r() * options.length)];
        const depth = o.a.d;
        if (z + depth > period) break;
        const sx = 0.92 + r() * 0.16;
        placed.push({ arch: o.i, x: sd * (xBase + (o.a.w * sx) / 2 + r() * 2), z: z + depth / 2, sx, tint: TINTS[Math.floor(r() * TINTS.length)] });
        z += depth + gapMin + r() * (gapMax - gapMin);
      }
    }
  };
  fill("near", 12.5, 1.5, 5);
  fill("mid", 30, 2, 8);
  fill("far", 52, 4, 14);

  const m4 = new THREE.Matrix4();
  ARCHETYPES.forEach((a, ai) => {
    const mine = placed.filter((b) => b.arch === ai);
    if (!mine.length) return;
    const mesh = new THREE.InstancedMesh(buildingGeometry(a), mats, mine.length * copies);
    let k = 0;
    const c = new THREE.Color();
    for (let copy = 0; copy < copies; copy++) {
      for (const b of mine) {
        m4.compose(new THREE.Vector3(b.x, 0, origin - copy * period - b.z), new THREE.Quaternion(), new THREE.Vector3(b.sx, 1, 1));
        mesh.setMatrixAt(k, m4);
        mesh.setColorAt(k, c.setHex(b.tint));
        k++;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.frustumCulled = false;
    group.add(mesh);
  });

  // Bright shop signs facing the road on the near buildings.
  const signGeo = new THREE.BoxGeometry(0.25, 1.8, 5);
  const nearOnes = placed.filter((b) => ARCHETYPES[b.arch].row === "near" && r() < 0.6);
  const signs = new THREE.InstancedMesh(signGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), nearOnes.length * copies);
  const SIGN = [0xff4d6d, 0x4dabff, 0xffd43b, 0x51cf66, 0xff922b, 0xcc5de8];
  let k = 0;
  for (let copy = 0; copy < copies; copy++) {
    for (const b of nearOnes) {
      const sd = Math.sign(b.x);
      const a = ARCHETYPES[b.arch];
      m4.compose(new THREE.Vector3(b.x - sd * (a.w * b.sx) / 2 - sd * 0.1, 4.5 + r() * 3, origin - copy * period - b.z + (r() - 0.5) * 3), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
      signs.setMatrixAt(k, m4);
      signs.setColorAt(k, new THREE.Color(SIGN[Math.floor(r() * SIGN.length)]));
      k++;
    }
  }
  signs.frustumCulled = false;
  group.add(signs);
  return { group, facade, textures: [map, emissive] };
}

/** A distant skyline: merged towers with vertex colours (lighter at the top), plus window lights as points for the night. */
export function skylineGeometry(width: number, seed: number, minH: number, maxH: number): { geo: THREE.BufferGeometry; lights: THREE.BufferGeometry } {
  const r = rng(seed);
  const parts: THREE.BufferGeometry[] = [];
  const lightPos: number[] = [];
  let x = -width / 2;
  while (x < width / 2) {
    const w = 14 + r() * 30;
    const h = minH + Math.pow(r(), 1.7) * (maxH - minH);
    const b = new THREE.BoxGeometry(w, h + 14, 18).translate(x + w / 2, (h - 14) / 2, 0);
    const pos = b.attributes.position as THREE.BufferAttribute;
    const col: number[] = [];
    const base = 0.55 + r() * 0.2;
    for (let i = 0; i < pos.count; i++) {
      const t = clamp((pos.getY(i) + 14) / (h + 14));
      const v = base * (0.7 + 0.45 * t);
      col.push(v, v * 1.02, v * 1.08);
    }
    b.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    parts.push(b);
    for (let i = 0; i < Math.floor((w * h) / 90); i++) lightPos.push(x + 1.5 + r() * (w - 3), 2 + r() * (h - 4), 9.2);
    x += w + r() * 6;
  }
  const geo = mergeGeometries(parts.map(ni))!;
  const lights = new THREE.BufferGeometry();
  lights.setAttribute("position", new THREE.Float32BufferAttribute(lightPos, 3));
  return { geo, lights };
}

// ---------------------------------------------------------------- ground

/** A mottled meadow that tiles every 40 m along the road (so recycling the road never shows a seam). */
export function makeGrassTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d")!;
  const r = rng(31);
  g.fillStyle = "#5b9a45";
  g.fillRect(0, 0, 512, 512);
  const wrapBlob = (x: number, y: number, rad: number, color: string) => {
    for (const ox of [-512, 0, 512]) {
      for (const oy of [-512, 0, 512]) {
        const grad = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
        grad.addColorStop(0, color);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = grad;
        g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
      }
    }
  };
  for (let i = 0; i < 60; i++) wrapBlob(r() * 512, r() * 512, 40 + r() * 90, r() < 0.5 ? "rgba(84,140,60,0.5)" : r() < 0.6 ? "rgba(112,168,72,0.45)" : "rgba(60,110,50,0.45)");
  for (let i = 0; i < 6000; i++) {
    const v = r();
    g.fillStyle = v < 0.5 ? "rgba(40,90,40,0.35)" : "rgba(150,200,90,0.3)";
    g.fillRect(r() * 512, r() * 512, 1 + r() * 2, 2 + r() * 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** Paving for the city: light concrete slabs with joints. */
export function makeCityGroundTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const r = rng(77);
  g.fillStyle = "#a9a9a4";
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2500; i++) {
    const v = 150 + r() * 40;
    g.fillStyle = `rgba(${v},${v},${v - 4},0.35)`;
    g.fillRect(r() * 256, r() * 256, 1 + r() * 3, 1 + r() * 3);
  }
  g.strokeStyle = "rgba(70,70,72,0.55)";
  g.lineWidth = 3;
  for (let i = 0; i <= 256; i += 64) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i, 256);
    g.moveTo(0, i);
    g.lineTo(256, i);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
