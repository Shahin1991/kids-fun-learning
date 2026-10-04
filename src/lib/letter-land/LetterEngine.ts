import * as THREE from "three";
import { ALPHABET, type LetterEntry } from "@/data/alphabet";
import { buildGlyphGeometry } from "@/lib/parade/glyph-geometry";
import { GLYPHS } from "@/lib/parade/glyphs";
import { makeTitle } from "@/lib/toy3d/bubble";
import { addToyRoom } from "@/lib/toy3d/scenery";
import { Spring } from "@/lib/toy3d/spring";
import { ToyScene, type PickInfo, type ToyOptions } from "@/lib/toy3d/ToyScene";
import { sampleStrokes } from "./trace";

export type LetterMode = "learn" | "trace";

export interface LetterOptions extends ToyOptions {
  onSelect?: (p: { letter: string; word: string; index: number; found: number }) => void;
  onTrace?: (p: { n: number; total: number }) => void;
  onTraceDone?: (p: { letter: string }) => void;
  onMilestone?: (p: { found: number }) => void;
}

const COLORS = [0xff6b6b, 0x4d96ff, 0x6bcb77, 0xffb703, 0x9b51e0, 0xff7f50, 0x2ec4b6, 0xf15bb5];

interface Tile {
  entry: LetterEntry;
  index: number;
  group: THREE.Group;
  mesh: THREE.Mesh;
  mat: THREE.MeshPhysicalMaterial;
  hop: Spring;
  x: number;
  z: number;
  scale: number;
  phase: number;
  next: number;
}

interface Big {
  group: THREE.Group;
  mesh: THREE.Mesh;
  mat: THREE.MeshPhysicalMaterial;
  color: number;
  pop: Spring;
  drop: Spring;
  spin: number;
}

interface Bead {
  mesh: THREE.Mesh;
  x: number;
  y: number;
  lit: boolean;
  pop: Spring;
}

export class LetterEngine extends ToyScene {
  private tiles: Tile[] = [];
  private geos = new Map<string, THREE.BufferGeometry>();
  private big: Big | null = null;
  private emoji: { sprite: THREE.Sprite; dispose: () => void; pop: Spring } | null = null;
  private word: { sprite: THREE.Sprite; dispose: () => void; pop: Spring } | null = null;
  private current = -1;
  private mode: LetterMode = "learn";
  private found = new Set<number>();
  private lastMilestone = 0;
  private bigPos = new THREE.Vector3(-3, 4.6, 0);
  private bigScale = 3;
  private objPos = new THREE.Vector3(4, 4, 0);
  private beads: Bead[] = [];
  private nextBead = 0;
  private traceGroup: THREE.Group | null = null;
  private beadGeo = new THREE.SphereGeometry(1, 14, 10);
  private pressed = false;
  private idleHop = 2;
  private doneIn = 0;

  constructor(container: HTMLElement, private opts: LetterOptions = {}) {
    super(container, 0xd8eeff, opts);
    addToyRoom(this.stage.scene, 0xd8eeff, 0xe6c79a);
    ALPHABET.forEach((entry, index) => {
      const color = COLORS[index % COLORS.length];
      const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15 });
      const group = new THREE.Group();
      const mesh = new THREE.Mesh(this.glyph(entry.letter), mat);
      group.add(mesh);
      const tile: Tile = { entry, index, group, mesh, mat, hop: new Spring(0, 0, 220, 9), x: 0, z: 0, scale: 1, phase: Math.random() * 6, next: 0 };
      const hit = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.7, 1), new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }));
      hit.userData.owner = tile;
      group.add(hit);
      this.stage.scene.add(group);
      this.pickables.push(group);
      this.tiles.push(tile);
    });
    this.start();
    this.select(0, false);
  }

  private glyph(ch: string) {
    let g = this.geos.get(ch);
    if (!g) this.geos.set(ch, (g = buildGlyphGeometry(ch)));
    return g;
  }

  setMode(mode: LetterMode) {
    this.mode = mode;
    this.rebuildTrace();
  }

  activate(id: string) {
    const i = ALPHABET.findIndex((a) => a.letter === id);
    if (i >= 0) this.select(i, true);
  }

  protected onResize(aspect: number) {
    const wide = aspect > 1.3;
    const cols = wide ? 13 : 7;
    const rows = Math.ceil(this.tiles.length / cols);
    const dist = (wide ? 17 : 20) * Math.max(1, 1.1 / aspect);
    const halfW = this.stage.halfWidthAt(dist);
    // The tiles are much closer to the camera than the stage, so fit them using the width at their depth.
    const tileZ = 3.4;
    const spacing = Math.min(1.5, (this.stage.halfWidthAt(dist - tileZ) * 2 * 0.9) / cols);
    this.tiles.forEach((t, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      t.x = (c - (cols - 1) / 2) * spacing;
      t.z = tileZ + r * (wide ? 2.3 : 2.1);
      t.scale = Math.min(1.1, (spacing * 0.9) / 1.05);
      t.group.scale.setScalar(t.scale);
    });
    this.bigScale = Math.min(3.4, halfW * (wide ? 0.3 : 0.38));
    this.bigPos.set(-halfW * (wide ? 0.32 : 0.34), 0.72 * this.bigScale + 1.4, 0);
    this.objPos.set(halfW * (wide ? 0.32 : 0.34), 3.4, 0);
    const cam = this.stage.camera;
    cam.position.set(0, 7.4 + rows * 0.8, dist);
    cam.lookAt(0, 2.6, 1.8);
    if (this.big) this.rebuildTrace();
  }

  // ---- selecting a letter ----
  private select(index: number, announce: boolean) {
    const entry = ALPHABET[index];
    this.current = index;
    this.doneIn = 0;

    if (this.big) {
      this.stage.scene.remove(this.big.group);
      this.big.mat.dispose();
    }
    const color = COLORS[index % COLORS.length];
    const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12, emissive: color, emissiveIntensity: 0.1 });
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(this.glyph(entry.letter), mat);
    group.add(mesh);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.9, 1.2), new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }));
    hit.userData.owner = "big";
    group.add(hit);
    this.stage.scene.add(group);
    this.pickables = this.pickables.filter((p) => !(p instanceof THREE.Group && p.userData.big));
    group.userData.big = true;
    this.pickables.push(group);
    this.big = { group, mesh, mat, color, pop: new Spring(0, 1, 150, 9), drop: new Spring(this.reduced ? 0 : 7, 0, 110, 10), spin: this.reduced ? 0 : 1 };

    this.setObject(entry, color);
    this.tiles[index].hop.kick(this.reduced ? 0 : 7);
    if (!this.reduced) this.confetti.burst(this.bigPos.clone().setY(this.bigPos.y + 1.5), [color, 0xffd93d, 0xffffff, 0xff6b9a], 30, 8);
    this.found.add(index);
    if (announce) this.opts.onSelect?.({ letter: entry.letter, word: entry.word, index, found: this.found.size });
    if (this.found.size % 5 === 0 && this.found.size !== this.lastMilestone) {
      this.lastMilestone = this.found.size;
      this.opts.onMilestone?.({ found: this.found.size });
    }
    this.rebuildTrace();
  }

  private makeEmojiSprite(emoji: string) {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    g.font = "190px serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(emoji, 128, 140);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(3.4, 3.4, 1);
    return {
      sprite,
      dispose: () => {
        tex.dispose();
        mat.dispose();
      },
    };
  }

  private setObject(entry: LetterEntry, color: number) {
    for (const o of [this.emoji, this.word]) {
      if (o) {
        this.stage.scene.remove(o.sprite);
        o.dispose();
      }
    }
    const e = this.makeEmojiSprite(entry.emoji);
    e.sprite.position.copy(this.objPos);
    this.stage.scene.add(e.sprite);
    this.emoji = { ...e, pop: new Spring(0, 1, 140, 7) };
    const w = makeTitle(entry.word, `#${color.toString(16).padStart(6, "0")}`);
    w.sprite.position.set(this.objPos.x, this.objPos.y - 2.4, 0);
    this.stage.scene.add(w.sprite);
    this.word = { ...w, pop: new Spring(0, 1, 140, 8) };
  }

  // ---- tracing ----
  private clearTrace() {
    if (this.traceGroup) {
      this.stage.scene.remove(this.traceGroup);
      this.traceGroup.traverse((o) => {
        if (o instanceof THREE.Mesh) (o.material as THREE.Material).dispose();
      });
    }
    this.traceGroup = null;
    this.beads = [];
    this.nextBead = 0;
  }

  private rebuildTrace() {
    this.clearTrace();
    if (!this.big) return;
    this.big.mat.transparent = this.mode === "trace";
    this.big.mat.opacity = this.mode === "trace" ? 0.28 : 1;
    this.big.mat.needsUpdate = true;
    if (this.mode !== "trace") return;
    const letter = ALPHABET[this.current].letter;
    const group = new THREE.Group();
    group.position.copy(this.bigPos);
    group.scale.setScalar(this.bigScale);
    sampleStrokes(GLYPHS[letter]).forEach((b, i) => {
      const mesh = new THREE.Mesh(this.beadGeo, new THREE.MeshBasicMaterial({ color: i === 0 ? 0x2fd36b : 0xffffff }));
      mesh.position.set(b.x, b.y, 0.15);
      mesh.scale.setScalar(i === 0 ? 0.1 : 0.065);
      group.add(mesh);
      this.beads.push({ mesh, x: b.x, y: b.y, lit: false, pop: new Spring(0, 0, 220, 9) });
    });
    this.stage.scene.add(group);
    this.traceGroup = group;
  }

  private traceAt(e: PointerEvent) {
    if (this.mode !== "trace" || !this.traceGroup || this.doneIn > 0) return;
    const p = this.planePoint(e, 0);
    if (!p) return;
    const lx = (p.x - this.bigPos.x) / this.bigScale;
    const ly = (p.y - this.bigPos.y) / this.bigScale;
    while (this.nextBead < this.beads.length) {
      const b = this.beads[this.nextBead];
      if (Math.hypot(lx - b.x, ly - b.y) > 0.34) break;
      b.lit = true;
      b.pop.kick(this.reduced ? 0 : 6);
      (b.mesh.material as THREE.MeshBasicMaterial).color.setHex(this.big?.color ?? 0xffd93d);
      this.nextBead++;
      this.opts.onTrace?.({ n: this.nextBead, total: this.beads.length });
    }
    if (this.nextBead >= this.beads.length) this.finishTrace();
  }

  private finishTrace() {
    const letter = ALPHABET[this.current].letter;
    this.doneIn = 1.6;
    if (this.big) {
      this.big.mat.opacity = 1;
      this.big.spin = this.reduced ? 0 : 1;
      this.big.pop.kick(this.reduced ? 0 : 6);
    }
    if (!this.reduced) this.confetti.burst(this.bigPos.clone().setY(this.bigPos.y + 1), [0xffd93d, 0xff6b9a, 0x6bcb77, 0x4d96ff], 44, 9);
    this.opts.onTraceDone?.({ letter });
  }

  // ---- input ----
  protected onDown(info: PickInfo | null, e: PointerEvent) {
    const owner = info?.owner;
    if (owner === "big") {
      this.big?.pop.kick(this.reduced ? 0 : 5);
      if (this.mode === "learn") this.opts.onSelect?.({ letter: ALPHABET[this.current].letter, word: ALPHABET[this.current].word, index: this.current, found: this.found.size });
      else {
        this.pressed = true;
        this.traceAt(e);
      }
      return;
    }
    if (owner && typeof owner === "object") {
      this.select((owner as Tile).index, true);
      return;
    }
    this.pressed = true;
    this.traceAt(e);
  }

  protected onMove(e: PointerEvent) {
    if (this.pressed) this.traceAt(e);
  }

  protected onUp() {
    this.pressed = false;
  }

  // ---- simulation ----
  protected update(dt: number) {
    const t = this.time;
    const idle = this.reduced ? 0 : 1;
    this.idleHop -= dt;
    if (this.idleHop <= 0 && idle) {
      this.tiles[Math.floor(Math.random() * this.tiles.length)].hop.kick(4);
      this.idleHop = 1.2 + Math.random() * 1.6;
    }
    for (const tile of this.tiles) {
      const h = Math.max(0, tile.hop.step(dt));
      const sel = tile.index === this.current;
      const s = tile.scale * (sel ? 1.15 : 1);
      tile.group.position.set(tile.x, 0.72 * s + h * 0.35, tile.z);
      tile.group.rotation.y = Math.sin(t * 0.9 + tile.phase) * 0.18 * idle;
      tile.group.scale.setScalar(s * (1 + Math.sin(t * 2.4 + tile.phase) * 0.015 * idle));
      tile.mat.emissiveIntensity = sel ? 0.35 : 0;
      tile.mat.emissive.setHex(sel ? 0xffffff : 0x000000);
    }
    const big = this.big;
    if (big) {
      const pop = Math.max(0.01, big.pop.step(dt));
      const drop = big.drop.step(dt);
      if (big.spin > 0) big.spin = Math.max(0, big.spin - dt / 0.9);
      const breathe = 1 + Math.sin(t * 2) * 0.02 * idle;
      const tracing = this.mode === "trace" && this.doneIn <= 0;
      big.group.position.set(this.bigPos.x, this.bigPos.y + drop + (tracing ? 0 : Math.sin(t * 1.6) * 0.12 * idle), 0);
      big.group.scale.setScalar(this.bigScale * pop * (tracing ? 1 : breathe));
      big.group.rotation.y = tracing ? 0 : Math.sin(t * 0.8) * 0.2 * idle + big.spin * Math.PI * 2;
    }
    for (const o of [this.emoji, this.word]) {
      if (!o) continue;
      const p = Math.max(0.01, o.pop.step(dt));
      const bob = o === this.emoji ? Math.sin(t * 2.2) * 0.15 * idle : 0;
      o.sprite.position.y = (o === this.emoji ? this.objPos.y : this.objPos.y - 2.4) + bob;
      const base = o === this.emoji ? 3.4 : 5.2;
      o.sprite.scale.set(base * p, (o === this.emoji ? 3.4 : 1.8) * p, 1);
    }
    this.beads.forEach((b, i) => {
      const k = Math.max(0, b.pop.step(dt));
      const hint = i === this.nextBead && this.mode === "trace" ? 1 + Math.sin(t * 8) * 0.35 : 1;
      b.mesh.scale.setScalar((i === 0 ? 0.1 : 0.065) * (b.lit ? 1.5 : hint) * (1 + k * 0.6));
    });
    if (this.doneIn > 0) {
      this.doneIn -= dt;
      if (this.doneIn <= 0) this.select((this.current + 1) % this.tiles.length, true);
    }
  }

  protected onDestroy() {
    this.clearTrace();
    this.tiles.forEach((t) => t.mat.dispose());
    this.big?.mat.dispose();
    for (const o of [this.emoji, this.word]) o?.dispose();
    this.geos.forEach((g) => g.dispose());
    this.beadGeo.dispose();
  }
}
