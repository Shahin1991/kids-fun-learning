import * as CANNON from "cannon-es";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export type TowerMode = "build" | "knock";

export interface TowerState {
  blocks: number;
  height: number;
}

export interface TowerOptions {
  reducedMotion?: boolean;
  onState?: (s: TowerState) => void;
  onMilestone?: (m: { level: number; height: number; blocks: number }) => void;
  /** Sounds are played by the host so they follow the app's sound toggle. */
  onSound?: (e: { kind: "drop" | "land" | "tumble"; height: number; strength: number }) => void;
}

interface Variant {
  w: number;
  h: number;
  d: number;
}

// Wide, flat blocks first; tall ones only appear later (dynamic scaffolding).
const VARIANTS: Variant[] = [
  { w: 2.4, h: 0.7, d: 1.4 },
  { w: 1.4, h: 1.4, d: 1.4 },
  { w: 2.0, h: 0.5, d: 1.2 },
  { w: 1.0, h: 1.0, d: 1.0 },
  { w: 0.9, h: 1.8, d: 0.9 },
];
const COLORS = [0xff6b6b, 0x4d96ff, 0x6bcb77, 0xffd93d, 0x9b51e0, 0xff9f43];
const TABLE_HALF = 6.5;
const HOVER_LIMIT = 4.6;

interface Block {
  body: CANNON.Body;
  mesh: THREE.Mesh;
  landed: boolean;
  squash: number;
}

const milestoneHeight = (level: number) => 1.5 + 2 * level;

export class BlockTowerEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
  private world: CANNON.World;
  private toyMat = new CANNON.Material("toy");
  private blocks: Block[] = [];
  private geometries = new Map<number, THREE.BufferGeometry>();
  private materials = new Map<number, THREE.MeshStandardMaterial>();
  private confetti: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number }[] = [];
  private hover: THREE.Mesh | null = null;
  private hoverVariant = 0;
  private hoverX = 0;
  private dragging = false;
  private mode: TowerMode = "build";
  private dropped = 0;
  private colorIdx = 0;
  private cooldown = 0;
  private lastSound = 0;
  private milestone = 0;
  private stableFor = 0;
  private height = 0;
  private metricsT = 0;
  private lastState = "";
  private camLook = 2.5;
  private shake = 0;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private raf = 0;
  private lastT = 0;
  private time = 0;
  private destroyed = false;

  constructor(private container: HTMLElement, private opts: TowerOptions = {}) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:none";
    container.appendChild(this.renderer.domElement);
    this.scene.background = new THREE.Color(0xdff3ff);

    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -16, 0) });
    this.world.allowSleep = true;
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    (this.world.solver as CANNON.GSSolver).iterations = 14;
    const groundMat = new CANNON.Material("ground");
    this.world.addContactMaterial(new CANNON.ContactMaterial(groundMat, this.toyMat, { friction: 0.8, restitution: 0 }));
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.toyMat, this.toyMat, { friction: 0.8, restitution: 0 }));

    const table = new CANNON.Body({ mass: 0, material: groundMat, shape: new CANNON.Box(new CANNON.Vec3(TABLE_HALF, 0.5, 3)) });
    table.position.set(0, -0.5, 0);
    this.world.addBody(table);

    this.buildScene();
    container.addEventListener("pointerdown", this.onDown);
    window.addEventListener("pointermove", this.onMove);
    window.addEventListener("pointerup", this.onUp);
    window.addEventListener("pointercancel", this.onCancel);

    this.resize();
    this.nextHover();
    this.raf = requestAnimationFrame(this.loop);
  }

  // ---- public API ----
  setMode(mode: TowerMode) {
    this.mode = mode;
    this.dragging = false;
    if (this.hover) this.hover.visible = mode === "build";
  }

  reset() {
    for (const b of this.blocks) this.removeBlock(b);
    this.blocks = [];
    this.dropped = 0;
    this.milestone = 0;
    this.stableFor = 0;
    this.height = 0;
    this.nextHover();
    this.emitState(true);
  }

  /** Knocks everything over. */
  boom() {
    for (const b of this.blocks) {
      b.body.wakeUp();
      b.body.applyImpulse(new CANNON.Vec3((Math.random() - 0.5) * 16, 6 + Math.random() * 8, 0));
      b.body.angularVelocity.z += (Math.random() - 0.5) * 8;
    }
    if (!this.opts.reducedMotion) this.shake = 0.5;
    this.opts.onSound?.({ kind: "tumble", height: 0, strength: 1 });
  }

  resize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.container.removeEventListener("pointerdown", this.onDown);
    window.removeEventListener("pointermove", this.onMove);
    window.removeEventListener("pointerup", this.onUp);
    window.removeEventListener("pointercancel", this.onCancel);
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m: THREE.Material) => m.dispose());
      }
    });
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.blocks = [];
    this.world.bodies.slice().forEach((b) => this.world.removeBody(b));
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }

  // ---- scene ----
  private buildScene() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.75 * Math.PI));
    const key = new THREE.DirectionalLight(0xfff7e6, 0.9 * Math.PI);
    key.position.set(6, 16, 10);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -14, right: 14, top: 34, bottom: -4, near: 1, far: 70 });
    this.scene.add(key);

    const wood = new THREE.MeshStandardMaterial({ color: 0xba8c63, roughness: 0.75 });
    const table = new THREE.Mesh(new THREE.BoxGeometry(TABLE_HALF * 2, 1, 6), wood);
    table.position.set(0, -0.5, 0);
    table.receiveShadow = true;
    this.scene.add(table);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), new THREE.MeshStandardMaterial({ color: 0xcfe9c9, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  private geometry(v: number) {
    let g = this.geometries.get(v);
    if (!g) {
      const s = VARIANTS[v];
      g = new RoundedBoxGeometry(s.w, s.h, s.d, 4, 0.12);
      this.geometries.set(v, g);
    }
    return g;
  }

  private material(color: number) {
    let m = this.materials.get(color);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color, roughness: 0.45 });
      this.materials.set(color, m);
    }
    return m;
  }

  // ---- blocks ----
  private pickVariant() {
    const pool = this.dropped < 6 ? 3 : this.dropped < 12 ? 4 : 5;
    return Math.floor(Math.random() * pool);
  }

  private nextHover() {
    if (this.hover) {
      this.scene.remove(this.hover);
      this.hover = null;
    }
    this.hoverVariant = this.pickVariant();
    const color = COLORS[this.colorIdx % COLORS.length];
    const mesh = new THREE.Mesh(this.geometry(this.hoverVariant), this.material(color));
    mesh.castShadow = true;
    mesh.visible = this.mode === "build";
    this.hover = mesh;
    this.scene.add(mesh);
  }

  private drop() {
    if (!this.hover || this.cooldown > 0) return;
    const s = VARIANTS[this.hoverVariant];
    const color = COLORS[this.colorIdx++ % COLORS.length];
    const body = new CANNON.Body({ mass: s.w * s.h * s.d, material: this.toyMat, shape: new CANNON.Box(new CANNON.Vec3(s.w / 2, s.h / 2, s.d / 2)) });
    body.position.set(this.hoverX, this.hover.position.y, 0);
    // Keep the action mostly in the screen plane so towers stay buildable.
    body.linearFactor.set(1, 1, 0.1);
    body.angularFactor.set(0.05, 0.05, 1);
    body.angularVelocity.z = (Math.random() - 0.5) * 0.3;
    body.linearDamping = 0.04;
    body.angularDamping = 0.2;
    body.allowSleep = true;
    body.sleepSpeedLimit = 0.25;
    body.sleepTimeLimit = 0.6;
    this.world.addBody(body);

    const mesh = new THREE.Mesh(this.geometry(this.hoverVariant), this.material(color));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.copy(this.hover.position);
    this.scene.add(mesh);

    const block: Block = { body, mesh, landed: false, squash: 0 };
    body.addEventListener("collide", (e: { contact: CANNON.ContactEquation }) => {
      const v = Math.abs(e.contact.getImpactVelocityAlongNormal());
      if (v < 1.2) return;
      if (!block.landed && v > 2) {
        block.landed = true;
        block.squash = 1;
      }
      const now = performance.now();
      if (now - this.lastSound < 80) return;
      this.lastSound = now;
      this.opts.onSound?.({ kind: v > 6 ? "tumble" : "land", height: Math.max(0, body.position.y), strength: Math.min(1, v / 10) });
    });
    this.blocks.push(block);
    this.dropped++;
    this.cooldown = 0.45;
    this.opts.onSound?.({ kind: "drop", height: this.height, strength: 0.5 });
    this.nextHover();
  }

  private removeBlock(b: Block) {
    this.world.removeBody(b.body);
    this.scene.remove(b.mesh);
  }

  // ---- input ----
  private setPointer(e: PointerEvent) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
  }

  private planeX(): number | null {
    const p = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(this.plane, p) ? p.x : null;
  }

  private onDown = (e: PointerEvent) => {
    this.setPointer(e);
    if (this.mode === "build") {
      this.dragging = true;
      const x = this.planeX();
      if (x !== null) this.hoverX = Math.max(-HOVER_LIMIT, Math.min(HOVER_LIMIT, x));
      return;
    }
    const hit = this.raycaster.intersectObjects(this.blocks.map((b) => b.mesh), false)[0];
    if (!hit) return;
    const block = this.blocks.find((b) => b.mesh === hit.object);
    if (!block) return;
    // Poke: push the block away from where it was tapped.
    const dx = hit.point.x - block.body.position.x;
    const dir = Math.abs(dx) < 0.05 ? (Math.random() < 0.5 ? -1 : 1) : -Math.sign(dx);
    block.body.wakeUp();
    block.body.applyImpulse(new CANNON.Vec3(dir * 9 * block.body.mass, 3 * block.body.mass, 0));
    block.body.angularVelocity.z += dir * -3;
  };

  private onMove = (e: PointerEvent) => {
    if (this.mode !== "build") return;
    const r = this.renderer.domElement.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
    if (e.pointerType !== "mouse" && !this.dragging) return;
    this.setPointer(e);
    const x = this.planeX();
    if (x !== null) this.hoverX = Math.max(-HOVER_LIMIT, Math.min(HOVER_LIMIT, x));
  };

  private onUp = () => {
    if (this.dragging && this.mode === "build") this.drop();
    this.dragging = false;
  };

  private onCancel = () => {
    this.dragging = false;
  };

  // ---- simulation ----
  private metrics() {
    let top = 0;
    let moving = false;
    let count = 0;
    for (const b of this.blocks) {
      if (b.body.position.y < -4 || Math.abs(b.body.position.x) > TABLE_HALF + 1) continue;
      count++;
      if (b.body.velocity.length() > 0.35 || b.body.angularVelocity.length() > 0.5) {
        moving = true;
        continue;
      }
      b.body.updateAABB();
      top = Math.max(top, b.body.aabb.upperBound.y);
    }
    this.height = top;
    if (!moving && top >= milestoneHeight(this.milestone + 1)) this.stableFor += 0.12;
    else this.stableFor = 0;
    if (this.stableFor > 1) {
      this.milestone++;
      this.stableFor = 0;
      this.celebrate();
      this.opts.onMilestone?.({ level: this.milestone, height: top, blocks: count });
    }
    this.emitState(false, count);
  }

  private emitState(force: boolean, count = this.blocks.length) {
    const key = `${count}:${this.height.toFixed(1)}`;
    if (!force && key === this.lastState) return;
    this.lastState = key;
    this.opts.onState?.({ blocks: count, height: Math.round(this.height * 10) / 10 });
  }

  private celebrate() {
    if (this.opts.reducedMotion) return;
    const colors = [0xff6b6b, 0xffd93d, 0x6bcb77, 0x4d96ff, 0x9b51e0];
    for (let i = 0; i < 50; i++) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshBasicMaterial({ color: colors[i % colors.length], side: THREE.DoubleSide }));
      mesh.position.set((Math.random() - 0.5) * 3, this.height + 1, 1);
      this.scene.add(mesh);
      this.confetti.push({ mesh, vel: new THREE.Vector3((Math.random() - 0.5) * 8, 4 + Math.random() * 6, (Math.random() - 0.5) * 3), life: 2.4 });
    }
  }

  private loop = (t: number) => {
    if (this.destroyed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(1 / 30, this.lastT ? (t - this.lastT) / 1000 : 1 / 60);
    this.lastT = t;
    this.time += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.world.step(1 / 60, dt, 4);

    for (let i = this.blocks.length - 1; i >= 0; i--) {
      const b = this.blocks[i];
      if (b.body.position.y < -6) {
        this.removeBlock(b);
        this.blocks.splice(i, 1);
        continue;
      }
      b.mesh.position.set(b.body.position.x, b.body.position.y, b.body.position.z);
      b.mesh.quaternion.set(b.body.quaternion.x, b.body.quaternion.y, b.body.quaternion.z, b.body.quaternion.w);
      if (b.squash > 0 && !this.opts.reducedMotion) {
        b.squash = Math.max(0, b.squash - dt * 2.5);
        const k = Math.cos((1 - b.squash) * 16) * b.squash * 0.16;
        b.mesh.scale.set(1 + k * 0.6, 1 - k, 1 + k * 0.6);
      } else b.mesh.scale.set(1, 1, 1);
    }

    this.metricsT += dt;
    if (this.metricsT > 0.12) {
      this.metricsT = 0;
      this.metrics();
    }

    // Hovering block breathes and sways while it waits.
    if (this.hover) {
      const idle = this.opts.reducedMotion ? 0 : 1;
      const top = Math.max(this.height, 0);
      this.hover.position.x += (this.hoverX - this.hover.position.x) * Math.min(1, dt * 14);
      this.hover.position.y = top + 2.6 + Math.sin(this.time * 2) * 0.12 * idle;
      this.hover.position.z = 0;
      this.hover.rotation.z = Math.sin(this.time * 1.6) * 0.05 * idle;
      const breathe = 1 + Math.sin(this.time * 2.4) * 0.025 * idle;
      this.hover.scale.set(breathe, 1 / breathe, 1);
    }

    for (const c of this.confetti) {
      c.life -= dt;
      c.vel.y -= 12 * dt;
      c.mesh.position.addScaledVector(c.vel, dt);
      c.mesh.rotation.x += dt * 6;
    }
    this.confetti = this.confetti.filter((c) => {
      if (c.life > 0) return true;
      this.scene.remove(c.mesh);
      c.mesh.geometry.dispose();
      (c.mesh.material as THREE.Material).dispose();
      return false;
    });

    // Camera follows the tower upward.
    const aspect = this.camera.aspect;
    const wanted = Math.max(2.4, this.height * 0.8 + 1.8);
    this.camLook += (wanted - this.camLook) * Math.min(1, dt * 2);
    const dist = (13 + this.height * 0.9) * Math.max(1, 1.2 / aspect);
    this.shake = Math.max(0, this.shake - dt);
    const sx = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 0.6 : 0;
    this.camera.position.set(sx, this.camLook + 0.9, dist);
    this.camera.lookAt(0, this.camLook, 0);
    this.renderer.render(this.scene, this.camera);
  };
}
