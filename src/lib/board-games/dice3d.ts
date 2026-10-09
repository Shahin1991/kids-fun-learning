import * as THREE from "three";

// +x, -x, +y, -y, +z, -z  (opposite faces add up to 7)
const FACE_VALUES = [3, 4, 1, 6, 2, 5];
const NORMALS: Record<number, THREE.Vector3> = {
  3: new THREE.Vector3(1, 0, 0),
  4: new THREE.Vector3(-1, 0, 0),
  1: new THREE.Vector3(0, 1, 0),
  6: new THREE.Vector3(0, -1, 0),
  2: new THREE.Vector3(0, 0, 1),
  5: new THREE.Vector3(0, 0, -1),
};
const PIPS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.27, 0.27], [0.73, 0.73]],
  3: [[0.27, 0.27], [0.5, 0.5], [0.73, 0.73]],
  4: [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]],
  5: [[0.27, 0.27], [0.73, 0.27], [0.5, 0.5], [0.27, 0.73], [0.73, 0.73]],
  6: [[0.27, 0.25], [0.73, 0.25], [0.27, 0.5], [0.73, 0.5], [0.27, 0.75], [0.73, 0.75]],
};

function faceTexture(v: number): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = "#e6e0f0";
  g.lineWidth = 8;
  g.strokeRect(4, 4, 120, 120);
  g.fillStyle = v === 1 ? "#ff4d6d" : "#2b2340";
  for (const [x, y] of PIPS[v]) {
    g.beginPath();
    g.arc(x * 128, y * 128, v === 1 ? 20 : 12, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A chunky die that is thrown in an arc, tumbles, and always settles showing the rolled number. */
export class Dice3D {
  readonly mesh: THREE.Mesh;
  private mats: THREE.MeshStandardMaterial[];
  private from = new THREE.Vector3();
  private to = new THREE.Vector3();
  private t = 1;
  private dur = 1.1;
  private target = new THREE.Quaternion();
  private axis = new THREE.Vector3(1, 1, 0).normalize();
  private spins = 3;
  private onDone?: () => void;
  private value = 1;

  constructor(private scene: THREE.Scene, size = 1.3, private reduced = false) {
    this.mats = FACE_VALUES.map((v) => new THREE.MeshStandardMaterial({ map: faceTexture(v), roughness: 0.35 }));
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), this.mats);
    this.mesh.visible = false;
    scene.add(this.mesh);
    this.setValue(1);
  }

  get rolling() {
    return this.t < 1;
  }

  private faceUp(v: number): THREE.Quaternion {
    return new THREE.Quaternion().setFromUnitVectors(NORMALS[v], new THREE.Vector3(0, 1, 0));
  }

  setValue(v: number) {
    this.value = v;
    this.target.copy(this.faceUp(v));
    this.mesh.quaternion.copy(this.target);
  }

  /** Throw the die from `from` so it lands at `to` showing `value`. */
  roll(value: number, from: THREE.Vector3, to: THREE.Vector3, onDone?: () => void) {
    this.value = value;
    this.from.copy(from);
    this.to.copy(to);
    this.t = 0;
    this.dur = this.reduced ? 0.2 : 1.15;
    this.spins = 2 + Math.random() * 2;
    this.axis.set(Math.random() - 0.5, Math.random() * 0.6 + 0.2, Math.random() - 0.5).normalize();
    this.target.copy(this.faceUp(value)).premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2));
    this.onDone = onDone;
    this.mesh.visible = true;
  }

  hide() {
    this.mesh.visible = false;
  }

  update(dt: number) {
    if (this.t >= 1) return;
    this.t = Math.min(1, this.t + dt / this.dur);
    const k = this.t;
    // Fall from height with two shrinking bounces.
    const bounce = k < 0.55 ? Math.abs(Math.cos((k / 0.55) * Math.PI * 0.5)) * 4.2 : k < 0.8 ? Math.sin(((k - 0.55) / 0.25) * Math.PI) * 0.9 : k < 1 ? Math.sin(((k - 0.8) / 0.2) * Math.PI) * 0.25 : 0;
    this.mesh.position.lerpVectors(this.from, this.to, Math.min(1, k * 1.6));
    this.mesh.position.y = this.to.y + bounce;
    const ease = 1 - Math.pow(1 - k, 3);
    const spin = new THREE.Quaternion().setFromAxisAngle(this.axis, (1 - ease) * this.spins * Math.PI * 2);
    this.mesh.quaternion.copy(this.target).multiply(spin);
    if (this.t >= 1) {
      this.mesh.quaternion.copy(this.target);
      const cb = this.onDone;
      this.onDone = undefined;
      cb?.();
    }
  }

  dispose() {
    this.mats.forEach((m) => {
      m.map?.dispose();
      m.dispose();
    });
    this.mesh.geometry.dispose();
    this.scene.remove(this.mesh);
  }
}
