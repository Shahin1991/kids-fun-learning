import * as THREE from "three";
import { addToyRoom } from "@/lib/toy3d/scenery";
import { ToyScene } from "@/lib/toy3d/ToyScene";
import { Dice3D } from "./dice3d";
import type { DiceEngine, DiceOptions, DiceState } from "./dice-types";
import { makePawn, Mover } from "./pawn";
import { clampHumans, is, seatLabel } from "./seats";
import { LADDERS, moveFrom, SNAKES, squareCell } from "./snakes-ladders";
import type { GameLevel } from "./types";

const TOP = 0.3;
/** Pawn colour by seat (the name and emoji come from `seatLabel`). */
const PALETTE = [
  { color: 0xff7a1a, css: "#ff7a1a" },
  { color: 0x3b82f6, css: "#3b82f6" },
  { color: 0x22c55e, css: "#22c55e" },
  { color: 0xc084fc, css: "#c084fc" },
];
const SNAKE_COLOURS = ["#ff6b6b", "#7c3aed", "#10b981", "#f59e0b", "#06b6d4", "#ec4899", "#84cc16", "#f97316"];

/** Centre of a square in board units: x runs left to right, z grows toward the camera (square 1 is front left). */
function cellPos(n: number): THREE.Vector2 {
  const { col, row } = squareCell(n);
  return new THREE.Vector2(col + 0.5 - 5, 5 - (row + 0.5));
}

/** The wiggling path a snake takes from its head square down to its tail square (also drawn on the board). */
function snakePath(from: number, to: number, steps = 28): THREE.Vector2[] {
  const a = cellPos(from);
  const b = cellPos(to);
  const d = b.clone().sub(a);
  const perp = new THREE.Vector2(-d.y, d.x).normalize();
  const amp = Math.min(0.75, 0.25 + d.length() * 0.05);
  const phase = from % 7;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return a.clone().addScaledVector(d, t).addScaledVector(perp, Math.sin(t * Math.PI * 3 + phase) * amp * Math.sin(t * Math.PI));
  });
}

function drawBoard(): THREE.CanvasTexture {
  const cs = 128;
  const c = document.createElement("canvas");
  c.width = c.height = cs * 10;
  const g = c.getContext("2d")!;
  const px = (v: THREE.Vector2) => [(v.x + 5) * cs, (v.y + 5) * cs] as const;
  const tints = ["#fff0b8", "#ffd6e6", "#cfeeff", "#d7f5c8"];
  for (let n = 1; n <= 100; n++) {
    const { col, row } = squareCell(n);
    g.fillStyle = tints[(col + row) % 2 === 0 ? (row % 2 ? 0 : 2) : row % 2 ? 1 : 3];
    g.fillRect(col * cs, (9 - row) * cs, cs, cs);
    g.strokeStyle = "rgba(120,90,60,0.35)";
    g.lineWidth = 3;
    g.strokeRect(col * cs + 1.5, (9 - row) * cs + 1.5, cs - 3, cs - 3);
    g.fillStyle = "#6b4a2b";
    g.font = "bold 46px sans-serif";
    g.textAlign = "left";
    g.textBaseline = "top";
    g.fillText(String(n), col * cs + 10, (9 - row) * cs + 8);
  }
  g.font = "64px sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("🏆", 0.5 * cs, 0.5 * cs + 8);
  // Ladders
  for (const [from, to] of Object.entries(LADDERS)) {
    const a = cellPos(Number(from));
    const b = cellPos(to);
    const d = b.clone().sub(a);
    const len = d.length();
    const dir = d.clone().normalize();
    const perp = new THREE.Vector2(-dir.y, dir.x).multiplyScalar(0.17);
    g.lineCap = "round";
    for (const s of [-1, 1]) {
      const [x1, y1] = px(a.clone().addScaledVector(perp, s));
      const [x2, y2] = px(b.clone().addScaledVector(perp, s));
      g.strokeStyle = "#7a4a22";
      g.lineWidth = 12;
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.stroke();
    }
    for (let r = 0.3; r < len - 0.15; r += 0.42) {
      const mid = a.clone().addScaledVector(dir, r);
      const [x1, y1] = px(mid.clone().sub(perp));
      const [x2, y2] = px(mid.clone().add(perp));
      g.strokeStyle = "#e0a566";
      g.lineWidth = 9;
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.stroke();
    }
  }
  // Snakes
  Object.entries(SNAKES).forEach(([from, to], i) => {
    const pts = snakePath(Number(from), to);
    const colour = SNAKE_COLOURS[i % SNAKE_COLOURS.length];
    g.lineCap = "round";
    g.lineJoin = "round";
    for (let k = 0; k < pts.length - 1; k++) {
      const t = k / (pts.length - 1);
      const [x1, y1] = px(pts[k]);
      const [x2, y2] = px(pts[k + 1]);
      g.strokeStyle = colour;
      g.lineWidth = 30 - t * 18;
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.stroke();
      if (k % 3 === 0) {
        g.strokeStyle = "rgba(255,255,255,0.55)";
        g.lineWidth = (30 - t * 18) * 0.35;
        g.beginPath();
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.stroke();
      }
    }
    const [hx, hy] = px(pts[0]);
    g.fillStyle = colour;
    g.beginPath();
    g.arc(hx, hy, 24, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#fff";
    for (const s of [-1, 1]) {
      g.beginPath();
      g.arc(hx + s * 9, hy - 6, 7, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = "#222";
    for (const s of [-1, 1]) {
      g.beginPath();
      g.arc(hx + s * 9, hy - 5, 3.5, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = "#e11d48";
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(hx, hy + 12);
    g.lineTo(hx, hy + 26);
    g.moveTo(hx, hy + 26);
    g.lineTo(hx - 5, hy + 32);
    g.moveTo(hx, hy + 26);
    g.lineTo(hx + 5, hy + 32);
    g.stroke();
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** 3D Snakes & Ladders: hopping pawns, a tumbling die, real ladders to climb and snakes to slide down. */
export class SnakesLaddersEngine extends ToyScene implements DiceEngine {
  private count: number;
  private pos: number[] = [];
  private pawns: { group: THREE.Group; mover: Mover }[] = [];
  private current = 0;
  private phase: "idle" | "rolling" | "moving" | "over" = "idle";
  private dice: Dice3D;
  private rolled: number | null = null;
  private message = "";
  private winner: number | null = null;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private level: GameLevel = "easy";
  private humans = 1;

  constructor(container: HTMLElement, private opts: DiceOptions = {}) {
    super(container, 0xbfe6ff, opts, 40);
    this.count = Math.max(2, Math.min(4, opts.players ?? 2));
    addToyRoom(this.stage.scene, 0xcdeeff, 0xd9a86c);
    const wood = new THREE.MeshStandardMaterial({ color: 0xa8643a, roughness: 0.7 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.3, 10.6), wood);
    frame.position.y = 0.15;
    this.stage.scene.add(frame);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial({ map: drawBoard(), roughness: 0.8 }));
    face.rotation.x = -Math.PI / 2;
    face.position.y = TOP + 0.005;
    this.stage.scene.add(face);
    this.dice = new Dice3D(this.stage.scene, 1.3, this.reduced);
    this.stage.onDispose(() => this.dice.dispose());
    this.start();
    this.newGame({ players: this.count, humans: opts.humans ?? 1, level: "easy" });
  }

  // ---- public API ----
  newGame(cfg: { players: number; humans: number; level: GameLevel }) {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.count = Math.max(2, Math.min(4, cfg.players));
    this.humans = clampHumans(cfg.humans, this.count);
    this.level = cfg.level;
    this.pawns.forEach((p) => this.stage.scene.remove(p.group));
    this.pawns = [];
    this.pos = Array(this.count).fill(0);
    for (let i = 0; i < this.count; i++) {
      const group = makePawn(PALETTE[i].color, 0.95);
      group.position.copy(this.worldPos(i, 0));
      this.stage.scene.add(group);
      this.pawns.push({ group, mover: new Mover(group, this.reduced) });
    }
    this.dice.hide();
    this.rolled = null;
    this.winner = null;
    this.current = 0;
    this.phase = "idle";
    this.startTurn();
  }

  roll() {
    if (this.phase !== "idle" || !this.isHuman(this.current)) return;
    this.doRoll();
  }

  activate(id: string) {
    if (id === "roll") this.roll();
  }

  private label(seat: number) {
    return seatLabel(seat, this.humans);
  }

  private isHuman(seat: number) {
    return seat < this.humans;
  }

  // ---- layout ----
  /** Where pawn i stands for square n (0 = waiting in front of square 1); pawns sharing a square fan out. */
  private worldPos(i: number, n: number): THREE.Vector3 {
    if (n === 0) return new THREE.Vector3(-4.5 + i * 0.85, TOP, 5.9);
    const c = cellPos(n);
    const mates = this.pos.map((p, k) => (p === n ? k : -1)).filter((k) => k >= 0);
    const idx = Math.max(0, mates.indexOf(i));
    if (mates.length <= 1) return new THREE.Vector3(c.x, TOP, c.y);
    const a = (idx / mates.length) * Math.PI * 2 + 0.6;
    return new THREE.Vector3(c.x + Math.cos(a) * 0.24, TOP, c.y + Math.sin(a) * 0.24);
  }

  // ---- flow ----
  private emit() {
    const state: DiceState = {
      players: Array.from({ length: this.count }, (_, i) => ({ name: this.label(i).name, emoji: this.label(i).emoji, color: PALETTE[i].css, info: this.pos[i] === 0 ? "Start" : `Square ${this.pos[i]}`, human: this.isHuman(i) })),
      current: this.current,
      canRoll: this.phase === "idle" && this.isHuman(this.current),
      choosing: false,
      message: this.message,
      winner: this.winner,
      rolled: this.rolled,
    };
    this.opts.onState?.(state);
  }

  private later(ms: number, fn: () => void) {
    this.timers.push(setTimeout(fn, this.reduced ? Math.min(ms, 150) : ms));
  }

  private startTurn() {
    this.phase = "idle";
    this.pawns.forEach((p, i) => (p.mover.glow = i === this.current && this.isHuman(i) ? 1 : 0));
    const me = this.label(this.current);
    if (!me.human) this.message = `${me.name} ${is(me)} rolling…`;
    else this.message = me.you ? "Your turn! Roll the dice 🎲" : `${me.name}'s turn! Pass the device, then roll 🎲`;
    this.emit();
    if (!this.isHuman(this.current)) this.later(1000, () => this.doRoll());
  }

  private doRoll() {
    this.phase = "rolling";
    this.pawns.forEach((p) => (p.mover.glow = 0));
    const value = 1 + Math.floor(Math.random() * 6);
    this.rolled = value;
    this.message = `${this.label(this.current).name} rolled…`;
    this.emit();
    this.opts.onSound?.("roll");
    this.dice.roll(value, new THREE.Vector3(-3, 7, 4), new THREE.Vector3(0, 0.95, 0.5), () => {
      this.message = `${this.label(this.current).name} rolled a ${value}!`;
      this.emit();
      this.opts.onSound?.("hop", value);
      this.later(450, () => this.move(value));
    });
  }

  private move(value: number) {
    this.phase = "moving";
    const who = this.current;
    const m = moveFrom(this.pos[who], value);
    const mover = this.pawns[who].mover;
    // Pawns standing on the way do not matter; hop through each square then settle.
    const steps = m.path.map((n) => {
      const c = cellPos(n);
      return new THREE.Vector3(c.x, TOP, c.y);
    });
    mover.hop(steps, {
      onStep: (i) => this.opts.onSound?.("hop", i),
      onDone: () => {
        this.pos[who] = m.landed;
        if (m.jump) this.jump(who, m);
        else this.settle(who, m.landed, value);
      },
    });
    this.dice.hide();
  }

  private jump(who: number, m: ReturnType<typeof moveFrom>) {
    const j = m.jump!;
    const mover = this.pawns[who].mover;
    this.message = j.kind === "ladder" ? "A ladder! Up you go! 🪜" : "Oh no, a snake! Wheee! 🐍";
    this.emit();
    this.opts.onSound?.(j.kind === "ladder" ? "up" : "down");
    const a = cellPos(j.from);
    const b = cellPos(j.to);
    let curve: THREE.Curve<THREE.Vector3>;
    if (j.kind === "ladder") {
      curve = new THREE.LineCurve3(new THREE.Vector3(a.x, TOP, a.y), new THREE.Vector3(b.x, TOP, b.y));
    } else {
      const pts = snakePath(j.from, j.to).map((p) => new THREE.Vector3(p.x, TOP, p.y));
      curve = new THREE.CatmullRomCurve3(pts);
    }
    if (j.kind === "ladder" && !this.reduced) this.confetti.burst(new THREE.Vector3(b.x, 1.2, b.y), [0xffd93d, 0xffffff, 0x6bcb77], 22, 5);
    mover.ride(curve, j.kind === "ladder" ? 1.0 : 1.4, () => {
      this.pos[who] = j.to;
      this.settle(who, j.to, this.rolled ?? 0);
    });
  }

  private settle(who: number, at: number, value: number) {
    // Nudge pawns that now share the square into a little circle.
    this.pawns.forEach((p, i) => {
      if (this.pos[i] === at && !p.mover.busy) p.mover.teleport(this.worldPos(i, at));
    });
    this.emit();
    if (at === 100) {
      this.phase = "over";
      this.winner = who;
      this.pawns[who].mover.glow = 2;
      const w = this.label(who);
      this.message = w.you ? "You won! 🎉" : w.human ? `${w.name} won! 🎉` : `${w.name} won! Good game! 👏`;
      this.emit();
      this.opts.onSound?.(w.human ? "win" : "lose");
      this.opts.onResult?.({ result: w.human ? "win" : "lose", players: this.count, humans: this.humans, level: this.level });
      if (w.human) this.confetti.burst(new THREE.Vector3(0, 3, 0), [0xffd93d, 0xff6b6b, 0x4d96ff, 0x6bcb77, 0xffffff], 90, 10);
      return;
    }
    if (value === 6) {
      this.message = `${this.label(who).name} rolled a 6: roll again! ⭐`;
      this.later(500, () => this.startTurn());
      this.emit();
      return;
    }
    this.later(450, () => {
      this.current = (this.current + 1) % this.count;
      this.startTurn();
    });
  }

  // ---- camera & loop ----
  protected onResize(aspect: number) {
    const cam = this.stage.camera;
    const tan = Math.tan((cam.fov * Math.PI) / 360);
    const portrait = aspect < 0.9;
    const dist = Math.max(20, (portrait ? 6.4 : 5.9) / (tan * aspect), 8.4 / tan);
    const pitch = (portrait ? 70 : 64) * (Math.PI / 180);
    const target = new THREE.Vector3(0, 0, portrait ? 2.6 : 2.0);
    cam.position.set(0, Math.sin(pitch) * dist, target.z + Math.cos(pitch) * dist);
    cam.lookAt(target);
  }

  protected update(dt: number) {
    this.pawns.forEach((p) => p.mover.update(dt));
    this.dice.update(dt);
    if (this.winner !== null && !this.reduced) this.pawns[this.winner].group.rotation.y += dt * 6;
  }

  protected onDestroy() {
    this.timers.forEach(clearTimeout);
  }
}
