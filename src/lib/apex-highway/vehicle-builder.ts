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
  glowTexture?.dispose();
  glowTexture = null;
}

export interface BuiltVehicle {
  group: THREE.Group;
  spec: VehicleSpec;
  spinGroups: THREE.Group[];
  steerGroups: THREE.Group[];
  steeringWheel: THREE.Object3D | null;
  headAnchors: THREE.Object3D[];
  setPaint: (hex: string) => void;
  setBrake: (on: boolean) => void;
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

  const extrude = (key: string, pts: [number, number][], width: number, bevel: number) =>
    cache.get(`${spec.id}:${key}`, () => {
      const shape = new THREE.Shape();
      pts.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: width - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 6 });
      geo.translate(0, 0, -(width - bevel * 2) / 2);
      geo.rotateY(Math.PI / 2);
      return toCreasedNormals(geo, Math.PI / 5);
    });

  add(extrude("body", spec.body, W - 0.1, 0.06), paint, 0, 0, 0, true);
  for (const b of spec.boxes ?? []) add(box(`box${b.x0}`, W - 0.05, b.y1 - b.y0, b.x1 - b.x0), paint, 0, (b.y0 + b.y1) / 2, -(b.x0 + b.x1) / 2, true);

  const cabin = spec.cabin;
  if (cabin) {
    add(extrude("cabin", cabin, W - 0.22, 0.03), glass, 0, 0, 0);
    // Roof slab and pillars
    const roofLen = cabin[2][0] - cabin[1][0];
    const roofY = cabin[1][1];
    add(box("roof", W - 0.2, 0.06, roofLen + 0.1), paint, 0, roofY + 0.02, -(cabin[1][0] + cabin[2][0]) / 2, true);
    const bar = (a: [number, number], b: [number, number], x: number) => {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const m = add(box(`bar${a}${b}`, 0.07, len, 0.07), paint, x, (a[1] + b[1]) / 2, -(a[0] + b[0]) / 2);
      m.rotation.x = Math.atan2(-(b[0] - a[0]), b[1] - a[1]);
    };
    for (const s of [-1, 1]) {
      const x = s * (W / 2 - 0.1);
      bar(cabin[3], cabin[2], x);
      bar(cabin[0], cabin[1], x);
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
  if (spec.id === "bus") {
    add(box("busfront", W - 0.3, 0.9, 0.03), glass, 0, 2.2, -(4.5 + 0.02));
    add(box("busrear", W - 0.6, 0.6, 0.03), glass, 0, 2.2, 4.5 + 0.02);
  }

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
    }
  }

  // Wheels with arches
  const spinGroups: THREE.Group[] = [];
  const steerGroups: THREE.Group[] = [];
  const R = spec.wheelRadius;
  const tyreW = 0.26;
  const tyreGeo = cache.get(`${spec.id}:tyre`, () => new THREE.CylinderGeometry(R, R, tyreW, 28).rotateZ(Math.PI / 2));
  const rimGeo = cache.get(`${spec.id}:rim`, () => new THREE.CylinderGeometry(R * 0.62, R * 0.62, tyreW + 0.02, 20).rotateZ(Math.PI / 2));
  const spokeGeo = cache.get(`${spec.id}:spoke`, () => new THREE.BoxGeometry(tyreW + 0.04, 0.05, R * 1.2));
  const archGeo = cache.get(`${spec.id}:arch`, () => new THREE.CylinderGeometry(R * 1.18, R * 1.18, 0.05, 24).rotateZ(Math.PI / 2));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const wx = sx * (W / 2 - 0.12);
      const wz = sz * (spec.wheelbase / 2);
      add(archGeo, dark, sx * (W / 2 - 0.02), R, wz);
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
    setBrake: (on) => {
      tailMat.emissiveIntensity = on ? 2.4 : 0.6;
    },
    dispose: () => {
      mats.forEach((m) => m.dispose());
      glowMats.forEach((m) => m.dispose());
    },
  };
}

export type { BoxSpec };
