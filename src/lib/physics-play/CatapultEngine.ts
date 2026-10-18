import * as CANNON from "cannon-es";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { disposeObject, SportScene, textSprite } from "@/lib/sports3d/SportScene";
import { resultFor, type SportOptions } from "@/lib/sports3d/types";
import { isDown, launchVelocity, POINTS, PREVIEW_DOTS, SHOTS_PER_TOWER, SLING, TOWER_X, towerLayout, trajectory, type TowerBlock } from "./catapult";
import { fitFrontCamera, lockToPlane, stepWorld, syncMesh } from "./physics";

const G = 9.8;
const COLOURS = [0xff6b6b, 0x4d96ff, 0x6bcb77, 0xffd93d, 0x9b51e0, 0xff9f43];

type Phase = "aim" | "flying" | "between";

interface Piece {
  spec: TowerBlock;
  body: CANNON.Body;
  mesh: THREE.Mesh;
  down: boolean;
}

function starShape(r: number) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    if (i === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  s.closePath();
  return s;
}

/**
 * Catapult: pull back the slingshot (anywhere on the screen) and let go. Dots show the flight path
 * (long on Easy, short on Hard). Knock the blocks down for points and the star off the top for a
 * bonus; three shots per tower. Nothing is ever lost: when the shots run out the next tower comes.
 */
export class CatapultEngine extends SportScene {
  private world = new CANNON.World({ gravity: new CANNON.Vec3(0, -G, 0) });
  private blockMat = new CANNON.Material("block");
  private ballMat = new CANNON.Material("ball");
  private groundMat = new CANNON.Material("ground");
  private pieces: Piece[] = [];
  private ball: { body: CANNON.Body | null; mesh: THREE.Mesh };
  private phase: Phase = "between";
  private pulling = false;
  private pull = new THREE.Vector2();
  private plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private dots: THREE.Mesh[] = [];
  private bands: THREE.Line[] = [];
  private pouch: THREE.Mesh;
  private tower = 0;
  private towers = 3;
  private shotsLeft = SHOTS_PER_TOWER;
  private flyT = 0;
  private towerPoints = 0;
  private woke = false;
  private geos = new Map<string, THREE.BufferGeometry>();
  private labels: { s: THREE.Sprite; t: number }[] = [];

  constructor(container: HTMLElement, opts: SportOptions) {
    super(container, opts, 0xbfe6ff, 40);
    this.world.allowSleep = true;
    (this.world.solver as CANNON.GSSolver).iterations = 12;
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.blockMat, this.blockMat, { friction: 0.6, restitution: 0.05 }));
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.blockMat, this.groundMat, { friction: 0.8, restitution: 0.02 }));
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.ballMat, this.blockMat, { friction: 0.4, restitution: 0.2 }));
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.ballMat, this.groundMat, { friction: 0.6, restitution: 0.3 }));
    const ground = new CANNON.Body({ mass: 0, material: this.groundMat, shape: new CANNON.Box(new CANNON.Vec3(60, 1, 5)) });
    ground.position.set(0, -1, 0);
    this.world.addBody(ground);
    this.buildScene();
    this.pouch = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0x5b3a1e, roughness: 0.9 }));
    this.stage.scene.add(this.pouch);
    this.ball = { body: null, mesh: new THREE.Mesh(new THREE.SphereGeometry(SLING.ballR, 24, 16), new THREE.MeshStandardMaterial({ color: 0xff6b6b, roughness: 0.35 })) };
    this.ball.mesh.castShadow = true;
    this.stage.scene.add(this.ball.mesh);
    const dotGeo = new THREE.SphereGeometry(0.09, 10, 8);
    for (let i = 0; i < 28; i++) {
      const d = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 - i * 0.025 }));
      d.visible = false;
      this.stage.scene.add(d);
      this.dots.push(d);
    }
    this.start();
  }

  private buildScene() {
    const s = this.stage.scene;
    this.stage.renderer.shadowMap.enabled = true;
    s.add(new THREE.HemisphereLight(0xffffff, 0x6b8f4e, 2));
    const sun = new THREE.DirectionalLight(0xfff4dd, 2);
    sun.position.set(-4, 12, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.bias = -0.0005;
    Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 10, bottom: -2, near: 1, far: 40 });
    s.add(sun);
    const grass = new THREE.Mesh(new THREE.BoxGeometry(80, 1, 12), new THREE.MeshStandardMaterial({ color: 0x7cc96b, roughness: 1 }));
    grass.position.set(0, -0.5, -3);
    grass.receiveShadow = true;
    s.add(grass);
    // Hills and clouds for a friendly backdrop
    for (const [x, r, c] of [[-12, 7, 0x8fd18a], [6, 9, 0x9edb93], [20, 8, 0x8fd18a]] as const) {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 12), new THREE.MeshStandardMaterial({ color: c, roughness: 1 }));
      hill.position.set(x, -r * 0.55, -16);
      s.add(hill);
    }
    // Slingshot: a wooden Y with two bands meeting at the pouch
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.8 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 1.6, 10), wood);
    trunk.position.set(SLING.x, 0.8, 0);
    trunk.castShadow = true;
    s.add(trunk);
    for (const sx of [-1, 1]) {
      const prong = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.1, 10), wood);
      prong.position.set(SLING.x + sx * 0.32, 2.05, 0);
      prong.rotation.z = -sx * 0.32;
      prong.castShadow = true;
      s.add(prong);
      const band = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0x3b2f2f }));
      s.add(band);
      this.bands.push(band);
    }
  }

  protected onResize() {
    const tx = TOWER_X[this.setup.level];
    fitFrontCamera(this.stage.camera, { minX: SLING.x - 1.6, maxX: tx + 2.6, minY: -0.2, maxY: 6.5 }, { top: 0.22, bottom: 0.1, side: 0.03 });
  }

  protected startGame() {
    this.onResize();
    this.towers = parseInt(this.setup.variant, 10) || 3;
    this.tower = 0;
    this.buildTower();
  }

  private geometry(b: TowerBlock) {
    const key = `${b.kind}`;
    let g = this.geos.get(key);
    if (!g) {
      g = b.kind === "star" ? new THREE.ExtrudeGeometry(starShape(b.w / 2), { depth: 0.25, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 }).translate(0, 0, -0.125) : new RoundedBoxGeometry(b.w, b.h, 0.9, 3, 0.08);
      this.geos.set(key, g);
      this.stage.onDispose(() => g!.dispose());
    }
    return g;
  }

  private clearTower() {
    for (const p of this.pieces) {
      this.world.removeBody(p.body);
      // Geometries are shared per block kind; materials are per block
      (p.mesh.material as THREE.Material).dispose();
      p.mesh.removeFromParent();
    }
    this.pieces = [];
  }

  private buildTower() {
    this.clearTower();
    this.removeBall();
    const layout = towerLayout(this.tower, this.setup.level);
    layout.forEach((b, i) => {
      const body = new CANNON.Body({ mass: b.kind === "star" ? 0.4 : b.w * b.h * 0.9, material: this.blockMat, shape: new CANNON.Box(new CANNON.Vec3(b.w / 2, b.h / 2, 0.45)) });
      body.position.set(b.x, b.y, 0);
      lockToPlane(body, false);
      body.allowSleep = true;
      body.sleepSpeedLimit = 0.15;
      body.sleepTimeLimit = 0.4;
      body.linearDamping = 0.05;
      body.angularDamping = 0.15;
      this.world.addBody(body);
      // Built resting exactly on each other, then asleep, so the tower never wobbles before it is hit
      body.sleep();
      const colour = b.kind === "star" ? 0xffd23f : COLOURS[(this.tower * 3 + i) % COLOURS.length];
      const m = b.kind === "star"
        ? new THREE.MeshStandardMaterial({ color: colour, emissive: 0xffb300, emissiveIntensity: 0.35, metalness: 0.3, roughness: 0.3 })
        : new THREE.MeshStandardMaterial({ color: colour, roughness: 0.45 });
      const mesh = new THREE.Mesh(this.geometry(b), m);
      mesh.castShadow = true;
      this.stage.scene.add(mesh);
      syncMesh(mesh, body);
      this.pieces.push({ spec: b, body, mesh, down: false });
    });
    this.towerPoints = 0;
    this.shotsLeft = SHOTS_PER_TOWER;
    this.newShot();
    this.emitHud({ message: this.statusText(), detail: undefined, say: this.tower === 0 ? "Pull back and let go!" : "New tower!" });
  }

  private statusText() {
    return `Tower ${this.tower + 1}/${this.towers} · ${"🔴".repeat(this.shotsLeft)}${"⚪".repeat(SHOTS_PER_TOWER - this.shotsLeft)}`;
  }

  private downText() {
    const n = this.pieces.filter((p) => p.down).length;
    const star = this.pieces.find((p) => p.spec.kind === "star")?.down;
    return `Knocked down ${n} of ${this.pieces.length}${star ? " · ⭐ +5" : ""}`;
  }

  private removeBall() {
    if (this.ball.body) this.world.removeBody(this.ball.body);
    this.ball.body = null;
  }

  private newShot() {
    this.removeBall();
    this.pull.set(0, 0);
    this.phase = "aim";
    this.woke = false;
  }

  // ---- input ----
  private pointerPull(e: PointerEvent) {
    const p = this.rayPlane(e, this.plane);
    if (!p) return;
    const v = launchVelocity(SLING.x - p.x, SLING.restY - p.y);
    const len = Math.hypot(SLING.x - p.x, SLING.restY - p.y) || 1;
    this.pull.set(((SLING.x - p.x) / len) * v.pull, ((SLING.restY - p.y) / len) * v.pull);
  }

  protected onDown(e: PointerEvent) {
    if (this.phase !== "aim" || this.over) return;
    this.pulling = true;
    this.pointerPull(e);
  }

  protected onMove(e: PointerEvent) {
    if (this.pulling) this.pointerPull(e);
  }

  protected onUp() {
    if (!this.pulling) return;
    this.pulling = false;
    // A tiny pull is treated as a tap, not a shot
    if (this.pull.length() < 0.35) {
      this.pull.set(0, 0);
      return;
    }
    this.launch();
  }

  private launch() {
    const v = launchVelocity(this.pull.x, this.pull.y);
    const body = new CANNON.Body({ mass: 4, material: this.ballMat, shape: new CANNON.Sphere(SLING.ballR) });
    body.position.set(SLING.x - this.pull.x, SLING.restY - this.pull.y, 0);
    body.velocity.set(v.vx, v.vy, 0);
    lockToPlane(body);
    body.linearDamping = 0.01;
    body.addEventListener("collide", (e: { body: CANNON.Body; contact: CANNON.ContactEquation }) => {
      const hitBlock = this.pieces.some((p) => p.body === e.body);
      // Wake the whole tower on the first hit so no block is left asleep in mid-air
      if (hitBlock && !this.woke) {
        this.woke = true;
        this.pieces.forEach((p) => p.body.wakeUp());
      }
      const s = Math.abs(e.contact.getImpactVelocityAlongNormal());
      if (s > 1) this.sound(hitBlock ? "clack" : "thud", Math.min(1, s / 12));
    });
    this.world.addBody(body);
    this.ball.body = body;
    this.pull.set(0, 0);
    this.phase = "flying";
    this.flyT = 0;
    this.shotsLeft--;
    this.sound("throw", 0.8);
    this.emitHud({ message: this.statusText() });
  }

  // ---- loop ----
  protected update(dt: number) {
    stepWorld(this.world, dt);
    for (const p of this.pieces) syncMesh(p.mesh, p.body);

    // Ball in the pouch while aiming, then following its body
    const rest = new THREE.Vector3(SLING.x - this.pull.x, SLING.restY - this.pull.y, 0);
    if (this.ball.body) syncMesh(this.ball.mesh, this.ball.body);
    else this.ball.mesh.position.copy(rest);
    this.ball.mesh.visible = this.phase !== "between" || this.ball.body !== null;
    // Once the ball is away the pouch snaps back to rest
    const pouchAt = this.ball.body ? new THREE.Vector3(SLING.x, SLING.restY, 0) : rest;
    this.pouch.position.copy(pouchAt).setX(pouchAt.x - 0.2);
    this.bands.forEach((b, i) => b.geometry.setFromPoints([new THREE.Vector3(SLING.x + (i ? 0.48 : -0.48), 2.55, 0), pouchAt]));

    // Flight path preview while pulling
    const v = launchVelocity(this.pull.x, this.pull.y);
    const pts = this.pulling && v.pull > 0.35 ? trajectory(rest.x, rest.y, v.vx, v.vy, G, PREVIEW_DOTS[this.setup.level]) : [];
    this.dots.forEach((d, i) => {
      d.visible = i < pts.length;
      if (d.visible) d.position.set(pts[i].x, pts[i].y, 0);
    });

    if (this.phase === "flying") {
      this.flyT += dt;
      const b = this.ball.body!;
      const settled = this.pieces.every((p) => p.body.sleepState === CANNON.Body.SLEEPING || (p.body.velocity.length() < 0.2 && p.body.angularVelocity.length() < 0.3));
      const ballDone = b.velocity.length() < 0.3 || b.position.x > TOWER_X[this.setup.level] + 14 || b.position.y < -3;
      if ((settled && ballDone && this.flyT > 1.2) || this.flyT > 7) this.shotFinished();
    }

    for (const l of this.labels) {
      l.t += dt;
      l.s.position.y += dt * 0.7;
      (l.s.material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - l.t / 1.5);
    }
    this.labels = this.labels.filter((l) => {
      if (l.t < 1.5) return true;
      disposeObject(l.s);
      return false;
    });
  }

  private tilt(q: CANNON.Quaternion) {
    return 2 * Math.atan2(Math.hypot(q.x, q.y, q.z), Math.abs(q.w));
  }

  private shotFinished() {
    this.phase = "between";
    let gained = 0;
    for (const p of this.pieces) {
      if (p.down || !isDown(p.spec.y, p.body.position.y, this.tilt(p.body.quaternion))) continue;
      p.down = true;
      gained += POINTS[p.spec.kind];
      const s = textSprite(`+${POINTS[p.spec.kind]}`, p.spec.kind === "star" ? "#ffe066" : "#ffffff");
      s.scale.set(1.4, 0.44, 1);
      s.position.set(p.body.position.x, p.body.position.y + 0.8, 1);
      this.stage.scene.add(s);
      this.labels.push({ s, t: 0 });
    }
    this.towerPoints += gained;
    this.players[0].score += gained;
    const allDown = this.pieces.every((p) => p.down);
    if (gained) this.sound("score", Math.min(1, gained / 8));
    if (allDown) {
      this.celebrate(new THREE.Vector3(TOWER_X[this.setup.level], 2, 1), 4);
      this.sound("cheer");
      this.emitHud({ message: "All down! 🎉", detail: this.downText(), say: "All down!" });
      this.after(1.8, () => this.nextTower());
    } else if (this.shotsLeft > 0) {
      this.emitHud({ message: this.statusText(), detail: this.downText(), say: gained ? `${gained}!` : "Try again!" });
      this.after(0.6, () => this.newShot());
    } else {
      this.emitHud({ message: `${this.towerPoints} points from this tower!`, detail: this.downText(), say: `${this.towerPoints} points` });
      this.after(1.8, () => this.nextTower());
    }
  }

  private nextTower() {
    this.tower++;
    if (this.tower >= this.towers) return this.finish();
    this.buildTower();
  }

  private finish() {
    this.over = true;
    this.removeBall();
    const r = resultFor(this.players, "solo");
    this.emitHud({ message: r.text, detail: undefined, say: r.text });
    this.celebrate(new THREE.Vector3(0, 3, 1), 6);
    this.sound("cheer");
    this.after(1, () => this.opts.onGameOver(r));
  }

  protected onDestroy() {
    this.clearTower();
    this.world.bodies.slice().forEach((b) => this.world.removeBody(b));
  }
}
