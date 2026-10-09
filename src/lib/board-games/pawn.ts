import * as THREE from "three";

const pawnProfile = [
  [0.0, 0.0], [0.34, 0.0], [0.36, 0.08], [0.3, 0.16], [0.18, 0.28], [0.13, 0.5], [0.2, 0.58], [0.2, 0.64], [0.0, 0.66],
].map(([x, y]) => new THREE.Vector2(x, y));
const lathe = new THREE.LatheGeometry(pawnProfile, 24);
const head = new THREE.SphereGeometry(0.24, 20, 16);
const eye = new THREE.SphereGeometry(0.055, 8, 6);
const pupil = new THREE.SphereGeometry(0.028, 8, 6);
const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
const black = new THREE.MeshBasicMaterial({ color: 0x222222 });

/** A chubby toy pawn with a friendly face. Geometry is shared, so only the paint material needs disposing (the Stage does that). */
export function makePawn(color: number, scale = 1): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  const body = new THREE.Mesh(lathe, mat);
  const ball = new THREE.Mesh(head, mat);
  ball.position.y = 0.78;
  g.add(body, ball);
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(eye, white);
    e.position.set(s * 0.09, 0.82, 0.2);
    const p = new THREE.Mesh(pupil, black);
    p.position.set(s * 0.09, 0.82, 0.24);
    g.add(e, p);
  }
  g.scale.setScalar(scale);
  return g;
}

interface Leg {
  from: THREE.Vector3;
  to: THREE.Vector3;
  dur: number;
  arc: number;
  curve?: THREE.Curve<THREE.Vector3>;
  onLand?: () => void;
}

/** Moves a pawn through a queue of hops, slides and curved rides, with a little squash when it lands. */
export class Mover {
  private legs: Leg[] = [];
  private t = 0;
  private impact = 0;
  private resting = new THREE.Vector3();
  private done: (() => void)[] = [];
  /** Idle bobbing for pawns that are waiting to be chosen */
  glow = 0;
  private time = Math.random() * 6;

  constructor(public group: THREE.Object3D, private reduced = false) {
    this.resting.copy(group.position);
  }

  get busy() {
    return this.legs.length > 0;
  }

  teleport(p: THREE.Vector3) {
    this.legs = [];
    this.group.position.copy(p);
    this.resting.copy(p);
  }

  /** Hop square to square; `onStep(i)` fires on each landing. */
  hop(points: THREE.Vector3[], opts: { dur?: number; arc?: number; onStep?: (i: number) => void; onDone?: () => void } = {}) {
    let from = this.legs.length ? this.legs[this.legs.length - 1].to : this.resting;
    points.forEach((to, i) => {
      this.legs.push({ from: from.clone(), to: to.clone(), dur: this.reduced ? 0.05 : opts.dur ?? 0.26, arc: this.reduced ? 0 : opts.arc ?? 0.55, onLand: () => opts.onStep?.(i) });
      from = to;
    });
    if (opts.onDone) this.done.push(opts.onDone);
  }

  /** Smooth ride along a curve (ladder climb, snake slide). */
  ride(curve: THREE.Curve<THREE.Vector3>, dur: number, onDone?: () => void) {
    const start = curve.getPoint(0);
    const end = curve.getPoint(1);
    this.legs.push({ from: start, to: end, dur: this.reduced ? 0.05 : dur, arc: 0, curve });
    if (onDone) this.done.push(onDone);
  }

  /** Jump (arc) to a point, e.g. back to base after being captured. */
  fling(to: THREE.Vector3, dur = 0.7, arc = 2.2, onDone?: () => void) {
    const from = this.legs.length ? this.legs[this.legs.length - 1].to : this.resting;
    this.legs.push({ from: from.clone(), to: to.clone(), dur: this.reduced ? 0.05 : dur, arc });
    if (onDone) this.done.push(onDone);
  }

  update(dt: number) {
    this.time += dt;
    const g = this.group;
    const leg = this.legs[0];
    if (leg) {
      this.t += dt / leg.dur;
      const k = Math.min(1, this.t);
      if (leg.curve) {
        g.position.copy(leg.curve.getPoint(k));
      } else {
        g.position.lerpVectors(leg.from, leg.to, k);
        g.position.y += Math.sin(k * Math.PI) * leg.arc;
      }
      // stretch while airborne
      const air = leg.arc > 0 ? Math.sin(k * Math.PI) : 0;
      g.scale.set(1 - air * 0.08, 1 + air * 0.12, 1 - air * 0.08);
      if (this.t >= 1) {
        this.t = 0;
        this.legs.shift();
        this.resting.copy(leg.to);
        g.position.copy(leg.to);
        if (!this.reduced && leg.arc > 0) this.impact = 1;
        leg.onLand?.();
        if (this.legs.length === 0) {
          const cbs = this.done;
          this.done = [];
          cbs.forEach((f) => f());
        }
      }
    } else {
      this.impact = Math.max(0, this.impact - dt * 4);
      const sq = Math.sin(this.impact * Math.PI) * 0.18 * this.impact;
      const bounce = this.glow > 0 && !this.reduced ? Math.abs(Math.sin(this.time * 6)) * 0.28 * this.glow : 0;
      g.scale.set(1 + sq + (this.glow > 0 ? 0.12 * this.glow : 0), 1 - sq + (this.glow > 0 ? 0.12 * this.glow : 0), 1 + sq + (this.glow > 0 ? 0.12 * this.glow : 0));
      g.position.y = this.resting.y + bounce;
    }
  }
}
