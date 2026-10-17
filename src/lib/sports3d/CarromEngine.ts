import * as THREE from "three";
import { BotPlanner, candidateShots } from "./cue-bot";
import { BASELINE, BASELINE_HALF, BOARD_HALF, CARROM_TABLE, carromLayout, carromOutcome, COIN_POINTS, COIN_R, MAX_SHOT, POCKET_R, STRIKER_R, type CoinKind } from "./carrom";
import type { Disc, SimEvents } from "./physics2d";
import { textSprite } from "./SportScene";
import { TableEngine } from "./TableEngine";
import { resultFor, type SportOptions } from "./types";

const COIN_H = 0.075;
const STRIKER_ID = 0;

const COIN_LOOK: Record<CoinKind, { body: number; ring: string; face: string }> = {
  white: { body: 0xf3e2c0, ring: "#c9a979", face: "#f7ead0" },
  black: { body: 0x2b2420, ring: "#5a4a40", face: "#3a302a" },
  queen: { body: 0xd8344a, ring: "#8f1a2b", face: "#e04a5e" },
};

function faceTexture(face: string, ring: string, star = false) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = face;
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = ring;
  for (const [r, w] of [[54, 6], [38, 4], [20, 3]] as const) {
    g.lineWidth = w;
    g.beginPath();
    g.arc(64, 64, r, 0, Math.PI * 2);
    g.stroke();
  }
  if (star) {
    g.fillStyle = ring;
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      const r = i % 2 ? 12 : 28;
      g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r);
    }
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function boardTexture() {
  const S = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(S / 2, S / 2, 50, S / 2, S / 2, S * 0.75);
  grad.addColorStop(0, "#f6dfae");
  grad.addColorStop(1, "#e2bf82");
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  const u = S / (BOARD_HALF * 2); // px per unit
  const P = (v: number) => S / 2 + v * u;
  g.strokeStyle = "#5b3a1e";
  g.fillStyle = "#5b3a1e";
  // Baselines: a double line on each side with end circles.
  for (let side = 0; side < 4; side++) {
    g.save();
    g.translate(S / 2, S / 2);
    g.rotate((side * Math.PI) / 2);
    const y1 = BASELINE * u - STRIKER_R * u;
    const y2 = BASELINE * u + STRIKER_R * u;
    const x = BASELINE_HALF * u;
    g.lineWidth = 3;
    for (const y of [y1, y2]) {
      g.beginPath();
      g.moveTo(-x, y);
      g.lineTo(x, y);
      g.stroke();
    }
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.arc(sx * x, (y1 + y2) / 2, STRIKER_R * u, 0, Math.PI * 2);
      g.fillStyle = "#c0392b";
      g.fill();
      g.stroke();
    }
    // Diagonal arrow toward the pocket.
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(1.15 * u, 1.15 * u);
    g.lineTo(2.85 * u, 2.85 * u);
    g.stroke();
    g.restore();
  }
  // Centre circles.
  g.lineWidth = 4;
  for (const r of [0.95, 0.2]) {
    g.beginPath();
    g.arc(S / 2, S / 2, r * u, 0, Math.PI * 2);
    g.stroke();
  }
  // Pockets.
  for (const pk of CARROM_TABLE.pockets) {
    g.beginPath();
    g.arc(P(pk.x), P(-pk.y), POCKET_R * u, 0, Math.PI * 2);
    g.fillStyle = "#1a1210";
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Carrom: flick the striker from your baseline to knock coins into the corner pockets. */
export class CarromEngine extends TableEngine {
  private kinds = new Map<number, CoinKind>();
  private coinsLeft = 0;
  private shots = 0;
  private floaters: { s: THREE.Sprite; t: number }[] = [];
  private geo: { coin: THREE.CylinderGeometry; striker: THREE.CylinderGeometry };
  private mats = new Map<string, THREE.Material[]>();
  private turnMarker: THREE.Mesh;

  constructor(container: HTMLElement, opts: SportOptions) {
    super(container, opts, CARROM_TABLE, 0x9fd3c7, 0, MAX_SHOT, 0.55);
    this.rolls = false;
    this.geo = { coin: new THREE.CylinderGeometry(COIN_R, COIN_R, COIN_H, 36), striker: new THREE.CylinderGeometry(STRIKER_R, STRIKER_R, COIN_H * 1.15, 40) };
    this.stage.onDispose(() => {
      this.geo.coin.dispose();
      this.geo.striker.dispose();
      this.mats.forEach((ms) => ms.forEach((m) => m.dispose()));
    });
    this.buildBoard();
    this.turnMarker = new THREE.Mesh(new THREE.RingGeometry(STRIKER_R * 1.25, STRIKER_R * 1.55, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
    this.turnMarker.rotation.x = -Math.PI / 2;
    this.stage.scene.add(this.turnMarker);
    this.start();
  }

  private buildBoard() {
    const s = this.stage.scene;
    s.add(new THREE.HemisphereLight(0xffffff, 0x8a6a4a, 1.6));
    const key = new THREE.DirectionalLight(0xfff3dd, 2.2);
    key.position.set(3, 12, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.02;
    Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 });
    s.add(key);

    const surface = new THREE.Mesh(new THREE.PlaneGeometry(BOARD_HALF * 2, BOARD_HALF * 2), new THREE.MeshStandardMaterial({ map: boardTexture(), roughness: 0.55 }));
    surface.rotation.x = -Math.PI / 2;
    surface.receiveShadow = true;
    s.add(surface);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x6b3d1f, roughness: 0.5 });
    const W = 0.45;
    for (const [x, z, w, d] of [
      [0, -(BOARD_HALF + W / 2), BOARD_HALF * 2 + W * 2, W],
      [0, BOARD_HALF + W / 2, BOARD_HALF * 2 + W * 2, W],
      [-(BOARD_HALF + W / 2), 0, W, BOARD_HALF * 2],
      [BOARD_HALF + W / 2, 0, W, BOARD_HALF * 2],
    ]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.28, d), frameMat);
      m.position.set(x, 0.1, z);
      m.castShadow = true;
      m.receiveShadow = true;
      s.add(m);
    }
    const under = new THREE.Mesh(new THREE.BoxGeometry(BOARD_HALF * 2 + W * 2, 0.2, BOARD_HALF * 2 + W * 2), frameMat);
    under.position.y = -0.11;
    s.add(under);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x86c5b6, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.3;
    floor.receiveShadow = true;
    s.add(floor);
  }

  private material(kind: CoinKind | "striker"): THREE.Material[] {
    let m = this.mats.get(kind);
    if (!m) {
      const look = kind === "striker" ? { body: 0xe8f4ff, ring: "#2f6fd6", face: "#eef6ff" } : COIN_LOOK[kind];
      const side = new THREE.MeshStandardMaterial({ color: look.body, roughness: 0.4 });
      const top = new THREE.MeshStandardMaterial({ map: faceTexture(look.face, look.ring, kind === "striker" || kind === "queen"), roughness: 0.35 });
      m = [side, top, top];
      this.mats.set(kind, m);
    }
    return m;
  }

  protected cueId() {
    return STRIKER_ID;
  }

  protected lift(d: Disc) {
    return d.id === STRIKER_ID ? (COIN_H * 1.15) / 2 : COIN_H / 2;
  }

  private baselineY(player: number) {
    return player === 0 ? -BASELINE : BASELINE;
  }

  protected clampPlace(x: number) {
    const y = this.baselineY(this.turn);
    const cx = Math.max(-BASELINE_HALF, Math.min(BASELINE_HALF, x));
    return this.isFree(cx, y, STRIKER_R, STRIKER_ID) ? { x: cx, y } : null;
  }

  protected startGame() {
    for (const m of this.meshes.values()) m.removeFromParent();
    this.meshes.clear();
    this.kinds.clear();
    this.discs = [{ id: STRIKER_ID, x: 0, y: -BASELINE, vx: 0, vy: 0, r: STRIKER_R, m: 2.7, active: true }];
    const striker = new THREE.Mesh(this.geo.striker, this.material("striker"));
    striker.castShadow = true;
    this.meshes.set(STRIKER_ID, striker);
    this.stage.scene.add(striker);
    carromLayout(this.setup.variant).forEach((c, i) => {
      const id = i + 1;
      this.discs.push({ id, x: c.x, y: c.y, vx: 0, vy: 0, r: COIN_R, m: 1, active: true });
      this.kinds.set(id, c.kind);
      const mesh = new THREE.Mesh(this.geo.coin, this.material(c.kind));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.rotation.y = Math.random() * Math.PI;
      this.meshes.set(id, mesh);
      this.stage.scene.add(mesh);
    });
    this.coinsLeft = this.discs.length - 1;
    this.shots = 0;
    this.prepareStriker();
    this.emitHud({ message: this.turnText(), detail: "White 20 · Black 10 · Queen 50", say: this.isRobotTurn ? undefined : "Pull back from the striker and let go!" });
    this.beginTurn();
  }

  private turnText() {
    const p = this.players[this.turn];
    if (this.isRobotTurn) return "Robo is aiming… 🤖";
    if (this.players.length === 1) return "Slide the striker, pull back, let go! 🎯";
    return `${p.icon} ${p.name}: your shot!`;
  }

  private prepareStriker() {
    const s = this.discs[0];
    const y = this.baselineY(this.turn);
    let x = 0;
    for (const dx of [0, 0.4, -0.4, 0.8, -0.8, 1.2, -1.2, 1.6, -1.6, 2.0, -2.0]) {
      if (this.isFree(dx, y, STRIKER_R, STRIKER_ID)) {
        x = dx;
        break;
      }
    }
    this.restore(s, x, y);
    this.aimAngle = this.turn === 0 ? Math.PI / 2 : -Math.PI / 2;
    this.canPlace = true;
    this.turnMarker.visible = true;
  }

  protected onShot() {
    this.shots++;
    this.turnMarker.visible = false;
  }

  protected shotFinished(ev: SimEvents) {
    const pottedIds = ev.pots.map((p) => p.a);
    const coins = pottedIds.filter((id) => id !== STRIKER_ID).map((id) => this.kinds.get(id)!);
    const strikerIn = pottedIds.includes(STRIKER_ID);
    const res = carromOutcome({ scores: this.players.map((p) => p.score), turn: this.turn, coinsLeft: this.coinsLeft }, coins, strikerIn);
    res.scores.forEach((s, i) => (this.players[i].score = s));
    this.coinsLeft = res.coinsLeft;
    for (const id of pottedIds) {
      if (id === STRIKER_ID) continue;
      const pk = ev.pots.find((p) => p.a === id)!;
      const pocket = this.table.pockets[pk.pocket];
      this.floatText(`+${COIN_POINTS[this.kinds.get(id)!]}`, pocket.x, pocket.y);
    }
    if (res.gained) {
      this.sound("score", Math.min(1, res.gained / 50));
      if (coins.includes("queen")) this.celebrate(this.toWorld({ x: 0, y: 0 }, 0.6));
    } else if (strikerIn) this.sound("foul", 0.5);
    this.turn = res.turn;
    if (res.over) {
      this.over = true;
      const r = resultFor(this.players, this.setup.opponent);
      if (this.players.length === 1) r.text = `Board cleared in ${this.shots} shots! 🎉`;
      this.emitHud({ message: r.text, detail: undefined, say: r.text });
      this.celebrate(this.toWorld({ x: 0, y: 0 }, 1), 8);
      this.sound("cheer");
      this.after(1.2, () => this.opts.onGameOver(r));
      return;
    }
    this.emitHud({ message: res.message, detail: undefined, say: res.gained ? `${res.gained} points!` : undefined });
    this.after(res.gained ? 0.9 : 1.1, () => {
      this.prepareStriker();
      this.emitHud({ message: this.turnText(), detail: res.again ? "Shoot again!" : undefined });
      this.beginTurn();
    });
  }

  private floatText(text: string, x: number, y: number) {
    const s = textSprite(text, "#ffe066");
    s.scale.set(1.5, 0.47, 1);
    s.position.copy(this.toWorld({ x: x * 0.8, y: y * 0.8 }, 0.4));
    this.stage.scene.add(s);
    this.floaters.push({ s, t: 0 });
  }

  protected idle(dt: number) {
    for (const f of this.floaters) {
      f.t += dt;
      f.s.position.y += dt * 0.6;
      (f.s.material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - f.t / 1.4);
    }
    this.floaters = this.floaters.filter((f) => {
      if (f.t < 1.4) return true;
      (f.s.material as THREE.SpriteMaterial).map?.dispose();
      f.s.material.dispose();
      f.s.removeFromParent();
      return false;
    });
    if (this.turnMarker.visible) {
      const s = this.discs[0];
      this.turnMarker.position.copy(this.toWorld(s, 0.005));
      const pulse = this.reduced ? 1 : 1 + Math.sin(this.time * 5) * 0.08;
      this.turnMarker.scale.setScalar(pulse);
    }
  }

  protected robotPlanner(fromCue = false) {
    const y = this.baselineY(this.turn);
    const starts = fromCue ? [] : [-2.1, -1.4, -0.7, 0, 0.7, 1.4, 2.1].map((x) => ({ x, y })).filter((p) => this.isFree(p.x, p.y, STRIKER_R, STRIKER_ID));
    if (!starts.length) starts.push({ x: this.discs[0].x, y: this.discs[0].y });
    const targets = this.discs.filter((d) => d.active && d.id !== STRIKER_ID).map((d) => d.id);
    const cands = candidateShots({ discs: this.discs, table: this.table, cueId: STRIKER_ID, targets, starts, maxSpeed: MAX_SHOT });
    return new BotPlanner(this.discs, this.table, STRIKER_ID, cands, (_final, ev) => {
      let v = 0;
      for (const p of ev.pots) v += p.a === STRIKER_ID ? -40 : COIN_POINTS[this.kinds.get(p.a)!];
      return v + (ev.hits.length ? 1 : 0);
    });
  }
}
