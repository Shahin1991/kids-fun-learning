import * as THREE from "three";
import { disposeObject, SportScene } from "@/lib/sports3d/SportScene";
import { resultFor, type SportLevel, type SportOptions } from "@/lib/sports3d/types";
import { ANGLES, AREA, buildRun, CUP_WALL, MARBLE_R, PUZZLES, rampTray, snap, THICK, type Plank, type Pose, type Run } from "./marble-run";
import { fitFrontCamera, syncMesh } from "./physics";

const RAMP_COLOURS = [0xff9f43, 0x4d96ff, 0x9b51e0];
/** Misses before the ghost ramps show where to put them */
const HINT_AFTER: Record<SportLevel, number> = { easy: 1, medium: 2, hard: 4 };

/**
 * Marble Run: drag the ramps into the gaps (tap a ramp to tilt it), then tap the marble to let it
 * go. If it misses it comes straight back; after a miss or two, see-through ghost ramps show where
 * they go (and a ramp dropped near its ghost snaps into place), so every puzzle can be finished.
 */
export class MarbleRunEngine extends SportScene {
  private run: Run | null = null;
  private puzzle = 0;
  private puzzles = 3;
  private poses: Pose[] = [];
  private course = new THREE.Group();
  private rampMeshes: THREE.Mesh[] = [];
  private ghosts: THREE.Mesh[] = [];
  private marble: THREE.Mesh;
  private tapRing: THREE.Mesh;
  private plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private drag: { i: number; dx: number; dy: number; x0: number; y0: number; t0: number; moved: boolean } | null = null;
  private misses = 0;
  private busy = false;

  constructor(container: HTMLElement, opts: SportOptions) {
    super(container, opts, 0xe8f4ff, 40);
    const s = this.stage.scene;
    s.add(new THREE.HemisphereLight(0xffffff, 0x99aabb, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(-3, 10, 8);
    s.add(sun);
    s.add(this.course);
    this.marble = new THREE.Mesh(new THREE.SphereGeometry(MARBLE_R, 28, 18), new THREE.MeshStandardMaterial({ color: 0x00b8d4, metalness: 0.2, roughness: 0.15 }));
    // A stripe so you can see it roll
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(MARBLE_R * 0.98, 0.03, 8, 32), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    this.marble.add(stripe);
    s.add(this.marble);
    this.tapRing = new THREE.Mesh(new THREE.RingGeometry(MARBLE_R * 1.5, MARBLE_R * 1.9, 32), new THREE.MeshBasicMaterial({ color: 0xffd93d, transparent: true, opacity: 0.9, depthTest: false }));
    this.tapRing.renderOrder = 5;
    s.add(this.tapRing);
    this.stage.onDispose(() => disposeObject(this.course));
    this.start();
  }

  protected onResize() {
    fitFrontCamera(this.stage.camera, { minX: AREA.minX, maxX: AREA.maxX, minY: -0.3, maxY: AREA.maxY }, { top: 0.3, bottom: 0.11, side: 0.03 });
  }

  protected startGame() {
    this.puzzles = Math.min(PUZZLES.length, parseInt(this.setup.variant, 10) || 3);
    this.puzzle = 0;
    this.loadPuzzle();
  }

  // ---- building ----
  private plankMesh(p: Plank, colour: number, depth = 0.8, opacity = 1) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(p.len, THICK, depth),
      new THREE.MeshStandardMaterial({ color: colour, roughness: 0.6, transparent: opacity < 1, opacity, depthWrite: opacity === 1 }),
    );
    m.position.set(p.x, p.y, 0);
    m.rotation.z = p.angle;
    return m;
  }

  private loadPuzzle() {
    for (const c of [...this.course.children]) disposeObject(c);
    this.rampMeshes = [];
    this.ghosts = [];
    const pz = PUZZLES[this.puzzle];
    this.poses = rampTray(pz);
    this.run = buildRun(pz, this.poses);
    // Backdrop, floor, fixed course and the cup
    const back = new THREE.Mesh(new THREE.PlaneGeometry(AREA.maxX - AREA.minX + 1.2, AREA.maxY + 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }));
    back.position.set(0, AREA.maxY / 2, -0.6);
    this.course.add(back);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(AREA.maxX - AREA.minX + 1.2, 0.3, 1.2), new THREE.MeshStandardMaterial({ color: 0x8bc34a, roughness: 1 }));
    floor.position.set(0, -0.15, 0);
    this.course.add(floor);
    for (const f of pz.fixed) this.course.add(this.plankMesh(f, 0x546e7a));
    const cupMat = new THREE.MeshStandardMaterial({ color: 0xff6b6b, roughness: 0.4 });
    for (const sx of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(THICK, CUP_WALL, 0.9), cupMat);
      w.position.set(pz.cup.x + sx * (pz.cup.w / 2 + THICK / 2), CUP_WALL / 2, 0);
      this.course.add(w);
    }
    const cupBack = new THREE.Mesh(new THREE.BoxGeometry(pz.cup.w + THICK * 2, CUP_WALL, 0.05), new THREE.MeshStandardMaterial({ color: 0xffd93d, roughness: 0.6 }));
    cupBack.position.set(pz.cup.x, CUP_WALL / 2, -0.45);
    this.course.add(cupBack);
    // Start chute marker
    const chute = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.32, 0.5, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0x00b8d4, side: THREE.DoubleSide, roughness: 0.5 }));
    chute.position.set(pz.start.x, pz.start.y + 0.35, 0);
    this.course.add(chute);
    // The child's ramps and their (hidden) ghosts
    pz.ramps.forEach((len, i) => {
      const m = this.plankMesh({ ...this.poses[i], len }, RAMP_COLOURS[i % RAMP_COLOURS.length], 0.9);
      this.course.add(m);
      this.rampMeshes.push(m);
      const g = this.plankMesh({ ...pz.solution[i], len }, 0x6bcb77, 0.92, 0.35);
      g.visible = false;
      this.course.add(g);
      this.ghosts.push(g);
    });
    this.misses = 0;
    this.busy = false;
    this.resetMarble();
    this.emitHud({
      message: `Puzzle ${this.puzzle + 1}/${this.puzzles}: ${pz.name}`,
      detail: "Drag the ramps · tap a ramp to tilt it · tap the marble to go",
      say: this.puzzle === 0 ? "Drag the ramp into the gap, then tap the marble!" : pz.name,
    });
  }

  private resetMarble() {
    this.run?.reset();
    if (this.run) syncMesh(this.marble, this.run.marble);
  }

  private setPose(i: number, pose: Pose) {
    this.poses[i] = pose;
    this.run?.setRamp(i, pose);
    const m = this.rampMeshes[i];
    m.position.set(pose.x, pose.y, 0);
    m.rotation.z = pose.angle;
  }

  // ---- input ----
  private point(e: PointerEvent) {
    const p = this.rayPlane(e, this.plane);
    return p ? { x: p.x, y: p.y } : null;
  }

  protected onDown(e: PointerEvent) {
    if (!this.run || this.over || this.busy || this.run.status() !== "ready") return;
    const p = this.point(e);
    if (!p) return;
    // Generous hit areas: kids' fingers are big
    const ray = this.setRay(e);
    const hit = ray.intersectObjects(this.rampMeshes, false)[0];
    const i = hit ? this.rampMeshes.indexOf(hit.object as THREE.Mesh) : this.nearestRamp(p);
    if (i >= 0) {
      const pose = this.poses[i];
      this.drag = { i, dx: pose.x - p.x, dy: pose.y - p.y, x0: p.x, y0: p.y, t0: this.time, moved: false };
      return;
    }
    const mp = this.run.marble.position;
    if (Math.hypot(p.x - mp.x, p.y - mp.y) < 1.0) this.go();
  }

  /** A ramp within half a metre of the finger, if the ray missed them all */
  private nearestRamp(p: { x: number; y: number }) {
    let best = -1;
    let bestD = 0.5;
    this.poses.forEach((q, i) => {
      const len = PUZZLES[this.puzzle].ramps[i];
      const c = Math.cos(q.angle);
      const s = Math.sin(q.angle);
      const along = (p.x - q.x) * c + (p.y - q.y) * s;
      const across = Math.abs(-(p.x - q.x) * s + (p.y - q.y) * c);
      const d = Math.abs(along) <= len / 2 ? across : Infinity;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }

  protected onMove(e: PointerEvent) {
    if (!this.drag) return;
    const p = this.point(e);
    if (!p) return;
    const d = this.drag;
    if (Math.hypot(p.x - d.x0, p.y - d.y0) > 0.15) d.moved = true;
    if (!d.moved) return;
    const len = PUZZLES[this.puzzle].ramps[d.i];
    const half = len / 2;
    const x = Math.max(AREA.minX + half * 0.5, Math.min(AREA.maxX - half * 0.5, snap(p.x + d.dx)));
    const y = Math.max(0.3, Math.min(AREA.maxY - 0.3, snap(p.y + d.dy)));
    this.setPose(d.i, { x, y, angle: this.poses[d.i].angle });
  }

  protected onUp() {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    const pose = this.poses[d.i];
    if (!d.moved && this.time - d.t0 < 0.45) {
      // Tap: tilt to the next angle
      const k = ANGLES.findIndex((a) => Math.abs(a - pose.angle) < 1e-3);
      this.setPose(d.i, { ...pose, angle: ANGLES[(k + 1) % ANGLES.length] });
      this.sound("clack", 0.3);
      return;
    }
    // Dropped close to its ghost: click into place
    const g = PUZZLES[this.puzzle].solution[d.i];
    if (this.ghosts[d.i].visible && Math.hypot(pose.x - g.x, pose.y - g.y) < 0.6) {
      this.setPose(d.i, { ...g });
      this.sound("score", 0.3);
    } else this.sound("thud", 0.3);
  }

  private go() {
    if (!this.run) return;
    this.run.release();
    this.sound("throw", 0.5);
  }

  // ---- loop ----
  protected update(dt: number) {
    const run = this.run;
    if (!run) return;
    run.step(dt);
    syncMesh(this.marble, run.marble);
    const status = run.status();
    this.tapRing.visible = status === "ready" && !this.busy && !this.over;
    if (this.tapRing.visible) {
      this.tapRing.position.copy(this.marble.position).setZ(0.4);
      this.tapRing.scale.setScalar(this.reduced ? 1 : 1 + Math.sin(this.time * 5) * 0.12);
    }
    for (const g of this.ghosts) (g.material as THREE.MeshStandardMaterial).opacity = this.reduced ? 0.5 : 0.45 + Math.sin(this.time * 4) * 0.15;
    if (this.busy) return;
    if (status === "cup") this.solved();
    else if (status === "miss") this.missed();
  }

  private solved() {
    this.busy = true;
    this.players[0].score++;
    this.sound("pot", 0.9);
    this.sound("cheer");
    this.celebrate(new THREE.Vector3(PUZZLES[this.puzzle].cup.x, 1.5, 1), 4);
    this.emitHud({ message: "In the cup! 🎉", say: "In the cup!" });
    this.after(2, () => {
      this.puzzle++;
      if (this.puzzle >= this.puzzles) this.finish();
      else this.loadPuzzle();
    });
  }

  private missed() {
    this.busy = true;
    this.misses++;
    const hint = this.misses >= HINT_AFTER[this.setup.level];
    this.emitHud({ message: hint ? "Try the green ghost spots 👻" : "So close! Move a ramp and try again", say: hint ? "Try the green ghost spots" : "Try again" });
    this.after(0.9, () => {
      this.resetMarble();
      this.busy = false;
      if (hint) this.ghosts.forEach((g) => (g.visible = true));
    });
  }

  private finish() {
    this.over = true;
    const r = resultFor(this.players, "solo");
    r.text = `You solved ${this.players[0].score} puzzles! 🎉`;
    this.emitHud({ message: r.text, detail: undefined, say: r.text });
    this.after(1, () => this.opts.onGameOver(r));
  }
}
