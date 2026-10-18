import * as CANNON from "cannon-es";
import type * as THREE from "three";

/** Shared cannon-es plumbing for the physics toys. */

export const STEP = 1 / 60;

/** Steps the world on a fixed clock (so results do not depend on the frame rate). */
export function stepWorld(world: CANNON.World, dt: number) {
  world.step(STEP, dt, 5);
}

/**
 * Draws a body where it is *between* physics steps. A frame can run zero or two fixed steps
 * (120 Hz screens, busy frames); drawing the raw position then judders.
 */
export function syncMesh(mesh: THREE.Object3D, body: CANNON.Body) {
  const p = body.interpolatedPosition;
  const q = body.interpolatedQuaternion;
  mesh.position.set(p.x, p.y, p.z);
  mesh.quaternion.set(q.x, q.y, q.z, q.w);
}

/** Keeps a body moving in the screen plane (x/y) and spinning only about z, so play stays readable. */
export function lockToPlane(body: CANNON.Body, strict = true) {
  body.linearFactor.set(1, 1, strict ? 0 : 0.1);
  body.angularFactor.set(strict ? 0 : 0.05, strict ? 0 : 0.05, 1);
}

export function staticBox(world: CANNON.World, mat: CANNON.Material, x: number, y: number, w: number, h: number, d = 1, angle = 0): CANNON.Body {
  const body = new CANNON.Body({ mass: 0, material: mat, shape: new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)) });
  body.position.set(x, y, 0);
  if (angle) body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), angle);
  world.addBody(body);
  return body;
}

/**
 * Points a front-on camera so a box of the screen plane (z = 0) fits between the HUD at the top
 * (scoreboard and status line) and the hint bar at the bottom. Margins are fractions of the screen.
 */
export function fitFrontCamera(
  cam: THREE.PerspectiveCamera,
  box: { minX: number; maxX: number; minY: number; maxY: number },
  margins = { top: 0.24, bottom: 0.12, side: 0.04 },
) {
  const tan = Math.tan((cam.fov * Math.PI) / 360);
  const spanY = box.maxY - box.minY;
  const spanX = box.maxX - box.minX;
  // Half the visible height needed for the box to fill the room left between the margins
  const halfH = Math.max(spanY / (2 * (1 - margins.top - margins.bottom)), spanX / (2 * (1 - 2 * margins.side) * cam.aspect));
  const cx = (box.minX + box.maxX) / 2;
  // Box bottom sits `bottom` of the screen up from the bottom edge (and the box is centred in the room if wider)
  const room = 2 * halfH * (1 - margins.top - margins.bottom);
  const cy = box.minY - (room - spanY) / 2 - 2 * halfH * margins.bottom + halfH;
  const dist = halfH / tan;
  cam.position.set(cx, cy, dist);
  cam.lookAt(cx, cy, 0);
}
