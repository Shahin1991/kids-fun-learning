import * as THREE from "three";
import { SHAPES, type ShapeDef } from "@/data/shapes";
import { outlineShape } from "@/lib/toy3d/outlines";
import { addToyRoom } from "@/lib/toy3d/scenery";
import { Spring } from "@/lib/toy3d/spring";
import { ToyScene, type PickInfo, type ToyOptions } from "@/lib/toy3d/ToyScene";

export interface SorterOptions extends ToyOptions {
  onPlaced?: (p: { id: string; label: string; index: number }) => void;
  onWrong?: (p: { id: string }) => void;
  onRound?: (p: { round: number }) => void;
}

const TOP_Y = 2.6;
const LIFT_Y = 3.8;
const BOX_Z = -2;

interface Piece {
  def: ShapeDef;
  mesh: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  home: THREE.Vector3;
  hole: THREE.Vector3;
  ring: THREE.Mesh;
  wobble: Spring;
  state: "idle" | "drag" | "return" | "drop" | "done";
  t: number;
  from: THREE.Vector3;
  press: THREE.Vector3 | null;
  tapDrop: boolean;
}

export class SorterEngine extends ToyScene {
  private pieces: Piece[] = [];
  private top: THREE.Mesh | null = null;
  private round = 0;
  private dragging: Piece | null = null;
  private scale = 1;
  private nextRoundIn = 0;
  private wood = new THREE.MeshStandardMaterial({ color: 0xd9a066, roughness: 0.7 });
  private inner = new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 1 });
  private ringMat = new THREE.MeshBasicMaterial({ color: 0xfff176, transparent: true, opacity: 0.0, side: THREE.DoubleSide });

  constructor(container: HTMLElement, private opts: SorterOptions = {}) {
    super(container, 0xd7f0ff, opts);
    addToyRoom(this.stage.scene, 0xdff1ff, 0xc99560);
    const box = new THREE.Mesh(new THREE.BoxGeometry(15, 2.3, 5.6), this.wood);
    box.position.set(0, 1.15, BOX_Z);
    this.stage.scene.add(box);
    const dark = new THREE.Mesh(new THREE.PlaneGeometry(14.6, 5.2).rotateX(-Math.PI / 2), this.inner);
    dark.position.set(0, 2.32, BOX_Z);
    this.stage.scene.add(dark);
    this.startRound();
    this.start();
  }

  protected onResize(aspect: number) {
    // Almost straight down, so outlines look like they do on a real shape-sorter toy.
    const height = 20 * Math.max(1, 1.15 / aspect);
    this.stage.camera.position.set(0, height, 3.4);
    this.stage.camera.lookAt(0, 2, 0.7);
    this.layout();
  }

  // ---- rounds ----
  private startRound() {
    this.clearPieces();
    // Scaffolding: two shapes first, one more each round, up to all five.
    const count = Math.min(SHAPES.length, 2 + this.round);
    const defs = [...SHAPES].sort(() => Math.random() - 0.5).slice(0, count);
    const holeOrder = [...defs].sort(() => Math.random() - 0.5);

    const plate = new THREE.Shape();
    plate.moveTo(-7.5, -2.8);
    plate.lineTo(7.5, -2.8);
    plate.lineTo(7.5, 2.8);
    plate.lineTo(-7.5, 2.8);
    plate.closePath();
    holeOrder.forEach((d, i) => {
      // Holes are the piece outline a little larger, moved to the hole position.
      const sc = this.scaleFor(count);
      const cx = this.holeX(i, count);
      const pts = outlineShape(d.id, 1.14, 0.18).getPoints(14).map((p) => new THREE.Vector2(p.x * sc + cx, p.y * sc));
      plate.holes.push(new THREE.Path(pts));
    });
    const geo = new THREE.ExtrudeGeometry(plate, { depth: 0.3, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    this.top = new THREE.Mesh(geo, this.wood);
    this.top.position.set(0, TOP_Y - 0.3, BOX_Z);
    this.stage.scene.add(this.top);

    defs.forEach((d, i) => {
      const holeIdx = holeOrder.indexOf(d);
      const s = this.scaleFor(count);
      const g = new THREE.ExtrudeGeometry(outlineShape(d.id, s, 0.16), { depth: 0.8, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 3, curveSegments: 10 });
      g.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshPhysicalMaterial({ color: d.color, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2 });
      const mesh = new THREE.Mesh(g, mat);
      const home = new THREE.Vector3(this.holeX(i, count), 0.02, 3.6);
      const hole = new THREE.Vector3(this.holeX(holeIdx, count), TOP_Y, BOX_Z);
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.15 * s, 1.4 * s, 40).rotateX(-Math.PI / 2), this.ringMat.clone());
      ring.position.set(hole.x, TOP_Y + 0.03, hole.z);
      this.stage.scene.add(ring);
      mesh.position.copy(home);
      const piece: Piece = { def: d, mesh, mat, home, hole, ring, wobble: new Spring(0, 0, 200, 8), state: "idle", t: 0, from: home.clone(), press: null, tapDrop: false };
      mesh.userData.owner = piece;
      this.stage.scene.add(mesh);
      this.pickables.push(mesh);
      this.pieces.push(piece);
    });
  }

  private holeX(i: number, count: number) {
    const spacing = Math.min(4.4, 13 / count);
    return (i - (count - 1) / 2) * spacing;
  }
  private scaleFor(count: number) {
    return Math.min(1.6, Math.min(4.4, 13 / count) / 2.5) * this.scale;
  }

  private layout() {
    this.scale = 1;
  }

  private clearPieces() {
    for (const p of this.pieces) {
      this.stage.scene.remove(p.mesh, p.ring);
      p.mesh.geometry.dispose();
      p.mat.dispose();
      p.ring.geometry.dispose();
      (p.ring.material as THREE.Material).dispose();
    }
    this.pieces = [];
    this.pickables = [];
    if (this.top) {
      this.stage.scene.remove(this.top);
      this.top.geometry.dispose();
      this.top = null;
    }
    this.dragging = null;
  }

  // ---- input ----
  activate(id: string) {
    const p = this.pieces.find((x) => x.def.id === id && x.state === "idle");
    if (p) this.sendHome(p);
  }

  protected onDown(info: PickInfo | null, e: PointerEvent) {
    const p = info?.owner as Piece | undefined;
    if (!p || p.state === "done" || p.state === "drop") return;
    this.dragging = p;
    p.state = "drag";
    p.press = this.groundPoint(e, TOP_Y);
    p.from.copy(p.mesh.position);
  }

  protected onMove(e: PointerEvent) {
    const p = this.dragging;
    if (!p) return;
    const g = this.groundPoint(e, TOP_Y);
    if (!g) return;
    p.from.set(g.x, 0, g.z);
    for (const q of this.pieces) {
      const near = q === p && Math.hypot(g.x - q.hole.x, g.z - q.hole.z) < 1.8;
      (q.ring.material as THREE.MeshBasicMaterial).opacity = near ? 0.9 : 0;
    }
  }

  protected onUp(e: PointerEvent) {
    const p = this.dragging;
    if (!p) return;
    this.dragging = null;
    const g = this.groundPoint(e, TOP_Y);
    this.pieces.forEach((q) => ((q.ring.material as THREE.MeshBasicMaterial).opacity = 0));
    const moved = g && p.press ? Math.hypot(g.x - p.press.x, g.z - p.press.z) : 0;
    if (moved < 0.35) {
      // A plain tap drops the piece into its own hole: an easier alternative to dragging.
      this.sendHome(p);
      return;
    }
    if (g && Math.hypot(g.x - p.hole.x, g.z - p.hole.z) < 1.8) {
      this.sendHome(p);
      return;
    }
    p.state = "return";
    p.t = 0;
    p.from.copy(p.mesh.position);
    p.wobble.kick(this.reduced ? 0 : 6);
    const wrongHole = g && this.pieces.some((q) => q !== p && Math.hypot(g.x - q.hole.x, g.z - q.hole.z) < 1.6);
    if (wrongHole) this.opts.onWrong?.({ id: p.def.id });
  }

  private sendHome(p: Piece) {
    p.state = "drop";
    p.t = 0;
    p.tapDrop = true;
    p.from.copy(p.mesh.position);
  }

  // ---- simulation ----
  protected update(dt: number) {
    for (const p of this.pieces) {
      const w = p.wobble.step(dt);
      const m = p.mesh;
      switch (p.state) {
        case "idle": {
          const sway = this.reduced ? 0 : Math.sin(this.time * 1.8 + p.home.x) * 0.06;
          m.position.lerp(p.home, Math.min(1, dt * 10));
          m.rotation.y = sway + w * 0.4;
          m.rotation.x = 0;
          break;
        }
        case "drag": {
          const target = new THREE.Vector3(p.from.x, LIFT_Y, p.from.z);
          m.position.lerp(target, Math.min(1, dt * 16));
          m.rotation.y += (0 - m.rotation.y) * 0.2;
          break;
        }
        case "return": {
          p.t += dt / 0.4;
          const k = Math.min(1, p.t);
          m.position.lerpVectors(p.from, p.home, k * k * (3 - 2 * k));
          m.rotation.y = w * 0.6;
          if (k >= 1) p.state = "idle";
          break;
        }
        case "drop": {
          p.t += dt / 0.85;
          const k = Math.min(1, p.t);
          if (k < 0.4) {
            // glide over the hole at lift height
            const a = k / 0.4;
            m.position.set(p.from.x + (p.hole.x - p.from.x) * a, Math.max(p.from.y, LIFT_Y) + Math.sin(a * Math.PI) * 0.8, p.from.z + (p.hole.z - p.from.z) * a);
          } else {
            const a = (k - 0.4) / 0.6;
            m.position.set(p.hole.x, LIFT_Y - a * a * (LIFT_Y + 0.4), p.hole.z);
          }
          m.rotation.y *= 0.85;
          if (k >= 1) this.settle(p);
          break;
        }
        default:
          break;
      }
    }
    if (this.nextRoundIn > 0) {
      this.nextRoundIn -= dt;
      if (this.nextRoundIn <= 0) this.startRound();
    }
  }

  private settle(p: Piece) {
    p.state = "done";
    p.mesh.visible = false;
    this.pickables = this.pickables.filter((x) => x !== p.mesh);
    const hit = p.hole.clone();
    hit.y += 0.4;
    if (!this.reduced) this.confetti.burst(hit, [parseInt(p.def.color.slice(1), 16), 0xffffff, 0xffd93d], 18, 5);
    this.opts.onPlaced?.({ id: p.def.id, label: p.def.label, index: this.pieces.filter((x) => x.state === "done").length - 1 });
    if (this.pieces.every((x) => x.state === "done")) {
      this.round++;
      if (!this.reduced) this.confetti.burst(new THREE.Vector3(0, 5, 0), [0xff6b6b, 0xffd93d, 0x6bcb77, 0x4d96ff, 0x9b51e0], 50, 9);
      this.opts.onRound?.({ round: this.round });
      this.nextRoundIn = 1.6;
    }
  }

  protected onDestroy() {
    this.clearPieces();
    this.wood.dispose();
    this.inner.dispose();
    this.ringMat.dispose();
  }
}
