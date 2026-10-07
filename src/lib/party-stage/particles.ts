import * as THREE from "three";

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  color: THREE.Color;
  life: number;
  max: number;
  size: number;
  gravity: number;
  drag: number;
  /** emits fading trail sparks while alive */
  trail: boolean;
}

/** A pool of glowing dots drawn as one instanced mesh: fireworks, sparks, droplets. */
export class ParticlePool {
  private items: Particle[] = [];
  private mesh: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();
  private geo = new THREE.SphereGeometry(1, 6, 4);
  private mat = new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });

  constructor(private scene: THREE.Scene, private capacity = 900) {
    this.mesh = new THREE.InstancedMesh(this.geo, this.mat, capacity);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.setColorAt(0, new THREE.Color(1, 1, 1));
    scene.add(this.mesh);
  }

  /** Additive glow suits dark backgrounds; light ones need normal blending or the dots vanish. */
  setBlending(b: THREE.Blending) {
    this.mat.blending = b;
    this.mat.needsUpdate = true;
  }

  emit(pos: THREE.Vector3, vel: THREE.Vector3, color: THREE.ColorRepresentation, life: number, size: number, gravity = -6, drag = 0.6, trail = false) {
    if (this.items.length >= this.capacity) return;
    this.items.push({ pos: pos.clone(), vel: vel.clone(), color: new THREE.Color(color), life, max: life, size, gravity, drag, trail });
  }

  update(dt: number) {
    const spawned: Particle[] = [];
    for (const p of this.items) {
      p.life -= dt;
      p.vel.y += p.gravity * dt;
      p.vel.multiplyScalar(Math.max(0, 1 - p.drag * dt));
      p.pos.addScaledVector(p.vel, dt);
      if (p.trail && p.life > 0 && Math.random() < 0.2 && this.items.length + spawned.length < this.capacity) {
        spawned.push({ pos: p.pos.clone(), vel: new THREE.Vector3(), color: p.color.clone(), life: 0.3, max: 0.3, size: p.size * 0.65, gravity: -0.5, drag: 1.5, trail: false });
      }
    }
    this.items = this.items.filter((p) => p.life > 0).concat(spawned);
    this.mesh.count = this.items.length;
    this.items.forEach((p, i) => {
      const k = Math.max(0, p.life / p.max);
      this.dummy.position.copy(p.pos);
      this.dummy.scale.setScalar(Math.max(0.001, p.size * (0.3 + 0.7 * k)));
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.mesh.setColorAt(i, p.color);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.dispose();
    this.geo.dispose();
    this.mat.dispose();
    this.items = [];
  }
}

interface Droplet {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  size: number;
}

/** Lit, glossy water droplets that stretch along their motion and report where they land. */
export class DropletPool {
  private items: Droplet[] = [];
  private mesh: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();
  private geo = new THREE.SphereGeometry(1, 10, 8);
  private mat = new THREE.MeshPhysicalMaterial({ color: 0xb8e2ff, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.8 });
  private up = new THREE.Vector3(0, 1, 0);
  private dir = new THREE.Vector3();

  constructor(private scene: THREE.Scene, private onLand: (at: THREE.Vector3, size: number) => void, private capacity = 600) {
    this.mesh = new THREE.InstancedMesh(this.geo, this.mat, capacity);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    scene.add(this.mesh);
  }

  emit(pos: THREE.Vector3, vel: THREE.Vector3, size: number) {
    if (this.items.length < this.capacity) this.items.push({ pos: pos.clone(), vel: vel.clone(), size });
  }

  update(dt: number) {
    const alive: Droplet[] = [];
    for (const d of this.items) {
      d.vel.y -= 17 * dt;
      d.vel.multiplyScalar(1 - 0.12 * dt);
      d.pos.addScaledVector(d.vel, dt);
      if (d.pos.y <= 0.06) {
        this.onLand(d.pos, d.size);
        continue;
      }
      alive.push(d);
    }
    this.items = alive;
    this.mesh.count = alive.length;
    alive.forEach((d, i) => {
      const speed = d.vel.length();
      this.dir.copy(d.vel).normalize();
      this.dummy.position.copy(d.pos);
      this.dummy.quaternion.setFromUnitVectors(this.up, speed > 0.01 ? this.dir : this.up);
      const stretch = 1 + Math.min(speed, 16) * 0.1;
      this.dummy.scale.set(d.size, d.size * stretch, d.size);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.dispose();
    this.geo.dispose();
    this.mat.dispose();
    this.items = [];
  }
}
