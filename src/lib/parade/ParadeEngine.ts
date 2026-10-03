import * as THREE from "three";
import { Confetti } from "@/lib/fx/confetti";
import { Stage } from "@/lib/fx/stage";
import { buildGlyphGeometry } from "./glyph-geometry";
import { LETTERS, NUMBERS } from "./glyphs";

export type ParadeMode = "letters" | "numbers";

export interface ParadeOptions {
  reducedMotion?: boolean;
  onPrompt?: (p: { char: string; mode: ParadeMode }) => void;
  onCorrect?: (p: { char: string; streak: number }) => void;
  onWrong?: (p: { char: string }) => void;
}

const COLORS = [0xff6b6b, 0x4d96ff, 0x6bcb77, 0xffd93d, 0x9b51e0, 0xff9f43, 0x2ec4b6, 0xf15bb5];
const GLYPH_WIDTH = 1.05;

interface Item {
  char: string;
  group: THREE.Group;
  glyph: THREE.Mesh;
  mat: THREE.MeshPhysicalMaterial;
  color: number;
  slot: number;
  fromX: number;
  toX: number;
  fromZ: number;
  toZ: number;
  t: number;
  dur: number;
  rest: number;
  hop: number;
  spin: number;
  shake: number;
  squash: number;
  drop: number;
  phase: number;
}

const ease = (p: number) => p * p * (3 - 2 * p);

export class ParadeEngine {
  private stage: Stage;
  private confetti: Confetti;
  private geometries = new Map<string, THREE.BufferGeometry>();
  private items: Item[] = [];
  private slotOwner: (Item | null)[] = [];
  private slotX: number[] = [];
  private slotZ: number[] = [];
  private itemScale = 1.6;
  private mode: ParadeMode = "letters";
  private target = "";
  private streak = 0;
  private celebrating = 0;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private raf = 0;
  private lastT = 0;
  private time = 0;
  private destroyed = false;
  private camDist = 13;

  constructor(private container: HTMLElement, private opts: ParadeOptions = {}) {
    this.stage = new Stage(container, 0xbfe8ff);
    this.confetti = new Confetti(this.stage.scene);
    this.stage.onDispose(() => {
      this.confetti.dispose();
      this.geometries.forEach((g) => g.dispose());
      this.items.forEach((i) => i.mat.dispose());
    });
    this.buildScenery();
    container.addEventListener("pointerdown", this.onDown);
    this.resize();
    this.startRound();
    this.raf = requestAnimationFrame(this.loop);
  }

  // ---- public API ----
  setMode(mode: ParadeMode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this.streak = 0;
    this.startRound();
  }

  /** Re-announces the current target. */
  repeat() {
    if (this.target) this.opts.onPrompt?.({ char: this.target, mode: this.mode });
  }

  resize() {
    const aspect = this.stage.resize();
    this.camDist = 13 * Math.max(1, 1.15 / aspect);
    this.stage.camera.position.set(0, 3.8, this.camDist);
    this.stage.camera.lookAt(0, 2.6, 0);
    this.layout();
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
    scene.add(new THREE.AmbientLight(0xffffff, 0.8 * Math.PI));
    const key = new THREE.DirectionalLight(0xfff7e6, 1.1 * Math.PI);
    key.position.set(5, 10, 9);
    scene.add(key);

    const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: 0x9be37f, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(60, 5), new THREE.MeshStandardMaterial({ color: 0xf3d9a4, roughness: 1 }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.01, -0.2);
    scene.add(road);

    // Bunting across the top
    const flag = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-0.4, 0), new THREE.Vector2(0.4, 0), new THREE.Vector2(0, -0.8)]));
    const mats = COLORS.map((c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
    for (let i = 0; i < 25; i++) {
      const x = -12 + i;
      const m = new THREE.Mesh(flag, mats[i % mats.length]);
      // Gentle sag between the posts
      m.position.set(x, 6.9 + 0.55 * (x / 12) ** 2, -3);
      scene.add(m);
    }
  }

  private glyph(ch: string) {
    let g = this.geometries.get(ch);
    if (!g) {
      g = buildGlyphGeometry(ch);
      this.geometries.set(ch, g);
    }
    return g;
  }

  private layout() {
    const count = Math.max(this.items.length + 2, 4);
    const usable = this.stage.halfWidthAt(this.camDist) * 2 * 0.88;
    const spacing = usable / count;
    this.itemScale = Math.min(2.8, (spacing * 0.98) / GLYPH_WIDTH);
    this.slotX = Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * spacing);
    this.slotZ = Array.from({ length: count }, (_, i) => (i % 2 ? -0.9 : 0.5));
    const owners: (Item | null)[] = new Array(count).fill(null);
    this.items.forEach((it, i) => {
      it.slot = i;
      owners[it.slot] = it;
      it.fromX = it.toX = this.slotX[it.slot];
      it.fromZ = it.toZ = this.slotZ[it.slot];
      it.t = 1;
      it.group.scale.setScalar(this.itemScale);
    });
    this.slotOwner = owners;
  }

  // ---- rounds ----
  private clearItems() {
    for (const it of this.items) {
      this.stage.scene.remove(it.group);
      it.mat.dispose();
    }
    this.items = [];
  }

  private startRound() {
    this.clearItems();
    this.celebrating = 0;
    const all = this.mode === "letters" ? LETTERS : NUMBERS;
    // Scaffolding: start with 3 characters in play and 2 on screen; widen as the streak grows.
    const pool = all.slice(0, Math.min(all.length, 3 + this.streak));
    const count = Math.min(5, 2 + Math.floor(this.streak / 2), pool.length);
    const chars = [...pool].sort(() => Math.random() - 0.5).slice(0, count);
    this.target = chars[Math.floor(Math.random() * chars.length)];
    const colors = [...COLORS].sort(() => Math.random() - 0.5);

    this.items = chars.map((ch, i) => {
      const color = colors[i % colors.length];
      const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15 });
      const group = new THREE.Group();
      const glyph = new THREE.Mesh(this.glyph(ch), mat);
      // Bigger, invisible hit box so small fingers do not have to be precise.
      const hit = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.8, 1.2), new THREE.MeshBasicMaterial({ visible: false }));
      hit.userData.item = true;
      group.add(glyph, hit);
      this.stage.scene.add(group);
      return {
        char: ch, group, glyph, mat, color, slot: i, fromX: 0, toX: 0, fromZ: 0, toZ: 0, t: 1, dur: 0.7, rest: 0.3 + Math.random() * 0.8,
        hop: 0.9, spin: 0, shake: 0, squash: 0, drop: this.opts.reducedMotion ? 0 : 1 + i * 0.25, phase: Math.random() * 6,
      } satisfies Item;
    });
    this.layout();
    this.items.forEach((it) => {
      it.group.userData.item = it;
      it.group.traverse((o) => (o.userData.owner = it));
    });
    this.opts.onPrompt?.({ char: this.target, mode: this.mode });
  }

  // ---- input ----
  private onDown = (e: PointerEvent) => {
    if (this.celebrating > 0) return;
    const r = this.stage.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.stage.camera);
    const hits = this.raycaster.intersectObjects(this.items.map((i) => i.group), true);
    const owner = hits[0]?.object.userData.owner as Item | undefined;
    if (!owner) return;
    if (owner.char === this.target) this.correct(owner);
    else this.wrong(owner);
  };

  private correct(it: Item) {
    this.streak++;
    this.celebrating = 1.5;
    it.spin = 1;
    it.squash = 0;
    if (!this.opts.reducedMotion) {
      const p = it.group.position.clone();
      p.y += 1.5;
      this.confetti.burst(p, [...COLORS], 44, 8);
    }
    this.opts.onCorrect?.({ char: it.char, streak: this.streak });
  }

  private wrong(it: Item) {
    it.shake = 1;
    this.opts.onWrong?.({ char: it.char });
  }

  // ---- simulation ----
  private freeSlot(): number {
    const free = this.slotOwner.map((o, i) => (o ? -1 : i)).filter((i) => i >= 0);
    return free.length ? free[Math.floor(Math.random() * free.length)] : -1;
  }

  private update(dt: number) {
    const reduced = this.opts.reducedMotion;
    for (const it of this.items) {
      const hopping = it.t < 1;
      if (hopping) {
        it.t = Math.min(1, it.t + dt / it.dur);
        if (it.t >= 1) {
          it.squash = 1;
          it.rest = 0.3 + Math.random() * 0.9;
        }
      } else if (this.celebrating <= 0) {
        it.rest -= dt;
        if (it.rest <= 0 && it.spin <= 0) {
          const next = this.freeSlot();
          if (next >= 0) {
            this.slotOwner[it.slot] = null;
            this.slotOwner[next] = it;
            it.slot = next;
            it.fromX = it.group.position.x;
            it.fromZ = it.group.position.z;
            it.toX = this.slotX[next];
            it.toZ = this.slotZ[next];
            it.t = 0;
            it.dur = 0.55 + Math.random() * 0.3;
            it.hop = reduced ? 0.2 : 0.8 + Math.random() * 0.7;
          } else it.rest = 0.5;
        }
      }
      const p = ease(it.t);
      const x = it.fromX + (it.toX - it.fromX) * p;
      const z = it.fromZ + (it.toZ - it.fromZ) * p;
      let y = hopping ? it.hop * 4 * it.t * (1 - it.t) : 0;

      if (it.drop > 0) {
        it.drop = Math.max(0, it.drop - dt * 1.8);
        y += it.drop * it.drop * 9;
        if (it.drop === 0) it.squash = 1;
      }
      it.group.position.set(x, y * (this.itemScale / 1.7) + 0.72 * this.itemScale, z);

      let sx = 1;
      let sy = 1;
      if (it.squash > 0) {
        it.squash = Math.max(0, it.squash - dt * 3.5);
        const k = reduced ? 0 : Math.cos((1 - it.squash) * 14) * it.squash * 0.2;
        sx = 1 + k * 0.7;
        sy = 1 - k;
      } else if (!hopping && !reduced) {
        const b = 1 + Math.sin(this.time * 2.2 + it.phase) * 0.025;
        sx = b;
        sy = 1 / b;
      }
      let rotY = Math.sin(this.time * 0.9 + it.phase) * 0.12 * (reduced ? 0 : 1);
      if (it.spin > 0) {
        it.spin = Math.max(0, it.spin - dt / 0.9);
        const s = 1 - it.spin;
        rotY = reduced ? 0 : ease(s) * Math.PI * 2;
        const pop = 1 + Math.sin(s * Math.PI) * 0.3;
        sx *= pop;
        sy *= pop;
        it.mat.emissive.setHex(it.color).multiplyScalar(Math.sin(s * Math.PI) * 0.5);
      }
      it.shake = Math.max(0, it.shake - dt * 2.2);
      const rotZ = (hopping ? Math.sin(it.t * Math.PI) * 0.18 * Math.sign(it.toX - it.fromX || 1) * -1 : 0) + Math.sin(this.time * 38) * it.shake * 0.22 * (reduced ? 0.4 : 1);
      it.group.rotation.set(0, rotY, rotZ);
      it.group.scale.set(this.itemScale * sx, this.itemScale * sy, this.itemScale * sx);
    }

    if (this.celebrating > 0) {
      this.celebrating -= dt;
      if (this.celebrating <= 0) this.startRound();
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
