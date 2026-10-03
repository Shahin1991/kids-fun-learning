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
      if (p.trail && p.life > 0 && Math.random() < 0.5 && this.items.length + spawned.length < this.capacity) {
        spawned.push({ pos: p.pos.clone(), vel: new THREE.Vector3(), color: p.color.clone(), life: 0.35, max: 0.35, size: p.size * 0.6, gravity: -1, drag: 1, trail: false });
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
