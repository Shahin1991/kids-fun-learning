import * as CANNON from "cannon-es";
import * as THREE from "three";
import { sumLine } from "@/lib/sports3d/darts";
import { disposeObject, SportScene, textSprite } from "@/lib/sports3d/SportScene";
import { resultFor, type SportOptions } from "@/lib/sports3d/types";
import { BOARD, clampDrop, dividerXs, pegLayout, SLOT_VALUES, slotAt, slotWidth } from "./peg-drop";
import { fitFrontCamera, lockToPlane, staticBox, stepWorld, syncMesh } from "./physics";

const BALL_COLOURS = [0xff6b6b, 0x4d96ff, 0x6bcb77, 0xffd93d, 0x9b51e0, 0xff9f43];
const CUP_COLOURS = [0xff6b6b, 0xff9f43, 0xffd93d, 0x6bcb77, 0xffd93d, 0xff9f43, 0xff6b6b];

interface Ball {
  body: CANNON.Body;
  mesh: THREE.Mesh;
  scored: boolean;
  /** Seconds spent almost still before reaching a cup (balanced on a peg) */
  still: number;
}

/**
 * Peg Drop: slide the ball along the top and let go. It bounces down through the pegs (they light
 * up when hit) into a numbered cup; the cups add up as maths practice. No way to lose.
 */
export class PegDropEngine extends SportScene {
  private world = new CANNON.World({ gravity: new CANNON.Vec3(0, -14, 0) });
  private ballMat = new CANNON.Material("ball");
  private pegMat = new CANNON.Material("peg");
  private wallMat = new CANNON.Material("wall");
  private board = new THREE.Group();
  private pegBodies: CANNON.Body[] = [];
  private pegMeshes = new Map<number, { mesh: THREE.Mesh; flash: number }>();
  private balls: Ball[] = [];
  private dropper: THREE.Mesh;
  private dropX = 0;
  private aiming = false;
  private cooldown = 0;
  private dropped = 0;
  private total = 5;
  private points: number[] = [];
  private values: number[] = SLOT_VALUES.easy;
  private plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private labels: { s: THREE.Sprite; t: number }[] = [];
  private finishing = false;

  constructor(container: HTMLElement, opts: SportOptions) {
    super(container, opts, 0xdff3ff, 40);
    this.world.allowSleep = false;
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.ballMat, this.pegMat, { friction: 0.05, restitution: 0.45 }));
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.ballMat, this.wallMat, { friction: 0.1, restitution: 0.3 }));
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.ballMat, this.ballMat, { friction: 0.1, restitution: 0.3 }));
    const s = this.stage.scene;
    s.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(3, 8, 10);
    s.add(sun);
    s.add(this.board);
    this.dropper = new THREE.Mesh(new THREE.SphereGeometry(BOARD.ballR, 24, 16), new THREE.MeshStandardMaterial({ color: BALL_COLOURS[0], roughness: 0.3 }));
    s.add(this.dropper);
    this.stage.onDispose(() => disposeObject(this.board));
    this.start();
  }

  protected onResize() {
    // The whole board, from the cup numbers to just above the dropper
    fitFrontCamera(this.stage.camera, { minX: -BOARD.halfW - 0.4, maxX: BOARD.halfW + 0.4, minY: -0.3, maxY: BOARD.dropY + 0.5 });
  }

  protected startGame() {
    for (const b of this.balls) {
      this.world.removeBody(b.body);
      // The sphere geometry is shared with the dropper; only the colour is per ball
      (b.mesh.material as THREE.Material).dispose();
      b.mesh.removeFromParent();
    }
    this.balls = [];
    this.total = parseInt(this.setup.variant, 10) || 5;
    this.values = SLOT_VALUES[this.setup.level];
    this.dropped = 0;
    this.points = [];
    this.finishing = false;
    this.buildBoard();
    this.dropper.visible = true;
    this.emitHud({ message: this.ballsText(), detail: undefined, say: "Slide the ball and let go!" });
  }

  private ballsText() {
    const left = this.total - this.dropped;
    return left > 0 ? `Drop the balls! ${"🔵".repeat(Math.min(left, 10))}` : "Watch them land…";
  }

  private buildBoard() {
    this.world.bodies.filter((b) => b.mass === 0).forEach((b) => this.world.removeBody(b));
    this.pegBodies = [];
    this.pegMeshes.clear();
    for (const c of [...this.board.children]) disposeObject(c);

    const { halfW, height, pegR, slotH } = BOARD;
    const wood = new THREE.MeshStandardMaterial({ color: 0x4d96ff, roughness: 0.7 });
    const frame = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const back = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 + 0.6, height + 0.6, 0.2), wood);
    back.position.set(0, height / 2, -0.6);
    this.board.add(back);
    // Walls and floor
    for (const sx of [-1, 1]) {
      staticBox(this.world, this.wallMat, sx * (halfW + 0.25), height / 2, 0.5, height + 2);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, height + 0.6, 1.1), frame);
      m.position.set(sx * (halfW + 0.15), height / 2, 0);
      this.board.add(m);
    }
    staticBox(this.world, this.wallMat, 0, -0.5, halfW * 2 + 2, 1);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 + 0.6, 0.3, 1.1), frame);
    floor.position.set(0, -0.15, 0);
    this.board.add(floor);
    // Cups: coloured floors, dividers and a number under each
    const sw = slotWidth();
    this.values.forEach((v, i) => {
      const x = -halfW + (i + 0.5) * sw;
      const cup = new THREE.Mesh(new THREE.BoxGeometry(sw - 0.06, slotH, 0.05), new THREE.MeshStandardMaterial({ color: CUP_COLOURS[i], roughness: 0.6 }));
      cup.position.set(x, slotH / 2, -0.48);
      this.board.add(cup);
      const label = textSprite(String(v), "#ffffff");
      label.scale.set(2.4, 0.75, 1);
      label.position.set(x, 0.55, 0.7);
      this.board.add(label);
    });
    for (const x of dividerXs()) {
      staticBox(this.world, this.wallMat, x, slotH / 2, 0.12, slotH);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, slotH, 1.0), frame);
      m.position.set(x, slotH / 2, 0);
      this.board.add(m);
    }
    // Pegs: spheres in the physics (a circle in the screen plane), drawn as short pins
    const pegGeo = new THREE.CylinderGeometry(pegR, pegR, 0.9, 16).rotateX(Math.PI / 2);
    for (const p of pegLayout(this.setup.level)) {
      const body = new CANNON.Body({ mass: 0, material: this.pegMat, shape: new CANNON.Sphere(pegR) });
      body.position.set(p.x, p.y, 0);
      this.world.addBody(body);
      this.pegBodies.push(body);
      const mesh = new THREE.Mesh(pegGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffd93d, emissiveIntensity: 0, roughness: 0.3 }));
      mesh.position.set(p.x, p.y, 0);
      this.board.add(mesh);
      this.pegMeshes.set(body.id, { mesh, flash: 0 });
    }
  }

  // ---- input ----
  private setDrop(e: PointerEvent) {
    const p = this.rayPlane(e, this.plane);
    if (p) this.dropX = clampDrop(p.x);
  }

  protected onDown(e: PointerEvent) {
    if (this.over || this.dropped >= this.total) return;
    this.aiming = true;
    this.setDrop(e);
  }

  protected onMove(e: PointerEvent) {
    if (this.aiming || e.pointerType === "mouse") this.setDrop(e);
  }

  protected onUp() {
    if (!this.aiming) return;
    this.aiming = false;
    this.drop();
  }

  private drop() {
    if (this.cooldown > 0 || this.dropped >= this.total || this.over) return;
    const body = new CANNON.Body({ mass: 1, material: this.ballMat, shape: new CANNON.Sphere(BOARD.ballR) });
    // A hair of sideways jitter so a ball can never balance forever on a peg straight below
    body.position.set(this.dropper.position.x + (Math.random() - 0.5) * 0.04, BOARD.dropY, 0);
    lockToPlane(body);
    body.linearDamping = 0.02;
    this.world.addBody(body);
    const mesh = new THREE.Mesh(this.dropper.geometry, new THREE.MeshStandardMaterial({ color: BALL_COLOURS[this.dropped % BALL_COLOURS.length], roughness: 0.3 }));
    this.stage.scene.add(mesh);
    syncMesh(mesh, body);
    const ball: Ball = { body, mesh, scored: false, still: 0 };
    body.addEventListener("collide", (e: { body: CANNON.Body; contact: CANNON.ContactEquation }) => {
      const peg = this.pegMeshes.get(e.body.id);
      const v = Math.abs(e.contact.getImpactVelocityAlongNormal());
      if (peg) peg.flash = 1;
      if (v > 1.5) this.sound("clack", Math.min(0.6, v / 14));
    });
    this.balls.push(ball);
    this.dropped++;
    this.cooldown = 0.35;
    this.sound("throw", 0.3);
    (this.dropper.material as THREE.MeshStandardMaterial).color.setHex(BALL_COLOURS[this.dropped % BALL_COLOURS.length]);
    this.dropper.visible = this.dropped < this.total;
    this.emitHud({ message: this.ballsText() });
  }

  // ---- loop ----
  protected update(dt: number) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    stepWorld(this.world, dt);
    for (const b of this.balls) {
      syncMesh(b.mesh, b.body);
      if (b.scored) continue;
      const v = b.body.velocity.length();
      // In a cup once it is well below the divider tops and has calmed down
      if (b.body.position.y < BOARD.slotH * 0.6 && v < 1.5) this.score(b);
      else if (v < 0.08) {
        b.still += dt;
        if (b.still > 0.8) {
          b.body.applyImpulse(new CANNON.Vec3(Math.random() < 0.5 ? -1 : 1, 0.5, 0));
          b.still = 0;
        }
      } else b.still = 0;
    }
    for (const p of this.pegMeshes.values()) {
      if (p.flash <= 0) continue;
      p.flash = Math.max(0, p.flash - dt * 3);
      (p.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = p.flash * 1.4;
    }
    // Dropper glides after the finger and bobs gently while it waits
    const bob = this.reduced ? 0 : Math.sin(this.time * 3) * 0.06;
    this.dropper.position.x += (this.dropX - this.dropper.position.x) * Math.min(1, dt * 16);
    this.dropper.position.y = BOARD.dropY + bob;
    for (const l of this.labels) {
      l.t += dt;
      l.s.position.y += dt * 0.8;
      (l.s.material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - l.t / 1.4);
    }
    this.labels = this.labels.filter((l) => {
      if (l.t < 1.4) return true;
      disposeObject(l.s);
      return false;
    });
  }

  private score(b: Ball) {
    b.scored = true;
    const i = slotAt(b.body.position.x);
    const v = this.values[i];
    this.points.push(v);
    this.players[0].score += v;
    this.sound("pot", 0.7);
    this.sound("score", Math.min(1, v / 10));
    const at = new THREE.Vector3(-BOARD.halfW + (i + 0.5) * slotWidth(), BOARD.slotH + 0.4, 0.8);
    const s = textSprite(`+${v}`, "#ffe066");
    s.scale.set(1.6, 0.5, 1);
    s.position.copy(at);
    this.stage.scene.add(s);
    this.labels.push({ s, t: 0 });
    if (v >= 5) this.celebrate(at, 2);
    this.emitHud({ message: this.ballsText(), detail: sumLine(this.points) || `${v}!`, say: String(v) });
    if (this.balls.length === this.total && this.balls.every((x) => x.scored) && !this.finishing) {
      this.finishing = true;
      this.after(1.2, () => this.finish());
    }
  }

  private finish() {
    this.over = true;
    const r = resultFor(this.players, "solo");
    this.emitHud({ message: r.text, detail: sumLine(this.points), say: `${this.players[0].score} points!` });
    this.celebrate(new THREE.Vector3(0, BOARD.height / 2, 1), 5);
    this.sound("cheer");
    this.after(1, () => this.opts.onGameOver(r));
  }

  protected onDestroy() {
    this.world.bodies.slice().forEach((b) => this.world.removeBody(b));
  }
}
