import * as THREE from "three";
import { Spring } from "@/lib/toy3d/spring";
import { ToyScene, type PickInfo, type ToyOptions } from "@/lib/toy3d/ToyScene";
import {
  FOLDS,
  SHAPE_DEFS,
  bestEdge,
  edgePolygon,
  floorFrame,
  frameMatrix,
  hingeFrame,
  insetPolygon,
  sameEdge,
  worldEdges,
  type Edge,
  type FoldId,
  type Frame,
  type P2,
  type TileShape,
} from "./geometry";

export const TILE_COLORS = [0xff5a6e, 0xff9f43, 0xffd93d, 0x4cd97b, 0x3ab7ff, 0xa66cff, 0xff7ac8];
const MILESTONES = [5, 12, 25];

/** The twelve fixed viewpoints; the camera always rests on one of these. */
export const VIEWS = [
  { id: "front", label: "Front", yaw: 0, pitch: 0 },
  { id: "right", label: "Right", yaw: 90, pitch: 0 },
  { id: "back", label: "Back", yaw: 180, pitch: 0 },
  { id: "left", label: "Left", yaw: 270, pitch: 0 },
  { id: "top", label: "Top", yaw: 0, pitch: 89 },
  { id: "bottom", label: "Bottom", yaw: 0, pitch: -89 },
  { id: "front-right", label: "Front right", yaw: 45, pitch: 35 },
  { id: "back-right", label: "Back right", yaw: 135, pitch: 35 },
  { id: "back-left", label: "Back left", yaw: 225, pitch: 35 },
  { id: "front-left", label: "Front left", yaw: 315, pitch: 35 },
  { id: "front-high", label: "Front high", yaw: 0, pitch: 45 },
  { id: "back-high", label: "Back high", yaw: 180, pitch: 45 },
] as const;
/** Swiping sideways steps around this ring of eight views. */
const RING = [0, 6, 1, 7, 2, 8, 3, 9];

export interface MagnaState {
  view: number;
  count: number;
  selected: boolean;
  /** The selected tile can still be turned to a new fold angle */
  canRefold: boolean;
}

export interface MagnaOptions extends ToyOptions {
  onChange?: (s: MagnaState) => void;
  onPlace?: (p: { count: number; shape: TileShape; fold: FoldId }) => void;
  onMilestone?: (count: number) => void;
}

interface Tile {
  id: number;
  shape: TileShape;
  poly: P2[];
  color: number;
  parent: number | null;
  parentEdge: number;
  fold: FoldId;
  side: 1 | -1;
  frame: Frame;
  group: THREE.Group;
  body: THREE.Group;
  frameMat: THREE.MeshStandardMaterial;
  glassMat: THREE.MeshStandardMaterial;
  pop: Spring;
}

type Owner = { kind: "tile"; id: number } | { kind: "handle"; id: number; edge: number } | { kind: "floor" };

const foldAngle = (id: FoldId) => FOLDS.find((f) => f.id === id)?.angle ?? 90;

export class MagnaEngine extends ToyScene {
  private tiles: Tile[] = [];
  private nextId = 1;
  private selectedId: number | null = null;
  private shape: TileShape = "square";
  private color = TILE_COLORS[4];
  private fold: FoldId = "wall";
  private side: 1 | -1 = 1;
  private handles = new THREE.Group();
  private handleMeshes: THREE.Mesh[] = [];
  private floor: THREE.Mesh;
  private ray = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private milestones = new Set<number>();

  // orbit camera
  private viewIndex = 6;
  private yaw = (VIEWS[6].yaw * Math.PI) / 180;
  private pitch = (VIEWS[6].pitch * Math.PI) / 180;
  private zoom = 1;
  private fit = 5.5;
  private portrait = 1;
  private target = new THREE.Vector3(0, 0.6, 0);
  private goal = new THREE.Vector3(0, 0.6, 0);
  private pointers = new Map<number, { x: number; y: number }>();
  private downAt: { x: number; y: number; id: number } | null = null;
  private moved = false;
  private pinch = 0;

  constructor(container: HTMLElement, private opts: MagnaOptions = {}) {
    super(container, 0xcfe9ff, opts, 42);
    const scene = this.stage.scene;
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb8c9e8, 1.3));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(4, 9, 5);
    scene.add(sun);

    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: this.gridTexture(), roughness: 1 }));
    this.floor.userData.owner = { kind: "floor" } satisfies Owner;
    scene.add(this.floor);
    scene.add(this.handles);

    container.addEventListener("wheel", this.onWheel, { passive: false });
    this.placeCamera(true);
    this.start();
  }

  protected onDestroy() {
    this.container.removeEventListener("wheel", this.onWheel);
    for (const t of this.tiles) this.disposeTile(t);
    this.clearHandles();
    const map = (this.floor.material as THREE.MeshStandardMaterial).map;
    map?.dispose();
  }

  // ---- public controls ----
  setShape(s: TileShape) {
    this.shape = s;
  }
  setColor(hex: number) {
    this.color = hex;
  }
  setFold(f: FoldId) {
    this.fold = f;
    this.refoldSelected();
  }
  flipSide() {
    this.side = (this.side * -1) as 1 | -1;
    this.refoldSelected();
  }
  get state(): MagnaState {
    return { view: this.viewIndex, count: this.tiles.length, selected: this.selectedId !== null, canRefold: this.canRefold() };
  }

  undo() {
    const last = this.tiles[this.tiles.length - 1];
    if (last) this.removeTile(last.id);
  }
  clearAll() {
    for (const t of [...this.tiles]) this.disposeTile(t);
    this.tiles = [];
    this.selectedId = null;
    this.refreshHandles();
    this.emit();
  }
  removeSelected() {
    if (this.selectedId !== null) this.removeTile(this.selectedId);
  }

  /** Keyboard / screen reader: add a tile on the next free edge (or the floor). */
  activate(id: string) {
    if (id in SHAPE_DEFS) this.shape = id as TileShape;
    const sel = this.tile(this.selectedId) ?? this.tiles[this.tiles.length - 1];
    if (!sel) {
      this.placeOnFloor(0, 0);
      return;
    }
    const free = this.freeEdges(sel);
    if (free.length) this.attach(sel.id, free[0]);
    else this.placeOnFloor(((this.tiles.length * 1.7) % 6) - 3, 2);
  }
  resize() {
    super.resize();
  }

  setView(i: number) {
    this.viewIndex = ((i % VIEWS.length) + VIEWS.length) % VIEWS.length;
    this.emit();
  }
  private swipeView(dir: 1 | -1) {
    const at = RING.indexOf(this.viewIndex);
    this.setView(at < 0 ? 0 : RING[(at + dir + RING.length) % RING.length]);
  }

  // ---- tiles ----
  private tile(id: number | null) {
    return id === null ? undefined : this.tiles.find((t) => t.id === id);
  }

  private edgesOf(t: Tile): Edge[] {
    return worldEdges(t.poly, t.frame);
  }

  private freeEdges(t: Tile): number[] {
    const mine = this.edgesOf(t);
    const others = this.tiles.filter((o) => o !== t).flatMap((o) => this.edgesOf(o));
    return mine.map((e, i) => (others.some((o) => sameEdge(e, o)) ? -1 : i)).filter((i) => i >= 0);
  }

  private canRefold() {
    const t = this.tile(this.selectedId);
    return Boolean(t && t.parent !== null && !this.tiles.some((o) => o.parent === t.id));
  }

  private buildTile(shape: TileShape, k: number, color: number, frame: Frame): Tile {
    const poly = edgePolygon(shape, k);
    const outer = new THREE.Shape(poly.map(([x, y]) => new THREE.Vector2(x, y)));
    const inner = insetPolygon(poly, 0.075);
    outer.holes.push(new THREE.Path(inner.map(([x, y]) => new THREE.Vector2(x, y))));
    const frameGeo = new THREE.ExtrudeGeometry(outer, { depth: 0.07, bevelEnabled: false });
    frameGeo.translate(0, 0, -0.035);
    const glassGeo = new THREE.ShapeGeometry(new THREE.Shape(inner.map(([x, y]) => new THREE.Vector2(x, y))));
    const base = new THREE.Color(color);
    const frameMat = new THREE.MeshStandardMaterial({ color: base.clone().multiplyScalar(0.8), roughness: 0.35 });
    const glassMat = new THREE.MeshStandardMaterial({ color: base, roughness: 0.15, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });
    const body = new THREE.Group();
    body.add(new THREE.Mesh(frameGeo, frameMat), new THREE.Mesh(glassGeo, glassMat));
    const group = new THREE.Group();
    group.add(body);
    group.matrixAutoUpdate = false;
    const id = this.nextId++;
    group.userData.owner = { kind: "tile", id } satisfies Owner;
    const tile: Tile = { id, shape, poly, color, parent: null, parentEdge: 0, fold: this.fold, side: this.side, frame, group, body, frameMat, glassMat, pop: new Spring(this.reduced ? 1 : 0.2, 1, 260, 12) };
    this.applyFrame(tile);
    this.stage.scene.add(group);
    this.tiles.push(tile);
    return tile;
  }

  private applyFrame(t: Tile) {
    t.group.matrix.copy(frameMatrix(t.frame));
    t.group.matrixWorldNeedsUpdate = true;
  }

  private disposeTile(t: Tile) {
    this.stage.scene.remove(t.group);
    t.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    t.frameMat.dispose();
    t.glassMat.dispose();
  }

  private placeOnFloor(x: number, z: number) {
    const frame = floorFrame(Math.round(x * 2) / 2, Math.round(z * 2) / 2);
    const t = this.buildTile(this.shape, 0, this.color, frame);
    this.afterPlace(t);
  }

  private attach(parentId: number, edgeIndex: number) {
    const parent = this.tile(parentId);
    if (!parent) return;
    const edge = this.edgesOf(parent)[edgeIndex];
    const k = bestEdge(this.shape, edge.len);
    const frame = hingeFrame(edge, parent.frame.z, foldAngle(this.fold), this.side);
    const t = this.buildTile(this.shape, k, this.color, frame);
    t.parent = parentId;
    t.parentEdge = edgeIndex;
    this.afterPlace(t);
  }

  private afterPlace(t: Tile) {
    this.selectedId = t.id;
    this.refreshHandles();
    const c = t.frame.origin.clone().addScaledVector(t.frame.y, 0.5);
    this.confetti.burst(c, [t.color, 0xffffff, 0xfff176], this.reduced ? 0 : 12, 3.5);
    this.opts.onPlace?.({ count: this.tiles.length, shape: t.shape, fold: t.fold });
    for (const m of MILESTONES) {
      if (this.tiles.length >= m && !this.milestones.has(m)) {
        this.milestones.add(m);
        this.opts.onMilestone?.(m);
      }
    }
    this.emit();
  }

  private refoldSelected() {
    const t = this.tile(this.selectedId);
    if (!t || !this.canRefold()) return;
    const parent = this.tile(t.parent);
    if (!parent) return;
    const edge = this.edgesOf(parent)[t.parentEdge];
    t.fold = this.fold;
    t.side = this.side;
    t.frame = hingeFrame(edge, parent.frame.z, foldAngle(this.fold), this.side);
    this.applyFrame(t);
    t.pop.value = 0.85;
    this.refreshHandles();
    this.emit();
  }

  private removeTile(id: number) {
    const gone = new Set<number>([id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const t of this.tiles) {
        if (t.parent !== null && gone.has(t.parent) && !gone.has(t.id)) {
          gone.add(t.id);
          grew = true;
        }
      }
    }
    const parent = this.tile(this.tile(id)?.parent ?? null);
    for (const t of this.tiles.filter((x) => gone.has(x.id))) this.disposeTile(t);
    this.tiles = this.tiles.filter((t) => !gone.has(t.id));
    this.selectedId = parent ? parent.id : null;
    this.refreshHandles();
    this.emit();
  }

  private emit() {
    this.opts.onChange?.(this.state);
  }

  // ---- hinge handles ----
  private clearHandles() {
    for (const m of this.handleMeshes) {
      m.geometry.dispose();
      (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose());
    }
    this.handles.clear();
    this.handleMeshes = [];
  }

  private refreshHandles() {
    this.clearHandles();
    const t = this.tile(this.selectedId);
    if (!t) return;
    const edges = this.edgesOf(t);
    for (const i of this.freeEdges(t)) {
      const e = edges[i];
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true }));
      dot.renderOrder = 10;
      dot.position.copy(e.mid);
      dot.userData.pulse = true;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(e.len * 0.92, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: 0xfff176, depthTest: false, transparent: true, opacity: 0.9 }));
      bar.renderOrder = 9;
      bar.position.copy(e.mid);
      bar.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), e.b.clone().sub(e.a).normalize());
      const hit = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.copy(e.mid);
      hit.userData.owner = { kind: "handle", id: t.id, edge: i } satisfies Owner;
      this.handles.add(bar, dot, hit);
      this.handleMeshes.push(dot, bar, hit);
    }
  }

  // ---- picking & input ----
  private owner(e: PointerEvent, objects: THREE.Object3D[]): { owner: Owner; point: THREE.Vector3 } | null {
    const r = this.stage.renderer.domElement.getBoundingClientRect();
    this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.stage.camera);
    for (const hit of this.ray.intersectObjects(objects, true)) {
      let o: THREE.Object3D | null = hit.object;
      while (o && o.userData.owner === undefined) o = o.parent;
      if (o) return { owner: o.userData.owner as Owner, point: hit.point };
    }
    return null;
  }

  private tap(e: PointerEvent) {
    const h = this.owner(e, [this.handles]);
    if (h && h.owner.kind === "handle") {
      this.attach(h.owner.id, h.owner.edge);
      return;
    }
    const t = this.owner(e, this.tiles.map((x) => x.group));
    if (t && t.owner.kind === "tile") {
      this.selectedId = t.owner.id === this.selectedId ? null : t.owner.id;
      this.refreshHandles();
      this.emit();
      return;
    }
    const f = this.floor.visible ? this.owner(e, [this.floor]) : null;
    if (f) {
      if (this.selectedId !== null) {
        this.selectedId = null;
        this.refreshHandles();
        this.emit();
      } else {
        this.placeOnFloor(f.point.x, f.point.z);
      }
    }
  }

  protected onDown(_info: PickInfo | null, e: PointerEvent) {
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 1) {
      this.downAt = { x: e.clientX, y: e.clientY, id: e.pointerId };
      this.moved = false;
    } else {
      this.moved = true;
      this.downAt = null;
      this.pinch = this.pinchDistance();
    }
  }

  protected onMove(e: PointerEvent) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX;
    p.y = e.clientY;
    if (this.pointers.size >= 2) {
      const d = this.pinchDistance();
      if (this.pinch > 0 && d > 0) this.zoom = THREE.MathUtils.clamp(this.zoom * (this.pinch / d), 0.45, 2.5);
      this.pinch = d;
      return;
    }
    if (this.downAt && !this.moved && Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y) > 8) this.moved = true;
  }

  protected onUp(e: PointerEvent) {
    const had = this.pointers.delete(e.pointerId);
    if (had && this.downAt && this.downAt.id === e.pointerId && e.type === "pointerup") {
      if (!this.moved) this.tap(e);
      else {
        // A sideways swipe steps to the next fixed view instead of free-turning the camera.
        const dx = e.clientX - this.downAt.x;
        const dy = e.clientY - this.downAt.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) this.swipeView(dx > 0 ? -1 : 1);
      }
    }
    if (this.pointers.size === 0) this.downAt = null;
  }

  private pinchDistance() {
    const [a, b] = [...this.pointers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.zoom = THREE.MathUtils.clamp(this.zoom * (1 + e.deltaY * 0.001), 0.45, 2.5);
  };

  // ---- frame update ----
  private placeCamera(snap = false) {
    const v = VIEWS[this.viewIndex];
    const ty = (v.yaw * Math.PI) / 180;
    const tp = (v.pitch * Math.PI) / 180;
    const k = snap ? 1 : 0.14;
    this.yaw += (((ty - this.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * k;
    this.pitch += (tp - this.pitch) * k;
    this.floor.visible = this.pitch > -0.05;
    this.target.lerp(this.goal, snap ? 1 : 0.05);
    const dist = this.fit * this.zoom * this.portrait;
    const cp = Math.cos(this.pitch);
    this.stage.camera.position.set(this.target.x + dist * Math.sin(this.yaw) * cp, this.target.y + dist * Math.sin(this.pitch), this.target.z + dist * Math.cos(this.yaw) * cp);
    this.stage.camera.lookAt(this.target);
  }

  protected update(dt: number) {
    // keep the camera centred on the structure
    if (this.tiles.length) {
      const c = new THREE.Vector3();
      for (const t of this.tiles) c.add(t.frame.origin);
      c.divideScalar(this.tiles.length);
      this.goal.set(c.x, Math.max(0.3, c.y * 0.8), c.z);
      let extent = 0;
      for (const t of this.tiles) extent = Math.max(extent, t.frame.origin.distanceTo(c));
      this.fit += (5.2 + extent * 1.5 - this.fit) * Math.min(1, dt * 2);
    } else {
      this.goal.set(0, 0.5, 0);
      this.fit += (5.5 - this.fit) * Math.min(1, dt * 2);
    }
    this.placeCamera();

    const sel = this.selectedId;
    for (const t of this.tiles) {
      const s = t.pop.step(dt);
      t.body.scale.setScalar(s);
      const glow = this.reduced || t.id !== sel ? 0 : 0.18 + 0.12 * Math.sin(this.time * 6);
      t.frameMat.emissive.setScalar(glow);
    }
    const pulse = 1 + (this.reduced ? 0 : 0.2 * Math.sin(this.time * 6));
    for (const m of this.handleMeshes) if (m.userData.pulse) m.scale.setScalar(pulse);
  }

  protected onResize(aspect: number) {
    // Portrait screens need to sit further back to keep the build in view.
    this.portrait = aspect < 0.8 ? 1.5 : 1;
  }

  private gridTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    g.fillStyle = "#f4f7fb";
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = "#e4ebf5";
    g.fillRect(0, 0, 64, 64);
    g.fillRect(64, 64, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(20, 20);
    return tex;
  }
}
