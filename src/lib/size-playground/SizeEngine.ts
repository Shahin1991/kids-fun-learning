import * as THREE from "three";
import { buildAnimal, type AnimalRig } from "@/lib/toy3d/animals";
import { addMeadow, type Drifter } from "@/lib/toy3d/scenery";
import { Spring } from "@/lib/toy3d/spring";
import { ToyScene, type PickInfo, type ToyOptions } from "@/lib/toy3d/ToyScene";

export type SizeMode = "tap" | "sort";
export type SizeAsk = "big" | "small";

export interface SizeOptions extends ToyOptions {
  onPrompt?: (p: { mode: SizeMode; ask: SizeAsk | null; streak: number }) => void;
  onCorrect?: (p: { ask: SizeAsk | null; streak: number }) => void;
  onWrong?: () => void;
  onRound?: (p: { mode: SizeMode; streak: number }) => void;
}

const SPECIES = ["cow", "pig", "dog", "cat", "sheep", "lion", "horse", "duck", "chick", "frog"];
const SIZES = { tap2: [0.7, 1.7], tap3: [0.55, 1.1, 1.8], sort: [0.6, 1.1, 1.7] };
const PEDESTAL_H = [0.5, 0.9, 1.3];

interface Critter {
  rig: AnimalRig;
  outer: THREE.Group;
  size: number;
  rank: number;
  x: number;
  home: THREE.Vector3;
  pos: THREE.Vector3;
  grow: Spring;
  shake: Spring;
  state: "idle" | "drag" | "slide" | "placed";
  from: THREE.Vector3;
  slide: number;
  press: THREE.Vector3 | null;
  lift: number;
}

export class SizeEngine extends ToyScene {
  private scenery: Drifter;
  private critters: Critter[] = [];
  private pedestals: THREE.Mesh[] = [];
  private mode: SizeMode = "tap";
  private ask: SizeAsk = "big";
  private streak = 0;
  private dragging: Critter | null = null;
  private nextRoundIn = 0;
  private locked = false;
  private pole: THREE.Group | null = null;

  constructor(container: HTMLElement, private opts: SizeOptions = {}) {
    super(container, 0xa9dcff, opts);
    this.scenery = addMeadow(this.stage.scene);
    this.buildRound();
    this.start();
  }

  setMode(mode: SizeMode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this.streak = 0;
    this.buildRound();
  }

  protected onResize(aspect: number) {
    const dist = 15 * Math.max(1, 1.15 / aspect);
    this.stage.camera.position.set(0, 5.5, dist);
    this.stage.camera.lookAt(0, 1.8, 0);
  }

  // ---- rounds ----
  private clear() {
    for (const c of this.critters) this.stage.scene.remove(c.outer);
    this.critters = [];
    this.pickables = [];
    this.pedestals.forEach((p) => {
      this.stage.scene.remove(p);
      p.geometry.dispose();
      (p.material as THREE.Material).dispose();
    });
    this.pedestals = [];
    if (this.pole) this.stage.scene.remove(this.pole);
    this.pole = null;
    this.dragging = null;
    this.locked = false;
  }

  private buildRound() {
    this.clear();
    const species = [...SPECIES].sort(() => Math.random() - 0.5);
    let sizes: number[];
    if (this.mode === "sort") sizes = SIZES.sort;
    else sizes = this.streak >= 4 ? SIZES.tap3 : SIZES.tap2;
    // Scaffolding: two sizes, then three once the child has a streak of 4.
    const order = [...sizes.keys()].sort(() => Math.random() - 0.5);
    const spacing = this.mode === "sort" ? 4.2 : 4.6;
    this.ask = Math.random() < 0.5 ? "big" : "small";

    order.forEach((rank, slot) => {
      const size = sizes[rank];
      const rig = buildAnimal(species[slot % species.length]);
      const outer = new THREE.Group();
      outer.add(rig.group);
      const x = (slot - (order.length - 1) / 2) * spacing;
      const z = this.mode === "sort" ? 4.2 : 0;
      const c: Critter = {
        rig, outer, size, rank, x,
        home: new THREE.Vector3(x, 0, z), pos: new THREE.Vector3(x, 0, z),
        grow: new Spring(1, 1, 170, 9), shake: new Spring(0, 0, 260, 12),
        state: "idle", from: new THREE.Vector3(), slide: 0, press: null, lift: 0,
      };
      const w = Math.max(2.6, 2.6 / size);
      outer.add(this.hitBox(c, w, rig.height + 1, w));
      outer.children[outer.children.length - 1].position.y = (rig.height + 1) / 2;
      this.stage.scene.add(outer);
      this.pickables.push(outer);
      this.critters.push(c);
    });

    if (this.mode === "sort") {
      // Wooden steps, small to big, left to right.
      for (let i = 0; i < 3; i++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(3.4, PEDESTAL_H[i], 3), new THREE.MeshStandardMaterial({ color: [0xe3b27a, 0xd69a5c, 0xc4833f][i], roughness: 0.8 }));
        step.position.set((i - 1) * 4.2, PEDESTAL_H[i] / 2, -1.5);
        this.stage.scene.add(step);
        this.pedestals.push(step);
      }
    } else {
      // A ruler pole makes the size difference easy to see.
      const pole = new THREE.Group();
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5, 0.2), new THREE.MeshStandardMaterial({ color: 0xffffff }));
      post.position.y = 2.5;
      pole.add(post);
      for (let i = 1; i <= 5; i++) {
        const tick = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.22), new THREE.MeshStandardMaterial({ color: i % 2 ? 0xff6b6b : 0x4d96ff }));
        tick.position.y = i * 0.95;
        pole.add(tick);
      }
      pole.position.set(-8.4, 0, -2.5);
      this.stage.scene.add(pole);
      this.pole = pole;
    }
    this.opts.onPrompt?.({ mode: this.mode, ask: this.mode === "tap" ? this.ask : null, streak: this.streak });
  }

  // ---- input ----
  activate(id: string) {
    void id;
  }

  protected onDown(info: PickInfo | null, e: PointerEvent) {
    const c = info?.owner as Critter | undefined;
    if (!c || this.locked) return;
    if (this.mode === "tap") {
      this.answer(c);
      return;
    }
    if (c.state === "placed") return;
    this.dragging = c;
    c.state = "drag";
    c.press = this.groundPoint(e, 0);
    c.rig.cheer();
  }

  protected onMove(e: PointerEvent) {
    const c = this.dragging;
    if (!c) return;
    const g = this.groundPoint(e, 0);
    if (g) c.from.set(g.x, 0, g.z);
  }

  protected onUp(e: PointerEvent) {
    const c = this.dragging;
    if (!c) return;
    this.dragging = null;
    const g = this.groundPoint(e, 0);
    const moved = g && c.press ? Math.hypot(g.x - c.press.x, g.z - c.press.z) : 0;
    const step = this.pedestals[c.rank];
    const target = step ? new THREE.Vector3(step.position.x, PEDESTAL_H[c.rank], step.position.z) : null;
    const onRightStep = g && target && Math.hypot(g.x - target.x, g.z - target.z) < 2.6;
    // A plain tap sends the animal to its own step, as an easier alternative to dragging.
    if (target && (onRightStep || moved < 0.4)) {
      c.state = "placed";
      c.from.copy(c.pos);
      c.slide = 0;
      c.home.copy(target);
      c.rig.cheer();
      this.opts.onCorrect?.({ ask: null, streak: this.streak });
      if (this.critters.every((x) => x.state === "placed")) this.finishRound(0.9);
      return;
    }
    c.state = "slide";
    c.from.copy(c.pos);
    c.slide = 0;
    c.shake.kick(this.reduced ? 0 : 5);
    this.opts.onWrong?.();
  }

  private answer(c: Critter) {
    const want = this.ask === "big" ? Math.max(...this.critters.map((x) => x.size)) : Math.min(...this.critters.map((x) => x.size));
    if (c.size === want) {
      this.streak++;
      c.rig.cheer();
      c.grow.kick(this.reduced ? 0 : 6);
      if (!this.reduced) {
        const at = c.outer.position.clone();
        at.y += c.rig.height * c.size;
        this.confetti.burst(at, [0xffd93d, 0xff6b9a, 0xffffff, 0x6bcb77], 26, 7);
      }
      this.opts.onCorrect?.({ ask: this.ask, streak: this.streak });
      this.locked = true;
      this.finishRound(1.2);
    } else {
      c.shake.kick(this.reduced ? 0 : 7);
      this.opts.onWrong?.();
    }
  }

  private finishRound(delay: number) {
    this.locked = true;
    this.nextRoundIn = delay;
    if (!this.reduced) this.confetti.burst(new THREE.Vector3(0, 4, 1), [0xff6b6b, 0xffd93d, 0x6bcb77, 0x4d96ff], 30, 8);
    this.opts.onRound?.({ mode: this.mode, streak: this.streak });
  }

  // ---- simulation ----
  protected update(dt: number) {
    this.scenery.update(dt);
    for (const c of this.critters) {
      const g = c.grow.step(dt);
      const sh = c.shake.step(dt);
      switch (c.state) {
        case "drag":
          c.pos.lerp(new THREE.Vector3(c.from.x, 0, c.from.z), Math.min(1, dt * 14));
          c.lift = Math.min(1, c.lift + dt * 8);
          break;
        case "slide": {
          c.slide += dt / 0.45;
          const k = Math.min(1, c.slide);
          c.pos.lerpVectors(c.from, new THREE.Vector3(c.x, 0, c.home.z), k * k * (3 - 2 * k));
          c.lift = 1 - k;
          if (k >= 1) c.state = "idle";
          break;
        }
        case "placed": {
          c.slide += dt / 0.5;
          const k = Math.min(1, c.slide);
          c.pos.lerpVectors(c.from, c.home, k * k * (3 - 2 * k));
          c.lift = Math.sin(k * Math.PI);
          break;
        }
        default:
          c.lift = Math.max(0, c.lift - dt * 6);
      }
      c.outer.position.set(c.pos.x + sh * 0.08, c.pos.y + c.lift * 0.8, c.pos.z);
      c.outer.rotation.z = sh * 0.12;
      c.outer.scale.setScalar(c.size * g);
      c.rig.update(dt, this.time, this.reduced);
    }
    if (this.nextRoundIn > 0) {
      this.nextRoundIn -= dt;
      if (this.nextRoundIn <= 0) this.buildRound();
    }
  }

  protected onDestroy() {
    this.clear();
  }
}
