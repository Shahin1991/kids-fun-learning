import * as CANNON from "cannon-es";
import { lockToPlane, STEP } from "./physics";

/**
 * Marble Run: drag ramps into the gaps of a fixed course so the marble rolls from the start into the
 * cup. The course is built here (no Three.js) so the engine and the tests use exactly the same
 * physics, and every puzzle ships with a solution the tests prove works.
 */

export const MARBLE_R = 0.25;
export const THICK = 0.22;
export const AREA = { minX: -6.6, maxX: 6.6, minY: 0, maxY: 9.6 };
/** Ramp angles a tap cycles through (radians, 15° steps) */
export const ANGLES = [-45, -30, -15, 0, 15, 30, 45].map((d) => (d * Math.PI) / 180);
export const GRID = 0.25;

export interface Plank {
  x: number;
  y: number;
  len: number;
  /** Radians; positive tilts the right end up */
  angle: number;
}

export interface Pose {
  x: number;
  y: number;
  angle: number;
}

export interface Puzzle {
  name: string;
  /** Where the marble is let go */
  start: { x: number; y: number };
  /** Cup on the floor: centre x and inner width */
  cup: { x: number; w: number };
  /** Fixed course pieces (ledges, walls) */
  fixed: Plank[];
  /** Lengths of the ramps the child places */
  ramps: number[];
  /** A placement that gets the marble into the cup (checked by the tests) */
  solution: Pose[];
}

const deg = (d: number) => (d * Math.PI) / 180;
/** A plank from point a to point b (left to right) */
const span = (ax: number, ay: number, bx: number, by: number): Plank => ({ x: (ax + bx) / 2, y: (ay + by) / 2, len: Math.hypot(bx - ax, by - ay), angle: Math.atan2(by - ay, bx - ax) });
const wall = (x: number, y0: number, y1: number): Plank => ({ x, y: (y0 + y1) / 2, len: y1 - y0, angle: Math.PI / 2 });

export const CUP_WALL = 1.0;

export const PUZZLES: Puzzle[] = [
  {
    name: "Build a bridge",
    start: { x: -5.6, y: 8.9 },
    cup: { x: 5.1, w: 1.3 },
    fixed: [span(-6.3, 8.1, -3.2, 7.5), span(0.6, 4.4, 4.0, 3.7), wall(6.0, 0, 4.6)],
    ramps: [3.5],
    solution: [{ x: -1.25, y: 6.25, angle: deg(-30) }],
  },
  {
    // The marble bumps into a wall and drops; a ramp below sends it back to a cup on the left
    name: "Turn it around",
    start: { x: -4.6, y: 9.0 },
    cup: { x: -5.75, w: 1.3 },
    fixed: [span(-5.6, 8.3, -1.0, 7.7), wall(0.4, 5.6, 8.6), wall(-6.5, 0, 5.2)],
    ramps: [3.5],
    solution: [{ x: -1.5, y: 5.25, angle: deg(15) }],
  },
  {
    name: "Two bridges",
    start: { x: -5.9, y: 9.1 },
    cup: { x: 5.65, w: 1.2 },
    fixed: [span(-6.4, 8.5, -4.1, 8.15), span(-1.4, 5.85, 1.4, 5.6), span(4.1, 3.4, 5.0, 3.2), wall(6.6, 0, 4.4)],
    ramps: [3.5, 3.5],
    solution: [
      { x: -2.75, y: 7.0, angle: deg(-30) },
      { x: 2.75, y: 4.5, angle: deg(-30) },
    ],
  },
  {
    // No ledge at the start: catch the falling marble and fling it over the low wall
    name: "Catch and fling",
    start: { x: -4.0, y: 8.8 },
    cup: { x: 4.0, w: 1.6 },
    fixed: [wall(1.0, 0, 2.0), wall(5.3, 0, 4.2)],
    ramps: [3.5],
    solution: [{ x: -2.75, y: 5.5, angle: deg(-30) }],
  },
];

export function rampTray(p: Puzzle): Pose[] {
  // Ramps wait flat on the floor, on the side away from the cup
  const fromLeft = p.cup.x > 0;
  let edge = fromLeft ? AREA.minX + 0.3 : AREA.maxX - 0.3;
  return p.ramps.map((len) => {
    const pose = { x: fromLeft ? edge + len / 2 : edge - len / 2, y: 0.3, angle: 0 };
    edge += fromLeft ? len + 0.4 : -(len + 0.4);
    return pose;
  });
}

export const snap = (v: number) => Math.round(v / GRID) * GRID;

export interface Run {
  world: CANNON.World;
  marble: CANNON.Body;
  ramps: CANNON.Body[];
  /** Places ramp i (while the marble is not rolling) */
  setRamp: (i: number, pose: Pose) => void;
  release: () => void;
  reset: () => void;
  /** "ready" until the marble is let go */
  status: () => "ready" | "rolling" | "cup" | "miss";
  step: (dt: number) => void;
}

function plankBody(mat: CANNON.Material, p: Plank): CANNON.Body {
  const b = new CANNON.Body({ mass: 0, material: mat, shape: new CANNON.Box(new CANNON.Vec3(p.len / 2, THICK / 2, 0.5)) });
  b.position.set(p.x, p.y, 0);
  b.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), p.angle);
  return b;
}

export function buildRun(puzzle: Puzzle, poses: Pose[]): Run {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.8, 0) });
  const track = new CANNON.Material("track");
  const ball = new CANNON.Material("marble");
  world.addContactMaterial(new CANNON.ContactMaterial(track, ball, { friction: 0.3, restitution: 0.15 }));
  const floor = new CANNON.Body({ mass: 0, material: track, shape: new CANNON.Box(new CANNON.Vec3(20, 0.5, 2)) });
  floor.position.set(0, -0.5, 0);
  world.addBody(floor);
  for (const f of puzzle.fixed) world.addBody(plankBody(track, f));
  // Cup: two walls on the floor
  const { x: cx, w } = puzzle.cup;
  for (const sx of [-1, 1]) world.addBody(plankBody(track, wall(cx + sx * (w / 2 + THICK / 2), 0, CUP_WALL)));
  const ramps = poses.map((p, i) => {
    const b = plankBody(track, { ...p, len: puzzle.ramps[i] });
    world.addBody(b);
    return b;
  });
  const marble = new CANNON.Body({ mass: 1, material: ball, shape: new CANNON.Sphere(MARBLE_R) });
  lockToPlane(marble);
  marble.angularDamping = 0.05;
  marble.linearDamping = 0.01;

  let rolling = false;
  let still = 0;
  let t = 0;
  const reset = () => {
    if (rolling) world.removeBody(marble);
    rolling = false;
    still = 0;
    t = 0;
    marble.position.set(puzzle.start.x, puzzle.start.y, 0);
    marble.velocity.set(0, 0, 0);
    marble.angularVelocity.set(0, 0, 0);
    marble.quaternion.set(0, 0, 0, 1);
    marble.previousPosition.copy(marble.position);
    marble.interpolatedPosition.copy(marble.position);
  };
  reset();
  return {
    world,
    marble,
    ramps,
    setRamp: (i, pose) => {
      const b = ramps[i];
      b.position.set(pose.x, pose.y, 0);
      b.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), pose.angle);
      b.aabbNeedsUpdate = true;
    },
    release: () => {
      if (rolling) return;
      reset();
      world.addBody(marble);
      rolling = true;
    },
    reset,
    status: () => {
      if (!rolling) return "ready";
      const p = marble.position;
      const v = marble.velocity.length();
      if (Math.abs(p.x - cx) < w / 2 && p.y < CUP_WALL && v < 1) return "cup";
      if (p.x < AREA.minX - 1 || p.x > AREA.maxX + 1 || p.y < -1) return "miss";
      // Stopped somewhere that is not the cup, or rolling around for too long
      if (still > 1 || t > 20) return "miss";
      return "rolling";
    },
    step: (dt) => {
      world.step(STEP, dt, 5);
      if (!rolling) return;
      t += dt;
      still = marble.velocity.length() < 0.06 ? still + dt : 0;
    },
  };
}

/** Runs the marble headless and reports where it ended up. */
export function simulate(puzzle: Puzzle, poses: Pose[], maxT = 20): { result: "cup" | "miss"; path: { x: number; y: number }[] } {
  const run = buildRun(puzzle, poses);
  run.release();
  const path: { x: number; y: number }[] = [];
  for (let t = 0; t < maxT; t += STEP) {
    run.step(STEP);
    if (Math.round(t / STEP) % 15 === 0) path.push({ x: +run.marble.position.x.toFixed(2), y: +run.marble.position.y.toFixed(2) });
    const s = run.status();
    if (s === "cup" || s === "miss") return { result: s, path };
  }
  return { result: "miss", path };
}
