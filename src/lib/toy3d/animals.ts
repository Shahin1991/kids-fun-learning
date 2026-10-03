import * as THREE from "three";
import { Spring } from "./spring";
import { toyMaterial, unitCone, unitSphere } from "./scenery";

type EarKind = "none" | "floppy" | "pointy" | "round" | "side" | "tall";
type SnoutKind = "dog" | "cat" | "cow" | "pig" | "horse" | "lion" | "sheep";
type TailKind = "wag" | "long" | "tuft" | "curly" | "puff";

export interface AnimalSpec {
  id: string;
  kind: "quad" | "bird" | "frog";
  body: number;
  belly?: number;
  head?: number;
  accent: number;
  ears?: EarKind;
  snout?: SnoutKind;
  tail?: TailKind;
  mane?: boolean;
  wool?: boolean;
  spots?: boolean;
  horns?: boolean;
  /** overall scale */
  size?: number;
}

export const ANIMAL_SPECS: AnimalSpec[] = [
  { id: "dog", kind: "quad", body: 0xd9a066, belly: 0xf6e7cb, accent: 0x7a4a2a, ears: "floppy", snout: "dog", tail: "wag" },
  { id: "cat", kind: "quad", body: 0xff9f43, belly: 0xffe2bd, accent: 0xff8fa3, ears: "pointy", snout: "cat", tail: "long" },
  { id: "cow", kind: "quad", body: 0xffffff, accent: 0xf6a5b5, ears: "side", snout: "cow", tail: "tuft", spots: true, horns: true, size: 1.1 },
  { id: "duck", kind: "bird", body: 0xffd93d, accent: 0xff9f1c },
  { id: "pig", kind: "quad", body: 0xffa8c0, accent: 0xff7fa4, ears: "floppy", snout: "pig", tail: "curly" },
  { id: "sheep", kind: "quad", body: 0xffffff, head: 0x4a4a55, accent: 0x4a4a55, ears: "side", snout: "sheep", tail: "puff", wool: true, size: 1.05 },
  { id: "lion", kind: "quad", body: 0xf2b84b, belly: 0xffe1a0, accent: 0xb86a1e, ears: "round", snout: "lion", tail: "tuft", mane: true, size: 1.1 },
  { id: "frog", kind: "frog", body: 0x6bcb77, belly: 0xd9f5c8, accent: 0x3f9d52 },
  { id: "horse", kind: "quad", body: 0x9b6b43, belly: 0xb8875a, accent: 0x3b2a1e, ears: "tall", snout: "horse", tail: "long", mane: true, size: 1.2 },
  { id: "chick", kind: "bird", body: 0xffe45e, accent: 0xff9f1c, size: 0.8 },
];

export interface AnimalRig {
  group: THREE.Group;
  /** approximate top of the animal, for placing a speech bubble */
  height: number;
  update(dt: number, t: number, reduced: boolean): void;
  /** hop, squash on landing, perk the ears */
  cheer(): void;
}

const ell = (parent: THREE.Object3D, color: number, x: number, y: number, z: number, sx: number, sy = sx, sz = sx) => {
  const m = new THREE.Mesh(unitSphere, toyMaterial(color));
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  parent.add(m);
  return m;
};
const cone = (parent: THREE.Object3D, color: number, x: number, y: number, z: number, r: number, h: number) => {
  const m = new THREE.Mesh(unitCone, toyMaterial(color));
  m.position.set(x, y, z);
  m.scale.set(r, h, r);
  parent.add(m);
  return m;
};

function eye(parent: THREE.Object3D, x: number, y: number, z: number, r = 0.12) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  ell(g, 0xffffff, 0, 0, 0, r, r * 1.1, r * 0.7);
  ell(g, 0x1d1d28, 0, 0, r * 0.45, r * 0.62, r * 0.7, r * 0.4);
  ell(g, 0xffffff, r * 0.2, r * 0.25, r * 0.75, r * 0.2, r * 0.2, r * 0.15);
  parent.add(g);
  return g;
}

interface Parts {
  head: THREE.Object3D;
  body: THREE.Object3D;
  eyes: THREE.Object3D[];
  ears: THREE.Object3D[];
  tail: THREE.Object3D | null;
  tailKind: TailKind | null;
  top: number;
}

function buildQuad(s: AnimalSpec, root: THREE.Group): Parts {
  const body = ell(root, s.body, 0, 0.62, -0.1, 0.62, 0.55, 0.72);
  if (s.belly) ell(root, s.belly, 0, 0.5, 0.3, 0.42, 0.4, 0.34);
  for (const x of [-0.3, 0.3]) {
    ell(root, s.body === 0xffffff ? 0xeeeeee : s.body, x, 0.2, 0.38, 0.13, 0.22, 0.13);
    ell(root, s.accent, x, 0.05, 0.42, 0.15, 0.08, 0.17);
    ell(root, s.body, x * 1.2, 0.2, -0.5, 0.14, 0.22, 0.14);
  }
  if (s.wool) {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      ell(root, 0xffffff, Math.cos(a) * 0.5, 0.7 + Math.sin(i * 2.3) * 0.18, -0.1 + Math.sin(a) * 0.6, 0.3);
    }
    ell(root, 0xffffff, 0, 1.0, -0.1, 0.45, 0.3, 0.5);
  }
  if (s.spots) {
    ell(root, 0x2b2b33, 0.35, 0.95, -0.1, 0.2, 0.1, 0.24);
    ell(root, 0x2b2b33, -0.3, 0.8, -0.45, 0.18, 0.12, 0.2);
    ell(root, 0x2b2b33, 0.5, 0.55, -0.3, 0.1, 0.2, 0.2);
  }

  const head = new THREE.Group();
  head.position.set(0, 1.3, 0.35);
  root.add(head);
  const skull = ell(head, s.head ?? s.body, 0, 0, 0, 0.55, 0.5, 0.5);
  void skull;
  if (s.spots) ell(head, 0x2b2b33, -0.28, 0.18, 0.3, 0.2, 0.18, 0.15);
  const eyes = [eye(head, -0.2, 0.08, 0.4), eye(head, 0.2, 0.08, 0.4)];
  for (const x of [-0.32, 0.32]) ell(head, 0xff8fa3, x, -0.07, 0.36, 0.09, 0.05, 0.03);

  switch (s.snout) {
    case "dog":
    case "lion":
      ell(head, s.id === "lion" ? 0xffe1a0 : 0xf6e7cb, 0, -0.14, 0.42, 0.24, 0.18, 0.18);
      ell(head, 0x1d1d28, 0, -0.07, 0.58, 0.07, 0.05, 0.05);
      break;
    case "cat":
      ell(head, 0xffe2bd, -0.08, -0.14, 0.43, 0.1, 0.08, 0.08);
      ell(head, 0xffe2bd, 0.08, -0.14, 0.43, 0.1, 0.08, 0.08);
      ell(head, 0xff8fa3, 0, -0.06, 0.5, 0.05, 0.04, 0.03);
      break;
    case "cow":
      ell(head, 0xf6a5b5, 0, -0.17, 0.4, 0.32, 0.2, 0.2);
      for (const x of [-0.1, 0.1]) ell(head, 0x7a3a4a, x, -0.15, 0.58, 0.04, 0.05, 0.03);
      break;
    case "pig":
      ell(head, 0xff7fa4, 0, -0.1, 0.5, 0.2, 0.16, 0.12);
      for (const x of [-0.06, 0.06]) ell(head, 0x7a2a45, x, -0.1, 0.61, 0.035, 0.05, 0.03);
      break;
    case "horse":
      ell(head, 0xb8875a, 0, -0.25, 0.42, 0.25, 0.32, 0.28);
      for (const x of [-0.1, 0.1]) ell(head, 0x3b2a1e, x, -0.38, 0.66, 0.04, 0.05, 0.03);
      break;
    case "sheep":
      ell(head, 0x5a5a66, 0, -0.14, 0.42, 0.2, 0.15, 0.14);
      break;
    default:
      break;
  }

  const ears: THREE.Object3D[] = [];
  for (const side of [-1, 1]) {
    let e: THREE.Object3D | null = null;
    switch (s.ears) {
      case "floppy":
        e = ell(head, s.accent, side * 0.5, 0.05, 0.02, 0.13, 0.3, 0.1);
        e.rotation.z = side * 0.3;
        break;
      case "pointy":
        e = cone(head, s.body, side * 0.3, 0.55, -0.02, 0.17, 0.34);
        e.rotation.z = -side * 0.25;
        break;
      case "tall":
        e = cone(head, s.body, side * 0.22, 0.68, -0.05, 0.12, 0.42);
        e.rotation.z = -side * 0.15;
        break;
      case "round":
        e = ell(head, s.accent, side * 0.38, 0.38, 0, 0.14, 0.14, 0.08);
        break;
      case "side":
        e = ell(head, s.id === "cow" ? 0x2b2b33 : s.accent, side * 0.55, 0.16, 0.02, 0.22, 0.1, 0.09);
        e.rotation.z = -side * 0.25;
        break;
      default:
        break;
    }
    if (e) ears.push(e);
  }
  if (s.horns) for (const side of [-1, 1]) {
    const h = cone(head, 0xf1e3b8, side * 0.26, 0.55, 0.02, 0.07, 0.22);
    h.rotation.z = -side * 0.35;
  }
  if (s.mane) {
    if (s.id === "lion") {
      ell(head, 0xc9741f, 0, 0, -0.12, 0.85, 0.82, 0.4);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ell(head, 0xa95a14, Math.cos(a) * 0.72, Math.sin(a) * 0.68, -0.05, 0.2, 0.2, 0.2);
      }
    } else {
      ell(head, s.accent, 0, 0.3, -0.25, 0.14, 0.4, 0.14);
    }
  }

  let tail: THREE.Object3D | null = null;
  if (s.tail) {
    tail = new THREE.Group();
    tail.position.set(0, 0.8, -0.78);
    root.add(tail);
    switch (s.tail) {
      case "wag":
        ell(tail, s.accent, 0, 0.1, -0.1, 0.07, 0.07, 0.22).rotation.x = -0.5;
        break;
      case "long":
        ell(tail, s.body, 0, 0.18, -0.12, 0.07, 0.07, 0.34).rotation.x = -0.9;
        break;
      case "tuft":
        ell(tail, s.id === "lion" ? 0xc9741f : 0x2b2b33, 0, 0, -0.35, 0.1, 0.1, 0.1);
        ell(tail, s.body, 0, 0, -0.18, 0.04, 0.04, 0.18);
        break;
      case "curly": {
        const t = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 14, Math.PI * 1.6), toyMaterial(s.accent));
        t.position.set(0, 0.05, -0.1);
        tail.add(t);
        break;
      }
      case "puff":
        ell(tail, 0xffffff, 0, 0, -0.12, 0.16);
        break;
    }
  }
  return { head, body, eyes, ears, tail, tailKind: s.tail ?? null, top: 1.95 };
}

function buildBird(s: AnimalSpec, root: THREE.Group): Parts {
  const body = ell(root, s.body, 0, 0.55, 0, 0.62, 0.55, 0.55);
  const head = new THREE.Group();
  head.position.set(0, 1.18, 0.15);
  root.add(head);
  ell(head, s.body, 0, 0, 0, 0.4);
  const eyes = [eye(head, -0.16, 0.06, 0.3, 0.09), eye(head, 0.16, 0.06, 0.3, 0.09)];
  const beak = ell(head, s.accent, 0, -0.06, 0.4, 0.17, 0.07, 0.17);
  void beak;
  for (const x of [-0.26, 0.26]) ell(head, 0xff8fa3, x, -0.1, 0.25, 0.07, 0.04, 0.03);
  const ears: THREE.Object3D[] = [];
  for (const side of [-1, 1]) {
    const w = ell(root, s.id === "duck" ? 0xf5c518 : 0xffd23d, side * 0.6, 0.62, 0, 0.12, 0.3, 0.3);
    w.rotation.z = side * 0.4;
    ears.push(w);
    ell(root, s.accent, side * 0.2, 0.05, 0.25, 0.14, 0.05, 0.2);
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0.75, -0.55);
  root.add(tail);
  cone(tail, s.body, 0, 0.05, -0.1, 0.13, 0.3).rotation.x = -1.1;
  return { head, body, eyes, ears, tail, tailKind: "wag", top: 1.7 };
}

function buildFrog(s: AnimalSpec, root: THREE.Group): Parts {
  const body = ell(root, s.body, 0, 0.5, 0, 0.78, 0.55, 0.68);
  ell(root, s.belly ?? s.body, 0, 0.4, 0.3, 0.55, 0.38, 0.4);
  const head = new THREE.Group();
  head.position.set(0, 0.75, 0.25);
  root.add(head);
  const eyes = [] as THREE.Object3D[];
  for (const side of [-1, 1]) {
    ell(head, s.body, side * 0.3, 0.3, 0, 0.22);
    eyes.push(eye(head, side * 0.3, 0.33, 0.14, 0.15));
  }
  ell(head, 0x2f7d44, 0, -0.1, 0.5, 0.38, 0.04, 0.1);
  for (const x of [-0.5, 0.5]) ell(head, 0xff8fa3, x, -0.02, 0.35, 0.09, 0.05, 0.03);
  for (const side of [-1, 1]) {
    ell(root, s.body, side * 0.7, 0.2, -0.25, 0.24, 0.2, 0.34);
    ell(root, s.accent, side * 0.45, 0.06, 0.5, 0.2, 0.06, 0.16);
  }
  return { head, body, eyes, ears: [], tail: null, tailKind: null, top: 1.4 };
}

export function buildAnimal(id: string): AnimalRig {
  const spec = ANIMAL_SPECS.find((a) => a.id === id) ?? ANIMAL_SPECS[0];
  const group = new THREE.Group();
  const root = new THREE.Group();
  group.add(root);
  const parts = spec.kind === "quad" ? buildQuad(spec, root) : spec.kind === "bird" ? buildBird(spec, root) : buildFrog(spec, root);
  root.scale.setScalar(spec.size ?? 1);

  const phase = Math.random() * 6;
  const bodyBase = parts.body.scale.clone();
  const squash = new Spring(0, 0, 260, 9);
  let y = 0;
  let vy = 0;
  let airborne = false;
  let blinkIn = 1 + Math.random() * 3;
  let blinkT = 0;
  let perk = 0;

  return {
    group,
    height: parts.top * (spec.size ?? 1),
    cheer() {
      if (!airborne) {
        vy = 6.5;
        airborne = true;
      }
      perk = 1;
    },
    update(dt, t, reduced) {
      if (airborne) {
        vy -= 20 * dt;
        y += vy * dt;
        if (y <= 0) {
          y = 0;
          airborne = false;
          squash.kick(reduced ? 0 : 5);
        }
      }
      const s = squash.step(dt);
      root.position.y = y;
      root.scale.set((spec.size ?? 1) * (1 + s * 0.45), (spec.size ?? 1) * (1 - s * 0.6), (spec.size ?? 1) * (1 + s * 0.45));
      if (airborne) root.scale.y = (spec.size ?? 1) * 1.12;

      if (reduced) return;
      const breathe = Math.sin(t * 2.2 + phase) * 0.02;
      parts.head.rotation.y = Math.sin(t * 0.8 + phase) * 0.18;
      parts.head.rotation.z = Math.sin(t * 1.1 + phase) * 0.05 + (airborne ? 0.12 : 0);
      parts.body.scale.set(bodyBase.x, bodyBase.y * (1 + breathe * 1.5), bodyBase.z);

      if (parts.tail) {
        const speed = parts.tailKind === "wag" ? 9 : 2.4;
        const amp = parts.tailKind === "wag" ? 0.55 : 0.25;
        parts.tail.rotation.y = Math.sin(t * speed + phase) * amp;
      }
      perk = Math.max(0, perk - dt * 0.8);
      parts.ears.forEach((e, i) => {
        e.rotation.x = -perk * 0.4 + Math.sin(t * 7 + i + phase) * (Math.sin(t * 0.7 + phase) > 0.92 ? 0.25 : 0);
      });
      blinkIn -= dt;
      if (blinkIn <= 0) {
        blinkT = 0.16;
        blinkIn = 2 + Math.random() * 3.5;
      }
      blinkT = Math.max(0, blinkT - dt);
      const lid = blinkT > 0 ? 0.1 : 1;
      parts.eyes.forEach((e) => (e.scale.y = lid));
    },
  };
}
