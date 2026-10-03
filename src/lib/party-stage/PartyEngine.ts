import * as THREE from "three";
import { Spring } from "@/lib/toy3d/spring";
import { ToyScene, type ToyOptions } from "@/lib/toy3d/ToyScene";
import { ParticlePool } from "./particles";

export type PartyStyle = "firework" | "confetti" | "bubble" | "splash";

export interface PartyOptions extends ToyOptions {
  onBurst?: (p: { style: PartyStyle; x: number }) => void;
}

const PALETTE = [0xff4d6d, 0xffd93d, 0x4dd0ff, 0x6bff9a, 0xc77dff, 0xff9f43];
const COLS = 11;
const ROWS = 7;

interface Tile {
  mesh: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  x: number;
  z: number;
  glow: Spring;
  base: THREE.Color;
}
interface Ripple {
  mesh: THREE.Mesh;
  t: number;
}
interface Bubble {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  phase: number;
  life: number;
}

export class PartyEngine extends ToyScene {
  private style: PartyStyle = "firework";
  private particles: ParticlePool;
  private tiles: Tile[] = [];
  private ripples: Ripple[] = [];
  private bubbles: Bubble[] = [];
  private beams: THREE.Mesh[] = [];
  private ball: THREE.Mesh;
  private ballSpin = 1;
  private hue = 0.75;
  private bg = new THREE.Color(0x2a1a4a);
  private bgTarget = new THREE.Color(0x2a1a4a);
  private pressed = false;
  private lastTrail = 0;
  private bubbleGeo = new THREE.SphereGeometry(1, 20, 14);
  private bubbleMat = new THREE.MeshBasicMaterial({ color: 0xbfe9ff, transparent: true, opacity: 0.35 });
  private rippleGeo = new THREE.RingGeometry(0.85, 1, 40);
  private bokeh: { mesh: THREE.Mesh; speed: number; phase: number }[] = [];

  constructor(container: HTMLElement, private opts: PartyOptions = {}) {
    super(container, 0x2a1a4a, opts);
    const scene = this.stage.scene;
    scene.add(new THREE.AmbientLight(0xffffff, 0.55 * Math.PI));
    const key = new THREE.DirectionalLight(0xfff0ff, 0.8 * Math.PI);
    key.position.set(4, 12, 10);
    scene.add(key);
    this.particles = new ParticlePool(scene);
    this.stage.onDispose(() => this.particles.dispose());

    // Dance floor
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const base = new THREE.Color().setHSL(((c + r) % 6) / 6, 0.7, 0.45);
        const mat = new THREE.MeshStandardMaterial({ color: base, emissive: base, emissiveIntensity: 0.15, roughness: 0.4 });
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.3, 1.8), mat);
        const x = (c - (COLS - 1) / 2) * 1.9;
        const z = -5 + r * 1.9;
        mesh.position.set(x, -0.15, z);
        scene.add(mesh);
        this.tiles.push({ mesh, mat, x, z, glow: new Spring(0, 0, 120, 8), base });
      }
    }
    // Backdrop curtain
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), new THREE.MeshStandardMaterial({ color: 0x3a2466, roughness: 1 }));
    wall.position.set(0, 12, -8);
    scene.add(wall);
    // Disco ball
    this.ball = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 2), new THREE.MeshStandardMaterial({ color: 0xdfe6ff, metalness: 1, roughness: 0.15, flatShading: true, emissive: 0x8899ff, emissiveIntensity: 0.7 }));
    this.ball.position.set(0, 11.5, -3);
    scene.add(this.ball);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xcccccc }));
    cord.position.set(0, 15, -3);
    scene.add(cord);
    // Light beams
    for (let i = 0; i < 4; i++) {
      const beam = new THREE.Mesh(
        new THREE.ConeGeometry(2.2, 14, 24, 1, true).translate(0, -7, 0),
        new THREE.MeshBasicMaterial({ color: PALETTE[i], transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
      );
      beam.position.set((i - 1.5) * 5, 15, -5);
      scene.add(beam);
      this.beams.push(beam);
    }
    // Floating bokeh lights
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.25 + Math.random() * 0.35, 12, 8), new THREE.MeshBasicMaterial({ color: PALETTE[i % PALETTE.length], transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.position.set((Math.random() - 0.5) * 24, 2 + Math.random() * 12, -6 + Math.random() * 3);
      scene.add(m);
      this.bokeh.push({ mesh: m, speed: 0.2 + Math.random() * 0.4, phase: Math.random() * 6 });
    }
    this.start();
  }

  setStyle(style: PartyStyle) {
    this.style = style;
  }

  protected onResize(aspect: number) {
    const dist = 17 * Math.max(1, 1.2 / aspect);
    this.stage.camera.position.set(0, 7.5, dist);
    this.stage.camera.lookAt(0, 5, 0);
  }

  activate() {
    this.burst(new THREE.Vector3((Math.random() - 0.5) * 12, 4 + Math.random() * 5, 0));
  }

  protected onDown(_info: unknown, e: PointerEvent) {
    this.pressed = true;
    const p = this.planePoint(e, 0);
    if (p) this.burst(p);
  }

  protected onMove(e: PointerEvent) {
    if (!this.pressed || this.time - this.lastTrail < 0.06) return;
    this.lastTrail = this.time;
    const p = this.planePoint(e, 0);
    if (!p) return;
    // Dragging leaves a sparkly trail.
    const n = this.reduced ? 1 : 4;
    for (let i = 0; i < n; i++) {
      this.particles.emit(p, new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 3, 0), PALETTE[Math.floor(Math.random() * PALETTE.length)], 0.7, 0.14, -4);
    }
  }

  protected onUp() {
    this.pressed = false;
  }

  // ---- bursts ----
  private burst(at: THREE.Vector3) {
    const color = () => PALETTE[Math.floor(Math.random() * PALETTE.length)];
    const n = this.reduced ? 0.25 : 1;
    this.opts.onBurst?.({ style: this.style, x: Math.max(0, Math.min(1, (at.x + 12) / 24)) });

    const ring = new THREE.Mesh(this.rippleGeo, new THREE.MeshBasicMaterial({ color: color(), transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
    ring.position.copy(at);
    this.stage.scene.add(ring);
    this.ripples.push({ mesh: ring, t: 0 });

    // Mood: the room colour, disco ball and nearby floor tiles react to every tap.
    this.hue = (this.hue + 0.11) % 1;
    this.bgTarget.setHSL(this.hue, 0.55, 0.2);
    this.ballSpin = 6;
    for (const t of this.tiles) {
      const d = Math.hypot(t.x - at.x, t.z + 2);
      if (d < 7) t.glow.kick(10 / (1 + d * 0.6));
    }

    switch (this.style) {
      case "firework": {
        const c1 = color();
        const c2 = color();
        for (let i = 0; i < 70 * n; i++) {
          const dir = new THREE.Vector3().randomDirection().multiplyScalar(5 + Math.random() * 6);
          dir.z *= 0.3;
          this.particles.emit(at, dir, i % 2 ? c1 : c2, 1 + Math.random() * 0.7, 0.2, -5, 1.1, i % 3 === 0);
        }
        break;
      }
      case "confetti":
        this.confetti.burst(at, PALETTE, 60 * n, 9);
        break;
      case "bubble":
        for (let i = 0; i < 9 * n + 1; i++) {
          const m = new THREE.Mesh(this.bubbleGeo, this.bubbleMat);
          const s = 0.3 + Math.random() * 0.55;
          m.scale.setScalar(s);
          m.position.copy(at).add(new THREE.Vector3((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5, 0));
          this.stage.scene.add(m);
          this.bubbles.push({ mesh: m, vel: new THREE.Vector3((Math.random() - 0.5) * 1.5, 1 + Math.random() * 2, 0), phase: Math.random() * 6, life: 2.5 + Math.random() * 1.5 });
        }
        break;
      case "splash":
        for (let i = 0; i < 50 * n; i++) {
          const a = Math.random() * Math.PI;
          const sp = 4 + Math.random() * 6;
          this.particles.emit(at, new THREE.Vector3(Math.cos(a) * sp * 0.8, Math.sin(a) * sp + 2, 0), Math.random() < 0.5 ? 0x4dd0ff : 0xbfe9ff, 1 + Math.random() * 0.6, 0.18, -14, 0.2);
        }
        break;
    }
  }

  // ---- simulation ----
  protected update(dt: number) {
    const t = this.time;
    const idle = this.reduced ? 0 : 1;
    this.particles.update(dt);
    this.ballSpin = Math.max(1, this.ballSpin - dt * 5);
    this.ball.rotation.y += dt * 0.6 * this.ballSpin * idle;
    this.beams.forEach((b, i) => {
      b.rotation.z = Math.sin(t * 0.7 + i * 1.7) * 0.5 * idle;
      b.rotation.x = Math.cos(t * 0.5 + i) * 0.15 * idle;
    });
    this.bokeh.forEach((b) => {
      b.mesh.position.y += Math.sin(t * b.speed + b.phase) * dt * 0.6 * idle;
      b.mesh.position.x += Math.cos(t * b.speed * 0.7 + b.phase) * dt * 0.4 * idle;
    });
    for (const tile of this.tiles) {
      const g = Math.max(0, tile.glow.step(dt));
      const wave = idle ? (Math.sin(t * 1.4 + tile.x * 0.5 + tile.z * 0.4) + 1) * 0.12 : 0.1;
      tile.mat.emissiveIntensity = 0.15 + wave + g * 0.5;
      tile.mesh.position.y = -0.15 + g * 0.08;
    }
    for (const r of [...this.ripples]) {
      r.t += dt;
      const k = r.t / 0.8;
      r.mesh.scale.setScalar(0.3 + k * 4);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.8 * (1 - k));
      if (k >= 1) {
        this.stage.scene.remove(r.mesh);
        (r.mesh.material as THREE.Material).dispose();
        this.ripples = this.ripples.filter((x) => x !== r);
      }
    }
    for (const b of [...this.bubbles]) {
      b.life -= dt;
      b.mesh.position.addScaledVector(b.vel, dt);
      b.mesh.position.x += Math.sin(t * 3 + b.phase) * dt * 0.8;
      if (b.life <= 0) {
        // Pop into a few sparkles.
        for (let i = 0; i < 6; i++) this.particles.emit(b.mesh.position, new THREE.Vector3().randomDirection().multiplyScalar(2.5), 0xbfe9ff, 0.5, 0.1, -2);
        this.stage.scene.remove(b.mesh);
        this.bubbles = this.bubbles.filter((x) => x !== b);
      }
    }
    this.bg.lerp(this.bgTarget, Math.min(1, dt * 2));
    (this.stage.scene.background as THREE.Color).copy(this.bg);
  }

  protected onDestroy() {
    this.ripples.forEach((r) => (r.mesh.material as THREE.Material).dispose());
    this.bubbleGeo.dispose();
    this.bubbleMat.dispose();
    this.rippleGeo.dispose();
  }
}
