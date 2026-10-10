import * as THREE from "three";
import { addToyRoom } from "@/lib/toy3d/scenery";
import { ToyScene, type PickInfo } from "@/lib/toy3d/ToyScene";
import { Dice3D } from "./dice3d";
import type { DiceEngine, DiceOptions, DiceState } from "./dice-types";
import { applyMove, BASE, BASE_SLOTS, botChoose, cellOf, FINISHED, LANES, legalMoves, newGame, passTurn, SAFE, START_ABS, TRACK, type LudoState } from "./ludo";
import { makePawn, Mover } from "./pawn";
import { clampHumans, is, seatLabel } from "./seats";
import type { GameLevel } from "./types";

const TOP = 0.3;
/** Pawn colour per board colour (names and emoji come from the seat, via `seatLabel`). */
const COLOUR = [
  { hex: 0xff4d4d, css: "#ef4444" },
  { hex: 0x22c55e, css: "#16a34a" },
  { hex: 0xfacc15, css: "#ca8a04" },
  { hex: 0x3b82f6, css: "#2563eb" },
];
const CSS = ["#ff6b6b", "#6bcb77", "#ffd93d", "#4d96ff"];
const PLAYER_SETS: Record<number, number[]> = { 2: [0, 2], 3: [0, 1, 2], 4: [0, 1, 2, 3] };
const QUADRANT_CENTRE: [number, number][] = [[2.5, 2.5], [11.5, 2.5], [11.5, 11.5], [2.5, 11.5]];

/** Grid index coordinates (cell index, or fractional for the base slots) -> world position. */
const world = (c: number, r: number, y = TOP) => new THREE.Vector3(c - 7, y, r - 7);

function drawBoard(): THREE.CanvasTexture {
  const cs = 100;
  const c = document.createElement("canvas");
  c.width = c.height = cs * 15;
  const g = c.getContext("2d")!;
  const cell = (col: number, row: number, fill: string) => {
    g.fillStyle = fill;
    g.fillRect(col * cs, row * cs, cs, cs);
    g.strokeStyle = "rgba(90,60,40,0.45)";
    g.lineWidth = 4;
    g.strokeRect(col * cs + 2, row * cs + 2, cs - 4, cs - 4);
  };
  g.fillStyle = "#fff6e0";
  g.fillRect(0, 0, 1500, 1500);
  // Corner bases
  const corners: [number, number][] = [[0, 0], [9, 0], [9, 9], [0, 9]];
  corners.forEach(([cx, cy], i) => {
    g.fillStyle = CSS[i];
    g.fillRect(cx * cs, cy * cs, 6 * cs, 6 * cs);
    g.fillStyle = "#fff8ea";
    g.beginPath();
    g.roundRect((cx + 1) * cs, (cy + 1) * cs, 4 * cs, 4 * cs, 40);
    g.fill();
    BASE_SLOTS[i].forEach(([sx, sy]) => {
      g.fillStyle = CSS[i];
      g.beginPath();
      g.arc((sx + 0.5) * cs, (sy + 0.5) * cs, 0.62 * cs, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "rgba(255,255,255,0.45)";
      g.beginPath();
      g.arc((sx + 0.5) * cs, (sy + 0.5) * cs, 0.4 * cs, 0, Math.PI * 2);
      g.fill();
    });
  });
  // Track
  const startCells = new Map(START_ABS.map((a, i) => [`${TRACK[a][0]},${TRACK[a][1]}`, i]));
  TRACK.forEach(([col, row], abs) => {
    const start = startCells.get(`${col},${row}`);
    cell(col, row, start !== undefined ? CSS[start] : "#ffffff");
    if (SAFE.has(abs) && start === undefined) {
      g.fillStyle = "#f5b301";
      g.font = "bold 70px sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("★", (col + 0.5) * cs, (row + 0.55) * cs);
    }
  });
  LANES.forEach((lane, i) => lane.forEach(([col, row]) => cell(col, row, CSS[i])));
  // Centre
  const tri = (pts: [number, number][], fill: string) => {
    g.fillStyle = fill;
    g.beginPath();
    pts.forEach(([x, y], k) => (k ? g.lineTo(x * cs, y * cs) : g.moveTo(x * cs, y * cs)));
    g.closePath();
    g.fill();
    g.strokeStyle = "rgba(90,60,40,0.5)";
    g.lineWidth = 4;
    g.stroke();
  };
  tri([[6, 6], [6, 9], [7.5, 7.5]], CSS[0]);
  tri([[6, 6], [9, 6], [7.5, 7.5]], CSS[1]);
  tri([[9, 6], [9, 9], [7.5, 7.5]], CSS[2]);
  tri([[6, 9], [9, 9], [7.5, 7.5]], CSS[3]);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

interface Pawn {
  colour: number;
  token: number;
  group: THREE.Group;
  mover: Mover;
}

/** 3D Ludo: roll a six to leave base, race round the board, capture rivals and get all four pawns home. */
export class LudoEngine extends ToyScene implements DiceEngine {
  private state!: LudoState;
  private pawns: Pawn[] = [];
  private phase: "idle" | "rolling" | "choose" | "moving" | "over" = "idle";
  private dice: Dice3D;
  private rolled: number | null = null;
  private message = "";
  private level: GameLevel;
  private humans = 1;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private movable: Set<string> = new Set();
  private count: number;

  constructor(container: HTMLElement, private opts: DiceOptions = {}) {
    super(container, 0xc9ecff, opts, 40);
    this.level = opts.level ?? "easy";
    this.count = Math.max(2, Math.min(4, opts.players ?? 2));
    addToyRoom(this.stage.scene, 0xd6f0ff, 0xd9a86c);
    const wood = new THREE.Mesh(new THREE.BoxGeometry(15.6, 0.3, 15.6), new THREE.MeshStandardMaterial({ color: 0xa8643a, roughness: 0.7 }));
    wood.position.y = 0.15;
    this.stage.scene.add(wood);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(15, 15), new THREE.MeshStandardMaterial({ map: drawBoard(), roughness: 0.85 }));
    face.rotation.x = -Math.PI / 2;
    face.position.y = TOP + 0.005;
    this.stage.scene.add(face);
    this.dice = new Dice3D(this.stage.scene, 1.4, this.reduced);
    this.stage.onDispose(() => this.dice.dispose());
    this.start();
    this.newGame({ players: this.count, humans: opts.humans ?? 1, level: this.level });
  }

  // ---- public API ----
  newGame(cfg: { players: number; humans: number; level: GameLevel }) {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.count = Math.max(2, Math.min(4, cfg.players));
    this.level = cfg.level;
    this.humans = clampHumans(cfg.humans, this.count);
    this.pawns.forEach((p) => this.stage.scene.remove(p.group));
    this.pawns = [];
    this.pickables = [];
    this.state = newGame(PLAYER_SETS[this.count]);
    for (const colour of this.state.players) {
      for (let token = 0; token < 4; token++) {
        const group = makePawn(COLOUR[colour].hex, 0.78);
        group.position.copy(this.posOf(colour, token));
        this.stage.scene.add(group);
        const hit = this.hitBox({ colour, token }, 1.1, 1.6, 1.1);
        hit.position.y = 0.6;
        group.add(hit);
        if (this.isHumanColour(colour)) this.pickables.push(group);
        this.pawns.push({ colour, token, group, mover: new Mover(group, this.reduced) });
      }
    }
    this.dice.hide();
    this.rolled = null;
    this.movable.clear();
    this.startTurn();
  }

  roll() {
    if (this.phase !== "idle" || !this.isHumanColour(this.state.players[this.state.turn])) return;
    this.doRoll();
  }

  activate(id: string) {
    if (id === "roll") this.roll();
    else if (id.startsWith("pawn")) this.choose(Number(id.slice(4)));
  }

  private seatOf(colour: number) {
    return this.state.players.indexOf(colour);
  }

  private label(colour: number) {
    return seatLabel(this.seatOf(colour), this.humans);
  }

  private isHumanColour(colour: number) {
    return this.seatOf(colour) >= 0 && this.seatOf(colour) < this.humans;
  }

  // ---- layout ----
  private pawnAt(colour: number, token: number) {
    return this.pawns.find((p) => p.colour === colour && p.token === token)!;
  }

  /** Where a token stands now; tokens sharing a square fan out a little. */
  private posOf(colour: number, token: number): THREE.Vector3 {
    const p = this.state?.tokens[colour][token] ?? BASE;
    const [c, r] = cellOf(colour, p, token);
    if (p === BASE) return world(c, r);
    if (p >= FINISHED) {
      const a = (token / 4) * Math.PI * 2 + colour * 0.8;
      return world(7 + Math.cos(a) * 0.3, 7 + Math.sin(a) * 0.3);
    }
    // Everyone on the same cell (any colour)
    const mates: [number, number][] = [];
    this.state.players.forEach((pc) =>
      this.state.tokens[pc].forEach((pp, t) => {
        if (pp >= 0 && pp < FINISHED) {
          const [mc, mr] = cellOf(pc, pp, t);
          if (mc === c && mr === r) mates.push([pc, t]);
        }
      }),
    );
    if (mates.length <= 1) return world(c, r);
    const idx = mates.findIndex(([pc, t]) => pc === colour && t === token);
    const a = (idx / mates.length) * Math.PI * 2 + 0.5;
    return world(c + Math.cos(a) * 0.24, r + Math.sin(a) * 0.24);
  }

  private relayout() {
    this.pawns.forEach((p) => {
      if (!p.mover.busy) p.mover.teleport(this.posOf(p.colour, p.token));
    });
  }

  // ---- flow ----
  private emit() {
    const players = this.state.players.map((c) => ({
      name: this.label(c).name,
      emoji: this.label(c).emoji,
      color: COLOUR[c].css,
      info: `${this.state.tokens[c].filter((p) => p === FINISHED).length}/4 home`,
      human: this.isHumanColour(c),
    }));
    const st: DiceState = {
      players,
      current: this.state.turn,
      canRoll: this.phase === "idle" && this.isHumanColour(this.state.players[this.state.turn]),
      choosing: this.phase === "choose",
      message: this.message,
      winner: this.state.winner === null ? null : this.state.players.indexOf(this.state.winner),
      rolled: this.rolled,
    };
    this.opts.onState?.(st);
  }

  private later(ms: number, fn: () => void) {
    this.timers.push(setTimeout(fn, this.reduced ? Math.min(ms, 150) : ms));
  }

  private startTurn() {
    this.phase = "idle";
    this.pawns.forEach((p) => (p.mover.glow = 0));
    const colour = this.state.players[this.state.turn];
    const me = this.label(colour);
    if (!me.human) this.message = `${me.name} ${is(me)} rolling…`;
    else this.message = me.you ? "Your turn! Roll the dice 🎲" : `${me.name}'s turn! Pass the device, then roll 🎲`;
    this.emit();
    if (!this.isHumanColour(colour)) this.later(1000, () => this.doRoll());
  }

  private doRoll() {
    this.phase = "rolling";
    const colour = this.state.players[this.state.turn];
    const value = 1 + Math.floor(Math.random() * 6);
    this.rolled = value;
    this.message = `${this.label(colour).name} ${is(this.label(colour))} rolling…`;
    this.emit();
    this.opts.onSound?.("roll");
    const [qc, qr] = QUADRANT_CENTRE[colour];
    const to = world(qc, qr, 0.95);
    this.dice.roll(value, new THREE.Vector3(to.x * 0.3, 8, to.z * 0.3), to, () => {
      this.message = `${this.label(colour).name} rolled a ${value}!`;
      this.emit();
      this.later(500, () => this.afterRoll(colour, value));
    });
  }

  private afterRoll(colour: number, value: number) {
    const moves = legalMoves(this.state, colour, value);
    if (moves.length === 0) {
      this.message = value === 6 ? "No move this time" : `No move this time. ${this.isHumanColour(colour) ? "Next player!" : ""}`.trim();
      this.opts.onSound?.("pass");
      this.emit();
      this.later(1000, () => {
        this.dice.hide();
        this.state = passTurn(this.state);
        this.startTurn();
      });
      return;
    }
    if (this.isHumanColour(colour) && moves.length > 1) {
      this.phase = "choose";
      this.movable = new Set(moves.map((t) => `${colour}:${t}`));
      moves.forEach((t) => (this.pawnAt(colour, t).mover.glow = 1));
      this.message = "Tap a glowing pawn 👆";
      this.emit();
      return;
    }
    const human = this.isHumanColour(colour);
    const token = human ? moves[0] : botChoose(this.state, colour, value, this.level);
    this.later(human ? 300 : 650, () => this.execute(colour, token, value));
  }

  private choose(token: number) {
    const colour = this.state.players[this.state.turn];
    if (this.phase !== "choose" || this.rolled === null || !this.movable.has(`${colour}:${token}`)) return;
    this.pawns.forEach((p) => (p.mover.glow = 0));
    this.movable.clear();
    this.execute(colour, token, this.rolled);
  }

  private execute(colour: number, token: number, value: number) {
    this.phase = "moving";
    this.emit();
    this.dice.hide();
    const result = applyMove(this.state, colour, token, value);
    const pawn = this.pawnAt(colour, token);
    const steps: THREE.Vector3[] = [];
    if (result.from === BASE) {
      const [c, r] = cellOf(colour, 0);
      steps.push(world(c, r));
    } else {
      for (let p = result.from + 1; p <= result.to; p++) {
        const [c, r] = p >= FINISHED ? [7, 7] : cellOf(colour, p);
        steps.push(world(c, r));
      }
    }
    const done = () => {
      this.state = result.state;
      result.captured.forEach(({ colour: cc, token: ct }) => {
        const victim = this.pawnAt(cc, ct);
        const [bc, br] = BASE_SLOTS[cc][ct];
        victim.mover.fling(world(bc, br), 0.8, 3);
        this.opts.onSound?.("capture");
      });
      if (result.captured.length) {
        this.message = `${this.label(colour).name} sent ${this.label(result.captured[0].colour).name} home! 😲`;
        if (!this.reduced) this.confetti.burst(steps[steps.length - 1].clone().setY(1), [0xffd93d, 0xffffff, 0xff6b6b], 24, 5);
      }
      if (result.reachedHome) {
        this.opts.onSound?.("home");
        this.message = `${this.label(colour).name}${this.label(colour).you ? "r" : "'s"} pawn is home! 🏠`;
        if (!this.reduced) this.confetti.burst(world(7, 7, 1.2), [CSS[colour] ? new THREE.Color(CSS[colour]).getHex() : 0xffffff, 0xffffff, 0xffd93d], 30, 6);
      }
      this.later(result.captured.length ? 900 : 350, () => this.finishMove(colour, result.extraTurn, value));
    };
    if (result.from === BASE) {
      pawn.mover.fling(steps[0], 0.45, 1.6, done);
    } else {
      pawn.mover.hop(steps, { onStep: (i) => this.opts.onSound?.("hop", i), onDone: done });
    }
    if (result.state.winner !== null) this.pawns.filter((p) => p.colour === colour).forEach((p) => (p.mover.glow = 2));
  }

  private finishMove(colour: number, extra: boolean, value: number) {
    this.relayout();
    this.emit();
    if (this.state.winner !== null) {
      this.phase = "over";
      const w = this.label(this.state.winner);
      const won = w.human;
      this.message = w.you ? "You won! 🎉" : won ? `${w.name} won! 🎉` : `${w.name} won! Good game! 👏`;
      this.emit();
      this.opts.onSound?.(won ? "win" : "lose");
      this.opts.onResult?.({ result: won ? "win" : "lose", players: this.count, humans: this.humans, level: this.level });
      if (won) this.confetti.burst(world(0, 0, 4), [0xffd93d, 0xff6b6b, 0x4d96ff, 0x6bcb77, 0xffffff], 100, 11);
      return;
    }
    if (extra) {
      this.message = value === 6 ? `${this.label(colour).name} rolled a 6: roll again! ⭐` : `${this.label(colour).name} rolls again! ⭐`;
      this.emit();
      this.later(600, () => this.startTurn());
    } else {
      this.startTurn();
    }
  }

  // ---- input ----
  protected onDown(info: PickInfo | null) {
    const o = info?.owner as { colour: number; token: number } | undefined;
    if (o && o.colour === this.state.players[this.state.turn] && this.isHumanColour(o.colour)) this.choose(o.token);
  }

  // ---- camera & loop ----
  protected onResize(aspect: number) {
    const cam = this.stage.camera;
    const tan = Math.tan((cam.fov * Math.PI) / 360);
    const portrait = aspect < 0.9;
    const dist = Math.max(26, (portrait ? 9.2 : 8.6) / (tan * aspect), 12 / tan);
    const pitch = (portrait ? 72 : 64) * (Math.PI / 180);
    const target = new THREE.Vector3(0, 0, portrait ? 2.4 : 1.4);
    cam.position.set(0, Math.sin(pitch) * dist, target.z + Math.cos(pitch) * dist);
    cam.lookAt(target);
  }

  protected update(dt: number) {
    this.pawns.forEach((p) => {
      p.mover.update(dt);
      if (p.mover.glow === 2 && !this.reduced) p.group.rotation.y += dt * 5;
    });
    this.dice.update(dt);
  }

  protected onDestroy() {
    this.timers.forEach(clearTimeout);
  }
}
