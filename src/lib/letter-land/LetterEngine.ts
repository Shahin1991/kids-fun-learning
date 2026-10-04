import * as THREE from "three";
import { ALPHABET } from "@/data/alphabet";
import { buildGlyphGeometry } from "@/lib/parade/glyph-geometry";
import { GLYPHS } from "@/lib/parade/glyphs";
import { makeTitle } from "@/lib/toy3d/bubble";
import { addToyRoom } from "@/lib/toy3d/scenery";
import { Spring } from "@/lib/toy3d/spring";
import { ToyScene, type PickInfo, type ToyOptions } from "@/lib/toy3d/ToyScene";
import { sampleStrokes } from "./trace";

export type LetterMode = "learn" | "trace";
export type LetterSet = "letters" | "numbers";

export interface Paging {
  /** whether the ◀ ▶ bar should be shown */
  show: boolean;
  label: string;
  canPrev: boolean;
  canNext: boolean;
}

interface Entry {
  key: string;
  word: string;
  emoji: string;
  /** how many copies of the emoji to draw (numbers show that many objects) */
  count: number;
  spoken: string;
}

const NUMBER_WORDS = ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Zero"];
const NUMBER_EMOJI = ["🍎", "🐥", "🎈", "🍪", "⭐", "🐞", "🌸", "🚗", "🍓"];

const LETTER_ENTRIES: Entry[] = ALPHABET.map((a) => ({ key: a.letter, word: a.word, emoji: a.emoji, count: 1, spoken: `${a.letter}. ${a.letter} is for ${a.word}` }));
const NUMBER_ENTRIES: Entry[] = "1234567890".split("").map((d, i) => ({
  key: d,
  word: NUMBER_WORDS[i],
  emoji: d === "0" ? "⭕" : NUMBER_EMOJI[i],
  count: d === "0" ? 1 : i + 1,
  spoken: `${d}. ${NUMBER_WORDS[i]}`,
}));

export interface LetterOptions extends ToyOptions {
  onPaging?: (p: Paging) => void;
  onSelect?: (p: { letter: string; word: string; spoken: string; index: number; found: number }) => void;
  onTrace?: (p: { n: number; total: number }) => void;
  onTraceDone?: (p: { letter: string }) => void;
  onMilestone?: (p: { found: number }) => void;
}

const COLORS = [0xff6b6b, 0x4d96ff, 0x6bcb77, 0xffb703, 0x9b51e0, 0xff7f50, 0x2ec4b6, 0xf15bb5];

interface Tile {
  entry: Entry;
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
  private entries: Entry[] = LETTER_ENTRIES;
  private set: LetterSet = "letters";
  private tiles: Tile[] = [];
  private geos = new Map<string, THREE.BufferGeometry>();
  private big: Big | null = null;
  private emoji: { sprite: THREE.Sprite; dispose: () => void; pop: Spring; w: number; h: number } | null = null;
  private word: { sprite: THREE.Sprite; dispose: () => void; pop: Spring } | null = null;
  private current = -1;
  private mode: LetterMode = "learn";
  private page = 0;
  private found = new Set<string>();
  private lastMilestone = 0;
  private aspect = 1.8;
  private dist = 17;
  private halfW = 12;
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
    this.buildTiles();
    this.start();
    this.select(0, false);
  }

  private glyph(ch: string) {
    let g = this.geos.get(ch);
    if (!g) this.geos.set(ch, (g = buildGlyphGeometry(ch)));
    return g;
  }

  // ---- public controls ----
  setMode(mode: LetterMode) {
    this.mode = mode;
    this.doneIn = 0;
    this.relayout();
    this.rebuildTrace();
    this.emitPaging();
  }

  setSet(set: LetterSet) {
    if (set === this.set) return;
    this.set = set;
    this.entries = set === "letters" ? LETTER_ENTRIES : NUMBER_ENTRIES;
    this.found.clear();
    this.lastMilestone = 0;
    this.page = 0;
    this.buildTiles();
    this.relayout();
    this.select(0, true);
  }

  /** ◀ in the paging bar: previous page of tiles (learn) or previous letter (trace). */
  prev() {
    if (this.mode === "trace") this.select((this.current - 1 + this.entries.length) % this.entries.length, true);
    else this.goPage(this.page - 1);
  }

  next() {
    if (this.mode === "trace") this.select((this.current + 1) % this.entries.length, true);
    else this.goPage(this.page + 1);
  }

  activate(id: string) {
    const i = this.entries.findIndex((a) => a.key === id);
    if (i >= 0) this.select(i, true);
  }

  // ---- building ----
  private buildTiles() {
    for (const t of this.tiles) {
      this.stage.scene.remove(t.group);
      t.mat.dispose();
    }
    this.tiles = [];
    this.entries.forEach((entry, index) => {
      const color = COLORS[index % COLORS.length];
      const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15 });
      const group = new THREE.Group();
      group.add(new THREE.Mesh(this.glyph(entry.key), mat));
      const tile: Tile = { entry, index, group, mesh: group.children[0] as THREE.Mesh, mat, hop: new Spring(0, 0, 220, 9), x: 0, z: 0, scale: 1, phase: Math.random() * 6, next: 0 };
      const hit = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.7, 1), new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }));
      hit.userData.owner = tile;
      group.add(hit);
      group.visible = false;
      this.stage.scene.add(group);
      this.tiles.push(tile);
    });
  }

  // ---- layout (depends on screen shape, mode, page) ----
  protected onResize(aspect: number) {
    this.aspect = aspect;
    const wide = aspect > 1.3;
    // Phones are tall and narrow, so the camera comes closer instead of pulling far back.
    this.dist = wide ? 17 : 17 * Math.max(1, 0.8 / aspect);
    this.halfW = this.stage.halfWidthAt(this.dist);
    this.relayout();
  }

  private get wide() {
    return this.aspect > 1.3;
  }

  private get pageSize() {
    if (this.wide) return this.entries.length;
    return 6;
  }

  private get pages() {
    return Math.max(1, Math.ceil(this.entries.length / this.pageSize));
  }

  private goPage(p: number) {
    this.page = Math.max(0, Math.min(this.pages - 1, p));
    this.relayout();
    this.emitPaging();
  }

  private relayout() {
    if (!this.tiles.length) return;
    const wide = this.wide;
    const learn = this.mode === "learn";
    const cols = wide ? (this.set === "letters" ? 13 : 10) : 3;
    const tileZ = 3.4;
    const spacing = Math.min(wide ? 1.5 : 3.0, (this.stage.halfWidthAt(this.dist - tileZ) * 2 * 0.9) / cols);
    const first = this.page * this.pageSize;
    this.tiles.forEach((t) => {
      const local = t.index - first;
      const onPage = learn && local >= 0 && local < this.pageSize;
      t.group.visible = onPage;
      if (!onPage) return;
      const c = local % cols;
      const r = Math.floor(local / cols);
      t.x = (c - (Math.min(cols, this.pageSize - Math.floor(local / cols) * cols) - 1) / 2) * spacing;
      t.z = tileZ + r * (wide ? 2.3 : 6);
      t.scale = Math.min(wide ? 1.1 : 2.2, (spacing * 0.85) / 1.05);
      t.group.scale.setScalar(t.scale);
    });

    if (learn) {
      this.bigScale = Math.min(3.4, this.halfW * (wide ? 0.3 : 0.55));
      this.bigPos.set(-this.halfW * (wide ? 0.32 : 0.42), 0.72 * this.bigScale + 1.4, 0);
      this.objPos.set(this.halfW * (wide ? 0.32 : 0.42), 3.4, 0);
    } else {
      // Tracing: only the letter, big and centred.
      this.bigScale = Math.min(5.4, this.halfW * 1.15);
      this.bigPos.set(0, 0.72 * this.bigScale + 0.9, 0);
    }
    const rows = Math.ceil(Math.min(this.pageSize, this.tiles.length) / cols);
    const cam = this.stage.camera;
    if (learn && !wide) {
      // Phones: look down from higher up so the two rows of letters separate on screen.
      cam.position.set(0, 13 + rows * 0.5, this.dist);
      cam.lookAt(0, 2, -1.2);
    } else {
      cam.position.set(0, learn ? 7.4 + rows * 0.8 : 7, this.dist);
      cam.lookAt(0, learn ? 2.6 : 3.4, 1.8);
    }
    if (this.emoji) this.emoji.sprite.visible = learn;
    if (this.word) this.word.sprite.visible = learn;
    this.refreshPickables();
    if (this.big) this.rebuildTrace();
  }

  private refreshPickables() {
    const list: THREE.Object3D[] = [];
    if (this.big) list.push(this.big.group);
    if (this.mode === "learn") for (const t of this.tiles) if (t.group.visible) list.push(t.group);
    this.pickables = list;
  }

  private emitPaging() {
    const learn = this.mode === "learn";
    if (learn) {
      const first = this.page * this.pageSize;
      const last = Math.min(this.entries.length, first + this.pageSize) - 1;
      this.opts.onPaging?.({ show: this.pages > 1, label: `${this.entries[first].key} – ${this.entries[last].key}`, canPrev: this.page > 0, canNext: this.page < this.pages - 1 });
    } else {
      this.opts.onPaging?.({ show: true, label: this.entries[this.current]?.key ?? "", canPrev: true, canNext: true });
    }
  }

  // ---- selecting ----
  private select(index: number, announce: boolean) {
    const entry = this.entries[index];
    this.current = index;
    this.doneIn = 0;
    // Keep the chosen tile's page on screen.
    const wantPage = Math.floor(index / this.pageSize);
    if (wantPage !== this.page && this.mode === "learn") {
      this.page = wantPage;
      this.relayout();
    }

    if (this.big) {
      this.stage.scene.remove(this.big.group);
      this.big.mat.dispose();
    }
    const color = COLORS[index % COLORS.length];
    const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12, emissive: color, emissiveIntensity: 0.1 });
    const group = new THREE.Group();
    group.add(new THREE.Mesh(this.glyph(entry.key), mat));
    const hit = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.9, 1.2), new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }));
    hit.userData.owner = "big";
    group.add(hit);
    this.stage.scene.add(group);
    this.big = { group, mesh: group.children[0] as THREE.Mesh, mat, color, pop: new Spring(0, 1, 150, 9), drop: new Spring(this.reduced ? 0 : 7, 0, 110, 10), spin: this.reduced ? 0 : 1 };

    this.setObject(entry, color);
    this.tiles[index].hop.kick(this.reduced ? 0 : 7);
    if (!this.reduced) this.confetti.burst(this.bigPos.clone().setY(this.bigPos.y + 1.5), [color, 0xffd93d, 0xffffff, 0xff6b9a], 30, 8);
    this.found.add(entry.key);
    if (announce) this.opts.onSelect?.({ letter: entry.key, word: entry.word, spoken: entry.spoken, index, found: this.found.size });
    if (this.found.size % 5 === 0 && this.found.size !== this.lastMilestone) {
      this.lastMilestone = this.found.size;
      this.opts.onMilestone?.({ found: this.found.size });
    }
    this.refreshPickables();
    this.rebuildTrace();
    this.emitPaging();
  }

  private makeEmojiSprite(emoji: string, count: number) {
    const c = document.createElement("canvas");
    const perRow = count <= 5 ? count : Math.ceil(count / 2);
    const rows = count <= 5 ? 1 : 2;
    const cell = 150;
    c.width = Math.max(256, perRow * cell);
    c.height = Math.max(256, rows * cell);
    const g = c.getContext("2d")!;
    g.font = `${cell * 0.78}px serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    for (let i = 0; i < count; i++) {
      const r = Math.floor(i / perRow);
      const inRow = Math.min(perRow, count - r * perRow);
      const col = i % perRow;
      g.fillText(emoji, c.width / 2 + (col - (inRow - 1) / 2) * cell, c.height / 2 + (r - (rows - 1) / 2) * cell + 6);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    const h = 3.4;
    const w = h * (c.width / c.height);
    sprite.scale.set(w, h, 1);
    return {
      sprite,
      w,
      h,
      dispose: () => {
        tex.dispose();
        mat.dispose();
      },
    };
  }

  private setObject(entry: Entry, color: number) {
    for (const o of [this.emoji, this.word]) {
      if (o) {
        this.stage.scene.remove(o.sprite);
        o.dispose();
      }
    }
    const e = this.makeEmojiSprite(entry.emoji, entry.count);
    // Keep wide object groups inside the screen next to the big letter.
    const maxW = this.halfW * (this.wide ? 0.55 : 0.8);
    if (e.w > maxW) {
      const k = maxW / e.w;
      e.w *= k;
      e.h *= k;
    }
    e.sprite.position.copy(this.objPos);
    e.sprite.visible = this.mode === "learn";
    this.stage.scene.add(e.sprite);
    this.emoji = { ...e, pop: new Spring(0, 1, 140, 7) };
    const w = makeTitle(entry.word, `#${color.toString(16).padStart(6, "0")}`);
    w.sprite.position.set(this.objPos.x, this.objPos.y - 2.4, 0);
    w.sprite.visible = this.mode === "learn";
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
    const key = this.entries[this.current].key;
    const group = new THREE.Group();
    group.position.copy(this.bigPos);
    group.scale.setScalar(this.bigScale);
    sampleStrokes(GLYPHS[key]).forEach((b, i) => {
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
    this.doneIn = 1.6;
    if (this.big) {
      this.big.mat.opacity = 1;
      this.big.spin = this.reduced ? 0 : 1;
      this.big.pop.kick(this.reduced ? 0 : 6);
    }
    if (!this.reduced) this.confetti.burst(this.bigPos.clone().setY(this.bigPos.y + 1), [0xffd93d, 0xff6b9a, 0x6bcb77, 0x4d96ff], 44, 9);
    this.opts.onTraceDone?.({ letter: this.entries[this.current].key });
  }

  // ---- input ----
  protected onDown(info: PickInfo | null, e: PointerEvent) {
    const owner = info?.owner;
    if (owner === "big") {
      this.big?.pop.kick(this.reduced ? 0 : 5);
      if (this.mode === "learn") {
        const en = this.entries[this.current];
        this.opts.onSelect?.({ letter: en.key, word: en.word, spoken: en.spoken, index: this.current, found: this.found.size });
      } else {
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
    if (this.idleHop <= 0 && idle && this.mode === "learn") {
      const shown = this.tiles.filter((x) => x.group.visible);
      if (shown.length) shown[Math.floor(Math.random() * shown.length)].hop.kick(4);
      this.idleHop = 1.2 + Math.random() * 1.6;
    }
    for (const tile of this.tiles) {
      if (!tile.group.visible) continue;
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
      const isEmoji = o === this.emoji;
      const bob = isEmoji ? Math.sin(t * 2.2) * 0.15 * idle : 0;
      o.sprite.position.set(this.objPos.x, (isEmoji ? this.objPos.y : this.objPos.y - 2.4) + bob, 0);
      if (isEmoji && this.emoji) o.sprite.scale.set(this.emoji.w * p, this.emoji.h * p, 1);
      else o.sprite.scale.set(5.2 * p, 1.8 * p, 1);
    }
    this.beads.forEach((b, i) => {
      const k = Math.max(0, b.pop.step(dt));
      const hint = i === this.nextBead && this.mode === "trace" ? 1 + Math.sin(t * 8) * 0.35 : 1;
      b.mesh.scale.setScalar((i === 0 ? 0.1 : 0.065) * (b.lit ? 1.5 : hint) * (1 + k * 0.6));
    });
    if (this.doneIn > 0) {
      this.doneIn -= dt;
      if (this.doneIn <= 0) this.select((this.current + 1) % this.entries.length, true);
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
