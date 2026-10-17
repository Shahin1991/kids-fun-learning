import * as THREE from "three";
import { dartScore, RINGS, robotDart, SEGMENTS, sumLine, SWAY } from "./darts";
import { disposeObject, SportScene, textSprite } from "./SportScene";
import { resultFor, type SportOptions } from "./types";

const BOARD_Y = 1.73;
const FACE_Z = 0.04;
const HAND = new THREE.Vector3(0.12, 1.45, 1.25);
const FLIGHT_T = 0.32;
const PLAYER_FLIGHTS = [0x4d96ff, 0xff6b6b];

function boardTexture() {
  const S = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  const k = S / 2 / RINGS.board;
  const cx = S / 2;
  g.fillStyle = "#111";
  g.beginPath();
  g.arc(cx, cx, S / 2, 0, Math.PI * 2);
  g.fill();
  const wedge = (r0: number, r1: number, i: number, color: string) => {
    // Wedge i is centred on straight up, going clockwise; canvas angles run clockwise from +x.
    const a0 = ((i * 18 - 9 - 90) * Math.PI) / 180;
    const a1 = a0 + (18 * Math.PI) / 180;
    g.beginPath();
    g.arc(cx, cx, r1 * k, a0, a1);
    g.arc(cx, cx, r0 * k, a1, a0, true);
    g.closePath();
    g.fillStyle = color;
    g.fill();
  };
  for (let i = 0; i < 20; i++) {
    const even = i % 2 === 0;
    wedge(RINGS.outerBull, RINGS.doubleOut, i, even ? "#1b1b1b" : "#f3e6c4");
    wedge(RINGS.trebleIn, RINGS.trebleOut, i, even ? "#d7263d" : "#1f9a52");
    wedge(RINGS.doubleIn, RINGS.doubleOut, i, even ? "#d7263d" : "#1f9a52");
  }
  g.fillStyle = "#1f9a52";
  g.beginPath();
  g.arc(cx, cx, RINGS.outerBull * k, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#d7263d";
  g.beginPath();
  g.arc(cx, cx, RINGS.bull * k, 0, Math.PI * 2);
  g.fill();
  // Wire.
  g.strokeStyle = "rgba(220,220,220,0.8)";
  g.lineWidth = 2;
  for (const r of [RINGS.outerBull, RINGS.trebleIn, RINGS.trebleOut, RINGS.doubleIn, RINGS.doubleOut]) {
    g.beginPath();
    g.arc(cx, cx, r * k, 0, Math.PI * 2);
    g.stroke();
  }
  for (let i = 0; i < 20; i++) {
    const a = ((i * 18 - 9 - 90) * Math.PI) / 180;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * RINGS.outerBull * k, cx + Math.sin(a) * RINGS.outerBull * k);
    g.lineTo(cx + Math.cos(a) * RINGS.doubleOut * k, cx + Math.sin(a) * RINGS.doubleOut * k);
    g.stroke();
  }
  // Numbers.
  g.fillStyle = "#fff";
  g.font = "bold 64px system-ui, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  const rn = ((RINGS.doubleOut + RINGS.board) / 2) * k;
  SEGMENTS.forEach((n, i) => {
    const a = ((i * 18 - 90) * Math.PI) / 180;
    g.fillText(String(n), cx + Math.cos(a) * rn, cx + Math.sin(a) * rn);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

interface Flying {
  mesh: THREE.Group;
  from: THREE.Vector3;
  to: THREE.Vector3;
  t: number;
  hit: { x: number; y: number };
}

/** Darts: aim with your finger (the reticle wobbles a little, like a real hand) and let go to throw. */
export class DartsEngine extends SportScene {
  private plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -FACE_Z);
  private reticle: THREE.Mesh;
  private held: THREE.Group;
  private aim = new THREE.Vector2(0, 0); // board coords (m)
  private aiming = false;
  private busy = false;
  private flying: Flying | null = null;
  private stuck: { mesh: THREE.Group; wob: number }[] = [];
  private labels: { s: THREE.Sprite; t: number }[] = [];
  private round = 0;
  private rounds = 5;
  private dartInTurn = 0;
  private turnPoints: number[] = [];
  private robotTarget: { x: number; y: number } | null = null;
  private robotT = 0;
  private robotFrom = new THREE.Vector2();

  constructor(container: HTMLElement, opts: SportOptions) {
    super(container, opts, 0x3b2a4f, 40);
    this.buildRoom();
    this.reticle = new THREE.Mesh(new THREE.RingGeometry(0.009, 0.014, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true }));
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.0035, 16), new THREE.MeshBasicMaterial({ color: 0xffe066, depthTest: false }));
    this.reticle.add(dot);
    this.reticle.renderOrder = 6;
    dot.renderOrder = 7;
    this.reticle.visible = false;
    this.stage.scene.add(this.reticle);
    this.held = this.makeDart(PLAYER_FLIGHTS[0]);
    this.stage.scene.add(this.held);
    this.start();
  }

  private buildRoom() {
    const s = this.stage.scene;
    s.add(new THREE.HemisphereLight(0xfff0dd, 0x2a1d3a, 1.4));
    const spot = new THREE.SpotLight(0xffffff, 12, 6, Math.PI / 7, 0.5, 1);
    spot.position.set(0, BOARD_Y + 1.2, 1.4);
    spot.target.position.set(0, BOARD_Y, 0);
    spot.castShadow = true;
    spot.shadow.mapSize.set(1024, 1024);
    spot.shadow.bias = -0.0008;
    spot.shadow.normalBias = 0.004;
    s.add(spot, spot.target);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), new THREE.MeshStandardMaterial({ color: 0x6d4c8c, roughness: 0.9 }));
    wall.position.set(0, 2, 0);
    wall.receiveShadow = true;
    s.add(wall);
    const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 0.02), new THREE.MeshStandardMaterial({ color: 0x4a2c16, roughness: 0.6 }));
    cabinet.position.set(0, BOARD_Y, 0.01);
    cabinet.receiveShadow = true;
    s.add(cabinet);
    // The body stops just short of the face so the two never z-fight.
    const depth = FACE_Z - 0.024;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(RINGS.board, RINGS.board, depth, 64), new THREE.MeshStandardMaterial({ color: 0x151515 }));
    body.rotation.x = Math.PI / 2;
    body.position.set(0, BOARD_Y, 0.02 + depth / 2);
    body.castShadow = true;
    s.add(body);
    const face = new THREE.Mesh(new THREE.CircleGeometry(RINGS.board, 96), new THREE.MeshStandardMaterial({ map: boardTexture(), roughness: 0.85 }));
    face.position.set(0, BOARD_Y, FACE_Z);
    face.receiveShadow = true;
    s.add(face);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshStandardMaterial({ color: 0x5b3b25, roughness: 0.8 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = 3;
    floor.receiveShadow = true;
    s.add(floor);
    // Oche (throw line).
    const oche = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 0.04), new THREE.MeshStandardMaterial({ color: 0xffd93d }));
    oche.position.set(0, 0.01, 1.9);
    s.add(oche);
  }

  /** A dart pointing along +z (tip at the origin's -z side is the front). */
  private makeDart(flight: number) {
    const g = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: 0xc8ccd4, metalness: 0.8, roughness: 0.3 });
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0022, 0.03, 10), metal);
    tip.rotation.x = -Math.PI / 2;
    tip.position.z = -0.015;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.05, 14), new THREE.MeshStandardMaterial({ color: 0x8f97a6, metalness: 0.7, roughness: 0.35 }));
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 0.025;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.045, 8), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    shaft.rotation.x = Math.PI / 2;
    shaft.position.z = 0.072;
    const fm = new THREE.MeshStandardMaterial({ color: flight, side: THREE.DoubleSide, roughness: 0.5 });
    for (const rot of [0, Math.PI / 2]) {
      const f = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.02, 0.012), new THREE.Vector2(0.02, 0.04), new THREE.Vector2(0, 0.035)])), fm);
      f.rotation.set(0, -Math.PI / 2, rot);
      f.position.z = 0.06;
      const f2 = f.clone();
      f2.rotation.z = rot + Math.PI;
      g.add(f, f2);
    }
    g.add(tip, barrel, shaft);
    g.traverse((o) => (o.castShadow = true));
    return g;
  }

  protected onResize(aspect: number) {
    const cam = this.stage.camera;
    const tan = Math.tan((cam.fov * Math.PI) / 360);
    const want = RINGS.board * 1.45;
    const dist = want / (tan * Math.min(1, aspect));
    cam.position.set(0, BOARD_Y - 0.06, FACE_Z + dist);
    cam.lookAt(0, BOARD_Y + 0.02, 0);
    HAND.set(0.1 * Math.min(1, aspect), BOARD_Y - 0.28 * dist * tan, FACE_Z + dist * 0.55);
  }

  protected startGame() {
    for (const d of this.stuck) disposeObject(d.mesh);
    this.stuck = [];
    if (this.flying) disposeObject(this.flying.mesh);
    this.flying = null;
    this.rounds = parseInt(this.setup.variant, 10) || 5;
    this.round = 0;
    this.dartInTurn = 0;
    this.turnPoints = [];
    this.busy = false;
    this.aiming = false;
    this.emitHud({ message: this.turnText(), detail: undefined, say: this.isRobotTurn ? undefined : "Aim at the board and let go!" });
    this.prepareTurn();
  }

  private turnText() {
    const who = this.isRobotTurn ? "Robo is throwing 🤖" : this.players.length > 1 ? `${this.players[this.turn].icon} ${this.players[this.turn].name}` : "Aim and let go! 🎯";
    return `${who} · Round ${this.round + 1}/${this.rounds} · Dart ${this.dartInTurn + 1}/3`;
  }

  private prepareTurn() {
    this.setHeld();
    this.aim.set(0, 0);
    if (this.isRobotTurn) this.after(0.7, () => this.robotAim());
  }

  private setHeld() {
    disposeObject(this.held);
    this.held = this.makeDart(PLAYER_FLIGHTS[this.turn % 2]);
    this.held.position.copy(HAND);
    this.held.visible = !this.over;
    this.stage.scene.add(this.held);
  }

  private sway() {
    const a = SWAY[this.setup.level];
    const t = this.time;
    return new THREE.Vector2(Math.sin(t * 2.1) * a + Math.sin(t * 5.3) * a * 0.35, Math.cos(t * 1.7) * a + Math.sin(t * 4.1) * a * 0.3);
  }

  private setAim(e: PointerEvent) {
    const p = this.rayPlane(e, this.plane, e.pointerType === "mouse" ? 0 : 70);
    if (!p) return;
    this.aim.set(Math.max(-0.3, Math.min(0.3, p.x)), Math.max(-0.3, Math.min(0.3, p.y - BOARD_Y)));
  }

  protected onDown(e: PointerEvent) {
    if (this.busy || this.over || this.isRobotTurn) return;
    this.aiming = true;
    this.setAim(e);
  }

  protected onMove(e: PointerEvent) {
    if (this.aiming) this.setAim(e);
  }

  protected onUp() {
    if (!this.aiming) return;
    this.aiming = false;
    const s = this.sway();
    this.throwAt(this.aim.x + s.x, this.aim.y + s.y);
  }

  private throwAt(x: number, y: number) {
    this.busy = true;
    this.held.visible = false;
    const mesh = this.makeDart(PLAYER_FLIGHTS[this.turn % 2]);
    this.stage.scene.add(mesh);
    this.flying = { mesh, from: HAND.clone(), to: new THREE.Vector3(x, BOARD_Y + y, FACE_Z + 0.012), t: 0, hit: { x, y } };
    this.sound("throw", 0.7);
  }

  private robotAim() {
    if (!this.isRobotTurn || this.over) return;
    this.robotTarget = robotDart(this.setup.level);
    this.robotFrom.set(this.aim.x, this.aim.y);
    this.robotT = 0;
  }

  private landed(f: Flying) {
    const sc = dartScore(f.hit.x, f.hit.y);
    this.stuck.push({ mesh: f.mesh, wob: 1 });
    this.sound("thud", 0.8);
    if (sc.points) this.sound("score", sc.points / 60);
    this.players[this.turn].score += sc.points;
    this.turnPoints.push(sc.points);
    this.label(sc.points ? `${sc.label === String(sc.points) ? "" : sc.label + " "}${sc.points}` : "Miss", f.to);
    if (sc.points >= 50 || sc.multiplier === 3) this.celebrate(f.to.clone().setZ(0.2), 2.5);
    this.dartInTurn++;
    const sum = sumLine(this.turnPoints);
    if (this.dartInTurn < 3) {
      this.busy = false;
      this.emitHud({ message: this.turnText(), detail: sum || `${sc.points} points`, say: sc.points ? String(sc.points) : undefined });
      this.setHeld();
      if (this.isRobotTurn) this.after(0.6, () => this.robotAim());
      return;
    }
    const total = this.turnPoints.reduce((a, b) => a + b, 0);
    this.emitHud({ message: `${this.players[this.turn].icon} scored ${total}!`, detail: sum, say: `${total}!` });
    this.after(1.8, () => this.nextTurn());
  }

  private nextTurn() {
    for (const d of this.stuck) disposeObject(d.mesh);
    this.stuck = [];
    this.dartInTurn = 0;
    this.turnPoints = [];
    this.turn++;
    if (this.turn >= this.players.length) {
      this.turn = 0;
      this.round++;
    }
    if (this.round >= this.rounds) {
      this.over = true;
      this.held.visible = false;
      this.turn = 0;
      const r = resultFor(this.players, this.setup.opponent);
      this.emitHud({ message: r.text, detail: undefined, say: r.text });
      this.celebrate(new THREE.Vector3(0, BOARD_Y, 0.3), 3);
      this.sound("cheer");
      this.after(1, () => this.opts.onGameOver(r));
      return;
    }
    this.busy = false;
    this.emitHud({ message: this.turnText(), detail: undefined, say: this.isRobotTurn ? undefined : this.players.length > 1 ? `${this.players[this.turn].name}, your turn` : undefined });
    this.prepareTurn();
  }

  private label(text: string, at: THREE.Vector3) {
    const s = textSprite(text, "#ffe066");
    s.scale.set(0.24, 0.075, 1);
    s.position.set(at.x, at.y + 0.05, 0.15);
    this.stage.scene.add(s);
    this.labels.push({ s, t: 0 });
  }

  protected update(dt: number) {
    // Reticle: follows the finger with a little hand wobble.
    const showRet = this.aiming || (this.isRobotTurn && this.robotTarget !== null);
    this.reticle.visible = showRet;
    if (this.robotTarget) {
      this.robotT += dt;
      const k = Math.min(1, this.robotT / 0.7);
      const e = k * k * (3 - 2 * k);
      this.aim.set(this.robotFrom.x + (this.robotTarget.x - this.robotFrom.x) * e, this.robotFrom.y + (this.robotTarget.y - this.robotFrom.y) * e);
      if (this.robotT > 1.0) {
        const t = this.robotTarget;
        this.robotTarget = null;
        this.throwAt(t.x, t.y);
      }
    }
    if (showRet) {
      const s = this.isRobotTurn ? new THREE.Vector2() : this.sway();
      this.reticle.position.set(this.aim.x + s.x, BOARD_Y + this.aim.y + s.y, FACE_Z + 0.03);
    }
    // Held dart points at the aim.
    if (this.held.visible) {
      const bob = this.reduced ? 0 : Math.sin(this.time * 2) * 0.004;
      this.held.position.set(HAND.x, HAND.y + bob, HAND.z);
      this.held.lookAt(new THREE.Vector3(HAND.x, HAND.y, HAND.z).multiplyScalar(2).sub(new THREE.Vector3(this.aim.x, BOARD_Y + this.aim.y, FACE_Z)));
    }
    if (this.flying) {
      const f = this.flying;
      f.t = Math.min(1, f.t + dt / FLIGHT_T);
      const p = new THREE.Vector3().lerpVectors(f.from, f.to, f.t);
      p.y += Math.sin(Math.PI * f.t) * 0.06;
      const ahead = new THREE.Vector3().lerpVectors(f.from, f.to, Math.min(1, f.t + 0.05));
      ahead.y += Math.sin(Math.PI * Math.min(1, f.t + 0.05)) * 0.06;
      f.mesh.position.copy(p);
      if (f.t < 1) f.mesh.lookAt(p.clone().multiplyScalar(2).sub(ahead));
      if (f.t >= 1) {
        this.flying = null;
        f.mesh.position.copy(f.to);
        this.landed(f);
      }
    }
    for (const d of this.stuck) {
      if (d.wob <= 0) continue;
      d.wob = Math.max(0, d.wob - dt * 3);
      const w = this.reduced ? 0 : Math.sin(d.wob * 40) * d.wob * 0.06;
      d.mesh.rotation.x += w * dt * 10;
    }
    for (const l of this.labels) {
      l.t += dt;
      l.s.position.y += dt * 0.04;
      (l.s.material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - Math.max(0, l.t - 0.9) / 0.6);
    }
    this.labels = this.labels.filter((l) => {
      if (l.t < 1.5) return true;
      disposeObject(l.s);
      return false;
    });
  }
}
