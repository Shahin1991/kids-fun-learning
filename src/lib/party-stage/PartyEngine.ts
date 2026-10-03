import * as THREE from "three";
import { Spring } from "@/lib/toy3d/spring";
import { ToyScene, type ToyOptions } from "@/lib/toy3d/ToyScene";
import { DropletPool, ParticlePool } from "./particles";

export type PartyStyle = "firework" | "confetti" | "bubble" | "splash";

export interface PartyOptions extends ToyOptions {
  onBurst?: (p: { style: PartyStyle; x: number }) => void;
}

const PALETTE = [0xff4d6d, 0xffd93d, 0x4dd0ff, 0x6bff9a, 0xc77dff, 0xff9f43];
const FIREWORK_COLORS = [0xff5e7e, 0xffd166, 0x6ee7ff, 0x8cff9e, 0xd49bff, 0xffa24d, 0xffffff];
const COLS = 11;
const ROWS = 7;
const MAX_RIPPLES = 28;

interface Tile {
  mesh: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  x: number;
  z: number;
  glow: Spring;
}
interface Ripple {
  mesh: THREE.Mesh;
  t: number;
  dur: number;
  scale: number;
}
interface Bubble {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  phase: number;
  life: number;
  size: number;
  rise: number;
}
interface Rocket {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  target: THREE.Vector3;
  colors: [number, number];
}

const BUBBLE_VERT = `
varying vec3 vNormal; varying vec3 vView; varying vec3 vWorld;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * mv;
}`;
// Soap film: transparent in the middle, bright rainbow rim, and a small window-like highlight.
const BUBBLE_FRAG = `
uniform float uTime;
varying vec3 vNormal; varying vec3 vView; varying vec3 vWorld;
void main() {
  vec3 n = normalize(vNormal); vec3 v = normalize(vView);
  float f = pow(1.0 - abs(dot(n, v)), 2.4);
  vec3 irid = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + f * 1.3 + uTime * 0.06 + vWorld.y * 0.07 + vWorld.x * 0.04));
  float spec = pow(max(dot(n, normalize(vec3(-0.45, 0.75, 0.55))), 0.0), 60.0);
  float spec2 = pow(max(dot(n, normalize(vec3(0.5, -0.6, 0.6))), 0.0), 40.0) * 0.35;
  float alpha = 0.05 + f * 0.62 + spec * 0.9 + spec2;
  gl_FragColor = vec4(mix(vec3(1.0), irid, 0.8) * (0.55 + f * 0.7) + spec + spec2, clamp(alpha, 0.0, 1.0));
}`;

export class PartyEngine extends ToyScene {
  private style: PartyStyle = "firework";
  private glow: ParticlePool;
  private drops: DropletPool;
  private tiles: Tile[] = [];
  private ripples: Ripple[] = [];
  private bubbles: Bubble[] = [];
  private rockets: Rocket[] = [];
  private ball: THREE.Mesh;
  private hue = 0.75;
  private bg = new THREE.Color(0x2a1a4a);
  private bgTarget = new THREE.Color(0x2a1a4a);
  private pressed = false;
  private lastTrail = 0;
  private bubbleGeo = new THREE.SphereGeometry(1, 32, 24);
  private bubbleMat = new THREE.ShaderMaterial({ vertexShader: BUBBLE_VERT, fragmentShader: BUBBLE_FRAG, transparent: true, depthWrite: false, uniforms: { uTime: { value: 0 } } });
  private ringGeo = new THREE.RingGeometry(0.8, 1, 48);
  private bokeh: { mesh: THREE.Mesh; speed: number; phase: number }[] = [];

  constructor(container: HTMLElement, private opts: PartyOptions = {}) {
    super(container, 0x2a1a4a, opts);
    const scene = this.stage.scene;
    scene.add(new THREE.AmbientLight(0xffffff, 0.55 * Math.PI));
    const key = new THREE.DirectionalLight(0xfff0ff, 0.8 * Math.PI);
    key.position.set(4, 12, 10);
    scene.add(key);
    this.glow = new ParticlePool(scene);
    this.drops = new DropletPool(scene, (at, size) => this.splashRing(at, size));
    this.stage.onDispose(() => {
      this.glow.dispose();
      this.drops.dispose();
    });

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
        this.tiles.push({ mesh, mat, x, z, glow: new Spring(0, 0, 120, 8) });
      }
    }
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), new THREE.MeshStandardMaterial({ color: 0x3a2466, roughness: 1 }));
    wall.position.set(0, 12, -8);
    scene.add(wall);

    this.ball = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 2), new THREE.MeshStandardMaterial({ color: 0xdfe6ff, metalness: 1, roughness: 0.15, flatShading: true, emissive: 0x8899ff, emissiveIntensity: 0.7 }));
    this.ball.position.set(0, 11.5, -3);
    scene.add(this.ball);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xcccccc }));
    cord.position.set(0, 15, -3);
    scene.add(cord);

    // Light beams stay still: they only add colour to the room.
    for (let i = 0; i < 4; i++) {
      const beam = new THREE.Mesh(
        new THREE.ConeGeometry(2.2, 14, 24, 1, true).translate(0, -7, 0),
        new THREE.MeshBasicMaterial({ color: PALETTE[i], transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
      );
      beam.position.set((i - 1.5) * 5, 15, -5);
      beam.rotation.z = (i - 1.5) * 0.14;
      scene.add(beam);
    }
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
    const n = this.reduced ? 1 : 3;
    for (let i = 0; i < n; i++) {
      this.glow.emit(p, new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 2, 0), PALETTE[Math.floor(Math.random() * PALETTE.length)], 0.7, 0.07, -3);
    }
  }

  protected onUp() {
    this.pressed = false;
  }

  // ---- effects ----
  private ripple(at: THREE.Vector3, color: number, scale: number, dur: number, flat: boolean, opacity = 0.7) {
    if (this.ripples.length >= MAX_RIPPLES) return;
    const mesh = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false }));
    mesh.position.copy(at);
    if (flat) mesh.rotation.x = -Math.PI / 2;
    this.stage.scene.add(mesh);
    this.ripples.push({ mesh, t: 0, dur, scale });
  }

  /** A droplet landing on the floor makes a small, thin ripple. */
  private splashRing(at: THREE.Vector3, size: number) {
    if (size < 0.07 || Math.random() > 0.5) return;
    this.ripple(new THREE.Vector3(at.x, 0.03, at.z), 0xcfeeff, 0.45 + size * 5, 0.7, true, 0.45);
  }

  private burst(at: THREE.Vector3) {
    this.opts.onBurst?.({ style: this.style, x: Math.max(0, Math.min(1, (at.x + 12) / 24)) });
    // The room colour and nearby floor tiles react to every tap.
    this.hue = (this.hue + 0.11) % 1;
    this.bgTarget.setHSL(this.hue, 0.55, 0.2);
    for (const t of this.tiles) {
      const d = Math.hypot(t.x - at.x, t.z + 2);
      if (d < 7) t.glow.kick(8 / (1 + d * 0.6));
    }
    const n = this.reduced ? 0.25 : 1;

    switch (this.style) {
      case "firework": {
        const c1 = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
        const c2 = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
        const start = new THREE.Vector3(at.x, 0.4, at.z);
        const dist = Math.max(1, at.y - 0.4);
        this.rockets.push({ pos: start, vel: new THREE.Vector3((Math.random() - 0.5) * 0.6, dist / 0.42, 0), target: at.clone(), colors: [c1, c2] });
        break;
      }
      case "confetti":
        this.ripple(at, PALETTE[Math.floor(Math.random() * PALETTE.length)], 2.5, 0.6, false, 0.5);
        this.confetti.burst(at, PALETTE, 60 * n, 9);
        break;
      case "bubble":
        this.spawnBubbles(at, Math.max(2, Math.round(7 * n)));
        break;
      case "splash":
        this.spawnSplash(at, n);
        break;
    }
  }

  private explode(at: THREE.Vector3, colors: [number, number]) {
    const n = this.reduced ? 0.25 : 1;
    this.glow.emit(at, new THREE.Vector3(), 0xffffff, 0.14, 1.1, 0, 0);
    // A thin, evenly spread shell of sparks that slows, then drifts and falls.
    for (let i = 0; i < 150 * n; i++) {
      const dir = new THREE.Vector3().randomDirection();
      dir.z *= 0.4;
      const speed = 6.2 + Math.random() * 1.6;
      this.glow.emit(at, dir.multiplyScalar(speed), colors[i % 2], 1.3 + Math.random() * 0.9, 0.065, -3.4, 1.7, i % 4 === 0);
    }
    // A few slower glitter sparks that hang in the air.
    for (let i = 0; i < 30 * n; i++) {
      const dir = new THREE.Vector3().randomDirection().multiplyScalar(2 + Math.random() * 2.5);
      this.glow.emit(at, dir, 0xfff3c4, 1.6 + Math.random() * 1.0, 0.04, -1.8, 1.4);
    }
  }

  private spawnBubbles(at: THREE.Vector3, count: number) {
    for (let i = 0; i < count; i++) {
      const size = 0.22 + Math.pow(Math.random(), 1.6) * 0.7;
      const m = new THREE.Mesh(this.bubbleGeo, this.bubbleMat);
      m.scale.setScalar(size);
      m.position.copy(at).add(new THREE.Vector3((Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 0.6));
      this.stage.scene.add(m);
      this.bubbles.push({
        mesh: m,
        // Blown out with a little speed that quickly fades into a slow, steady float.
        vel: new THREE.Vector3((Math.random() - 0.5) * 3.2, 1 + Math.random() * 2.2, (Math.random() - 0.5) * 0.4),
        phase: Math.random() * 6.28,
        life: 4 + Math.random() * 4,
        size,
        rise: 0.45 + Math.random() * 0.45,
      });
    }
  }

  private popBubble(b: Bubble) {
    const at = b.mesh.position;
    for (let i = 0; i < 9; i++) {
      this.drops.emit(at, new THREE.Vector3().randomDirection().multiplyScalar(1.2 + Math.random() * 1.6), 0.025 + Math.random() * 0.02);
    }
    this.glow.emit(at, new THREE.Vector3(), 0xffffff, 0.1, b.size * 1.2, 0, 0);
    this.stage.scene.remove(b.mesh);
    this.bubbles = this.bubbles.filter((x) => x !== b);
  }

  private spawnSplash(at: THREE.Vector3, n: number) {
    // A fountain: a fast central jet plus a wider crown of droplets, each with its own size.
    const jet = Math.round(26 * n);
    for (let i = 0; i < jet; i++) {
      const a = Math.random() * Math.PI * 2;
      const spread = Math.random() * 0.9;
      const up = 8 + Math.random() * 7;
      this.drops.emit(at, new THREE.Vector3(Math.cos(a) * spread, up, Math.sin(a) * spread * 0.3), 0.06 + Math.random() * 0.07);
    }
    const crown = Math.round(34 * n);
    for (let i = 0; i < crown; i++) {
      const a = Math.random() * Math.PI * 2;
      const out = 2.5 + Math.random() * 4.2;
      this.drops.emit(at, new THREE.Vector3(Math.cos(a) * out, 3.5 + Math.random() * 4, Math.sin(a) * out * 0.3), 0.04 + Math.random() * 0.06);
    }
    // Fine spray
    for (let i = 0; i < 40 * n; i++) {
      this.drops.emit(at, new THREE.Vector3().randomDirection().multiplyScalar(2 + Math.random() * 6).setY(Math.random() * 7 + 1), 0.02 + Math.random() * 0.02);
    }
  }

  // ---- simulation ----
  protected update(dt: number) {
    const t = this.time;
    const idle = this.reduced ? 0 : 1;
    this.bubbleMat.uniforms.uTime.value = t;
    this.glow.update(dt);
    this.drops.update(dt);
    this.ball.rotation.y += dt * 0.5 * idle;
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

    for (const r of [...this.rockets]) {
      r.pos.addScaledVector(r.vel, dt);
      this.glow.emit(r.pos, new THREE.Vector3((Math.random() - 0.5) * 0.6, -0.8, 0), 0xffd9a0, 0.35, 0.05, -1, 1);
      if (r.pos.y >= r.target.y) {
        this.explode(r.target, r.colors);
        this.rockets = this.rockets.filter((x) => x !== r);
      }
    }

    for (const r of [...this.ripples]) {
      r.t += dt;
      const k = r.t / r.dur;
      r.mesh.scale.setScalar(0.2 + k * r.scale);
      const mat = r.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, mat.opacity * (1 - dt / Math.max(0.05, r.dur - r.t)));
      if (k >= 1) {
        this.stage.scene.remove(r.mesh);
        mat.dispose();
        this.ripples = this.ripples.filter((x) => x !== r);
      }
    }

    for (const b of [...this.bubbles]) {
      b.life -= dt;
      // Velocity eases toward a gentle rise with a slow side-to-side drift (like air currents).
      const sway = Math.sin(t * 0.9 + b.phase) * 0.35 + Math.sin(t * 2.1 + b.phase * 1.7) * 0.12;
      b.vel.x += (sway - b.vel.x) * Math.min(1, dt * 1.6);
      b.vel.y += (b.rise - b.vel.y) * Math.min(1, dt * 1.3);
      b.vel.z *= 1 - Math.min(1, dt * 2);
      b.mesh.position.addScaledVector(b.vel, dt);
      // Soap bubbles wobble: slightly squashed one way, then the other.
      const w = idle ? Math.sin(t * 5 + b.phase) * 0.05 : 0;
      b.mesh.scale.set(b.size * (1 + w), b.size * (1 - w), b.size * (1 + w * 0.5));
      if (b.life <= 0 || b.mesh.position.y > 15) this.popBubble(b);
    }

    this.bg.lerp(this.bgTarget, Math.min(1, dt * 2));
    (this.stage.scene.background as THREE.Color).copy(this.bg);
  }

  protected onDestroy() {
    this.ripples.forEach((r) => (r.mesh.material as THREE.Material).dispose());
    this.bubbleGeo.dispose();
    this.bubbleMat.dispose();
    this.ringGeo.dispose();
  }
}
