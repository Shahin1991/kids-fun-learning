import * as THREE from "three";
import { Confetti } from "@/lib/fx/confetti";
import { Stage } from "@/lib/fx/stage";

export interface ToyOptions {
  reducedMotion?: boolean;
}

export interface PickInfo {
  /** Whatever the subclass stored in `userData.owner` of the hit object (or an ancestor). */
  owner: unknown;
  point: THREE.Vector3;
}

/** Minimal surface the generic React wrapper needs. */
export interface ToyEngine {
  resize(): void;
  destroy(): void;
  /** Keyboard / screen-reader equivalent of tapping an item. */
  activate?(id: string): void;
}

/**
 * Base for the simple 3D toy games: renderer + camera + render loop, pointer picking,
 * confetti and strict teardown. Subclasses build their scene, then call `start()`.
 */
export abstract class ToyScene implements ToyEngine {
  protected readonly stage: Stage;
  protected readonly confetti: Confetti;
  protected readonly reduced: boolean;
  protected time = 0;
  protected pickables: THREE.Object3D[] = [];
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private raf = 0;
  private lastT = 0;
  private destroyed = false;

  constructor(protected container: HTMLElement, background: number, opts: ToyOptions = {}, fov = 45) {
    this.reduced = Boolean(opts.reducedMotion);
    this.stage = new Stage(container, background, fov);
    this.confetti = new Confetti(this.stage.scene);
    this.stage.onDispose(() => this.confetti.dispose());
  }

  protected abstract update(dt: number): void;
  protected onResize?(aspect: number): void;
  protected onDown?(info: PickInfo | null, e: PointerEvent): void;
  protected onMove?(e: PointerEvent): void;
  protected onUp?(e: PointerEvent): void;
  protected onDestroy?(): void;

  protected start() {
    this.container.addEventListener("pointerdown", this.handleDown);
    window.addEventListener("pointermove", this.handleMove);
    window.addEventListener("pointerup", this.handleUp);
    window.addEventListener("pointercancel", this.handleUp);
    this.resize();
    this.raf = requestAnimationFrame(this.loop);
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
    this.onDestroy?.();
    this.stage.dispose();
  }

  // ---- helpers for subclasses ----
  private aim(e: PointerEvent) {
    const r = this.stage.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.stage.camera);
  }

  protected pick(e: PointerEvent): PickInfo | null {
    this.aim(e);
    const hit = this.raycaster.intersectObjects(this.pickables, true)[0];
    if (!hit) return null;
    let o: THREE.Object3D | null = hit.object;
    while (o && o.userData.owner === undefined) o = o.parent;
    return o ? { owner: o.userData.owner, point: hit.point } : null;
  }

  /** Where the pointer ray crosses the plane z = `z` (for dragging). */
  protected planePoint(e: PointerEvent, z = 0): THREE.Vector3 | null {
    this.aim(e);
    const p = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), -z), p) ? p : null;
  }

  /** Where the pointer ray crosses the horizontal plane y = `y` (for dragging along the floor). */
  protected groundPoint(e: PointerEvent, y = 0): THREE.Vector3 | null {
    this.aim(e);
    const p = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), p) ? p : null;
  }

  /** Invisible, generously sized hit target so small fingers do not have to be precise. */
  protected hitBox(owner: unknown, w: number, h: number, d: number): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false }));
    m.userData.owner = owner;
    return m;
  }

  // ---- internals ----
  private handleDown = (e: PointerEvent) => this.onDown?.(this.pick(e), e);
  private handleMove = (e: PointerEvent) => this.onMove?.(e);
  private handleUp = (e: PointerEvent) => this.onUp?.(e);

  private loop = (t: number) => {
    if (this.destroyed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.lastT ? (t - this.lastT) / 1000 : 0.016);
    this.lastT = t;
    this.time += dt;
    this.update(dt);
    this.confetti.update(dt);
    this.stage.renderer.render(this.stage.scene, this.stage.camera);
  };
}
