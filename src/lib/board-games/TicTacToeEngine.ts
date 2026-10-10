import * as THREE from "three";
import { addToyRoom } from "@/lib/toy3d/scenery";
import { Spring } from "@/lib/toy3d/spring";
import { ToyScene, type PickInfo } from "@/lib/toy3d/ToyScene";
import { botMove, isFull, winnerOf, type Cell, type Mark } from "./tictactoe";
import type { BoardEngine, BoardOptions, GameLevel } from "./types";

const SPACING = 2.4;
const REST_Y = 0.5;
const PLAYER_COLOR = 0x4d96ff;
const BOT_COLOR = 0xff6b6b;

interface Piece {
  group: THREE.Group;
  mark: Mark;
  cell: number;
  y: number;
  vy: number;
  landed: boolean;
  squash: Spring;
  born: number;
  /** Seconds since the win/draw celebration started for this piece, or -1 */
  party: number;
  vanish: number;
}

const cellX = (i: number) => ((i % 3) - 1) * SPACING;
const cellZ = (i: number) => (Math.floor(i / 3) - 1) * SPACING;

/** Chunky toy X and O pieces drop onto a wooden board; the bot answers at three difficulty levels. */
export class TicTacToeEngine extends ToyScene implements BoardEngine {
  private board: Cell[] = Array(9).fill(null);
  private pieces: (Piece | null)[] = Array(9).fill(null);
  private leaving: Piece[] = [];
  private turn: "player" | "bot" | "busy" | "over" = "player";
  private level: GameLevel;
  private games = 0;
  private botTimer: ReturnType<typeof setTimeout> | undefined;
  private ghost: THREE.Group;
  private ghostCell = -1;
  private line: THREE.Mesh | null = null;
  private lineT = 0;
  private lineMat = new THREE.MeshStandardMaterial({ color: 0xffd93d, emissive: 0xffb400, emissiveIntensity: 0.9, roughness: 0.3 });
  private thinking: THREE.Group;
  private pending: { cell: number; by: "player" | "bot" } | null = null;
  private history: { cell: number; by: "player" | "bot" }[] = [];
  private resultParty = 0;
  private resultKind: "win" | "lose" | "draw" | null = null;

  constructor(container: HTMLElement, private opts: BoardOptions = {}) {
    super(container, 0xbfe6ff, opts, 40);
    this.level = opts.level ?? "easy";
    addToyRoom(this.stage.scene, 0xcdeeff, 0xd9a86c);
    this.buildBoard();
    this.ghost = this.makePiece("X", true);
    this.ghost.visible = false;
    this.stage.scene.add(this.ghost);
    // A little "thinking" bubble that floats over the board while the bot decides.
    this.thinking = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshStandardMaterial({ color: BOT_COLOR }));
      dot.position.x = (i - 1) * 0.7;
      this.thinking.add(dot);
    }
    this.thinking.visible = false;
    this.stage.scene.add(this.thinking);
    this.start();
    this.beginTurn();
  }

  // ---- public API ----
  setLevel(level: GameLevel) {
    this.level = level;
    this.newGame();
  }

  newGame() {
    clearTimeout(this.botTimer);
    this.pieces.forEach((p) => p && this.leaving.push(p));
    this.pieces = Array(9).fill(null);
    this.board = Array(9).fill(null);
    this.pending = null;
    this.history = [];
    this.resultKind = null;
    if (this.line) {
      this.stage.scene.remove(this.line);
      this.line.geometry.dispose();
      this.line = null;
    }
    this.games += 1;
    this.turn = "busy";
    this.beginTurn();
  }

  /** Oops: take back your last move (and Robo's answer to it). Only while it is your turn. */
  undo() {
    if (this.turn !== "player" || !this.history.some((h) => h.by === "player")) return;
    while (this.history.length) {
      const e = this.history.pop()!;
      const p = this.pieces[e.cell];
      if (p) this.leaving.push(p);
      this.pieces[e.cell] = null;
      this.board[e.cell] = null;
      if (e.by === "player") break;
    }
    this.ghostCell = -1;
    this.opts.onStatus?.("player");
    this.emitUndo();
  }

  private emitUndo() {
    this.opts.onUndoable?.(this.turn === "player" && this.history.some((h) => h.by === "player"));
  }

  activate(id: string) {
    this.tryPlace(Number(id));
  }

  // ---- scene ----
  private buildBoard() {
    const wood = new THREE.MeshStandardMaterial({ color: 0xf2c078, roughness: 0.6 });
    const dark = new THREE.MeshStandardMaterial({ color: 0xa8643a, roughness: 0.6 });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.5, 8.4), wood);
    slab.position.y = 0.25;
    this.stage.scene.add(slab);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(8.9, 0.3, 8.9), dark);
    rim.position.y = 0.1;
    this.stage.scene.add(rim);
    for (const o of [-1.2, 1.2]) {
      const v = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 7.6), dark);
      v.position.set(o, 0.58, 0);
      const h = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.22, 0.24), dark);
      h.position.set(0, 0.58, o);
      this.stage.scene.add(v, h);
    }
    for (let i = 0; i < 9; i++) {
      // Flat so a tilted camera ray cannot hit the top of a tall box in the next square along.
      const hit = this.hitBox(i, SPACING - 0.05, 0.3, SPACING - 0.05);
      hit.position.set(cellX(i), 0.7, cellZ(i));
      this.stage.scene.add(hit);
      this.pickables.push(hit);
    }
  }

  private makePiece(mark: Mark, ghost = false): THREE.Group {
    const g = new THREE.Group();
    const color = mark === "X" ? PLAYER_COLOR : BOT_COLOR;
    const m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2, transparent: ghost, opacity: ghost ? 0.4 : 1 });
    if (mark === "X") {
      for (const a of [Math.PI / 4, -Math.PI / 4]) {
        const bar = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 1.35, 8, 16), m);
        bar.rotation.z = Math.PI / 2; // lie flat along x
        const holder = new THREE.Group();
        holder.add(bar);
        holder.rotation.y = a;
        g.add(holder);
      }
    } else {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.26, 18, 36), m);
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
    }
    return g;
  }

  // ---- flow ----
  private beginTurn() {
    const botStarts = this.games % 2 === 1;
    if (this.board.every((c) => c === null) && botStarts) {
      this.turn = "bot";
      this.opts.onStatus?.("bot");
      this.scheduleBot();
    } else {
      this.turn = "player";
      this.opts.onStatus?.("player");
    }
  }

  private scheduleBot() {
    clearTimeout(this.botTimer);
    this.thinking.visible = true;
    this.botTimer = setTimeout(() => {
      this.thinking.visible = false;
      const cell = botMove(this.board, "O", this.level);
      this.place(cell, "bot");
    }, 750 + Math.random() * 500);
  }

  private tryPlace(cell: number) {
    if (this.turn !== "player" || this.board[cell]) return;
    this.place(cell, "player");
  }

  private place(cell: number, by: "player" | "bot") {
    const mark: Mark = by === "player" ? "X" : "O";
    this.board[cell] = mark;
    this.history.push({ cell, by });
    this.turn = "busy";
    this.emitUndo();
    this.ghost.visible = false;
    const group = this.makePiece(mark);
    group.position.set(cellX(cell), 7, cellZ(cell));
    this.stage.scene.add(group);
    this.pieces[cell] = { group, mark, cell, y: this.reduced ? REST_Y : 7, vy: 0, landed: false, squash: new Spring(0, 0, 240, 9), born: this.time, party: -1, vanish: 0 };
    this.pending = { cell, by };
  }

  private landed(by: "player" | "bot") {
    this.opts.onPlace?.({ by, n: this.board.filter(Boolean).length });
    const w = winnerOf(this.board);
    if (w) {
      this.finish(w.mark === "X" ? "win" : "lose", w.line);
    } else if (isFull(this.board)) {
      this.finish("draw");
    } else if (by === "player") {
      this.turn = "bot";
      this.opts.onStatus?.("bot");
      this.scheduleBot();
    } else {
      this.turn = "player";
      this.opts.onStatus?.("player");
      this.emitUndo();
    }
  }

  private finish(kind: "win" | "lose" | "draw", line?: number[]) {
    this.turn = "over";
    this.emitUndo();
    this.resultKind = kind;
    this.resultParty = 0;
    this.opts.onStatus?.(kind);
    this.opts.onResult?.({ result: kind, level: this.level });
    if (line) {
      const a = new THREE.Vector3(cellX(line[0]), 1.1, cellZ(line[0]));
      const b = new THREE.Vector3(cellX(line[2]), 1.1, cellZ(line[2]));
      const len = a.distanceTo(b) + 2;
      const bar = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, len - 0.32, 8, 12), this.lineMat);
      bar.position.copy(a).add(b).multiplyScalar(0.5);
      bar.lookAt(b);
      bar.rotateX(Math.PI / 2);
      bar.scale.set(0.01, 0.01, 0.01);
      this.line = bar;
      this.lineT = 0;
      this.stage.scene.add(bar);
      line.forEach((c, i) => {
        const p = this.pieces[c];
        if (p) p.party = -i * 0.18;
      });
      if (kind === "win") this.confetti.burst(new THREE.Vector3(0, 3, 0), [0xffd93d, 0xff6b6b, 0x4d96ff, 0x6bcb77, 0xffffff], 70, 9);
    } else {
      this.pieces.forEach((p) => p && (p.party = 0));
    }
  }

  // ---- input ----
  protected onDown(info: PickInfo | null) {
    if (typeof info?.owner === "number") this.tryPlace(info.owner);
  }

  protected onMove(e: PointerEvent) {
    if (this.turn !== "player") {
      this.ghostCell = -1;
      this.ghost.visible = false;
      return;
    }
    const info = this.pick(e);
    const cell = typeof info?.owner === "number" ? info.owner : -1;
    this.ghostCell = cell >= 0 && !this.board[cell] ? cell : -1;
  }

  protected onResize(aspect: number) {
    const cam = this.stage.camera;
    const tan = Math.tan((cam.fov * Math.PI) / 360);
    const portrait = aspect < 0.9;
    const dist = Math.max(19, (portrait ? 6.2 : 5.6) / (tan * aspect), 7.2 / tan);
    const pitch = (portrait ? 70 : 64) * (Math.PI / 180);
    const target = new THREE.Vector3(0, 0, portrait ? 2.2 : 1.4);
    cam.position.set(0, Math.sin(pitch) * dist, target.z + Math.cos(pitch) * dist);
    cam.lookAt(target);
  }

  // ---- loop ----
  protected update(dt: number) {
    for (const p of this.pieces) if (p) this.stepPiece(p, dt);
    for (const p of this.leaving) {
      p.vanish += dt * 3;
      p.group.scale.setScalar(Math.max(0.001, 1 - p.vanish));
      p.group.rotation.y += dt * 8;
    }
    this.leaving = this.leaving.filter((p) => {
      if (p.vanish < 1) return true;
      this.stage.scene.remove(p.group);
      return false;
    });

    // Hover ghost
    const showGhost = this.turn === "player" && this.ghostCell >= 0;
    this.ghost.visible = showGhost;
    if (showGhost) {
      this.ghost.position.set(cellX(this.ghostCell), REST_Y + 0.15 + Math.sin(this.time * 5) * 0.08, cellZ(this.ghostCell));
      this.ghost.rotation.y += dt * 1.5;
    }

    // Bot thinking dots bounce in a wave
    if (this.thinking.visible) {
      this.thinking.position.set(0, 2.2, -4.9);
      this.thinking.children.forEach((d, i) => {
        d.position.y = Math.abs(Math.sin(this.time * 6 - i * 0.7)) * 0.7;
      });
    }

    // Winning line grows in
    if (this.line) {
      this.lineT = Math.min(1, this.lineT + dt * 2.5);
      const s = this.lineT * this.lineT * (3 - 2 * this.lineT);
      this.line.scale.set(s, s, s);
      this.lineMat.emissiveIntensity = 0.7 + Math.sin(this.time * 7) * 0.3;
    }
    if (this.resultKind) this.resultParty += dt;
  }

  private stepPiece(p: Piece, dt: number) {
    const g = p.group;
    if (!p.landed) {
      if (!this.reduced) {
        p.vy -= 38 * dt;
        p.y += p.vy * dt;
      } else {
        p.y = REST_Y;
      }
      if (p.y <= REST_Y) {
        p.y = REST_Y;
        const hard = Math.abs(p.vy);
        if (hard > 6 && !this.reduced) {
          p.vy = hard * 0.32;
          p.squash.kick(-hard * 0.35);
        } else {
          p.vy = 0;
          p.landed = true;
          p.squash.kick(this.reduced ? 0 : -3);
          if (this.pending && this.pending.cell === p.cell) {
            const { by } = this.pending;
            this.pending = null;
            this.landed(by);
          }
        }
      }
      g.rotation.y += dt * 10 * Math.max(0, p.y - REST_Y) * 0.2;
    }
    const sq = p.squash.step(dt);
    let y = p.y;
    let spin = 0;
    let scaleBoost = 1;
    if (p.landed && !this.reduced) {
      // Idle breathing keeps the board alive.
      scaleBoost = 1 + Math.sin(this.time * 2.2 + p.cell) * 0.025;
    }
    if (p.party !== -1 && this.resultKind) {
      p.party += dt;
      const t = p.party;
      if (t > 0 && this.resultKind !== "lose" && !this.reduced) {
        y += Math.abs(Math.sin(t * 6)) * (this.resultKind === "win" ? 0.9 : 0.35);
        spin = t * 4;
      } else if (t > 0 && this.resultKind === "lose" && !this.reduced) {
        spin = Math.sin(t * 4) * 0.25;
      }
    }
    g.position.set(cellX(p.cell), y, cellZ(p.cell));
    g.scale.set((1 + sq * 0.25) * scaleBoost, (1 - sq * 0.35) * scaleBoost, (1 + sq * 0.25) * scaleBoost);
    if (p.landed) g.rotation.y = spin;
  }

  protected onDestroy() {
    clearTimeout(this.botTimer);
  }
}
