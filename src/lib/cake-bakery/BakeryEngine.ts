import * as THREE from "three";
import { drawFace, type Emotion } from "@/lib/toy3d/faces";
import { Floaters } from "@/lib/toy3d/floaters";
import { Spring } from "@/lib/toy3d/spring";
import { ToyScene, type PickInfo, type ToyOptions } from "@/lib/toy3d/ToyScene";
import { Assets, TIER_H, TIER_R, Tier, makePipe, makeTopping } from "./CakeModel";
import { FLAVORS, FROSTINGS, scoreCake, type CakeSpec, type Customer, type Grade, type Order, type PipeShape } from "./recipe";

export const STATIONS = ["pantry", "mix", "bake", "frost", "decorate", "serve"] as const;
export type Sfx = "note" | "ding" | "pop" | "splash";

export interface BakeryState {
  station: number;
  flavor: string;
  tiers: number;
  jars: number;
  mix: number;
  pour: number;
  /** 0..1 while the oven is on, -1 otherwise */
  baking: number;
  baked: boolean;
  cover: number;
  decor: number;
  grade: Grade | null;
  cake: CakeSpec;
}

export interface BakeryOptions extends ToyOptions {
  onState?: (s: BakeryState) => void;
  onSfx?: (kind: Sfx, n?: number) => void;
  onServed?: (grade: Grade, cake: CakeSpec) => void;
}

type Pose = { pos: [number, number, number]; look: [number, number, number] };
const POSES: Pose[] = [
  { pos: [0, 2.9, 6.2], look: [0, 2.1, -2] },
  { pos: [0, 3.2, 4.0], look: [0, 0.95, -1.3] },
  { pos: [-0.2, 3.0, 6.0], look: [-0.2, 0.8, -1.8] },
  { pos: [0, 3.0, 4.2], look: [0, 1.25, -1.3] },
  { pos: [0, 3.3, 3.8], look: [0, 1.35, -1.3] },
  { pos: [1.2, 3.0, 5.0], look: [1.3, 1.3, -1.5] },
];

const COUNTER_Y = 1;
const STAND_Y = 1.45;
const CENTER = new THREE.Vector3(0, 0, -1.3);
const OVEN = new THREE.Vector3(-4.1, 1.75, -1.6);
const JARS = [
  { name: "Flour", emoji: "🌾", color: "#ffffff" },
  { name: "Eggs", emoji: "🥚", color: "#ffd23f" },
  { name: "Milk", emoji: "🥛", color: "#eaf3ff" },
  { name: "Sugar", emoji: "🍬", color: "#ffd0e6" },
];

interface Jar {
  group: THREE.Group;
  home: THREE.Vector3;
  t: number;
  active: boolean;
  added: boolean;
  droppedFx: boolean;
}
interface Pan {
  group: THREE.Group;
  fill: THREE.Mesh;
  fillMat: THREE.MeshStandardMaterial;
  home: THREE.Vector3;
  level: number;
  scale: Spring;
}
interface DecorEntry {
  objs: THREE.Object3D[];
  topping?: string;
}

const ease = (t: number) => t * t * (3 - 2 * t);

export class BakeryEngine extends ToyScene {
  private assets = new Assets();
  private floaters: Floaters;
  private textures: THREE.Texture[] = [];

  // station + cake state
  private station = 0;
  private flavorId = FLAVORS[0].id;
  private tiersWanted = 1;
  private frostId = FROSTINGS[1].id;
  private order: Order | null = null;
  private grade: Grade | null = null;
  private served = false;
  private mixAngle = 0;
  private mixTurns = 0;
  private mixLastAngle: number | null = null;
  private baking = -1;
  private bakeT = 0;
  private baked = false;
  private tiers: Tier[] = [];
  private tierDrops: Spring[] = [];
  private decor: DecorEntry[] = [];
  private pops: { obj: THREE.Object3D; s: Spring }[] = [];
  private candles: THREE.Object3D[] = [];
  private decorMode: "pipe" | "topping" = "topping";
  private topping = "strawberry";
  private pipe: PipeShape = "dot";
  private pipeColor = FROSTINGS[0].color;
  private jarsAdded = 0;

  // scene objects
  private cakeGroup = new THREE.Group();
  private stand = new THREE.Group();
  private bowl = new THREE.Group();
  private bowlSquash = new Spring(0, 0, 240, 10);
  private batter!: THREE.Mesh;
  private batterMat = new THREE.MeshStandardMaterial({ color: FLAVORS[0].batter, roughness: 0.4 });
  private whisk = new THREE.Group();
  private stream: THREE.Mesh;
  private jars: Jar[] = [];
  private pans: Pan[] = [];
  private ovenGlow = new THREE.MeshStandardMaterial({ color: 0x2a2a30, emissive: 0xff7a1a, emissiveIntensity: 0, roughness: 0.3 });
  private customerGroup = new THREE.Group();
  private head!: THREE.Mesh;
  private faceCanvas = document.createElement("canvas");
  private faceTex: THREE.CanvasTexture;
  private hairMat = new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.8 });
  private skinMat = new THREE.MeshStandardMaterial({ color: 0xf6c9a5, roughness: 0.6 });
  private outfitMat = new THREE.MeshStandardMaterial({ color: 0xff7aa8, roughness: 0.6 });
  private customerHop = new Spring(0, 0, 220, 9);
  private cakeYaw = 0;
  private yawTarget = 0;

  // camera
  private camPos = new THREE.Vector3(...POSES[0].pos);
  private camLook = new THREE.Vector3(...POSES[0].look);
  private aspect = 1.6;

  // pointer
  private ray = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private drag: { mode: string; x: number; y: number; moved: boolean; last: THREE.Vector3 | null; pan?: number; pending?: THREE.Intersection } | null = null;
  private pouring = -1;
  private pourTick = 0;
  private lastEmit = "";

  constructor(container: HTMLElement, private opts: BakeryOptions = {}) {
    super(container, 0xffe6ef, opts, 44);
    const scene = this.stage.scene;
    scene.add(new THREE.HemisphereLight(0xffffff, 0xf3c9d8, 1.45));
    const sun = new THREE.DirectionalLight(0xfff2dc, 1.7);
    sun.position.set(3, 9, 7);
    scene.add(sun);
    this.floaters = new Floaters(scene);
    this.stage.onDispose(() => this.floaters.dispose());

    this.faceCanvas.width = 1024;
    this.faceCanvas.height = 512;
    this.faceTex = new THREE.CanvasTexture(this.faceCanvas);
    this.faceTex.colorSpace = THREE.SRGBColorSpace;
    this.textures.push(this.faceTex);

    this.buildKitchen();
    this.buildBowl();
    this.buildJars();
    this.buildPans();
    this.buildOven();
    this.buildCustomer();
    this.cakeGroup.position.set(CENTER.x, STAND_Y + 0.04, CENTER.z);
    scene.add(this.cakeGroup);
    this.stream = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 8), this.batterMat);
    this.stream.visible = false;
    scene.add(this.stream);
    this.setCustomer(null);
    this.applyStationVisibility();
    this.snapCamera();
    this.start();
    this.emit(true);
  }

  protected onDestroy() {
    for (const t of this.tiers) t.dispose();
    this.assets.dispose();
    this.textures.forEach((t) => t.dispose());
    this.batterMat.dispose();
    this.ovenGlow.dispose();
    this.hairMat.dispose();
    this.skinMat.dispose();
    this.outfitMat.dispose();
  }

  // ---------------------------------------------------------------- public API
  get state(): BakeryState {
    const pans = this.pans.slice(0, this.tiersWanted);
    return {
      station: this.station,
      flavor: this.flavorId,
      tiers: this.tiersWanted,
      jars: this.jarsAdded,
      mix: Math.min(1, this.mixTurns / 3),
      pour: pans.length ? pans.reduce((s, p) => s + Math.min(1, p.level), 0) / pans.length : 0,
      baking: this.baking,
      baked: this.baked,
      cover: this.coverage(),
      decor: this.decor.length,
      grade: this.grade,
      cake: this.spec(),
    };
  }

  setOrder(order: Order | null) {
    this.order = order;
    this.setCustomer(order?.customer ?? null);
  }

  /** Throw away the current cake and start a fresh bake at the pantry. */
  reset(order: Order | null) {
    this.clearCake();
    this.jarsAdded = 0;
    this.jars.forEach((j) => Object.assign(j, { added: false, active: false, t: 0 }));
    this.mixTurns = 0;
    this.mixLastAngle = null;
    this.pans.forEach((p) => (p.level = 0));
    this.baked = false;
    this.baking = -1;
    this.grade = null;
    this.served = false;
    this.setOrder(order);
    this.setCustomerFace("happy");
    this.station = 0;
    this.applyStationVisibility();
    this.emit(true);
  }

  setFlavor(id: string) {
    if (id === this.flavorId) return;
    this.flavorId = id;
    const f = FLAVORS.find((x) => x.id === id) ?? FLAVORS[0];
    this.batterMat.color.set(f.batter);
    if (this.baked) this.unbake();
    this.emit(true);
  }

  setTiers(n: number) {
    n = Math.max(1, Math.min(3, n));
    if (n === this.tiersWanted) return;
    this.tiersWanted = n;
    if (this.baked) this.unbake();
    this.layoutPans();
    this.emit(true);
  }

  setFrosting(id: string) {
    this.frostId = id;
  }

  setDecor(p: { mode?: "pipe" | "topping"; topping?: string; pipe?: PipeShape; pipeColor?: string }) {
    if (p.mode) this.decorMode = p.mode;
    if (p.topping) this.topping = p.topping;
    if (p.pipe) this.pipe = p.pipe;
    if (p.pipeColor) this.pipeColor = p.pipeColor;
  }

  /** Jump to a station; anything the child skipped is finished for them. */
  goStation(i: number) {
    i = Math.max(0, Math.min(STATIONS.length - 1, i));
    if (i >= 1) this.autoPantry();
    if (i >= 2) this.mixTurns = Math.max(this.mixTurns, 3);
    if (i >= 3 && !this.baked) this.autoBake();
    this.station = i;
    if (i >= 3 && this.tiers.length === 0) this.buildCake();
    this.applyStationVisibility();
    if (i === 5) this.serveCake();
    else this.options("note", i + 1);
    this.emit(true);
  }

  startBake() {
    if (this.baked || this.baking >= 0) return;
    this.pans.slice(0, this.tiersWanted).forEach((p) => (p.level = 1));
    this.baking = 0;
    this.bakeT = 0;
    this.options("pop", 1);
    this.emit(true);
  }

  coverAll() {
    const idx = FROSTINGS.findIndex((f) => f.id === this.frostId);
    const color = FROSTINGS[idx]?.color ?? "#fff";
    this.tiers.forEach((t) => t.coverAll(color, idx));
    this.options("pop", 2);
    this.burstAt(this.cakeTop(), [color, "#ffffff"]);
    this.emit(true);
  }

  undoDecor() {
    const e = this.decor.pop();
    if (!e) return;
    e.objs.forEach((o) => {
      this.cakeGroup.remove(o);
      this.candles = this.candles.filter((c) => c !== o);
    });
    this.options("pop", 0);
    this.emit(true);
  }

  activate(id: string) {
    if (id === "next") this.goStation(this.station + 1);
    else if (id === "back") this.goStation(this.station - 1);
  }

  // ---------------------------------------------------------------- derived state
  private flavor() {
    return FLAVORS.find((f) => f.id === this.flavorId) ?? FLAVORS[0];
  }

  private coverage() {
    return this.tiers.length ? this.tiers.reduce((s, t) => s + t.coverage(), 0) / this.tiers.length : 0;
  }

  private spec(): CakeSpec {
    const tally = new Map<number, number>();
    this.tiers.forEach((t) => t.tally(tally));
    let best: number | null = null;
    let bestN = 0;
    tally.forEach((n, k) => {
      if (n > bestN) [best, bestN] = [k, n];
    });
    const frosting = this.coverage() >= 0.15 && best !== null ? FROSTINGS[best].id : null;
    return { flavor: this.flavorId, tiers: this.tiersWanted, frosting, toppings: this.decor.flatMap((d) => (d.topping ? [d.topping] : [])) };
  }

  private cakeTop() {
    const top = new THREE.Vector3(0, TIER_H * Math.max(1, this.tiers.length) + 0.3, 0);
    return this.cakeGroup.localToWorld(top);
  }

  private emit(force = false) {
    const s = JSON.stringify(this.state);
    if (!force && s === this.lastEmit) return;
    this.lastEmit = s;
    this.opts.onState?.(this.state);
  }

  private options(kind: Sfx, n?: number) {
    this.opts.onSfx?.(kind, n);
  }

  private burstAt(at: THREE.Vector3, colors: string[], count = 16) {
    if (this.reduced) return;
    this.confetti.burst(at, colors.map((c) => new THREE.Color(c).getHex()), count, 4);
  }

  // ---------------------------------------------------------------- scene building
  private buildKitchen() {
    const s = this.stage.scene;
    const a = this.assets;
    const wallTex = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const g = c.getContext("2d")!;
      g.fillStyle = "#ffd9e6";
      g.fillRect(0, 0, 128, 128);
      g.fillStyle = "#ffc6da";
      for (let i = 0; i < 8; i++) g.fillRect(i * 16, 0, 8, 128);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(10, 3);
      this.textures.push(t);
      return t;
    })();
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), new THREE.MeshStandardMaterial({ map: wallTex, roughness: 1 }));
    wall.position.set(0, 7, -4.3);
    s.add(wall);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), a.mat("#e9c7a1", { rough: 0.9 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = 2;
    s.add(floor);
    // counter
    const body = new THREE.Mesh(new THREE.BoxGeometry(14, COUNTER_Y, 3.4), a.mat("#fff4f8"));
    body.position.set(0, COUNTER_Y / 2, -2.5);
    s.add(body);
    const top = new THREE.Mesh(new THREE.BoxGeometry(14.2, 0.12, 3.6), a.mat("#ffb6cf", { rough: 0.35 }));
    top.position.set(0, COUNTER_Y + 0.06 - 0.12, -2.45);
    s.add(top);
    // backsplash tiles
    const tiles = new THREE.Mesh(new THREE.PlaneGeometry(14, 1.6), a.mat("#fff", { rough: 0.3 }));
    tiles.position.set(0, COUNTER_Y + 0.9, -4.28);
    s.add(tiles);
    // shelf
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.14, 0.8), a.mat("#d99a62"));
    shelf.position.set(0, 2.55, -3.6);
    s.add(shelf);
    // cake stand
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.55, 0.4, 24), a.mat("#fff", { rough: 0.3 }));
    ped.position.set(CENTER.x, COUNTER_Y + 0.2, CENTER.z);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.08, 48), a.mat("#fff8fb", { rough: 0.25 }));
    plate.position.set(CENTER.x, STAND_Y - 0.04, CENTER.z);
    this.stand.add(ped, plate);
    s.add(this.stand);
  }

  private buildBowl() {
    const a = this.assets;
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(0.95, 36, 18, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x7fd6ff, roughness: 0.3, side: THREE.DoubleSide }),
    );
    const rim = new THREE.Mesh(a.geo("bowlrim", () => new THREE.TorusGeometry(0.95, 0.05, 8, 40)), a.mat("#bfeaff"));
    rim.rotation.x = Math.PI / 2;
    this.batter = new THREE.Mesh(new THREE.CircleGeometry(0.86, 36), this.batterMat);
    this.batter.rotation.x = -Math.PI / 2;
    this.batter.position.y = -0.35;
    this.bowl.add(shell, rim, this.batter);
    this.bowl.position.set(CENTER.x, COUNTER_Y + 0.95, CENTER.z);
    this.stage.scene.add(this.bowl);
    // whisk
    const handle = new THREE.Mesh(a.geo("whh", () => new THREE.CylinderGeometry(0.05, 0.05, 0.9, 10)), a.mat("#ff7aa8"));
    handle.position.y = 0.55;
    this.whisk.add(handle);
    for (let i = 0; i < 4; i++) {
      const loop = new THREE.Mesh(a.geo("whl", () => new THREE.TorusGeometry(0.2, 0.015, 6, 20)), a.mat("#c9d2dc", { metal: 0.8, rough: 0.25 }));
      loop.scale.set(1, 1.7, 1);
      loop.rotation.y = (i / 4) * Math.PI;
      loop.position.y = -0.1;
      this.whisk.add(loop);
    }
    this.whisk.visible = false;
    this.stage.scene.add(this.whisk);
  }

  private labelTexture(emoji: string) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    g.fillStyle = "#fff";
    g.beginPath();
    g.arc(64, 64, 58, 0, Math.PI * 2);
    g.fill();
    g.font = "76px serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(emoji, 64, 70);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    this.textures.push(t);
    return t;
  }

  private buildJars() {
    const a = this.assets;
    JARS.forEach((j, i) => {
      const group = new THREE.Group();
      const glass = new THREE.Mesh(a.geo("jar", () => new THREE.CylinderGeometry(0.42, 0.42, 0.95, 20)), new THREE.MeshStandardMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.35, roughness: 0.1 }));
      const content = new THREE.Mesh(a.geo("jarc", () => new THREE.CylinderGeometry(0.38, 0.38, 0.62, 20)), a.mat(j.color, { rough: 0.8 }));
      content.position.y = -0.14;
      const lid = new THREE.Mesh(a.geo("jarlid", () => new THREE.CylinderGeometry(0.44, 0.44, 0.14, 20)), a.mat("#ff9fc0"));
      lid.position.y = 0.54;
      const label = new THREE.Mesh(a.geo("jarlabel", () => new THREE.CircleGeometry(0.28, 20)), new THREE.MeshBasicMaterial({ map: this.labelTexture(j.emoji), transparent: true }));
      label.position.set(0, -0.05, 0.43);
      const hit = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 1.2), new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }));
      hit.userData.jar = i;
      group.add(glass, content, lid, label, hit);
      const home = new THREE.Vector3(-1.95 + i * 1.3, 2.62 + 0.52, -3.6);
      group.position.copy(home);
      this.stage.scene.add(group);
      this.jars.push({ group, home, t: 0, active: false, added: false, droppedFx: false });
    });
  }

  private buildPans() {
    const a = this.assets;
    for (let i = 0; i < 3; i++) {
      const r = TIER_R[i];
      const group = new THREE.Group();
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.96, 0.34, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0xc9d2dc, metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide }));
      tube.position.y = 0.17;
      const bottom = new THREE.Mesh(new THREE.CircleGeometry(r * 0.96, 40), a.mat("#9aa5b1", { metal: 0.6 }));
      bottom.rotation.x = -Math.PI / 2;
      bottom.position.y = 0.01;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.025, 6, 40), a.mat("#e5ebf1", { metal: 0.8, rough: 0.2 }));
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.34;
      const fillMat = new THREE.MeshStandardMaterial({ color: this.flavor().batter, roughness: 0.45 });
      const fill = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.94, r * 0.9, 0.3, 40), fillMat);
      fill.scale.y = 0.001;
      const hit = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.25, r + 0.25, 1.2, 16), new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }));
      hit.position.y = 0.5;
      hit.userData.pan = i;
      group.add(tube, bottom, rim, fill, hit);
      this.stage.scene.add(group);
      this.pans.push({ group, fill, fillMat, home: new THREE.Vector3(), level: 0, scale: new Spring(1, 1, 220, 12) });
    }
    this.layoutPans();
  }

  private layoutPans() {
    const n = this.tiersWanted;
    this.pans.forEach((p, i) => {
      p.home.set((i - (n - 1) / 2) * 2.3, COUNTER_Y + 0.01, -2.0);
      if (this.baking < 0) p.group.position.copy(p.home);
    });
  }

  private buildOven() {
    const a = this.assets;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.1, 1.7), a.mat("#ffe3ee", { rough: 0.35 }));
    body.position.y = 1.05;
    const window = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.95, 0.06), this.ovenGlow);
    window.position.set(0, 1.0, 0.87);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.7, 8), a.mat("#c9d2dc", { metal: 0.8 }));
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 1.62, 0.92);
    g.add(body, window, bar);
    for (let i = 0; i < 4; i++) {
      const knob = new THREE.Mesh(a.geo("knob", () => new THREE.CylinderGeometry(0.09, 0.09, 0.08, 12)), a.mat("#ff6b9c"));
      knob.rotation.x = Math.PI / 2;
      knob.position.set(-0.75 + i * 0.5, 1.9, 0.87);
      g.add(knob);
    }
    g.position.set(OVEN.x, COUNTER_Y, OVEN.z - 0.4);
    this.stage.scene.add(g);
  }

  private buildCustomer() {
    const a = this.assets;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.55, 6, 16), this.outfitMat);
    body.position.y = 0.7;
    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 24), new THREE.MeshStandardMaterial({ map: this.faceTex, roughness: 0.6 }));
    this.head.position.y = 1.75;
    this.head.rotation.y = 0;
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.66, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.55), this.hairMat);
    hair.position.y = 1.82;
    hair.rotation.x = -0.35;
    const arms = [-1, 1].map((s) => {
      const arm = new THREE.Mesh(a.geo("arm", () => new THREE.CapsuleGeometry(0.11, 0.4, 4, 8)), this.skinMat);
      arm.position.set(s * 0.52, 0.85, 0.05);
      arm.rotation.z = s * 0.35;
      return arm;
    });
    this.customerGroup.add(body, this.head, hair, ...arms);
    this.customerGroup.position.set(3.7, COUNTER_Y, -3.0);
    this.customerGroup.scale.setScalar(0.9);
    this.stage.scene.add(this.customerGroup);
  }

  private setCustomer(c: Customer | null) {
    const cu = c ?? { skin: "#f6c9a5", outfit: "#ff7aa8", hair: "#5b3a29", name: "" };
    this.hairMat.color.set(cu.hair);
    this.outfitMat.color.set(cu.outfit);
    this.skinMat.color.set(cu.skin);
    this.setCustomerFace("happy", cu.skin);
    this.customerGroup.visible = c !== null;
  }

  private setCustomerFace(e: Emotion, skin?: string) {
    const g = this.faceCanvas.getContext("2d")!;
    drawFace(g, e);
    // the face texture carries the skin tone, so tint it by painting the skin colour behind the features
    const sk = skin ?? "#" + this.skinMat.color.getHexString();
    g.globalCompositeOperation = "multiply";
    g.fillStyle = sk;
    g.fillRect(0, 0, 1024, 512);
    g.globalCompositeOperation = "source-over";
    this.faceTex.needsUpdate = true;
  }

  // ---------------------------------------------------------------- cake building
  private clearCake() {
    this.tiers.forEach((t) => {
      this.cakeGroup.remove(t.group);
      t.dispose();
    });
    this.tiers = [];
    this.tierDrops = [];
    this.decor.flatMap((d) => d.objs).forEach((o) => this.cakeGroup.remove(o));
    this.decor = [];
    this.candles = [];
    this.pops = [];
    this.cakeYaw = this.yawTarget = 0;
    this.cakeGroup.rotation.y = 0;
  }

  private buildCake() {
    this.clearCake();
    for (let i = 0; i < this.tiersWanted; i++) {
      const t = new Tier(i, this.flavor().sponge);
      const y = i * TIER_H;
      t.group.position.y = y + 3.5 + i * 1.2;
      this.cakeGroup.add(t.group);
      this.tiers.push(t);
      const sp = new Spring(y + 3.5 + i * 1.2, y, 150, 11);
      this.tierDrops.push(sp);
    }
  }

  private autoPantry() {
    JARS.forEach((_, i) => {
      this.jars[i].added = true;
    });
    this.jarsAdded = JARS.length;
  }

  private autoBake() {
    this.pans.slice(0, this.tiersWanted).forEach((p) => (p.level = 1));
    this.finishBake(false);
  }

  private unbake() {
    this.baked = false;
    this.baking = -1;
    this.clearCake();
    this.pans.forEach((p) => {
      p.level = 0;
      p.fillMat.color.set(this.flavor().batter);
    });
  }

  private finishBake(celebrate: boolean) {
    this.baked = true;
    this.baking = -1;
    this.ovenGlow.emissiveIntensity = 0;
    const f = this.flavor();
    this.pans.forEach((p) => {
      p.fillMat.color.set(f.sponge);
      p.group.position.copy(p.home);
      p.scale.value = celebrate ? 0.2 : 1;
      p.scale.target = 1;
    });
    if (celebrate) {
      this.options("ding");
      this.pans.slice(0, this.tiersWanted).forEach((p) => this.burstAt(p.home.clone().setY(2.2), ["#ffe27a", "#ffffff", f.sponge], 14));
    }
  }

  // ---------------------------------------------------------------- stations
  private applyStationVisibility() {
    const st = this.station;
    this.bowl.visible = st <= 2 && !(st === 2 && this.baked);
    this.whisk.visible = st === 1;
    this.jars.forEach((j) => (j.group.visible = st === 0));
    this.pans.forEach((p, i) => (p.group.visible = st === 2 && i < this.tiersWanted));
    this.cakeGroup.visible = st >= 3;
    // the cake stand is in the way of the baking pans, and is only needed once there is a cake
    this.stand.visible = st !== 2;
    if (st === 2) this.layoutPans();
  }

  private serveCake() {
    const cake = this.spec();
    this.grade = scoreCake(this.order, cake);
    this.setCustomerFace(this.grade.stars === 3 ? "loved" : this.grade.stars === 2 ? "happy" : "surprised");
    this.customerHop.kick(7);
    this.options("ding");
    const at = new THREE.Vector3(3.7, 3.4, -3.0);
    this.burstAt(at, ["#ff8fb8", "#ffe27a", "#ffffff", "#9be59f"], 28);
    if (!this.reduced) for (let i = 0; i < this.grade.stars * 2; i++) this.floaters.spawn(i % 2 ? "star" : "heart", at.clone().add(new THREE.Vector3((i - 2) * 0.3, 0, 0.2)), new THREE.Vector3((i - 2) * 0.12, 1.1, 0), 0.7, 1.8);
    if (!this.served) {
      this.served = true;
      this.opts.onServed?.(this.grade, cake);
    }
  }

  // ---------------------------------------------------------------- input
  private cast(e: PointerEvent, objs: THREE.Object3D[]): THREE.Intersection[] {
    const r = this.stage.renderer.domElement.getBoundingClientRect();
    this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.stage.camera);
    return this.ray.intersectObjects(objs, true);
  }

  private floorHit(e: PointerEvent, y: number): THREE.Vector3 | null {
    this.cast(e, []);
    const p = new THREE.Vector3();
    return this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), p) ? p : null;
  }

  private tierHit(e: PointerEvent): THREE.Intersection | null {
    if (!this.cakeGroup.visible) return null;
    const hit = this.cast(e, this.tiers.map((t) => t.mesh))[0];
    return hit ?? null;
  }

  protected onDown(_info: PickInfo | null, e: PointerEvent) {
    const st = this.station;
    this.drag = { mode: "none", x: e.clientX, y: e.clientY, moved: false, last: null };
    const d = this.drag;
    if (st === 0) {
      const hit = this.cast(e, this.jars.map((j) => j.group))[0];
      const i = hit ? this.findUserData(hit.object, "jar") : undefined;
      if (i !== undefined) this.startJar(i);
    } else if (st === 1) {
      d.mode = "mix";
      this.mixMove(e);
    } else if (st === 2) {
      const hit = this.cast(e, this.pans.slice(0, this.tiersWanted).map((p) => p.group))[0];
      const i = hit ? this.findUserData(hit.object, "pan") : undefined;
      if (this.baking >= 0) this.bakeT += 1.5; // tap to hurry the oven along
      else if (i !== undefined && !this.baked) {
        d.mode = "pour";
        this.pouring = i;
      }
    } else if (st === 3 || st === 4) {
      const hit = this.tierHit(e);
      if (hit && st === 3) {
        d.mode = "paint";
        this.paintHit(hit);
      } else if (hit && this.decorMode === "pipe") {
        d.mode = "pipe";
        this.startStroke();
        this.pipeAt(hit, d);
      } else if (hit) {
        d.mode = "tap";
        d.pending = hit;
      } else d.mode = "turn";
    } else d.mode = "turn";
  }

  protected onMove(e: PointerEvent) {
    const d = this.drag;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.hypot(dx, e.clientY - d.y) > 8) d.moved = true;
    if (d.mode === "mix") this.mixMove(e);
    else if (d.mode === "paint") {
      const hit = this.tierHit(e);
      if (hit) this.paintHit(hit);
    } else if (d.mode === "pipe") {
      const hit = this.tierHit(e);
      if (hit) this.pipeAt(hit, d);
    } else if (d.mode === "turn" || (d.mode === "tap" && d.moved)) {
      d.mode = "turn";
      this.yawTarget += (e.movementX || 0) * 0.012;
    }
  }

  protected onUp() {
    const d = this.drag;
    this.drag = null;
    this.pouring = -1;
    this.mixLastAngle = null;
    if (!d) return;
    if (d.mode === "tap" && !d.moved && d.pending) this.placeTopping(d.pending);
    if (d.mode === "paint") this.emit(true);
  }

  private findUserData(o: THREE.Object3D, key: string): number | undefined {
    let n: THREE.Object3D | null = o;
    while (n) {
      if (n.userData[key] !== undefined) return n.userData[key] as number;
      n = n.parent;
    }
    return undefined;
  }

  // pantry
  private startJar(i: number) {
    const j = this.jars[i];
    if (j.active) return;
    j.active = true;
    j.t = 0;
    j.droppedFx = false;
    this.options("note", i + 2);
  }

  // mix
  private mixMove(e: PointerEvent) {
    const p = this.floorHit(e, 2.4);
    if (!p) return;
    const dx = p.x - CENTER.x;
    const dz = p.z - CENTER.z;
    const r = Math.min(0.62, Math.hypot(dx, dz));
    const ang = Math.atan2(dz, dx);
    this.whisk.position.set(CENTER.x + Math.cos(ang) * r, 2.35, CENTER.z + Math.sin(ang) * r);
    if (r > 0.18 && this.mixLastAngle !== null) {
      let da = ang - this.mixLastAngle;
      if (da > Math.PI) da -= Math.PI * 2;
      if (da < -Math.PI) da += Math.PI * 2;
      this.mixAngle += Math.abs(da);
      const before = Math.floor(this.mixTurns * 4);
      this.mixTurns += Math.abs(da) / (Math.PI * 2);
      if (Math.floor(this.mixTurns * 4) !== before) this.options("note", Math.floor(this.mixTurns * 4) % 10);
      if (!this.reduced && Math.random() < 0.15) this.burstAt(this.whisk.position.clone().setY(1.9), [this.flavor().batter], 3);
    }
    this.mixLastAngle = r > 0.18 ? ang : null;
  }

  // decorating
  private startStroke() {
    this.decor.push({ objs: [] });
  }

  private surface(hit: THREE.Intersection) {
    const local = this.cakeGroup.worldToLocal(hit.point.clone());
    const n = (hit.face?.normal ?? new THREE.Vector3(0, 1, 0)).clone().transformDirection(hit.object.matrixWorld);
    const inv = new THREE.Matrix4().copy(this.cakeGroup.matrixWorld).invert();
    n.transformDirection(inv).normalize();
    return { local, n };
  }

  private attach(obj: THREE.Object3D, hit: THREE.Intersection) {
    const { local, n } = this.surface(hit);
    obj.position.copy(local).addScaledVector(n, 0.004);
    obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    obj.rotateY(Math.random() * 6.28);
    this.cakeGroup.add(obj);
    const s = new Spring(this.reduced ? 1 : 0.15, 1, 300, 10);
    this.pops.push({ obj, s });
    return obj;
  }

  private pipeAt(hit: THREE.Intersection, d: NonNullable<typeof this.drag>) {
    const here = hit.point;
    if (d.last && d.last.distanceTo(here) < 0.2) return;
    d.last = here.clone();
    const blob = this.attach(makePipe(this.pipe, this.pipeColor, this.assets), hit);
    this.decor[this.decor.length - 1]?.objs.push(blob);
    this.options("pop", this.decor.length);
    this.emit();
  }

  private placeTopping(hit: THREE.Intersection) {
    const obj = this.attach(makeTopping(this.topping, this.assets), hit);
    if (this.topping === "candle") this.candles.push(obj);
    this.decor.push({ objs: [obj], topping: this.topping });
    this.options("pop", this.decor.length);
    this.burstAt(hit.point, ["#ffffff", "#ffe27a", "#ff8fb8"], 8);
    this.emit(true);
  }

  private paintHit(hit: THREE.Intersection) {
    const tier = this.tiers.find((t) => t.mesh === hit.object);
    const matIndex = hit.face?.materialIndex;
    if (!tier || !hit.uv || matIndex === undefined || matIndex > 1) return;
    const idx = FROSTINGS.findIndex((f) => f.id === this.frostId);
    tier.paint(matIndex, hit.uv, FROSTINGS[idx].color, idx);
    if (Math.random() < 0.1) this.options("pop", 3);
    this.emit();
  }

  // ---------------------------------------------------------------- frame update
  protected onResize(aspect: number) {
    this.aspect = aspect;
  }

  private poseTarget(): { pos: THREE.Vector3; look: THREE.Vector3 } {
    const p = POSES[this.station];
    const look = new THREE.Vector3(...p.look);
    const pos = new THREE.Vector3(...p.pos);
    // portrait screens need to sit further back
    const k = this.aspect < 1 ? 1 + (1 - this.aspect) * 0.9 : 1;
    pos.sub(look).multiplyScalar(k).add(look);
    return { pos, look };
  }

  private snapCamera() {
    const t = this.poseTarget();
    this.camPos.copy(t.pos);
    this.camLook.copy(t.look);
    this.stage.camera.position.copy(this.camPos);
    this.stage.camera.lookAt(this.camLook);
  }

  protected update(dt: number) {
    const t = this.poseTarget();
    const k = this.reduced ? 1 : 1 - Math.exp(-dt * 3.5);
    this.camPos.lerp(t.pos, k);
    this.camLook.lerp(t.look, k);
    this.stage.camera.position.copy(this.camPos);
    this.stage.camera.lookAt(this.camLook);
    this.floaters.update(dt);

    this.updateJars(dt);
    this.updateMix(dt);
    this.updatePans(dt);
    this.updateCake(dt);
    this.updateCustomer(dt);
    this.emit();
  }

  private updateJars(dt: number) {
    const bowlTop = new THREE.Vector3(CENTER.x, 3.0, CENTER.z + 0.25);
    this.jars.forEach((j, i) => {
      if (this.station !== 0) return;
      if (j.active) {
        j.t += dt / 1.3;
        const t = Math.min(1, j.t);
        const out = ease(Math.min(1, t / 0.45));
        const back = ease(Math.max(0, (t - 0.65) / 0.35));
        const mid = ease(Math.min(1, Math.max(0, (t - 0.45) / 0.2)));
        const pos = j.home.clone().lerp(bowlTop, out * (1 - back));
        pos.y += Math.sin(out * Math.PI) * 0.6 * (1 - back);
        j.group.position.copy(pos);
        j.group.rotation.z = -2.1 * mid * (1 - back);
        if (!j.droppedFx && t > 0.55) {
          j.droppedFx = true;
          if (!j.added) {
            j.added = true;
            this.jarsAdded = this.jars.filter((x) => x.added).length;
          }
          this.bowlSquash.kick(5);
          this.options("splash");
          this.burstAt(new THREE.Vector3(CENTER.x, 2.3, CENTER.z), [JARS[i].color, "#ffffff"], 10);
        }
        if (j.t >= 1) {
          j.active = false;
          j.group.position.copy(j.home);
          j.group.rotation.z = 0;
        }
      } else if (!this.reduced) {
        j.group.position.y = j.home.y + Math.sin(this.time * 1.6 + i) * 0.03;
        j.group.rotation.z = Math.sin(this.time * 1.2 + i * 2) * 0.03;
      }
    });
    const sq = this.bowlSquash.step(dt);
    this.bowl.scale.set(1 + sq * 0.05, 1 - sq * 0.08, 1 + sq * 0.05);
    // batter fills up with each ingredient, then shows the flavour colour
    const level = Math.max(this.jarsAdded / JARS.length, this.station >= 1 || this.baked ? 1 : 0);
    this.batter.visible = level > 0;
    this.batter.position.y = -0.55 + level * 0.25;
  }

  private updateMix(dt: number) {
    if (this.station !== 1) return;
    const spin = this.drag?.mode === "mix" ? 1 : 0;
    this.whisk.rotation.y += dt * (4 + spin * 10);
    this.whisk.rotation.z = Math.sin(this.time * 6) * 0.05 * spin;
    this.batter.rotation.z += dt * (0.5 + spin * 4);
    if (!this.drag) this.whisk.position.lerp(new THREE.Vector3(CENTER.x + 0.35, 2.55, CENTER.z), 0.1);
  }

  private updatePans(dt: number) {
    const f = this.flavor();
    // bake timeline
    if (this.baking >= 0) {
      const speed = this.reduced ? 3 : 1;
      this.bakeT += dt * speed;
      const slide = 1.1;
      const cook = 2.6;
      this.pans.slice(0, this.tiersWanted).forEach((p, i) => {
        const s = ease(Math.min(1, Math.max(0, (this.bakeT - i * 0.2) / 0.8)));
        p.group.position.lerpVectors(p.home, new THREE.Vector3(OVEN.x + 0.3, OVEN.y, OVEN.z + 1.0), s);
        p.group.scale.setScalar(1 - s * 0.85);
        p.group.visible = s < 0.98;
      });
      const prog = Math.min(1, Math.max(0, (this.bakeT - slide) / cook));
      this.baking = prog;
      this.ovenGlow.emissiveIntensity = (this.bakeT > 0.7 ? 1 : 0) * (0.8 + Math.sin(this.time * 8) * 0.2);
      if (this.bakeT >= slide + cook) {
        this.pans.forEach((p) => {
          p.group.scale.setScalar(1);
          p.group.visible = true;
        });
        this.finishBake(true);
        this.applyStationVisibility();
      }
    }
    this.bowl.visible = this.station <= 2 && !(this.station === 2 && (this.baked || this.baking >= 0));
    // pouring
    const sp = this.pouring;
    if (sp >= 0 && this.station === 2 && !this.baked) {
      const pan = this.pans[sp];
      pan.level = Math.min(1, pan.level + dt / 1.1);
      this.pourTick += dt;
      if (this.pourTick > 0.28) {
        this.pourTick = 0;
        this.options("note", Math.round(pan.level * 8));
      }
      this.bowl.position.lerp(new THREE.Vector3(pan.home.x + 0.9, 2.95, pan.home.z), 0.15);
      this.bowl.rotation.z += (0.85 - this.bowl.rotation.z) * 0.15;
      const lip = new THREE.Vector3(pan.home.x - 0.05, 2.5, pan.home.z);
      this.stream.visible = true;
      const surface = COUNTER_Y + 0.3 * Math.max(0.05, pan.level);
      this.stream.position.set(lip.x, (lip.y + surface) / 2, lip.z);
      this.stream.scale.set(1, lip.y - surface, 1);
      this.batterMat.color.set(f.batter);
      if (!this.reduced && Math.random() < 0.25) this.burstAt(new THREE.Vector3(lip.x, surface + 0.1, lip.z), [f.batter], 2);
      this.emit();
    } else {
      this.stream.visible = false;
      this.bowl.rotation.z += (0 - this.bowl.rotation.z) * 0.15;
      const home = this.station === 2 ? new THREE.Vector3(-0.2, COUNTER_Y + 1.6, -3.0) : new THREE.Vector3(CENTER.x, COUNTER_Y + 0.95, CENTER.z);
      this.bowl.position.lerp(home, 0.12);
    }
    this.pans.forEach((p) => {
      const lv = this.baked ? 1.2 : p.level;
      p.fill.scale.y += (Math.max(0.001, lv) - p.fill.scale.y) * Math.min(1, dt * 6);
      p.fill.position.y = 0.02 + p.fill.scale.y * 0.15;
      if (this.baked && this.baking < 0) {
        const s = p.scale.step(dt);
        p.group.scale.setScalar(Math.max(0.05, s));
      }
    });
  }

  private updateCake(dt: number) {
    this.tierDrops.forEach((sp, i) => {
      const y = sp.step(dt);
      const tier = this.tiers[i];
      if (!tier) return;
      tier.group.position.y = this.reduced ? i * TIER_H : y;
      if (!this.reduced && Math.abs(sp.vel) > 0.05) tier.group.scale.set(1 + Math.abs(sp.vel) * 0.004, 1 - Math.min(0.2, Math.abs(sp.vel) * 0.01), 1 + Math.abs(sp.vel) * 0.004);
      else tier.group.scale.set(1, 1, 1);
    });
    this.cakeYaw += (this.yawTarget - this.cakeYaw) * Math.min(1, dt * 10);
    this.cakeGroup.rotation.y = this.cakeYaw;
    for (const p of this.pops) {
      p.obj.scale.setScalar(Math.max(0.05, p.s.step(dt)));
    }
    this.pops = this.pops.filter((p) => Math.abs(p.s.vel) > 0.01 || Math.abs(p.s.value - 1) > 0.01);
    for (const c of this.candles) {
      const f = c.getObjectByName("flame");
      if (f) {
        f.scale.set(1 + Math.sin(this.time * 18 + c.id) * 0.12, 1 + Math.sin(this.time * 23 + c.id) * 0.2, 1);
      }
    }
  }

  private updateCustomer(dt: number) {
    const hop = this.customerHop.step(dt);
    const bob = this.reduced ? 0 : Math.sin(this.time * 2.2) * 0.03;
    this.customerGroup.position.y = COUNTER_Y + bob + Math.max(0, hop) * 0.12;
    this.customerGroup.rotation.y = this.reduced ? -0.3 : -0.3 + Math.sin(this.time * 0.9) * 0.08;
    this.head.rotation.z = this.reduced ? 0 : Math.sin(this.time * 1.7) * 0.05;
  }
}
