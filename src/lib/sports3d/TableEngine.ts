import * as THREE from "three";
import { aimSpread, BotPlanner, jitterShot, pocketOnLine, wobbleShot, type Shot } from "./cue-bot";
import { anyMoving, castDisc, emptyEvents, simStep, type Disc, type SimEvents, type Table } from "./physics2d";
import { SportScene } from "./SportScene";
import type { SportOptions } from "./types";

type Phase = "aim" | "rolling" | "robot" | "wait";

interface Sinking {
  mesh: THREE.Object3D;
  from: THREE.Vector3;
  to: THREE.Vector3;
  t: number;
}

/**
 * Base for the table games (carrom, snooker). Physics runs in 2D table coordinates (x right,
 * y away from the near player) and is drawn in 3D with world x = x, world z = -y.
 *
 * Aiming is a slingshot anchored on the cue ball/striker: press near it, pull back, let go. The
 * shot goes the opposite way to the pull and harder the further you pull; letting go close to
 * the ball cancels. A guide line shows the first ball it will touch and where that ball will go.
 *
 * Aim is not perfect: a faint wedge shows how far the shot may stray (wider on harder levels and
 * for harder hits), and the real shot gets a little random angle and power error. To help, the
 * object ball's line turns green and its pocket lights up when it is heading in, and on Easy and
 * Medium a green hint arrow (worked out by the robot's planner) points at a good shot.
 */
export abstract class TableEngine extends SportScene {
  protected discs: Disc[] = [];
  protected meshes = new Map<number, THREE.Object3D>();
  protected phase: Phase = "wait";
  /** Whether the current shooter may slide the cue ball/striker before shooting. */
  protected canPlace = false;
  protected shotEvents: SimEvents = emptyEvents();
  protected aimAngle = Math.PI / 2;
  protected power = 0;
  private dragging: "aim" | "place" | null = null;
  private sinking: Sinking[] = [];
  private planner: BotPlanner | null = null;
  private robotShot: Shot | null = null;
  private robotT = 0;
  private robotFrom = { x: 0, y: 0, angle: 0 };
  private guide: THREE.Group;
  private guideLine: THREE.Line;
  private guideObj: THREE.Line;
  private ghost: THREE.Mesh;
  private powerRing: THREE.Mesh;
  private spread: THREE.Mesh;
  private pocketRing: THREE.Mesh;
  private hint: THREE.Group;
  private hintPlanner: BotPlanner | null = null;
  private hintShot: Shot | null = null;
  private lastClack = 0;
  protected surface: THREE.Plane;

  constructor(
    container: HTMLElement,
    opts: SportOptions,
    protected table: Table,
    background: number,
    protected surfaceY: number,
    protected maxSpeed: number,
    private tilt: number,
  ) {
    super(container, opts, background, 40);
    this.surface = new THREE.Plane(new THREE.Vector3(0, 1, 0), -surfaceY);

    // Aim guide: dashed path to the first contact, a ghost ball, and the object ball's line.
    this.guide = new THREE.Group();
    const lineMat = new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.06, gapSize: 0.04, transparent: true, opacity: 0.9, depthTest: false });
    this.guideLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), lineMat);
    this.guideObj = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.95, depthTest: false }));
    this.ghost = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthTest: false, side: THREE.DoubleSide }));
    this.ghost.rotation.x = -Math.PI / 2;
    this.powerRing = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48, 1, 0, Math.PI * 2), new THREE.MeshBasicMaterial({ color: 0x6bcb77, transparent: true, opacity: 0.85, depthTest: false, side: THREE.DoubleSide }));
    this.powerRing.rotation.x = -Math.PI / 2;
    // Uncertainty wedge: where the shot may actually go (±2 standard deviations).
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(9), 3));
    this.spread = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, depthTest: false, side: THREE.DoubleSide }));
    this.pocketRing = new THREE.Mesh(new THREE.RingGeometry(0.75, 1, 40), new THREE.MeshBasicMaterial({ color: 0x6bcb77, transparent: true, opacity: 0.9, depthTest: false, side: THREE.DoubleSide }));
    this.pocketRing.rotation.x = -Math.PI / 2;
    [this.guideLine, this.guideObj, this.ghost, this.powerRing, this.spread, this.pocketRing].forEach((o) => (o.renderOrder = 5));
    this.guide.add(this.spread, this.guideLine, this.guideObj, this.ghost, this.powerRing, this.pocketRing);
    this.guide.visible = false;
    this.stage.scene.add(this.guide);

    // Hint arrow (unit length along +x, scaled to the shot): a flat green arrow on the cloth.
    this.hint = new THREE.Group();
    const hm = new THREE.MeshBasicMaterial({ color: 0x6bcb77, transparent: true, opacity: 0.55, depthTest: false, side: THREE.DoubleSide });
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.12), hm);
    shaft.position.x = 0.4;
    const head = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0.75, 0.16), new THREE.Vector2(1, 0), new THREE.Vector2(0.75, -0.16)])), hm);
    [shaft, head].forEach((m) => {
      m.rotation.x = -Math.PI / 2;
      m.renderOrder = 4;
      this.hint.add(m);
    });
    this.hint.visible = false;
    this.stage.scene.add(this.hint);
  }

  // ---- subclass hooks ----
  protected abstract cueId(): number;
  /** Height of a disc's centre above the surface. */
  protected abstract lift(d: Disc): number;
  /** Clamp a requested cue position to where it may be placed, or null if not allowed there. */
  protected abstract clampPlace(x: number, y: number): { x: number; y: number } | null;
  /** Called once everything has stopped after a shot. */
  protected abstract shotFinished(events: SimEvents): void;
  /** Robot: candidate shots and how to score a simulated result. `fromCue` keeps the cue where it is (for the hint). */
  protected abstract robotPlanner(fromCue?: boolean): BotPlanner;
  /** Whether discs roll (balls) or slide (carrom coins). */
  protected rolls = true;
  protected onShot?(): void;

  protected cue(): Disc {
    return this.discs.find((d) => d.id === this.cueId())!;
  }

  protected toWorld(d: { x: number; y: number }, lift = 0) {
    return new THREE.Vector3(d.x, this.surfaceY + lift, -d.y);
  }

  /** Called by subclasses when it is someone's turn to shoot. */
  protected beginTurn() {
    this.dragging = null;
    this.power = 0;
    this.syncMeshes(0);
    if (this.over) return;
    if (this.isRobotTurn) {
      this.phase = "robot";
      this.guide.visible = false;
      this.planner = null;
      this.robotShot = null;
      this.after(0.6, () => {
        if (this.phase === "robot") this.planner = this.robotPlanner();
      });
    } else {
      this.phase = "aim";
      this.guide.visible = false;
      this.startHint();
    }
  }

  /** Easy and Medium: work out a good shot from where the cue sits and point at it. */
  private startHint() {
    this.hint.visible = false;
    this.hintShot = null;
    this.hintPlanner = null;
    if (this.setup.level === "hard" || this.over) return;
    this.hintPlanner = this.robotPlanner(true);
  }

  protected shoot(angle: number, speed: number) {
    const c = this.cue();
    c.vx = Math.cos(angle) * speed;
    c.vy = Math.sin(angle) * speed;
    this.shotEvents = emptyEvents();
    this.phase = "rolling";
    this.guide.visible = false;
    this.hint.visible = false;
    this.hintPlanner = null;
    this.onShot?.();
    this.sound("clack", Math.min(1, speed / this.maxSpeed + 0.2));
  }

  // ---- camera ----
  protected onResize(aspect: number) {
    const cam = this.stage.camera;
    // Lay a long table across the screen in landscape.
    const sideways = aspect > 1.15 && this.table.halfH > this.table.halfW * 1.3;
    const halfAcross = (sideways ? this.table.halfH : this.table.halfW) * 1.2;
    const halfDeep = (sideways ? this.table.halfW : this.table.halfH) * 1.12;
    const tan = Math.tan((cam.fov * Math.PI) / 360);
    const dist = Math.max(halfAcross / (tan * aspect), (halfDeep * Math.cos(this.tilt) + 0.35 * halfDeep) / tan) * 1.08;
    const toward = sideways ? new THREE.Vector3(-1, 0, 0) : new THREE.Vector3(0, 0, 1);
    const offset = toward.multiplyScalar(Math.sin(this.tilt) * dist).add(new THREE.Vector3(0, Math.cos(this.tilt) * dist, 0));
    // Nudge the table down a little so the scoreboard does not cover the far end.
    const target = new THREE.Vector3(0, this.surfaceY, 0).addScaledVector(sideways ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, -1), halfDeep * 0.06);
    cam.position.copy(target).add(offset);
    cam.up.set(0, 1, 0);
    cam.lookAt(target);
    cam.updateProjectionMatrix();
  }

  // ---- input ----
  private tablePoint(e: PointerEvent) {
    const p = this.rayPlane(e, this.surface);
    return p ? { x: p.x, y: -p.z } : null;
  }

  protected onDown(e: PointerEvent) {
    if (this.phase !== "aim" || this.over) return;
    const p = this.tablePoint(e);
    if (!p) return;
    if (this.canPlace && this.startsOnCue(p)) {
      this.dragging = "place";
      return;
    }
    this.dragging = "aim";
    this.updateAim(e);
  }

  /** Only a press right on the cue ball/striker slides it; anywhere else starts aiming. */
  protected startsOnCue(p: { x: number; y: number }) {
    const c = this.cue();
    return Math.hypot(p.x - c.x, p.y - c.y) < c.r * 1.6;
  }

  protected onMove(e: PointerEvent) {
    if (!this.dragging || this.phase !== "aim") return;
    if (this.dragging === "place") {
      const p = this.tablePoint(e);
      if (!p) return;
      const q = this.clampPlace(p.x, p.y);
      if (q) {
        const c = this.cue();
        c.x = q.x;
        c.y = q.y;
        this.syncMeshes(0);
      }
      return;
    }
    this.updateAim(e);
  }

  protected onUp() {
    if (!this.dragging) return;
    const was = this.dragging;
    this.dragging = null;
    if (was === "place" && this.phase === "aim") this.startHint();
    if (was !== "aim" || this.phase !== "aim") return;
    if (this.power < 0.06) {
      this.guide.visible = false;
      this.power = 0;
      return;
    }
    // The real shot strays a little from the aim, inside the wedge the guide showed.
    const j = jitterShot(this.aimAngle, this.power * this.maxSpeed, this.setup.level, this.power);
    this.shoot(j.angle, j.speed);
  }

  private updateAim(e: PointerEvent) {
    const p = this.tablePoint(e);
    if (!p) return;
    const c = this.cue();
    const dx = c.x - p.x;
    const dy = c.y - p.y;
    if (Math.hypot(dx, dy) < 1e-4) return;
    this.aimAngle = Math.atan2(dy, dx);
    // Power from the on-screen pull so it feels the same on any screen size.
    const cs = this.toScreen(this.toWorld(c));
    const pull = Math.hypot(e.clientX - cs.x, e.clientY - cs.y);
    this.power = Math.max(0, Math.min(1, (pull - 18) / (this.screenMin() * 0.33)));
    this.updateGuide();
  }

  protected updateGuide() {
    const c = this.cue();
    const dx = Math.cos(this.aimAngle);
    const dy = Math.sin(this.aimAngle);
    const hit = castDisc(this.discs, this.table, c, dx, dy);
    const y = this.lift(c) * 0.3;
    const start = this.toWorld(c, y);
    const endPt = { x: c.x + dx * hit.dist, y: c.y + dy * hit.dist };
    const end = this.toWorld(endPt, y);
    this.guideLine.geometry.setFromPoints([start, end]);
    this.guideLine.computeLineDistances();
    this.ghost.position.copy(end);
    this.ghost.scale.setScalar(c.r);
    this.ghost.visible = hit.disc !== null;
    this.guideObj.visible = hit.disc !== null;
    this.pocketRing.visible = false;
    const objMat = this.guideObj.material as THREE.LineBasicMaterial;
    if (hit.disc !== null) {
      const t = this.discs.find((d) => d.id === hit.disc)!;
      let len = this.table.halfW * 0.35;
      // Heading for a pocket: draw the line all the way in, in green, and light the pocket.
      const pk = pocketOnLine(this.table, t.x, t.y, hit.nx, hit.ny);
      if (pk >= 0) {
        const p = this.table.pockets[pk];
        len = (p.x - t.x) * hit.nx + (p.y - t.y) * hit.ny;
        this.pocketRing.visible = true;
        this.pocketRing.position.copy(this.toWorld(p, y));
        this.pocketRing.scale.setScalar(p.r * (this.reduced ? 1.1 : 1.1 + Math.sin(this.time * 8) * 0.1));
      }
      objMat.color.set(pk >= 0 ? 0x6bcb77 : 0xffe066);
      this.guideObj.geometry.setFromPoints([this.toWorld(t, y), this.toWorld({ x: t.x + hit.nx * len, y: t.y + hit.ny * len }, y)]);
    }
    // Uncertainty wedge out to the first contact (players only; the robot's error is its own).
    const human = this.phase === "aim";
    this.spread.visible = human;
    if (human) {
      const half = 2 * aimSpread(this.setup.level, this.power);
      const reach = Math.max(c.r * 3, hit.dist + c.r);
      const pos = this.spread.geometry.attributes.position as THREE.BufferAttribute;
      const pts = [start, this.toWorld({ x: c.x + Math.cos(this.aimAngle - half) * reach, y: c.y + Math.sin(this.aimAngle - half) * reach }, y), this.toWorld({ x: c.x + Math.cos(this.aimAngle + half) * reach, y: c.y + Math.sin(this.aimAngle + half) * reach }, y)];
      pts.forEach((v, i) => pos.setXYZ(i, v.x, v.y, v.z));
      pos.needsUpdate = true;
      this.spread.geometry.computeBoundingSphere();
    }
    this.powerRing.position.copy(this.toWorld(c, y));
    this.powerRing.scale.setScalar(c.r * (1.4 + this.power * 2.2));
    const m = this.powerRing.material as THREE.MeshBasicMaterial;
    m.color.setHSL(0.33 - this.power * 0.33, 0.8, 0.55);
    this.guide.visible = this.power > 0.02 || this.phase === "robot";
  }

  // ---- loop ----
  protected update(dt: number) {
    if (this.phase === "rolling") {
      const ev = emptyEvents();
      simStep(this.discs, this.table, dt, ev);
      this.react(ev);
      this.shotEvents.hits.push(...ev.hits);
      this.shotEvents.cushions.push(...ev.cushions);
      this.shotEvents.pots.push(...ev.pots);
      this.syncMeshes(dt);
      if (!anyMoving(this.discs) && this.sinking.length === 0) {
        this.phase = "wait";
        this.shotFinished(this.shotEvents);
      }
    } else if (this.phase === "robot") {
      this.robotStep(dt);
    } else if (this.phase === "aim") {
      this.hintStep();
    }
    this.animateSinking(dt);
    this.idle?.(dt);
  }

  /** Per-frame extras (cue stick, highlights). */
  protected idle?(dt: number): void;

  private react(ev: SimEvents) {
    const now = this.time;
    for (const h of ev.hits) {
      if (now - this.lastClack < 0.03) continue;
      this.lastClack = now;
      this.sound("clack", h.speed / this.maxSpeed + 0.1);
    }
    for (const c of ev.cushions) if (c.speed > this.maxSpeed * 0.05) this.sound("cushion", c.speed / this.maxSpeed);
    for (const p of ev.pots) {
      const mesh = this.meshes.get(p.a);
      const pk = this.table.pockets[p.pocket];
      if (!mesh) continue;
      this.sinking.push({ mesh, from: mesh.position.clone(), to: this.toWorld(pk, -0.5 * this.lift(this.discs.find((d) => d.id === p.a)!) - this.table.halfW * 0.02), t: 0 });
      this.sound("pot", 0.8);
    }
  }

  private animateSinking(dt: number) {
    for (const s of this.sinking) {
      s.t = Math.min(1, s.t + dt * 3.2);
      s.mesh.position.lerpVectors(s.from, s.to, s.t);
      s.mesh.scale.setScalar(1 - s.t * 0.4);
      if (s.t >= 1) s.mesh.visible = false;
    }
    this.sinking = this.sinking.filter((s) => s.t < 1);
  }

  private rollQ = new THREE.Quaternion();
  private axis = new THREE.Vector3();

  protected syncMeshes(dt: number) {
    for (const d of this.discs) {
      const m = this.meshes.get(d.id);
      if (!m || !d.active) continue;
      const before = m.position.clone();
      m.position.copy(this.toWorld(d, this.lift(d)));
      m.visible = true;
      m.scale.setScalar(1);
      if (dt > 0) {
        const mx = m.position.x - before.x;
        const mz = m.position.z - before.z;
        const dist = Math.hypot(mx, mz);
        if (dist > 1e-6 && dist < d.r * 4) {
          if (this.rolls) {
            this.axis.set(mz, 0, -mx).normalize();
            this.rollQ.setFromAxisAngle(this.axis, dist / d.r);
            m.quaternion.premultiply(this.rollQ);
          } else m.rotation.y += dist * 0.6;
        }
      }
    }
  }

  /** Puts a disc back on the table (re-spot) and shows its mesh. */
  protected restore(d: Disc, x: number, y: number) {
    d.active = true;
    d.x = x;
    d.y = y;
    d.vx = 0;
    d.vy = 0;
    const m = this.meshes.get(d.id);
    if (m) {
      m.visible = true;
      m.scale.setScalar(1);
    }
  }

  protected isFree(x: number, y: number, r: number, ignore = -1) {
    return this.discs.every((d) => !d.active || d.id === ignore || Math.hypot(d.x - x, d.y - y) >= d.r + r + 0.002);
  }

  private hintStep() {
    if (this.hintPlanner) {
      const t0 = performance.now();
      let res = null;
      while (!res && performance.now() - t0 < 5) res = this.hintPlanner.work(1);
      if (!res) return;
      this.hintPlanner = null;
      // Only point at shots the rules score above zero (a pot; in carrom a clean hit counts too).
      this.hintShot = res.value > 0 ? res.shot : null;
    }
    const s = this.hintShot;
    this.hint.visible = s !== null && this.dragging !== "place";
    if (!s) return;
    const c = this.cue();
    // Arrow length shows how hard to hit; it starts just outside the cue ball.
    const len = c.r * 2.5 + this.table.halfW * 0.5 * (s.speed / this.maxSpeed);
    const from = { x: c.x + Math.cos(s.angle) * c.r * 1.3, y: c.y + Math.sin(s.angle) * c.r * 1.3 };
    this.hint.position.copy(this.toWorld(from, 0.002));
    this.hint.rotation.y = s.angle;
    this.hint.scale.set(len, 1, c.r * 5);
    const m = (this.hint.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
    m.opacity = this.dragging ? 0.3 : this.reduced ? 0.55 : 0.4 + Math.sin(this.time * 4) * 0.2;
  }

  // ---- robot ----
  private robotStep(dt: number) {
    if (!this.robotShot) {
      if (!this.planner) return;
      // Think for a few milliseconds each frame.
      const t0 = performance.now();
      let res = null;
      while (!res && performance.now() - t0 < 7) res = this.planner.work(1);
      if (!res) return;
      this.planner = null;
      this.robotShot = wobbleShot(res.shot, this.setup.level);
      const c = this.cue();
      this.robotFrom = { x: c.x, y: c.y, angle: this.aimAngle };
      this.robotT = 0;
      return;
    }
    // Slide into place and swing the aim round, then pull back and shoot.
    this.robotT += dt;
    const s = this.robotShot;
    const c = this.cue();
    const k = Math.min(1, this.robotT / 0.9);
    const e = k * k * (3 - 2 * k);
    c.x = this.robotFrom.x + (s.x - this.robotFrom.x) * e;
    c.y = this.robotFrom.y + (s.y - this.robotFrom.y) * e;
    let da = s.angle - this.robotFrom.angle;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    this.aimAngle = this.robotFrom.angle + da * e;
    this.power = this.robotT < 0.9 ? 0.05 : Math.min(s.speed / this.maxSpeed, ((this.robotT - 0.9) / 0.5) * (s.speed / this.maxSpeed));
    this.syncMeshes(0);
    this.updateGuide();
    this.guide.visible = true;
    if (this.robotT > 1.6) {
      this.robotShot = null;
      this.shoot(s.angle, s.speed);
    }
  }
}
