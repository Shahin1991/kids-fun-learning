import * as THREE from "three";

interface Piece {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  life: number;
  max: number;
}

/** Small confetti/sparkle bursts. Geometry and materials are shared and disposed once. */
export class Confetti {
  private pieces: Piece[] = [];
  private geo = new THREE.PlaneGeometry(0.24, 0.24);
  private mats = new Map<number, THREE.MeshBasicMaterial>();

  constructor(private scene: THREE.Scene) {}

  private material(color: number) {
    let m = this.mats.get(color);
    if (!m) {
      m = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
      this.mats.set(color, m);
    }
    return m;
  }

  burst(at: THREE.Vector3, colors: number[], count = 30, power = 7) {
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.geo, this.material(colors[i % colors.length]));
      mesh.position.copy(at);
      mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      this.scene.add(mesh);
      const a = Math.random() * Math.PI * 2;
      const speed = power * (0.35 + Math.random() * 0.65);
      const life = 0.8 + Math.random() * 0.7;
      this.pieces.push({
        mesh,
        vel: new THREE.Vector3(Math.cos(a) * speed, Math.sin(a) * speed * 0.8 + 2, (Math.random() - 0.5) * speed * 0.5),
        spin: new THREE.Vector3(Math.random() * 12, Math.random() * 12, Math.random() * 12),
        life,
        max: life,
      });
    }
  }

  update(dt: number) {
    for (const p of this.pieces) {
      p.life -= dt;
      p.vel.y -= 9 * dt;
      p.vel.multiplyScalar(1 - dt * 0.8);
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += p.spin.x * dt;
      p.mesh.rotation.y += p.spin.y * dt;
      p.mesh.scale.setScalar(Math.max(0.01, Math.min(1, (p.life / p.max) * 2)));
    }
    this.pieces = this.pieces.filter((p) => {
      if (p.life > 0) return true;
      this.scene.remove(p.mesh);
      return false;
    });
  }

  dispose() {
    this.pieces.forEach((p) => this.scene.remove(p.mesh));
    this.pieces = [];
    this.geo.dispose();
    this.mats.forEach((m) => m.dispose());
    this.mats.clear();
  }
}
