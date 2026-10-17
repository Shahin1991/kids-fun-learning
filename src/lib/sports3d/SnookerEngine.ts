import * as THREE from "three";
import { BotPlanner, candidateShots } from "./cue-bot";
import { firstContact, type Disc, type SimEvents } from "./physics2d";
import {
  BALL_R,
  ballsOn,
  BAULK_Y,
  COLOURS,
  D_R,
  HALF_L,
  HALF_W,
  MAX_SHOT,
  newSnooker,
  redRack,
  SNOOKER_TABLE,
  snookerOutcome,
  SPOTS,
  targetLabel,
  VALUES,
  type BallKind,
  type Colour,
  type SnookerState,
} from "./snooker";
import { TableEngine } from "./TableEngine";
import { resultFor, type SportOptions } from "./types";

const CUE_ID = 0;
const BALL_COLOURS: Record<BallKind, string> = {
  cue: "#fbfaf4",
  red: "#c8102e",
  yellow: "#f7d117",
  green: "#13834a",
  brown: "#7a4a24",
  blue: "#1f5fd1",
  pink: "#f47fb0",
  black: "#151515",
};

function ballTexture(kind: BallKind) {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = BALL_COLOURS[kind];
  g.fillRect(0, 0, 128, 64);
  // Two small spots so you can see the balls roll.
  g.fillStyle = kind === "cue" ? "#d6283a" : "rgba(255,255,255,0.55)";
  for (const x of [32, 96]) {
    g.beginPath();
    g.arc(x, 32, 5, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function clothTexture() {
  const W = 512;
  const H = Math.round((W * HALF_L) / HALF_W);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = "#1f8a4c";
  g.fillRect(0, 0, W, H);
  // Subtle nap.
  for (let i = 0; i < 2500; i++) {
    g.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.03)";
    g.fillRect(Math.random() * W, Math.random() * H, 2, 2);
  }
  const u = W / (HALF_W * 2);
  const px = (x: number) => W / 2 + x * u;
  const py = (y: number) => H / 2 - y * u;
  g.strokeStyle = "rgba(255,255,255,0.7)";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, py(BAULK_Y));
  g.lineTo(W, py(BAULK_Y));
  g.stroke();
  g.beginPath();
  g.arc(px(0), py(BAULK_Y), D_R * u, 0, Math.PI);
  g.stroke();
  g.fillStyle = "rgba(255,255,255,0.75)";
  for (const s of Object.values(SPOTS)) {
    g.beginPath();
    g.arc(px(s.x), py(s.y), 2.5, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Snooker: pot a red, then a colour, and keep the break going. */
export class SnookerEngine extends TableEngine {
  private kinds = new Map<number, BallKind>();
  private state: SnookerState = newSnooker(1, 6);
  private geo = new THREE.SphereGeometry(BALL_R, 32, 20);
  private mats = new Map<BallKind, THREE.MeshStandardMaterial>();
  private cueStick: THREE.Group;
  private onRings: THREE.Mesh[] = [];
  private ringGeo = new THREE.RingGeometry(BALL_R * 1.25, BALL_R * 1.6, 32);
  private ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });

  constructor(container: HTMLElement, opts: SportOptions) {
    super(container, opts, SNOOKER_TABLE, 0x2a2140, 0, MAX_SHOT, 0.5);
    this.stage.onDispose(() => {
      this.geo.dispose();
      this.ringGeo.dispose();
      this.ringMat.dispose();
      this.mats.forEach((m) => {
        m.map?.dispose();
        m.dispose();
      });
    });
    this.buildTable();
    this.cueStick = this.buildCue();
    this.start();
  }

  private buildTable() {
    const s = this.stage.scene;
    s.add(new THREE.HemisphereLight(0xfff6e0, 0x302040, 1.3));
    for (const z of [-0.9, 0.9]) {
      const lamp = new THREE.SpotLight(0xfff1d6, 9, 6, Math.PI / 4, 0.6, 1.2);
      lamp.position.set(0, 2.2, z);
      lamp.target.position.set(0, 0, z);
      lamp.castShadow = true;
      lamp.shadow.mapSize.set(1024, 1024);
      lamp.shadow.bias = -0.0005;
      lamp.shadow.normalBias = 0.005;
      s.add(lamp, lamp.target);
    }
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2, HALF_L * 2), new THREE.MeshStandardMaterial({ map: clothTexture(), roughness: 0.95 }));
    cloth.rotation.x = -Math.PI / 2;
    cloth.receiveShadow = true;
    s.add(cloth);

    const cushionMat = new THREE.MeshStandardMaterial({ color: 0x17733d, roughness: 0.9 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a3018, roughness: 0.45 });
    const C = 0.05;
    const R = 0.12;
    const ch = BALL_R * 1.3;
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      s.add(m);
    };
    add(new THREE.BoxGeometry(HALF_W * 2, ch, C), cushionMat, 0, ch / 2, -(HALF_L + C / 2));
    add(new THREE.BoxGeometry(HALF_W * 2, ch, C), cushionMat, 0, ch / 2, HALF_L + C / 2);
    add(new THREE.BoxGeometry(C, ch, HALF_L * 2), cushionMat, -(HALF_W + C / 2), ch / 2, 0);
    add(new THREE.BoxGeometry(C, ch, HALF_L * 2), cushionMat, HALF_W + C / 2, ch / 2, 0);
    const OW = HALF_W + C;
    const OL = HALF_L + C;
    add(new THREE.BoxGeometry(OW * 2 + R * 2, ch * 1.4, R), woodMat, 0, (ch * 1.4) / 2, -(OL + R / 2));
    add(new THREE.BoxGeometry(OW * 2 + R * 2, ch * 1.4, R), woodMat, 0, (ch * 1.4) / 2, OL + R / 2);
    add(new THREE.BoxGeometry(R, ch * 1.4, OL * 2), woodMat, -(OW + R / 2), (ch * 1.4) / 2, 0);
    add(new THREE.BoxGeometry(R, ch * 1.4, OL * 2), woodMat, OW + R / 2, (ch * 1.4) / 2, 0);
    const body = new THREE.Mesh(new THREE.BoxGeometry(OW * 2 + R * 2, 0.5, OL * 2 + R * 2), woodMat);
    body.position.y = -0.26;
    s.add(body);
    const pocketMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
    for (const p of SNOOKER_TABLE.pockets) {
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(p.r * 1.05, p.r * 0.9, ch * 1.5, 24), pocketMat);
      hole.position.set(p.x, ch * 0.76, -p.y);
      s.add(hole);
    }
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x3a2d5a, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.8;
    floor.receiveShadow = true;
    s.add(floor);
  }

  private buildCue() {
    const g = new THREE.Group();
    const L = 1.45;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0145, L, 16), new THREE.MeshStandardMaterial({ color: 0xe0b878, roughness: 0.4 }));
    shaft.rotation.z = Math.PI / 2;
    shaft.position.x = -L / 2;
    const butt = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0148, L * 0.35, 16), new THREE.MeshStandardMaterial({ color: 0x2b1408, roughness: 0.4 }));
    butt.rotation.z = Math.PI / 2;
    butt.position.x = -L + (L * 0.35) / 2;
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.0056, 0.0056, 0.012, 12), new THREE.MeshStandardMaterial({ color: 0x3a6fd8 }));
    tip.rotation.z = Math.PI / 2;
    tip.position.x = -0.006;
    g.add(shaft, butt, tip);
    g.traverse((o) => (o.castShadow = true));
    g.visible = false;
    this.stage.scene.add(g);
    return g;
  }

  private material(kind: BallKind) {
    let m = this.mats.get(kind);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ map: ballTexture(kind), roughness: 0.18, metalness: 0.05 });
      this.mats.set(kind, m);
    }
    return m;
  }

  protected cueId() {
    return CUE_ID;
  }

  protected lift() {
    return BALL_R;
  }

  protected clampPlace(x: number, y: number) {
    let px = x;
    let py = Math.min(y, BAULK_Y);
    const d = Math.hypot(px, py - BAULK_Y);
    if (d > D_R) {
      px = (px / d) * D_R;
      py = BAULK_Y + ((py - BAULK_Y) / d) * D_R;
    }
    return this.isFree(px, py, BALL_R, CUE_ID) ? { x: px, y: py } : null;
  }

  protected startGame() {
    for (const m of this.meshes.values()) m.removeFromParent();
    this.meshes.clear();
    this.kinds.clear();
    const reds = Math.max(1, parseInt(this.setup.variant, 10) || 6);
    this.state = newSnooker(this.players.length, reds);
    this.discs = [];
    const add = (kind: BallKind, x: number, y: number) => {
      const id = this.discs.length;
      this.discs.push({ id, x, y, vx: 0, vy: 0, r: BALL_R, m: 1, active: true });
      this.kinds.set(id, kind);
      const mesh = new THREE.Mesh(this.geo, this.material(kind));
      mesh.castShadow = true;
      mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      this.meshes.set(id, mesh);
      this.stage.scene.add(mesh);
    };
    add("cue", -0.12, BAULK_Y - 0.12);
    for (const c of COLOURS) add(c, SPOTS[c].x, SPOTS[c].y);
    for (const r of redRack(reds)) add("red", r.x, r.y);
    this.canPlace = true;
    this.aimAngle = Math.PI / 2;
    this.emitHud({ message: this.turnText(), detail: "Red 1 · then a colour 2-7", say: this.isRobotTurn ? undefined : "Pot a red, then a colour!" });
    this.startTurn();
  }

  private turnText() {
    const who = this.isRobotTurn ? "Robo: " : this.players.length > 1 ? `${this.players[this.turn].icon} ` : "";
    return `${who}${targetLabel(this.state)}`;
  }

  private startTurn() {
    this.showBallsOn();
    this.beginTurn();
  }

  private showBallsOn() {
    this.onRings.forEach((r) => r.removeFromParent());
    this.onRings = [];
    const on = ballsOn(this.state);
    for (const d of this.discs) {
      if (!d.active || !on.includes(this.kinds.get(d.id)!)) continue;
      const ring = new THREE.Mesh(this.ringGeo, this.ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(d.x, 0.002, -d.y);
      this.stage.scene.add(ring);
      this.onRings.push(ring);
    }
  }

  protected onShot() {
    this.onRings.forEach((r) => (r.visible = false));
    this.canPlace = false;
  }

  protected shotFinished(ev: SimEvents) {
    const fc = firstContact(ev, CUE_ID);
    const potted = ev.pots.map((p) => this.kinds.get(p.a)!);
    const out = snookerOutcome(this.state, { firstHit: fc === null ? null : this.kinds.get(fc)!, potted });
    this.state = out.state;
    out.state.scores.forEach((s, i) => (this.players[i].score = s));
    for (const c of out.respot) this.respot(c);
    if (out.cueInHand) {
      const cue = this.cue();
      const spot = [[-0.12, -0.12], [0.12, -0.12], [0, -0.2], [-0.2, -0.05], [0.2, -0.05]].find(([x, y]) => this.isFree(x, BAULK_Y + y, BALL_R, CUE_ID)) ?? [0, -0.2];
      this.restore(cue, spot[0], BAULK_Y + spot[1]);
    }
    this.canPlace = out.cueInHand;
    this.syncMeshes(0);
    if (out.foul) this.sound("foul", 0.5);
    else if (out.points) {
      this.sound("score", out.points / 7);
      if (out.points >= 5) this.celebrate(this.toWorld(this.cue(), 0.3), 4);
    }
    this.turn = this.state.turn;
    if (this.state.over) {
      this.over = true;
      const r = resultFor(this.players, this.setup.opponent);
      this.emitHud({ message: r.text, detail: undefined, say: r.text });
      this.celebrate(this.toWorld({ x: 0, y: 0 }, 0.4), 6);
      this.sound("cheer");
      this.after(1.2, () => this.opts.onGameOver(r));
      return;
    }
    const sayPoints = out.foul ? "Foul!" : out.points ? `${out.points}!` : undefined;
    this.emitHud({ message: out.message, detail: out.keepTurn ? "Keep going!" : undefined, say: sayPoints });
    this.after(1, () => {
      this.emitHud({ message: this.turnText(), detail: this.canPlace ? "Drag the white to move it in the D" : out.keepTurn && this.state.brk ? `Break: ${this.state.brk}` : undefined });
      this.startTurn();
    });
  }

  private respot(c: Colour) {
    const d = this.discs.find((x) => this.kinds.get(x.id) === c)!;
    const order = [c, ...COLOURS.slice().reverse().filter((x) => x !== c)];
    for (const k of order) {
      if (this.isFree(SPOTS[k].x, SPOTS[k].y, BALL_R, d.id)) return this.restore(d, SPOTS[k].x, SPOTS[k].y);
    }
    // Everything covered: walk up the table from its own spot until there is room.
    for (let y = SPOTS[c].y; y < HALF_L - BALL_R; y += BALL_R * 0.5) {
      if (this.isFree(SPOTS[c].x, y, BALL_R, d.id)) return this.restore(d, SPOTS[c].x, y);
    }
    this.restore(d, SPOTS[c].x, SPOTS[c].y);
  }

  protected idle() {
    const show = (this.phase === "aim" && this.power > 0.02) || this.phase === "robot";
    this.cueStick.visible = show;
    if (show) {
      const c = this.cue();
      const back = BALL_R + 0.015 + this.power * 0.28;
      const dx = Math.cos(this.aimAngle);
      const dy = Math.sin(this.aimAngle);
      this.cueStick.position.set(c.x - dx * back, BALL_R + 0.012, -(c.y - dy * back));
      this.cueStick.rotation.set(0, Math.atan2(dy, dx), -0.06);
    }
    if (!this.reduced) {
      const pulse = 0.45 + Math.sin(this.time * 5) * 0.2;
      this.ringMat.opacity = pulse;
    }
  }

  protected robotPlanner(fromCue = false) {
    const cue = this.cue();
    const starts = this.canPlace && !fromCue
      ? [[0, -0.1], [-0.15, -0.08], [0.15, -0.08], [-0.25, -0.04], [0.25, -0.04]].map(([x, y]) => ({ x, y: BAULK_Y + y })).filter((p) => this.isFree(p.x, p.y, BALL_R, CUE_ID))
      : [{ x: cue.x, y: cue.y }];
    if (!starts.length) starts.push({ x: cue.x, y: cue.y });
    const on = ballsOn(this.state);
    const targets = this.discs.filter((d) => d.active && on.includes(this.kinds.get(d.id)!)).map((d) => d.id);
    const cands = candidateShots({ discs: this.discs, table: this.table, cueId: CUE_ID, targets, starts, maxSpeed: MAX_SHOT });
    const state = this.state;
    return new BotPlanner(
      this.discs,
      this.table,
      CUE_ID,
      cands,
      (_final: Disc[], ev) => {
        const fc = firstContact(ev, CUE_ID);
        const o = snookerOutcome(state, { firstHit: fc === null ? null : this.kinds.get(fc)!, potted: ev.pots.map((p) => this.kinds.get(p.a)!) });
        if (o.foul) return -10 - o.points;
        return o.points * 10 + (o.points ? VALUES.red : 0);
      },
      36,
    );
  }
}
