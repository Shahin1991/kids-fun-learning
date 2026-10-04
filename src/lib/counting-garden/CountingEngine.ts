import * as THREE from "three";
import { generateQuestion, type NumberQuestion } from "@/lib/numbers/questions";
import { buildGlyphGeometry } from "@/lib/parade/glyph-geometry";
import { makeTitle } from "@/lib/toy3d/bubble";
import { buildAnimal, type AnimalRig } from "@/lib/toy3d/animals";
import { addMeadow, type Drifter } from "@/lib/toy3d/scenery";
import { Spring } from "@/lib/toy3d/spring";
import { ToyScene, type PickInfo, type ToyOptions } from "@/lib/toy3d/ToyScene";

export interface CountingOptions extends ToyOptions {
  onPrompt?: (p: { kind: NumberQuestion["kind"]; text: string; spoken: string }) => void;
  onCount?: (p: { n: number }) => void;
  onCorrect?: (p: { answer: number; total: number }) => void;
  onWrong?: () => void;
}

const SPECIES = ["cow", "pig", "dog", "cat", "sheep", "lion", "horse", "duck", "chick", "frog"];
const COLORS = [0xff6b6b, 0x4d96ff, 0x6bcb77, 0xffb703, 0x9b51e0, 0xff7f50];

interface Critter {
  rig: AnimalRig;
  outer: THREE.Group;
  x: number;
  z: number;
  counted: boolean;
  label: { sprite: THREE.Sprite; dispose: () => void; pop: Spring } | null;
}

interface Choice {
  value: number;
  group: THREE.Group;
  mat: THREE.MeshPhysicalMaterial;
  x: number;
  wobble: Spring;
  drop: Spring;
  phase: number;
  /** becomes true once the number has landed; until then it cannot be tapped */
  ready: boolean;
}

export class CountingEngine extends ToyScene {
  private scenery: Drifter;
  private geos = new Map<string, THREE.BufferGeometry>();
  private critters: Critter[] = [];
  private choices: Choice[] = [];
  private extras: THREE.Object3D[] = [];
  private title: { sprite: THREE.Sprite; dispose: () => void } | null = null;
  private q: NumberQuestion = generateQuestion(0);
  private correct = 0;
  private counted = 0;
  private locked = false;
  private nextIn = 0;
  private scale = 1;

  constructor(container: HTMLElement, private opts: CountingOptions = {}) {
    super(container, 0xa9dcff, opts);
    this.scenery = addMeadow(this.stage.scene);
    this.start();
    this.buildRound();
  }

  private glyph(ch: string) {
    let g = this.geos.get(ch);
    if (!g) this.geos.set(ch, (g = buildGlyphGeometry(ch)));
    return g;
  }

  protected onResize(aspect: number) {
    const dist = 17 * Math.max(1, 1.15 / aspect);
    this.scale = Math.min(1.5, this.stage.halfWidthAt(dist) / 9);
    this.stage.camera.position.set(0, 6.5, dist);
    this.stage.camera.lookAt(0, 2.4, 0.6);
    if (this.critters.length) this.layout();
  }

  // ---- rounds ----
  private clear() {
    for (const c of this.critters) {
      this.stage.scene.remove(c.outer);
      c.label?.dispose();
    }
    for (const ch of this.choices) {
      this.stage.scene.remove(ch.group);
      ch.mat.dispose();
    }
    this.extras.forEach((e) => {
      this.stage.scene.remove(e);
      e.traverse((o) => o instanceof THREE.Mesh && (o.material as THREE.Material).dispose());
    });
    if (this.title) {
      this.stage.scene.remove(this.title.sprite);
      this.title.dispose();
    }
    this.critters = [];
    this.choices = [];
    this.extras = [];
    this.title = null;
    this.pickables = [];
    this.counted = 0;
    this.locked = false;
  }

  private buildRound() {
    this.clear();
    // Levels come from the existing question generator: tiny ranges first, then wider, then addition.
    this.q = generateQuestion(Math.floor(this.correct / 3));
    const q = this.q;
    const species = [...SPECIES].sort(() => Math.random() - 0.5);

    const make = (kind: string, count: number) => {
      for (let i = 0; i < count; i++) {
        const rig = buildAnimal(kind);
        const outer = new THREE.Group();
        outer.add(rig.group);
        const c: Critter = { rig, outer, x: 0, z: 0, counted: false, label: null };
        const hit = new THREE.Mesh(new THREE.BoxGeometry(2.2, rig.height + 0.4, 2.2), new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }));
        hit.position.y = (rig.height + 0.4) / 2;
        hit.userData.owner = c;
        outer.add(hit);
        this.stage.scene.add(outer);
        this.pickables.push(outer);
        this.critters.push(c);
      }
    };
    if (q.kind === "count") {
      make(species[0], q.count);
    } else {
      const [, a, b] = /(\d+) \+ (\d+)/.exec(q.prompt) ?? [];
      make(species[0], Number(a));
      make(species[1], Number(b));
    }

    this.q.choices.forEach((value, i) => {
      const mat = new THREE.MeshPhysicalMaterial({ color: COLORS[(value + i) % COLORS.length], roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12 });
      const group = new THREE.Group();
      group.add(new THREE.Mesh(this.glyph(value === 10 ? "1" : String(value)), mat));
      if (value === 10) {
        const zero = new THREE.Mesh(this.glyph("0"), mat);
        zero.position.x = 0.9;
        group.children[0].position.x = -0.45;
        group.add(zero);
      }
      // Just a little bigger than the number itself, so it never covers the animals behind it.
      const hit = new THREE.Mesh(new THREE.BoxGeometry(value === 10 ? 2.4 : 1.5, 1.8, 0.9), new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }));
      const ch: Choice = { value, group, mat, x: 0, wobble: new Spring(0, 0, 260, 11), drop: new Spring(this.reduced ? 0 : 6 + i, 0, 100, 10), phase: Math.random() * 6, ready: false };
      hit.userData.owner = ch;
      group.add(hit);
      this.stage.scene.add(group);
      this.choices.push(ch);
    });

    const text = q.kind === "count" ? "How many?" : `${q.prompt.replace(" = ?", "")} = ?`;
    const t = makeTitle(text, "#3b2f4a");
    t.sprite.position.set(0, 7.4, 0);
    this.stage.scene.add(t.sprite);
    this.title = t;
    this.layout();
    this.opts.onPrompt?.({ kind: q.kind, text, spoken: q.kind === "count" ? "How many are there?" : q.prompt.replace(" + ", " plus ").replace(" = ?", "") });
  }

  private layout() {
    const n = this.critters.length;
    const perRow = n > 6 ? Math.ceil(n / 2) : n;
    const rows = Math.ceil(n / perRow);
    const spacing = Math.min(3.4, (this.stage.halfWidthAt(17) * 2 * 0.8) / Math.max(perRow, 1)) * 1;
    const s = Math.min(1.7, spacing / 2.1) * (n > 6 ? 0.9 : 1);
    const isAdd = this.q.kind === "add";
    const a = isAdd ? Number(/(\d+) \+/.exec(this.q.prompt)?.[1] ?? n) : n;
    this.critters.forEach((c, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      let x = (col - (perRow - 1) / 2) * spacing;
      if (isAdd && rows === 1) x += (i < a ? -0.9 : 0.9) * spacing * 0.5;
      c.x = x;
      c.z = -row * 2.6 - 2;
      c.outer.scale.setScalar(s);
    });
    // Plus sign between the two groups
    this.extras.forEach((e) => this.stage.scene.remove(e));
    this.extras = [];
    if (isAdd && rows === 1 && this.critters.length > 1) {
      const plus = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.22), new THREE.MeshStandardMaterial({ color: 0x3b2f4a }));
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.9, 0.22), plus.material);
      const g = new THREE.Group();
      g.add(plus, bar);
      g.position.set((this.critters[a - 1].x + this.critters[a].x) / 2, 1.6, -2);
      this.stage.scene.add(g);
      this.extras.push(g);
    }
    const cs = Math.min(2.6, (this.stage.halfWidthAt(17) * 2 * 0.8) / Math.max(this.choices.length, 1));
    this.choices.forEach((c, i) => {
      c.x = (i - (this.choices.length - 1) / 2) * cs;
      c.group.scale.setScalar(Math.min(1.1, cs / 1.9) * this.scale);
    });
  }

  // ---- input ----
  activate(id: string) {
    const v = Number(id);
    const c = this.choices.find((x) => x.value === v);
    if (c) this.answer(c);
  }

  protected onDown(info: PickInfo | null) {
    if (this.locked || !info) return;
    const o = info.owner as Critter | Choice;
    if ("rig" in o) this.countCritter(o);
    else this.answer(o);
  }

  private countCritter(c: Critter) {
    if (c.counted) {
      c.rig.cheer();
      return;
    }
    c.counted = true;
    this.counted++;
    c.rig.cheer();
    const label = makeTitle(String(this.counted), "#ff5c8a");
    label.sprite.position.set(0, c.rig.height + 1.3, 0);
    label.sprite.scale.set(0.01, 0.01, 1);
    c.outer.add(label.sprite);
    c.label = { ...label, pop: new Spring(0, 1, 170, 9) };
    this.opts.onCount?.({ n: this.counted });
  }

  private answer(ch: Choice) {
    if (this.locked) return;
    if (ch.value === this.q.answer) {
      this.locked = true;
      this.correct++;
      this.critters.forEach((c, i) => setTimeout(() => c.rig.cheer(), i * 70));
      if (!this.reduced) {
        this.confetti.burst(new THREE.Vector3(0, 5, 1), [0xff6b6b, 0xffd93d, 0x6bcb77, 0x4d96ff, 0x9b51e0], 50, 9);
        this.confetti.burst(ch.group.position.clone().setY(2), [0xffd93d, 0xffffff], 20, 6);
      }
      ch.wobble.kick(this.reduced ? 0 : -6);
      this.nextIn = 2;
      this.opts.onCorrect?.({ answer: ch.value, total: this.correct });
    } else {
      ch.wobble.kick(this.reduced ? 0 : 9);
      this.opts.onWrong?.();
    }
  }

  // ---- simulation ----
  protected update(dt: number) {
    this.scenery.update(dt);
    const t = this.time;
    const idle = this.reduced ? 0 : 1;
    for (const c of this.critters) {
      c.outer.position.set(c.x, 0, c.z);
      c.rig.update(dt, t, this.reduced);
      if (c.label) {
        const p = Math.max(0.01, c.label.pop.step(dt));
        c.label.sprite.scale.set(3.2 * p, 1.1 * p, 1);
      }
    }
    for (const ch of this.choices) {
      const w = ch.wobble.step(dt);
      const drop = Math.max(0, ch.drop.step(dt));
      // A number that is still falling must not block taps meant for the animals behind it.
      if (!ch.ready && drop < 0.25) {
        ch.ready = true;
        this.pickables.push(ch.group);
      }
      const s = ch.group.scale.x;
      ch.group.position.set(ch.x + w * 0.2, 0.75 * s + 0.15 + drop + Math.abs(Math.sin(t * 2 + ch.phase)) * 0.12 * idle, 6.6);
      ch.group.rotation.z = w * 0.15;
      ch.group.rotation.y = Math.sin(t * 0.9 + ch.phase) * 0.2 * idle;
    }
    if (this.nextIn > 0) {
      this.nextIn -= dt;
      if (this.nextIn <= 0) this.buildRound();
    }
  }

  protected onDestroy() {
    this.clear();
    this.geos.forEach((g) => g.dispose());
  }
}
