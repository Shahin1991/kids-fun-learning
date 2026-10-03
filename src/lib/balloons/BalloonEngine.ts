import * as THREE from "three";
import { Confetti } from "@/lib/fx/confetti";
import { Stage } from "@/lib/fx/stage";

export interface BalloonOptions {
  reducedMotion?: boolean;
  onPop?: (p: { index: number; color: number; total: number }) => void;
  onMilestone?: (p: { total: number }) => void;
}

const COLORS = [0xff4d6d, 0xffb703, 0x4dabf7, 0x51cf66, 0xcc5de8, 0xff922b, 0x22b8cf, 0xf783ac];
const CAM_Z = 14;

interface Parts {
  group: THREE.Group;
  /** The part that squishes and disappears when popped */
  body: THREE.Object3D;
  string: THREE.Object3D;
}

/**
 * Balloon shapes are built by name so new ones (e.g. animal-shaped) can be registered later:
 * add an entry here that returns the parts for a given colour, and list it in ENABLED_SHAPES.
 */
type ShapeBuilder = (color: number, shared: Shared) => Parts;
interface Shared {
  geo: Map<string, THREE.BufferGeometry>;
  mat: Map<string, THREE.Material>;
}

function geometry(shared: Shared, key: string, make: () => THREE.BufferGeometry) {
  let g = shared.geo.get(key);
  if (!g) shared.geo.set(key, (g = make()));
  return g;
}
function material(shared: Shared, key: string, make: () => THREE.Material) {
  let m = shared.mat.get(key);
  if (!m) shared.mat.set(key, (m = make()));
  return m;
}

const round: ShapeBuilder = (color, sh) => {
  const group = new THREE.Group();
  const body = new THREE.Group();
  const paint = material(sh, `paint${color}`, () => new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 })) as THREE.MeshPhysicalMaterial;
  const balloon = new THREE.Mesh(geometry(sh, "round", () => new THREE.SphereGeometry(0.62, 28, 22).scale(1, 1.2, 1)), paint);
  const shine = new THREE.Mesh(
    geometry(sh, "shine", () => new THREE.SphereGeometry(0.12, 12, 10).scale(0.7, 1.3, 0.4)),
    material(sh, "shine", () => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })),
  );
  shine.position.set(-0.25, 0.4, 0.5);
  shine.rotation.z = 0.5;
  const knot = new THREE.Mesh(geometry(sh, "knot", () => new THREE.ConeGeometry(0.1, 0.16, 10).rotateX(Math.PI)), paint);
  knot.position.y = -0.8;
  body.add(balloon, shine, knot);

  const string = new THREE.Group();
  string.position.y = -0.88;
  const line = new THREE.Mesh(geometry(sh, "string", () => new THREE.CylinderGeometry(0.012, 0.012, 1.6, 4).translate(0, -0.8, 0)), material(sh, "stringMat", () => new THREE.MeshBasicMaterial({ color: 0x555a66 })));
  string.add(line);
  group.add(body, string);
  return { group, body, string };
};

const SHAPES: Record<string, ShapeBuilder> = { round };
const ENABLED_SHAPES = ["round"];

interface Balloon {
  parts: Parts;
  hit: THREE.Mesh;
  color: number;
  index: number;
  baseX: number;
  z: number;
  speed: number;
  amp: number;
  freq: number;
  phase: number;
  size: number;
  squish: number;
}

export class BalloonEngine {
  private stage: Stage;
  private confetti: Confetti;
  private shared: Shared = { geo: new Map(), mat: new Map() };
  private balloons: Balloon[] = [];
  private clouds: THREE.Group[] = [];
  private pops = 0;
  private respawn: number[] = [];
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private raf = 0;
  private lastT = 0;
  private time = 0;
  private destroyed = false;
  private dist = CAM_Z;

  constructor(private container: HTMLElement, private opts: BalloonOptions = {}) {
    this.stage = new Stage(container, 0xa9dcff, 45);
    this.confetti = new Confetti(this.stage.scene);
    this.stage.onDispose(() => {
      this.confetti.dispose();
      this.shared.geo.forEach((g) => g.dispose());
      this.shared.mat.forEach((m) => m.dispose());
    });
    this.buildScenery();
    container.addEventListener("pointerdown", this.onDown);
    this.resize();
    this.fill(true);
    this.raf = requestAnimationFrame(this.loop);
  }

  resize() {
    const aspect = this.stage.resize();
    this.dist = CAM_Z * Math.max(1, 1.1 / aspect);
    this.stage.camera.position.set(0, 0, this.dist);
    this.stage.camera.lookAt(0, 0, 0);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.container.removeEventListener("pointerdown", this.onDown);
    this.stage.dispose();
  }

  // ---- scene ----
  private buildScenery() {
    const { scene } = this.stage;
    scene.add(new THREE.AmbientLight(0xffffff, 0.9 * Math.PI));
    const key = new THREE.DirectionalLight(0xffffff, 1.2 * Math.PI);
    key.position.set(-5, 8, 10);
    scene.add(key);

    const hill = new THREE.Mesh(new THREE.SphereGeometry(14, 32, 16), new THREE.MeshStandardMaterial({ color: 0x8fdc6b, roughness: 1 }));
    hill.position.set(-4, -20, -8);
    scene.add(hill);
    const hill2 = hill.clone();
    hill2.position.set(9, -20.5, -10);
    hill2.material = new THREE.MeshStandardMaterial({ color: 0x74cf62, roughness: 1 });
    scene.add(hill2);

    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const puff = new THREE.SphereGeometry(1, 14, 10);
    this.stage.onDispose(() => cloudMat.dispose());
    for (let i = 0; i < 5; i++) {
      const c = new THREE.Group();
      for (const [x, y, s] of [[0, 0, 1], [1.1, -0.1, 0.8], [-1.1, -0.15, 0.75], [0.4, 0.5, 0.7]] as const) {
        const m = new THREE.Mesh(puff, cloudMat);
        m.position.set(x, y, 0);
        m.scale.set(s, s * 0.7, s * 0.6);
        c.add(m);
      }
      c.position.set(-14 + i * 7 + Math.random() * 3, 3 + Math.random() * 5, -12 - Math.random() * 6);
      this.clouds.push(c);
      scene.add(c);
    }
    this.stage.onDispose(() => puff.dispose());
  }

  // ---- balloons ----
  /** Scaffolding: a few big, slow balloons first; more, smaller and faster as the child pops. */
  private targetCount() {
    return Math.min(12, 4 + Math.floor(this.pops / 5));
  }
  private speedFactor() {
    return Math.min(1.5, 0.8 + this.pops * 0.02);
  }
  private sizeFactor() {
    return Math.max(1, 1.35 - this.pops * 0.02);
  }

  private spawn(anywhere: boolean) {
    const kind = ENABLED_SHAPES[Math.floor(Math.random() * ENABLED_SHAPES.length)];
    const index = Math.floor(Math.random() * COLORS.length);
    const color = COLORS[index];
    const parts = SHAPES[kind](color, this.shared);
    const z = -3 + Math.random() * 4;
    const size = this.sizeFactor() * (0.9 + Math.random() * 0.25);
    const halfW = this.stage.halfWidthAt(this.dist - z);
    const halfH = this.stage.halfHeightAt(this.dist - z);
    const baseX = (Math.random() * 2 - 1) * halfW * 0.85;
    const y = anywhere ? (Math.random() * 2 - 1) * halfH * 0.8 : -halfH - 2.5;
    parts.group.position.set(baseX, y, z);
    // Generous invisible hit target, larger than the balloon itself.
    const hit = new THREE.Mesh(new THREE.SphereGeometry(1.0, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 0;
    parts.group.add(hit);
    this.stage.scene.add(parts.group);
    const b: Balloon = {
      parts, hit, color, index, baseX, z, size,
      speed: (0.9 + Math.random() * 0.7) * this.speedFactor(),
      amp: 0.3 + Math.random() * 0.5, freq: 0.8 + Math.random() * 0.8, phase: Math.random() * 6, squish: 0,
    };
    hit.userData.balloon = b;
    parts.group.scale.setScalar(size);
    this.balloons.push(b);
  }

  private fill(initial: boolean) {
    while (this.balloons.length < this.targetCount()) this.spawn(initial);
  }

  private remove(b: Balloon) {
    this.stage.scene.remove(b.parts.group);
    b.hit.geometry.dispose();
    (b.hit.material as THREE.Material).dispose();
    this.balloons = this.balloons.filter((x) => x !== b);
  }

  // ---- input ----
  private onDown = (e: PointerEvent) => {
    const r = this.stage.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.stage.camera);
    const live = this.balloons.filter((b) => b.squish === 0).map((b) => b.hit);
    const hit = this.raycaster.intersectObjects(live, false)[0];
    if (hit) (hit.object.userData.balloon as Balloon).squish = 0.0001;
  };

  private pop(b: Balloon) {
    this.pops++;
    const at = b.parts.group.position.clone();
    if (!this.opts.reducedMotion) this.confetti.burst(at, [b.color, b.color, 0xffffff, 0xffe066], 34, 7.5);
    this.remove(b);
    this.opts.onPop?.({ index: b.index, color: b.color, total: this.pops });
    if (this.pops % 10 === 0) this.opts.onMilestone?.({ total: this.pops });
    this.respawn.push(0.5);
  }

  // ---- loop ----
  private update(dt: number) {
    const reduced = this.opts.reducedMotion;
    for (const b of [...this.balloons]) {
      const g = b.parts.group;
      if (b.squish > 0) {
        // Quick squash-and-stretch, then pop.
        b.squish += dt;
        const k = Math.min(1, b.squish / 0.14);
        const sx = reduced ? 1 : 1 + 0.45 * k;
        const sy = reduced ? 1 : 1 - 0.35 * k;
        g.scale.set(b.size * sx, b.size * sy, b.size * sx);
        if (k >= 1) this.pop(b);
        continue;
      }
      g.position.y += b.speed * dt;
      const wob = reduced ? 0 : 1;
      g.position.x = b.baseX + Math.sin(this.time * b.freq + b.phase) * b.amp * wob;
      g.rotation.z = Math.sin(this.time * b.freq * 1.3 + b.phase) * 0.12 * wob;
      g.rotation.x = Math.sin(this.time * b.freq * 0.9 + b.phase) * 0.06 * wob;
      b.parts.string.rotation.z = Math.sin(this.time * b.freq * 2 + b.phase) * 0.3 * wob;
      const breathe = 1 + Math.sin(this.time * 2.4 + b.phase) * 0.03 * wob;
      g.scale.set(b.size * breathe, b.size / breathe, b.size * breathe);
      const top = this.stage.halfHeightAt(this.dist - b.z) + 3;
      if (g.position.y > top) {
        this.remove(b);
        this.respawn.push(0.1);
      }
    }
    this.respawn = this.respawn.map((t) => t - dt).filter((t) => {
      if (t > 0) return true;
      if (this.balloons.length < this.targetCount()) this.spawn(false);
      return false;
    });
    this.fill(false);
    for (const c of this.clouds) {
      c.position.x += dt * 0.3;
      if (c.position.x > 20) c.position.x = -20;
    }
  }

  private loop = (t: number) => {
    if (this.destroyed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.lastT ? (t - this.lastT) / 1000 : 0.016);
    this.lastT = t;
    this.time += dt;
    this.update(dt);
    this.confetti.update(dt);
    this.stage.renderer.render(this.stage.scene, this.stage.camera);
  };
}
