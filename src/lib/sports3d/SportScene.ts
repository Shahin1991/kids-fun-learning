import * as THREE from "three";
import { isAppPaused } from "@/lib/app-pause";
import { Confetti } from "@/lib/fx/confetti";
import { Stage } from "@/lib/fx/stage";
import { playerList, type SportEngine, type SportHud, type SportOptions, type SportPlayer, type SportSetup, type SportSoundKind } from "./types";

/**
 * Base for the four sports games: Three.js stage with shadows, a render loop that stops while the
 * app is paused, pointer helpers, timed callbacks, HUD/sound plumbing and strict teardown.
 */
export abstract class SportScene implements SportEngine {
  protected readonly stage: Stage;
  protected readonly confetti: Confetti;
  protected readonly reduced: boolean;
  protected setup: SportSetup;
  protected players: SportPlayer[] = [];
  protected turn = 0;
  protected time = 0;
  protected over = false;
  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private timers: { at: number; fn: () => void }[] = [];
  private raf = 0;
  private lastT = 0;
  private destroyed = false;
  private hud: SportHud = { players: [], turn: 0, message: "" };
  protected overlay: { scene: THREE.Scene; camera: THREE.PerspectiveCamera } | null = null;

  constructor(protected container: HTMLElement, protected opts: SportOptions, background: number, fov = 45) {
    this.reduced = Boolean(opts.reducedMotion);
    this.setup = { opponent: opts.opponent, level: opts.level, variant: opts.variant };
    this.stage = new Stage(container, background, fov);
    this.stage.renderer.shadowMap.enabled = true;
    this.stage.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.confetti = new Confetti(this.stage.scene);
    this.stage.onDispose(() => this.confetti.dispose());
  }

  protected abstract update(dt: number): void;
  protected abstract startGame(): void;
  protected onResize?(aspect: number): void;
  protected onDown?(e: PointerEvent): void;
  protected onMove?(e: PointerEvent): void;
  protected onUp?(e: PointerEvent): void;
  protected onDestroy?(): void;

  protected start() {
    this.container.addEventListener("pointerdown", this.handleDown);
    window.addEventListener("pointermove", this.handleMove);
    window.addEventListener("pointerup", this.handleUp);
    window.addEventListener("pointercancel", this.handleUp);
    this.resize();
    this.newGame(this.setup);
    this.raf = requestAnimationFrame(this.loop);
  }

  newGame(setup: SportSetup) {
    this.setup = { ...setup };
    this.timers = [];
    this.players = playerList(setup.opponent);
    this.turn = 0;
    this.over = false;
    this.startGame();
  }

  resize() {
    const aspect = this.stage.resize();
    this.onResize?.(aspect);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.container.removeEventListener("pointerdown", this.handleDown);
    window.removeEventListener("pointermove", this.handleMove);
    window.removeEventListener("pointerup", this.handleUp);
    window.removeEventListener("pointercancel", this.handleUp);
    this.timers = [];
    this.onDestroy?.();
    this.stage.dispose();
  }

  // ---- helpers ----
  protected get isRobotTurn() {
    return this.setup.opponent === "robot" && this.turn === 1;
  }

  protected after(seconds: number, fn: () => void) {
    this.timers.push({ at: this.time + seconds, fn });
  }

  protected sound(kind: SportSoundKind, strength = 1) {
    this.opts.onSound({ kind, strength: Math.max(0, Math.min(1, strength)) });
  }

  /** Merges into the HUD and sends it to the shell. */
  protected emitHud(patch: Partial<SportHud> = {}) {
    this.hud = { ...this.hud, ...patch, players: this.players.map((p) => ({ ...p })), turn: this.turn };
    this.opts.onHud(this.hud);
  }

  protected setRay(e: PointerEvent, offsetY = 0) {
    const r = this.stage.renderer.domElement.getBoundingClientRect();
    this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - offsetY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.stage.camera);
    return this.raycaster;
  }

  protected rayPlane(e: PointerEvent, plane: THREE.Plane, offsetY = 0): THREE.Vector3 | null {
    const p = new THREE.Vector3();
    return this.setRay(e, offsetY).ray.intersectPlane(plane, p) ? p : null;
  }

  /** Screen position (CSS px) of a world point. */
  protected toScreen(v: THREE.Vector3): { x: number; y: number } {
    const r = this.stage.renderer.domElement.getBoundingClientRect();
    const p = v.clone().project(this.stage.camera);
    return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height };
  }

  protected screenMin() {
    const r = this.stage.renderer.domElement.getBoundingClientRect();
    return Math.max(1, Math.min(r.width, r.height));
  }

  protected celebrate(at: THREE.Vector3, power = 6) {
    if (this.reduced) return;
    this.confetti.burst(at, [0xff6b6b, 0xffd93d, 0x6bcb77, 0x4d96ff, 0x9b51e0], 40, power);
  }

  private loop = (t: number) => {
    if (this.destroyed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(1 / 30, this.lastT ? (t - this.lastT) / 1000 : 1 / 60);
    this.lastT = t;
    if (isAppPaused()) return;
    this.time += dt;
    if (this.timers.length) {
      const due = this.timers.filter((x) => x.at <= this.time);
      this.timers = this.timers.filter((x) => x.at > this.time);
      due.forEach((x) => x.fn());
    }
    this.update(dt);
    this.confetti.update(dt);
    this.stage.renderer.render(this.stage.scene, this.stage.camera);
    if (this.overlay) {
      // First-person props (the bow) drawn on top with their own camera.
      const r = this.stage.renderer;
      r.autoClear = false;
      r.clearDepth();
      r.render(this.overlay.scene, this.overlay.camera);
      r.autoClear = true;
    }
  };

  private handleDown = (e: PointerEvent) => {
    if (e.button !== undefined && e.button > 0) return;
    if ((e.target as HTMLElement | null)?.closest?.("button,[role=dialog]")) return;
    this.onDown?.(e);
  };
  private handleMove = (e: PointerEvent) => this.onMove?.(e);
  private handleUp = (e: PointerEvent) => this.onUp?.(e);
}

/** Shared canvas-text sprite for floating score labels. */
export function textSprite(text: string, color = "#ffffff", stroke = "#3b2f4a"): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 160;
  const g = c.getContext("2d")!;
  g.font = "900 96px system-ui, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineWidth = 16;
  g.strokeStyle = stroke;
  g.strokeText(text, 256, 84);
  g.fillStyle = color;
  g.fillText(text, 256, 84);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.renderOrder = 10;
  return s;
}

export function disposeObject(o: THREE.Object3D) {
  o.traverse((c) => {
    if (c instanceof THREE.Mesh || c instanceof THREE.Sprite || c instanceof THREE.Line) {
      c.geometry?.dispose();
      const mats = Array.isArray(c.material) ? c.material : [c.material];
      mats.forEach((m: THREE.Material & { map?: THREE.Texture | null }) => {
        m.map?.dispose();
        m.dispose();
      });
    }
  });
  o.removeFromParent();
}
