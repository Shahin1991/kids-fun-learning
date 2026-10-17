import * as THREE from "three";
import { aimOff, ARCHERY_SWAY, arrowLanding, arrowScore, DISTANCE, FACE_R, GUST, nextGust, RING_COLOURS, RING_W, robotArrow, rollWind, windDrift } from "./archery";
import { sumLine } from "./darts";
import { disposeObject, SportScene, textSprite } from "./SportScene";
import { gaussian, resultFor, type SportOptions } from "./types";

const TARGET_Y = 1.3;
const EYE = new THREE.Vector3(0, 1.5, 0);
const FLIGHT_T = 0.55; // a little slower than real so kids can follow it
const FULL_DRAW = 0.7; // seconds to reach a full draw
const PLAYER_FLETCH = [0x4d96ff, 0xff6b6b];

function faceTexture() {
  const S = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  const k = S / 2 / FACE_R;
  for (let i = 0; i < 10; i++) {
    const r = FACE_R - i * RING_W;
    g.beginPath();
    g.arc(S / 2, S / 2, r * k, 0, Math.PI * 2);
    g.fillStyle = `#${RING_COLOURS[i].toString(16).padStart(6, "0")}`;
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = i === 2 || i === 3 ? "#ffffff" : "#222222";
    g.stroke();
  }
  g.beginPath();
  g.arc(S / 2, S / 2, (RING_W / 2) * k, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = "#222";
  g.fillRect(S / 2 - 6, S / 2 - 1, 12, 2);
  g.fillRect(S / 2 - 1, S / 2 - 6, 2, 12);
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

/**
 * Archery: press and hold to draw the bow (the string comes back), move to aim the sight, let go
 * to shoot. A full draw flies flat to the sight; letting go early drops low. There is always some
 * wind (a breeze on Easy, strong on Hard). It is set for each end, shifts a little for every arrow,
 * and gusts while the arrow flies, so the same aim never lands in quite the same place; arrows
 * also leave the bow with a small random error. The flag and a big arrow under the target show
 * the wind; on Easy and Medium a green ring shows where to aim off so the wind carries the arrow
 * into the gold, with a little arrow by the sight pointing to it.
 */
export class ArcheryEngine extends SportScene {
  private plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), DISTANCE);
  private flagY: Float32Array = new Float32Array();
  private sight: THREE.Mesh;
  private aim = new THREE.Vector2();
  private drawing = false;
  private draw = 0;
  private holdT = 0;
  private busy = false;
  private flying: Flying | null = null;
  private stuck: THREE.Group[] = [];
  private labels: { s: THREE.Sprite; t: number }[] = [];
  private wind = 0;
  private endWind = 0;
  private lastDrift = 0;
  private windArrow: THREE.Mesh;
  private aimRing: THREE.Mesh;
  private pointer: THREE.Mesh;
  private end = 0;
  private ends = 3;
  private arrowInTurn = 0;
  private turnPoints: number[] = [];
  private flag: THREE.Mesh;
  private zoom = 0;
  private zoomHold = 0;
  private baseFov = 12;
  private bow: { group: THREE.Group; string: THREE.Line; arrow: THREE.Group; top: THREE.Vector3; bottom: THREE.Vector3 };
  private robotTarget: { x: number; y: number } | null = null;
  private robotT = 0;
  private robotFrom = new THREE.Vector2();

  constructor(container: HTMLElement, opts: SportOptions) {
    super(container, opts, 0x9fd8ff, 12);
    this.stage.scene.fog = new THREE.Fog(0x9fd8ff, 30, 90);
    this.buildRange();
    this.flag = this.buildFlag();
    this.sight = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.075, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true, opacity: 0.95 }));
    const pin = new THREE.Mesh(new THREE.CircleGeometry(0.015, 16), new THREE.MeshBasicMaterial({ color: 0x00e676, depthTest: false }));
    this.sight.add(pin);
    this.sight.renderOrder = 6;
    pin.renderOrder = 7;
    this.sight.visible = false;
    this.stage.scene.add(this.sight);
    // Wind arrow under the target (clear of the HUD): points downwind, longer and redder when stronger.
    const wa = new THREE.Shape([new THREE.Vector2(0, -0.05), new THREE.Vector2(0.7, -0.05), new THREE.Vector2(0.7, -0.12), new THREE.Vector2(1, 0), new THREE.Vector2(0.7, 0.12), new THREE.Vector2(0.7, 0.05), new THREE.Vector2(0, 0.05)]);
    const waGeo = new THREE.ShapeGeometry(wa);
    waGeo.translate(-0.5, 0, 0);
    this.windArrow = new THREE.Mesh(waGeo, new THREE.MeshBasicMaterial({ color: 0x6bcb77, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
    this.windArrow.position.set(0, TARGET_Y - FACE_R - 0.2, -DISTANCE + 0.1);
    this.stage.scene.add(this.windArrow);
    // Aim-off help: where to put the sight so the wind blows the arrow into the gold.
    this.aimRing = new THREE.Mesh(new THREE.RingGeometry(0.075, 0.1, 40), new THREE.MeshBasicMaterial({ color: 0x6bcb77, depthTest: false, transparent: true, opacity: 0.8 }));
    this.aimRing.renderOrder = 5;
    this.aimRing.visible = false;
    this.stage.scene.add(this.aimRing);
    this.pointer = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0.035), new THREE.Vector2(0.07, 0), new THREE.Vector2(0, -0.035)])), new THREE.MeshBasicMaterial({ color: 0x6bcb77, depthTest: false, transparent: true, opacity: 0.95 }));
    this.pointer.renderOrder = 7;
    this.pointer.visible = false;
    this.stage.scene.add(this.pointer);
    this.bow = this.buildBow();
    this.start();
  }

  private buildRange() {
    const s = this.stage.scene;
    s.add(new THREE.HemisphereLight(0xe8f6ff, 0x5b8c3a, 1.6));
    const sun = new THREE.DirectionalLight(0xfff4dd, 2.4);
    sun.position.set(-6, 12, -4);
    sun.target.position.set(0, 0, -DISTANCE);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.02;
    Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 40 });
    s.add(sun, sun.target);
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x74c365, roughness: 1 }));
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    s.add(grass);
    // Mown lane.
    const lane = new THREE.Mesh(new THREE.PlaneGeometry(3, DISTANCE + 2), new THREE.MeshStandardMaterial({ color: 0x86d175, roughness: 1 }));
    lane.rotation.x = -Math.PI / 2;
    lane.position.set(0, 0.005, -DISTANCE / 2);
    lane.receiveShadow = true;
    s.add(lane);
    // Target: straw boss on an easel.
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.8 });
    for (const sx of [-0.55, 0.55]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.1, 0.06), wood);
      leg.position.set(sx, 1.0, -DISTANCE - 0.25);
      leg.rotation.x = -0.18;
      leg.castShadow = true;
      s.add(leg);
    }
    const boss = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.3, 48), new THREE.MeshStandardMaterial({ color: 0xd9b86a, roughness: 1 }));
    boss.rotation.x = Math.PI / 2;
    boss.position.set(0, TARGET_Y, -DISTANCE - 0.15);
    boss.castShadow = true;
    s.add(boss);
    const face = new THREE.Mesh(new THREE.CircleGeometry(FACE_R, 96), new THREE.MeshStandardMaterial({ map: faceTexture(), roughness: 0.9 }));
    face.position.set(0, TARGET_Y, -DISTANCE + 0.02);
    s.add(face);
    // Trees and hills for depth.
    const leaf = new THREE.MeshStandardMaterial({ color: 0x3f9b4a, roughness: 0.9 });
    const trunk = new THREE.MeshStandardMaterial({ color: 0x6b4423 });
    for (let i = 0; i < 18; i++) {
      const x = (i % 2 ? 1 : -1) * (4 + ((i * 37) % 9));
      const z = -DISTANCE - 6 - ((i * 53) % 22);
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.4, 8), trunk);
      t.position.set(x, 0.7, z);
      const c = new THREE.Mesh(new THREE.ConeGeometry(1.1, 3, 10), leaf);
      c.position.set(x, 2.6, z);
      c.castShadow = true;
      s.add(t, c);
    }
    for (const [x, r] of [[-25, 14], [18, 18], [0, 22]]) {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 12), new THREE.MeshStandardMaterial({ color: 0x5fae58, roughness: 1 }));
      hill.position.set(x, -r * 0.6, -70);
      s.add(hill);
    }
  }

  private buildFlag() {
    // Beside the target so it stays inside the narrow aiming lens.
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.4, 8), new THREE.MeshStandardMaterial({ color: 0xeeeeee }));
    pole.position.set(0.85, 1.2, -DISTANCE + 0.6);
    this.stage.scene.add(pole);
    const geo = new THREE.PlaneGeometry(0.36, 0.22, 12, 4);
    geo.translate(0.18, 0, 0);
    const flag = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xff6b6b, side: THREE.DoubleSide }));
    flag.position.set(0.85, 2.25, -DISTANCE + 0.6);
    this.stage.scene.add(flag);
    this.flagY = Float32Array.from({ length: geo.attributes.position.count }, (_, i) => geo.attributes.position.getY(i));
    return flag;
  }

  private makeArrow(fletch: number, length = 0.75) {
    const g = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, length, 8), new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.4 }));
    shaft.rotation.x = Math.PI / 2;
    shaft.position.z = length / 2;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.03, 8), new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.8, roughness: 0.3 }));
    tip.rotation.x = -Math.PI / 2;
    tip.position.z = -0.01;
    const fm = new THREE.MeshStandardMaterial({ color: fletch, side: THREE.DoubleSide });
    for (let i = 0; i < 3; i++) {
      const vane = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.08), fm);
      vane.position.set(0, 0, length - 0.06);
      vane.rotation.set(0, Math.PI / 2, 0);
      const holder = new THREE.Group();
      holder.add(vane);
      vane.position.y = 0.016;
      holder.rotation.z = (i * Math.PI * 2) / 3;
      g.add(holder);
    }
    g.add(shaft, tip);
    g.traverse((o) => (o.castShadow = true));
    return g;
  }

  /** First-person bow in its own overlay scene so it is not squashed by the narrow aiming lens. */
  private buildBow() {
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x666666, 2));
    const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 10);
    this.overlay = { scene, camera };
    const group = new THREE.Group();
    const top = new THREE.Vector3(0, 0.36, 0);
    const bottom = new THREE.Vector3(0, -0.36, 0);
    const curve = new THREE.QuadraticBezierCurve3(bottom, new THREE.Vector3(0, 0, -0.16), top);
    const limb = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.012, 8), new THREE.MeshStandardMaterial({ color: 0x8b4a1c, roughness: 0.5 }));
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 12), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    grip.position.set(0, 0, -0.08);
    const string = new THREE.Line(new THREE.BufferGeometry().setFromPoints([top, new THREE.Vector3(), bottom]), new THREE.LineBasicMaterial({ color: 0xf5f5f5 }));
    const arrow = this.makeArrow(PLAYER_FLETCH[0], 0.6);
    group.add(limb, grip, string, arrow);
    group.position.set(0.25, -0.25, -0.95);
    group.rotation.set(0.12, 0.55, -0.12);
    group.scale.setScalar(0.7);
    scene.add(group);
    this.stage.onDispose(() => disposeObject(group));
    return { group, string, arrow, top, bottom };
  }

  protected onResize(aspect: number) {
    const cam = this.stage.camera;
    // Fit the whole target (plus a margin) in the narrower screen direction.
    const half = FACE_R * 2.3;
    this.baseFov = (2 * Math.atan(half / (DISTANCE * Math.min(1, aspect))) * 180) / Math.PI;
    cam.fov = this.baseFov;
    cam.position.copy(EYE);
    cam.lookAt(0, TARGET_Y + 0.15, -DISTANCE);
    cam.updateProjectionMatrix();
    if (this.overlay) {
      this.overlay.camera.aspect = aspect;
      this.overlay.camera.updateProjectionMatrix();
      this.bow.group.position.x = 0.25 * Math.min(1, aspect);
    }
  }

  protected startGame() {
    for (const a of this.stuck) disposeObject(a);
    this.stuck = [];
    if (this.flying) disposeObject(this.flying.mesh);
    this.flying = null;
    this.ends = parseInt(this.setup.variant, 10) || 3;
    this.end = 0;
    this.arrowInTurn = 0;
    this.turnPoints = [];
    this.busy = false;
    this.drawing = false;
    this.draw = 0;
    this.newWind();
    this.emitHud({ message: this.turnText(), detail: this.windText(), say: this.isRobotTurn ? undefined : "Hold to pull the bow, then let go!" });
    this.prepareTurn();
  }

  private newWind() {
    this.endWind = rollWind(this.setup.level);
    this.wind = this.endWind;
  }

  /** The wind shifts a little before every arrow. */
  private shiftWind() {
    this.wind = nextGust(this.endWind, this.setup.level);
  }

  private get helps() {
    return this.setup.level !== "hard";
  }

  private windText() {
    if (Math.abs(this.wind) < 0.05) return "No wind 🍃";
    const dir = this.wind > 0 ? "→" : "←";
    const tip = this.helps ? ` · aim ${this.wind > 0 ? "left" : "right"} a little` : "";
    return `Wind ${dir} ${Math.abs(this.wind).toFixed(1)} m/s 🌬️${tip}`;
  }

  private turnText() {
    const who = this.isRobotTurn ? "Robo is shooting 🤖" : this.players.length > 1 ? `${this.players[this.turn].icon} ${this.players[this.turn].name}` : "Hold, aim, let go! 🏹";
    return `${who} · End ${this.end + 1}/${this.ends} · Arrow ${this.arrowInTurn + 1}/3`;
  }

  private prepareTurn() {
    this.aim.set(0, 0);
    this.draw = 0;
    this.setBowArrow();
    if (this.isRobotTurn) this.after(0.8, () => this.robotAim());
  }

  private setBowArrow() {
    const old = this.bow.arrow;
    const arrow = this.makeArrow(PLAYER_FLETCH[this.turn % 2], 0.6);
    this.bow.group.add(arrow);
    this.bow.arrow = arrow;
    disposeObject(old);
    arrow.visible = !this.over;
  }

  private sway() {
    const fatigue = Math.max(0, this.holdT - 3) * 0.6;
    const a = ARCHERY_SWAY[this.setup.level] * (1 + fatigue);
    const t = this.time;
    return new THREE.Vector2(Math.sin(t * 1.9) * a + Math.sin(t * 4.7) * a * 0.3, Math.cos(t * 1.4) * a + Math.sin(t * 3.9) * a * 0.3);
  }

  private setAim(e: PointerEvent) {
    const p = this.rayPlane(e, this.plane, e.pointerType === "mouse" ? 0 : 70);
    if (!p) return;
    this.aim.set(Math.max(-1.4, Math.min(1.4, p.x)), Math.max(-1.2, Math.min(1.4, p.y - TARGET_Y)));
  }

  protected onDown(e: PointerEvent) {
    if (this.busy || this.over || this.isRobotTurn) return;
    this.drawing = true;
    this.holdT = 0;
    this.draw = 0;
    this.setAim(e);
  }

  protected onMove(e: PointerEvent) {
    if (this.drawing) this.setAim(e);
  }

  protected onUp() {
    if (!this.drawing) return;
    this.drawing = false;
    if (this.draw < 0.15) {
      this.draw = 0;
      return;
    }
    const s = this.sway();
    const at = arrowLanding({ x: this.aim.x + s.x, y: this.aim.y + s.y }, this.draw, this.wind, this.setup.level);
    this.lastDrift = at.drift;
    this.shoot(at.x, at.y);
  }

  private shoot(x: number, y: number) {
    this.busy = true;
    this.bow.arrow.visible = false;
    const mesh = this.makeArrow(PLAYER_FLETCH[this.turn % 2]);
    this.stage.scene.add(mesh);
    const from = new THREE.Vector3(EYE.x + 0.1, EYE.y - 0.15, EYE.z - 0.5);
    this.flying = { mesh, from, to: new THREE.Vector3(x, TARGET_Y + y, -DISTANCE + 0.05), t: 0, hit: { x, y } };
    this.sound("throw", 0.8);
  }

  private robotAim() {
    if (!this.isRobotTurn || this.over) return;
    const hit = robotArrow(this.setup.level, this.wind);
    // The sight sits upwind of where the arrow will land.
    this.robotTarget = { x: hit.x - windDrift(this.wind), y: hit.y };
    this.robotFrom.set(this.aim.x, this.aim.y);
    this.robotT = 0;
  }

  private landed(f: Flying) {
    const sc = arrowScore(f.hit.x, f.hit.y);
    const onTarget = Math.hypot(f.hit.x, f.hit.y) < 0.68;
    if (onTarget) this.stuck.push(f.mesh);
    else disposeObject(f.mesh);
    this.sound("thud", onTarget ? 0.8 : 0.3);
    if (sc.points) this.sound("score", sc.points / 10);
    this.players[this.turn].score += sc.points;
    this.turnPoints.push(sc.points);
    this.label(sc.label, f.to);
    if (sc.points >= 9) this.celebrate(f.to.clone().setZ(-DISTANCE + 0.5), 2);
    this.zoom = 1;
    this.zoomHold = 1.2;
    this.arrowInTurn++;
    const sum = sumLine(this.turnPoints);
    if (this.arrowInTurn < 3) {
      this.after(1.5, () => {
        this.busy = false;
        this.shiftWind();
        this.emitHud({ message: this.turnText(), detail: `${sum || `${sc.points} points`} · ${this.windText()}` });
        this.setBowArrow();
        if (this.isRobotTurn) this.after(0.5, () => this.robotAim());
      });
      const pushed = !this.isRobotTurn && Math.abs(this.lastDrift) > 0.04 ? `💨 The wind pushed it ${this.lastDrift > 0 ? "right →" : "← left"}` : undefined;
      this.emitHud({ say: sc.points ? String(sc.points) : "Missed", ...(pushed ? { detail: pushed } : {}) });
      return;
    }
    const total = this.turnPoints.reduce((a, b) => a + b, 0);
    this.emitHud({ message: `${this.players[this.turn].icon} scored ${total}!`, detail: sum, say: `${total}!` });
    this.after(2.2, () => this.nextTurn());
  }

  private nextTurn() {
    for (const a of this.stuck) disposeObject(a);
    this.stuck = [];
    this.arrowInTurn = 0;
    this.turnPoints = [];
    this.turn++;
    if (this.turn >= this.players.length) {
      this.turn = 0;
      this.end++;
      this.newWind();
    } else this.shiftWind();
    if (this.end >= this.ends) {
      this.over = true;
      this.turn = 0;
      this.bow.arrow.visible = false;
      const r = resultFor(this.players, this.setup.opponent);
      this.emitHud({ message: r.text, detail: undefined, say: r.text });
      this.celebrate(new THREE.Vector3(0, TARGET_Y, -DISTANCE + 1), 4);
      this.sound("cheer");
      this.after(1, () => this.opts.onGameOver(r));
      return;
    }
    this.busy = false;
    this.emitHud({ message: this.turnText(), detail: this.windText(), say: this.isRobotTurn ? undefined : this.players.length > 1 ? `${this.players[this.turn].name}, your turn` : undefined });
    this.prepareTurn();
  }

  private label(text: string, at: THREE.Vector3) {
    const s = textSprite(text, "#ffe066");
    s.scale.set(0.9, 0.28, 1);
    s.position.set(at.x, at.y + 0.25, -DISTANCE + 0.4);
    this.stage.scene.add(s);
    this.labels.push({ s, t: 0 });
  }

  protected update(dt: number) {
    if (this.drawing) {
      this.holdT += dt;
      this.draw = Math.min(1, this.holdT / FULL_DRAW);
    } else if (!this.robotTarget && !this.flying) this.draw = Math.max(0, this.draw - dt * 4);

    if (this.robotTarget) {
      this.robotT += dt;
      const k = Math.min(1, this.robotT / 0.9);
      const e = k * k * (3 - 2 * k);
      this.aim.set(this.robotFrom.x + (this.robotTarget.x - this.robotFrom.x) * e, this.robotFrom.y + (this.robotTarget.y - this.robotFrom.y) * e);
      this.draw = Math.min(1, this.robotT / FULL_DRAW);
      if (this.robotT > 1.3) {
        const t = this.robotTarget;
        this.robotTarget = null;
        // Robo feels the gusts too.
        this.shoot(t.x + windDrift(this.wind + Math.max(-2, Math.min(2, gaussian())) * GUST[this.setup.level]), t.y);
      }
    }

    const showSight = this.drawing || this.robotTarget !== null;
    this.sight.visible = showSight;
    if (showSight) {
      const s = this.drawing ? this.sway() : new THREE.Vector2();
      this.sight.position.set(this.aim.x + s.x, TARGET_Y + this.aim.y + s.y, -DISTANCE + 0.2);
      const m = this.sight.material as THREE.MeshBasicMaterial;
      m.color.setHSL(0.33 * this.draw, 0.9, 0.6);
    }

    // Bow string and nocked arrow follow the draw.
    const pull = this.draw * 0.22;
    const nock = new THREE.Vector3(0, 0, pull);
    this.bow.string.geometry.setFromPoints([this.bow.top, nock, this.bow.bottom]);
    this.bow.arrow.position.set(0, 0, pull - 0.6 + 0.02);
    const idle = this.reduced ? 0 : 1;
    this.bow.group.rotation.z = -0.12 + Math.sin(this.time * 1.3) * 0.01 * idle;

    if (this.flying) {
      const f = this.flying;
      f.t = Math.min(1, f.t + dt / FLIGHT_T);
      const arc = 0.35;
      const at = (t: number) => {
        const p = new THREE.Vector3().lerpVectors(f.from, f.to, t);
        p.y += Math.sin(Math.PI * t) * arc;
        return p;
      };
      const p = at(f.t);
      f.mesh.position.copy(p);
      if (f.t < 1) f.mesh.lookAt(p.clone().multiplyScalar(2).sub(at(Math.min(1, f.t + 0.03))));
      if (f.t >= 1) {
        this.flying = null;
        f.mesh.position.copy(f.to);
        this.landed(f);
      }
    }

    // After each arrow the lens zooms onto the target for a moment.
    const cam = this.stage.camera;
    if (this.zoomHold > 0) this.zoomHold -= dt;
    else this.zoom = Math.max(0, this.zoom - dt * 2);
    const zfov = this.baseFov * (1 - 0.55 * (this.reduced ? Math.min(1, this.zoom) : this.zoom));
    if (Math.abs(cam.fov - zfov) > 0.01) {
      cam.fov = zfov;
      cam.updateProjectionMatrix();
    }
    if (this.overlay) this.bow.group.visible = this.zoom < 0.2;

    // Wind arrow: direction, size and colour by strength, with a little flutter.
    const ws = Math.min(1, Math.abs(this.wind) / 4);
    this.windArrow.visible = Math.abs(this.wind) >= 0.05;
    this.windArrow.rotation.z = this.wind >= 0 ? 0 : Math.PI;
    const flutter = this.reduced ? 1 : 1 + Math.sin(this.time * (5 + ws * 8)) * 0.05;
    this.windArrow.scale.set((0.25 + ws * 0.55) * flutter, 0.9 + ws * 0.4, 1);
    (this.windArrow.material as THREE.MeshBasicMaterial).color.setHSL(0.33 - ws * 0.33, 0.85, 0.55);

    // Aim-off ring and pointer (Easy/Medium, while it is a person's go).
    const mine = !this.isRobotTurn && !this.over && !this.flying && this.zoom < 0.2;
    const off = aimOff(this.wind);
    this.aimRing.visible = this.helps && mine;
    if (this.aimRing.visible) {
      this.aimRing.position.set(off.x, TARGET_Y + off.y, -DISTANCE + 0.15);
      const inside = this.drawing && Math.hypot(this.aim.x - off.x, this.aim.y - off.y) < 0.09;
      const pulse = this.reduced ? 1 : 1 + Math.sin(this.time * 5) * 0.1;
      this.aimRing.scale.setScalar(inside ? 1.15 : pulse);
      (this.aimRing.material as THREE.MeshBasicMaterial).opacity = inside ? 1 : 0.7;
    }
    const dx = off.x - this.aim.x;
    const dy = off.y - this.aim.y;
    this.pointer.visible = this.helps && this.drawing && Math.hypot(dx, dy) > 0.2;
    if (this.pointer.visible) {
      const a = Math.atan2(dy, dx);
      this.pointer.position.set(this.sight.position.x + Math.cos(a) * 0.14, this.sight.position.y + Math.sin(a) * 0.14, -DISTANCE + 0.21);
      this.pointer.rotation.z = a;
    }

    // Flag streams with the wind.
    const pos = this.flag.geometry.attributes.position as THREE.BufferAttribute;
    const strength = Math.min(1, Math.abs(this.wind) / 4);
    this.flag.rotation.y = this.wind >= 0 ? 0 : Math.PI;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const wave = Math.sin(x * 12 - this.time * (4 + strength * 6)) * 0.03 * (x / 0.36) * (idle || 0.2);
      pos.setZ(i, wave);
      pos.setY(i, this.flagY[i] - (1 - strength) * x * 0.9);
    }
    pos.needsUpdate = true;

    for (const l of this.labels) {
      l.t += dt;
      (l.s.material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - Math.max(0, l.t - 1) / 0.5);
    }
    this.labels = this.labels.filter((l) => {
      if (l.t < 1.5) return true;
      disposeObject(l.s);
      return false;
    });
  }
}
