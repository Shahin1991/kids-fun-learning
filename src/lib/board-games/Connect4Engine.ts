import * as THREE from "three";
import { addToyRoom } from "@/lib/toy3d/scenery";
import { Spring } from "@/lib/toy3d/spring";
import { ToyScene, type PickInfo } from "@/lib/toy3d/ToyScene";
import { botColumn, COLS, drop, emptyBoard, findWin, idx, isFull, landingRow, ROWS, type Board, type Disc } from "./connect4";
import type { BoardEngine, BoardOptions, GameLevel } from "./types";

const CELL = 1.1;
const LEG = 0.9;
const FRAME_W = COLS * CELL + 0.7;
const FRAME_H = ROWS * CELL + 0.7;
const TOP_Y = LEG + FRAME_H;
const PLAYER_COLOR = 0xff4d4d;
const BOT_COLOR = 0xffd93d;

const colX = (c: number) => (c - (COLS - 1) / 2) * CELL;
const rowY = (r: number) => LEG + 0.35 + (r + 0.5) * CELL;

interface DiscObj {
  group: THREE.Group;
  disc: Disc;
  col: number;
  row: number;
  y: number;
  vy: number;
  bounces: number;
  landed: boolean;
  squash: Spring;
  party: number;
  // Only used while the disc is falling out of a cleared board
  vx: number;
  spin: number;
}

/** Upright Connect 4 toy: discs fall and bounce through a glossy blue frame; the board empties by dropping the discs out. */
export class Connect4Engine extends ToyScene implements BoardEngine {
  private board: Board = emptyBoard();
  private discs: (DiscObj | null)[] = Array(COLS * ROWS).fill(null);
  private falling: DiscObj[] = [];
  private turn: "player" | "bot" | "busy" | "over" = "player";
  private level: GameLevel;
  private games = 0;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private hoverCol = 3;
  private hoverX = 0;
  private hoverTargetX = 0;
  private hoverDisc: THREE.Group;
  /** Aiming: the finger is down (or the mouse is over a column). Releasing drops the disc; sliding off the board cancels. */
  private pressed = false;
  private aimCol = -1;
  private guide: THREE.Mesh;
  private guideMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, depthWrite: false });
  private ghost: THREE.Group;
  private ghostMats: THREE.MeshStandardMaterial[] = [];
  private arrow: THREE.Mesh;
  private arrowMat = new THREE.MeshStandardMaterial({ color: 0xffd93d, emissive: 0xffa500, emissiveIntensity: 0.5 });
  private wiggle = 0;
  private hoverAs: Disc = 1;
  private pending: { col: number; row: number; by: "player" | "bot" } | null = null;
  private history: { col: number; row: number; by: "player" | "bot" }[] = [];
  private rings: THREE.Mesh[] = [];
  private result: "win" | "lose" | "draw" | null = null;
  private resultT = 0;
  private frame: THREE.Group;
  private discGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.36, 36).rotateX(Math.PI / 2);
  private coreGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.4, 28).rotateX(Math.PI / 2);
  private mats: Record<Disc, { face: THREE.MeshPhysicalMaterial; core: THREE.MeshPhysicalMaterial }>;

  constructor(container: HTMLElement, private opts: BoardOptions = {}) {
    super(container, 0xc8f0d0, opts, 40);
    this.level = opts.level ?? "easy";
    addToyRoom(this.stage.scene, 0xd6f5dd, 0xd9a86c);
    const make = (c: number) => ({
      face: new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.15 }),
      core: new THREE.MeshPhysicalMaterial({ color: new THREE.Color(c).multiplyScalar(0.8), roughness: 0.4, clearcoat: 0.6 }),
    });
    this.mats = { 1: make(PLAYER_COLOR), 2: make(BOT_COLOR) };
    this.frame = this.buildFrame();
    this.hoverDisc = this.makeDisc(1);
    this.stage.scene.add(this.hoverDisc);
    // Column guide + ghost disc show exactly where the disc will land; the arrow says "slide me, then let go".
    this.guide = new THREE.Mesh(new THREE.BoxGeometry(CELL * 0.98, FRAME_H, 0.8), this.guideMat);
    this.guide.position.set(0, LEG + FRAME_H / 2, 0.1);
    this.guide.visible = false;
    this.stage.scene.add(this.guide);
    this.ghost = new THREE.Group();
    this.ghostMats = [new THREE.MeshStandardMaterial({ color: PLAYER_COLOR, transparent: true, opacity: 0.5 }), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })];
    this.ghost.add(new THREE.Mesh(this.discGeo, this.ghostMats[0]), new THREE.Mesh(this.coreGeo, this.ghostMats[1]));
    this.ghost.visible = false;
    this.stage.scene.add(this.ghost);
    this.arrow = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.55, 16).rotateX(Math.PI), this.arrowMat);
    this.arrow.visible = false;
    this.stage.scene.add(this.arrow);
    this.start();
    this.beginTurn();
  }

  // ---- public API ----
  setLevel(level: GameLevel) {
    this.level = level;
    this.newGame();
  }

  newGame() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    // The board empties the way the real toy does: every disc drops out of the bottom.
    this.discs.forEach((d) => {
      if (!d) return;
      d.vy = 0;
      d.vx = (Math.random() - 0.5) * 3;
      d.spin = (Math.random() - 0.5) * 8;
      this.falling.push(d);
    });
    this.discs = Array(COLS * ROWS).fill(null);
    this.board = emptyBoard();
    this.pending = null;
    this.history = [];
    this.result = null;
    this.rings.forEach((r) => {
      this.stage.scene.remove(r);
      r.geometry.dispose();
    });
    this.rings = [];
    this.games += 1;
    this.turn = "busy";
    this.timers.push(setTimeout(() => this.beginTurn(), this.reduced ? 0 : 600));
  }

  /** Oops: take back your last disc (and Robo's answer to it). The discs slip out of the bottom. Only on your turn. */
  undo() {
    if (this.turn !== "player" || !this.history.some((h) => h.by === "player")) return;
    while (this.history.length) {
      const e = this.history.pop()!;
      const i = idx(e.row, e.col);
      const d = this.discs[i];
      if (d) {
        d.vy = 0;
        d.vx = (Math.random() - 0.5) * 2;
        d.spin = (Math.random() - 0.5) * 6;
        this.falling.push(d);
      }
      this.discs[i] = null;
      this.board[i] = 0;
      if (e.by === "player") break;
    }
    this.aimCol = -1;
    this.opts.onStatus?.("player");
    this.emitUndo();
  }

  private emitUndo() {
    this.opts.onUndoable?.(this.turn === "player" && this.history.some((h) => h.by === "player"));
  }

  activate(id: string) {
    this.tryDrop(Number(id));
  }

  // ---- scene ----
  private buildFrame(): THREE.Group {
    const g = new THREE.Group();
    const shape = new THREE.Shape();
    const w = FRAME_W / 2;
    const h = FRAME_H / 2;
    const r = 0.5;
    shape.moveTo(-w + r, -h);
    shape.lineTo(w - r, -h);
    shape.quadraticCurveTo(w, -h, w, -h + r);
    shape.lineTo(w, h - r);
    shape.quadraticCurveTo(w, h, w - r, h);
    shape.lineTo(-w + r, h);
    shape.quadraticCurveTo(-w, h, -w, h - r);
    shape.lineTo(-w, -h + r);
    shape.quadraticCurveTo(-w, -h, -w + r, -h);
    for (let c = 0; c < COLS; c++) {
      for (let row = 0; row < ROWS; row++) {
        const hole = new THREE.Path();
        hole.absarc(colX(c), (row + 0.5) * CELL - (ROWS * CELL) / 2, 0.47, 0, Math.PI * 2, true);
        shape.holes.push(hole);
      }
    }
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2, curveSegments: 24 });
    geo.translate(0, 0, -0.25);
    const blue = new THREE.MeshPhysicalMaterial({ color: 0x2f7bff, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 });
    const board = new THREE.Mesh(geo, blue);
    board.position.y = LEG + FRAME_H / 2;
    g.add(board);
    const legMat = new THREE.MeshStandardMaterial({ color: 0xffd93d, roughness: 0.5 });
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.5, LEG + 0.2, 1.6), legMat);
      leg.position.set(s * (FRAME_W / 2 - 0.4), (LEG + 0.2) / 2, 0);
      g.add(leg);
    }
    this.stage.scene.add(g);
    for (let c = 0; c < COLS; c++) {
      const hit = this.hitBox(c, CELL, FRAME_H + 3, 2.4);
      hit.position.set(colX(c), LEG + FRAME_H / 2 + 0.8, 0.4);
      this.stage.scene.add(hit);
      this.pickables.push(hit);
    }
    return g;
  }

  private makeDisc(d: Disc): THREE.Group {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(this.discGeo, this.mats[d].face));
    g.add(new THREE.Mesh(this.coreGeo, this.mats[d].core));
    return g;
  }

  // ---- flow ----
  private beginTurn() {
    const botStarts = this.games % 2 === 1;
    if (botStarts) {
      this.startBotTurn();
    } else {
      this.turn = "player";
      this.setHoverAs(1);
      this.opts.onStatus?.("player");
    }
  }

  private setHoverAs(d: Disc) {
    this.hoverAs = d;
    this.hoverDisc.children.forEach((c, i) => {
      const m = this.mats[d];
      (c as THREE.Mesh).material = i === 0 ? m.face : m.core;
    });
  }

  private startBotTurn() {
    this.turn = "bot";
    this.opts.onStatus?.("bot");
    this.setHoverAs(2);
    // The bot's disc wanders over a couple of columns, then settles on its choice.
    const wander = Math.floor(Math.random() * COLS);
    this.hoverCol = wander;
    this.timers.push(
      setTimeout(() => {
        const col = botColumn(this.board, 2, this.level);
        this.hoverCol = col;
        this.timers.push(setTimeout(() => this.dropDisc(col, "bot"), 650));
      }, 700),
    );
  }

  private tryDrop(col: number) {
    if (this.turn !== "player" || landingRow(this.board, col) < 0) return;
    this.dropDisc(col, "player");
  }

  private dropDisc(col: number, by: "player" | "bot") {
    const d: Disc = by === "player" ? 1 : 2;
    const row = landingRow(this.board, col);
    if (row < 0) return;
    this.board = drop(this.board, col, d)!;
    this.history.push({ col, row, by });
    this.turn = "busy";
    this.emitUndo();
    const group = this.makeDisc(d);
    const y0 = TOP_Y + 1;
    group.position.set(colX(col), y0, 0);
    this.stage.scene.add(group);
    this.discs[idx(row, col)] = { group, disc: d, col, row, y: this.reduced ? rowY(row) : y0, vy: 0, bounces: 0, landed: false, squash: new Spring(0, 0, 260, 9), party: -1, vx: 0, spin: 0 };
    this.pending = { col, row, by };
  }

  private landed(by: "player" | "bot") {
    this.opts.onPlace?.({ by, n: this.board.filter(Boolean).length });
    const w = findWin(this.board);
    if (w) {
      this.finish(w.disc === 1 ? "win" : "lose", w.cells);
    } else if (isFull(this.board)) {
      this.finish("draw");
    } else if (by === "player") {
      this.startBotTurn();
    } else {
      this.turn = "player";
      this.setHoverAs(1);
      this.opts.onStatus?.("player");
      this.emitUndo();
    }
  }

  private finish(kind: "win" | "lose" | "draw", cells?: number[]) {
    this.turn = "over";
    this.emitUndo();
    this.result = kind;
    this.resultT = 0;
    this.opts.onStatus?.(kind);
    this.opts.onResult?.({ result: kind, level: this.level });
    if (cells) {
      const ringMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffe066, emissiveIntensity: 1, roughness: 0.3 });
      cells.forEach((i, n) => {
        const d = this.discs[i];
        if (d) d.party = -n * 0.15;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.07, 10, 36), ringMat);
        ring.position.set(colX(i % COLS), rowY(Math.floor(i / COLS)), 0.26);
        this.stage.scene.add(ring);
        this.rings.push(ring);
      });
      if (kind === "win") this.confetti.burst(new THREE.Vector3(0, TOP_Y - 1, 1.5), [0xffd93d, 0xff4d4d, 0x4d96ff, 0x6bcb77, 0xffffff], 80, 10);
    }
  }

  // ---- input ----
  // Press (or hover) to aim, slide to another column, let go to drop. Letting go off the board cancels.
  protected onDown(info: PickInfo | null) {
    if (this.turn !== "player") return;
    this.pressed = true;
    this.aimCol = typeof info?.owner === "number" ? info.owner : -1;
    if (this.aimCol >= 0) this.hoverCol = this.aimCol;
  }

  protected onMove(e: PointerEvent) {
    if (this.turn !== "player") return;
    if (e.pointerType === "touch" && !this.pressed) return;
    const info = this.pick(e);
    this.aimCol = typeof info?.owner === "number" ? info.owner : -1;
    if (this.aimCol >= 0) this.hoverCol = this.aimCol;
  }

  protected onUp(e: PointerEvent) {
    if (!this.pressed) return;
    this.pressed = false;
    const col = this.aimCol;
    if (e.type === "pointercancel" || col < 0) {
      this.wiggle = 1;
      if (e.pointerType === "touch") this.aimCol = -1;
      return;
    }
    if (landingRow(this.board, col) < 0) {
      this.wiggle = 1;
      return;
    }
    if (e.pointerType === "touch") this.aimCol = -1;
    this.tryDrop(col);
  }

  protected onResize(aspect: number) {
    const cam = this.stage.camera;
    const tan = Math.tan((cam.fov * Math.PI) / 360);
    // Room above the frame for the hovering disc and the arrow, and below for the buttons.
    const needH = (TOP_Y + 4.2) / 2;
    const dist = Math.max((FRAME_W / 2 + 0.8) / (tan * aspect), needH / tan) * 1.12;
    const cy = (TOP_Y + 2.4) / 2 - 0.2;
    cam.position.set(0, cy + 2.6, dist);
    cam.lookAt(0, cy, 0);
  }

  // ---- loop ----
  protected update(dt: number) {
    for (const d of this.discs) if (d) this.stepDisc(d, dt);

    // Cleared discs fall out of the bottom of the frame.
    for (const d of this.falling) {
      d.vy -= 32 * dt;
      d.y += d.vy * dt;
      d.group.position.x += d.vx * dt;
      d.group.position.y = d.y;
      d.group.position.z += dt * 2;
      d.group.rotation.z += d.spin * dt;
    }
    this.falling = this.falling.filter((d) => {
      if (d.y > -4) return true;
      this.stage.scene.remove(d.group);
      return false;
    });

    // Hover disc follows the chosen column
    this.hoverTargetX = colX(this.hoverCol);
    this.hoverX += (this.hoverTargetX - this.hoverX) * Math.min(1, dt * 12);
    const show = this.turn === "player" || this.turn === "bot";
    this.hoverDisc.visible = show;
    if (show) {
      const bob = this.reduced ? 0 : Math.sin(this.time * 5) * 0.08;
      this.hoverDisc.position.set(this.hoverX, TOP_Y + 0.85 + bob, 0);
      this.hoverDisc.scale.setScalar(this.turn === "bot" ? 1 : 0.95 + Math.sin(this.time * 6) * 0.03);
      this.hoverDisc.rotation.z = this.turn === "bot" && !this.reduced ? Math.sin(this.time * 9) * 0.15 : 0;
    }

    // Aiming feedback
    const aiming = this.turn === "player";
    this.wiggle = Math.max(0, this.wiggle - dt * 3);
    this.arrow.visible = aiming;
    const full = this.aimCol >= 0 && landingRow(this.board, this.aimCol) < 0;
    const showGuide = aiming && this.aimCol >= 0;
    this.guide.visible = showGuide;
    this.guide.position.x = colX(Math.max(0, this.aimCol));
    this.guideMat.color.set(full ? 0xff5555 : 0xffffff);
    this.guideMat.opacity = full ? 0.3 : 0.2 + Math.sin(this.time * 6) * 0.05 + (this.pressed ? 0.08 : 0);
    const row = this.aimCol >= 0 ? landingRow(this.board, this.aimCol) : -1;
    this.ghost.visible = showGuide && row >= 0;
    if (this.ghost.visible) {
      this.ghost.position.set(colX(this.aimCol), rowY(row), 0);
      this.ghost.scale.setScalar(0.92 + Math.sin(this.time * 7) * 0.05);
    }
    if (aiming) {
      const wob = this.wiggle > 0 && !this.reduced ? Math.sin(this.time * 40) * 0.15 * this.wiggle : 0;
      this.arrow.position.set(this.hoverX + wob, TOP_Y + 1.75 + (this.reduced ? 0 : Math.abs(Math.sin(this.time * 5)) * 0.25), 0);
      if (this.pressed) this.hoverDisc.scale.setScalar(1.1);
    }

    this.rings.forEach((r, i) => {
      r.rotation.z += dt * 2;
      r.scale.setScalar(1 + Math.sin(this.time * 7 + i) * 0.08);
    });

    if (this.result) {
      this.resultT += dt;
      // A draw gives the whole frame a friendly wiggle; wins and losses leave it still.
      this.frame.rotation.z = this.result === "draw" && !this.reduced ? Math.sin(this.resultT * 8) * 0.03 * Math.max(0, 1 - this.resultT / 1.5) : 0;
    }
  }

  private stepDisc(d: DiscObj, dt: number) {
    const target = rowY(d.row);
    if (!d.landed) {
      if (this.reduced) {
        d.y = target;
        d.landed = true;
      } else {
        d.vy -= 34 * dt;
        d.y += d.vy * dt;
      }
      if (d.y <= target) {
        d.y = target;
        const hard = Math.abs(d.vy);
        if (hard > 5 && d.bounces < 2) {
          d.vy = hard * 0.3;
          d.bounces += 1;
          d.squash.kick(-hard * 0.25);
        } else {
          d.vy = 0;
          d.landed = true;
        }
        if (d.landed && this.pending && this.pending.col === d.col && this.pending.row === d.row) {
          const { by } = this.pending;
          this.pending = null;
          this.landed(by);
        }
      }
    }
    const sq = d.squash.step(dt);
    let y = d.y;
    let rotZ = 0;
    if (d.party !== -1 && this.result && this.result !== "draw") {
      d.party += dt;
      if (d.party > 0 && !this.reduced) {
        if (this.result === "win") {
          y += Math.abs(Math.sin(d.party * 5)) * 0.18;
          rotZ = d.party * 3;
        } else {
          rotZ = Math.sin(d.party * 5) * 0.2;
        }
      }
    }
    d.group.position.set(colX(d.col), y, 0);
    d.group.scale.set(1 + sq * 0.12, 1 - sq * 0.18, 1);
    d.group.rotation.z = rotZ;
  }

  protected onDestroy() {
    this.timers.forEach(clearTimeout);
    this.discGeo.dispose();
    this.coreGeo.dispose();
    this.ghostMats.forEach((m) => m.dispose());
    this.guideMat.dispose();
    this.arrowMat.dispose();
    Object.values(this.mats).forEach((m) => {
      m.face.dispose();
      m.core.dispose();
    });
  }
}
