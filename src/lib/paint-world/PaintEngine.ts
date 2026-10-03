import * as THREE from "three";
import type { TapItem } from "@/data/animals";
import { COLORS } from "@/data/colors";
import { makeTitle } from "@/lib/toy3d/bubble";
import { addToyRoom } from "@/lib/toy3d/scenery";
import { ToyScene, type PickInfo, type ToyOptions } from "@/lib/toy3d/ToyScene";
import { Spring } from "@/lib/toy3d/spring";

export interface PaintOptions extends ToyOptions {
  onTap?: (p: { id: string; index: number; label: string; phrase: string; found: number }) => void;
  onMilestone?: (p: { found: number }) => void;
}

const MAX_SPLATS = 12;

interface Ball {
  item: TapItem;
  index: number;
  hex: number;
  group: THREE.Group;
  mesh: THREE.Mesh;
  x: number;
  z: number;
  squash: Spring;
  y: number;
  vy: number;
  airborne: boolean;
  phase: number;
  nextWobble: number;
  title: { sprite: THREE.Sprite; dispose: () => void; life: number } | null;
  lift: number;
}

interface Blob {
  mesh: THREE.Mesh;
  from: THREE.Vector3;
  to: THREE.Vector3;
  t: number;
  hex: number;
  splatAt: THREE.Vector3;
}

interface Splat {
  mesh: THREE.Mesh;
  tex: THREE.CanvasTexture;
  grow: Spring;
  age: number;
}

function splatTexture(color: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = color;
  g.translate(128, 120);
  g.beginPath();
  g.arc(0, 0, 54, 0, Math.PI * 2);
  g.fill();
  for (let i = 0; i < 9; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = 50 + Math.random() * 28;
    g.beginPath();
    g.arc(Math.cos(a) * d, Math.sin(a) * d, 12 + Math.random() * 20, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < 3; i++) {
    const x = (Math.random() - 0.5) * 70;
    g.beginPath();
    g.roundRect(x - 7, 20, 14, 40 + Math.random() * 50, 7);
    g.fill();
  }
  g.fillStyle = "rgba(255,255,255,0.35)";
  g.beginPath();
  g.ellipse(-18, -20, 18, 11, -0.6, 0, Math.PI * 2);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class PaintEngine extends ToyScene {
  private balls: Ball[] = [];
  private blobs: Blob[] = [];
  private splats: Splat[] = [];
  private wallMat: THREE.MeshStandardMaterial;
  private wallTarget = new THREE.Color(0xffefc2);
  private found = new Set<string>();
  private lastMilestone = 0;
  private blobGeo = new THREE.SphereGeometry(0.4, 14, 10);
  private shelfMat = new THREE.MeshStandardMaterial({ color: 0xe0a96d, roughness: 0.8 });
  private shelves: THREE.Mesh[] = [];

  constructor(container: HTMLElement, private opts: PaintOptions = {}) {
    super(container, 0xffefc2, opts);
    const room = addToyRoom(this.stage.scene);
    this.wallMat = room.wallMat;
    COLORS.forEach((item, index) => {
      const hex = parseInt((item.color ?? "#ffffff").slice(1), 16);
      const group = new THREE.Group();
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(1.25, 36, 28),
        new THREE.MeshPhysicalMaterial({ color: hex, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, emissive: hex, emissiveIntensity: 0.12 }),
      );
      group.add(mesh);
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.2, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 }));
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.03;
      this.stage.scene.add(shadow);
      const ball: Ball = { item, index, hex, group, mesh, x: 0, z: 0, squash: new Spring(0, 0, 200, 8), y: 0, vy: 0, airborne: false, phase: Math.random() * 6, nextWobble: 1 + Math.random() * 3, title: null, lift: 0 };
      const hit = new THREE.Mesh(new THREE.SphereGeometry(1.45, 12, 10), new THREE.MeshBasicMaterial({ visible: false }));
      hit.userData.owner = ball;
      group.add(hit);
      this.stage.scene.add(group);
      this.pickables.push(group);
      this.balls.push(ball);
      group.userData.shadow = shadow;
    });
    this.start();
  }

  protected onResize(aspect: number) {
    const cols = aspect > 1.2 ? 3 : 2;
    const rows = Math.ceil(this.balls.length / cols);
    const dist = (aspect > 1.2 ? 15 : 12 + rows * 2.5) * Math.max(1, 1.1 / aspect);
    const spacing = Math.min(4.2, (this.stage.halfWidthAt(dist) * 2 * 0.8) / cols);
    this.balls.forEach((b, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      b.x = (c - (cols - 1) / 2) * spacing;
      b.z = 2.5 - r * Math.min(4.6, spacing * 1.15);
      // Back rows stand on a shelf so they are never hidden behind the front row.
      b.lift = r * 2.2;
      const s = Math.min(1.25, spacing / 3.1);
      b.group.scale.setScalar(s);
      (b.group.userData.shadow as THREE.Mesh).scale.setScalar(s);
    });
    // Build one shelf per extra row.
    this.shelves.forEach((m) => {
      this.stage.scene.remove(m);
      m.geometry.dispose();
    });
    this.shelves = [];
    for (let r = 1; r < rows; r++) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(cols * spacing + 2, r * 2.2, 3.8), this.shelfMat);
      shelf.position.set(0, (r * 2.2) / 2, 2.5 - r * Math.min(4.6, spacing * 1.15));
      this.stage.scene.add(shelf);
      this.shelves.push(shelf);
    }
    const cam = this.stage.camera;
    cam.position.set(0, 5.2 + rows * 0.6, dist);
    cam.lookAt(0, 4.4, -3);
  }

  activate(id: string) {
    const b = this.balls.find((x) => x.item.id === id);
    if (b) this.tapBall(b);
  }

  protected onDown(info: PickInfo | null) {
    const b = info?.owner as Ball | undefined;
    if (b) this.tapBall(b);
  }

  private tapBall(b: Ball) {
    if (!b.airborne) {
      b.vy = 8;
      b.airborne = true;
    }
    b.squash.kick(this.reduced ? 0 : -5);
    // Paint blob flies to the wall, then splats.
    const to = new THREE.Vector3((Math.random() - 0.5) * 14, 3 + Math.random() * 5.5, -7.7);
    const mesh = new THREE.Mesh(this.blobGeo, new THREE.MeshBasicMaterial({ color: b.hex }));
    const from = b.group.position.clone();
    from.y += 2 * b.group.scale.y;
    mesh.position.copy(from);
    this.stage.scene.add(mesh);
    this.blobs.push({ mesh, from, to, t: 0, hex: b.hex, splatAt: to });

    this.wallTarget.set(0xffffff).lerp(new THREE.Color(b.hex), 0.28);
    if (b.title) {
      b.title.dispose();
      this.stage.scene.remove(b.title.sprite);
    }
    const t = makeTitle(b.item.label.toUpperCase(), b.item.color ?? "#333333");
    t.sprite.position.set(0, 3.6, 0);
    b.group.add(t.sprite);
    b.title = { ...t, life: 1.8 };

    this.found.add(b.item.id);
    this.opts.onTap?.({ id: b.item.id, index: b.index, label: b.item.label, phrase: b.item.phrase, found: this.found.size });
    if ((this.found.size === 3 || this.found.size === 6) && this.found.size !== this.lastMilestone) {
      this.lastMilestone = this.found.size;
      this.opts.onMilestone?.({ found: this.found.size });
    }
  }

  private addSplat(at: THREE.Vector3, hex: number) {
    const color = `#${hex.toString(16).padStart(6, "0")}`;
    const tex = splatTexture(color);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    mesh.position.copy(at);
    mesh.position.z += this.splats.length * 0.002;
    mesh.rotation.z = (Math.random() - 0.5) * 0.6;
    mesh.scale.setScalar(0.01);
    this.stage.scene.add(mesh);
    this.splats.push({ mesh, tex, grow: new Spring(0, 1, 160, 9), age: 0 });
    while (this.splats.length > MAX_SPLATS) {
      const old = this.splats.shift()!;
      this.stage.scene.remove(old.mesh);
      old.tex.dispose();
      old.mesh.geometry.dispose();
      (old.mesh.material as THREE.Material).dispose();
    }
  }

  protected update(dt: number) {
    for (const b of this.balls) {
      if (b.airborne) {
        b.vy -= 22 * dt;
        b.y += b.vy * dt;
        if (b.y <= 0) {
          b.y = 0;
          b.airborne = false;
          b.squash.kick(this.reduced ? 0 : 7);
        }
      }
      b.nextWobble -= dt;
      if (b.nextWobble <= 0 && !this.reduced) {
        b.squash.kick(2.2);
        b.nextWobble = 2 + Math.random() * 3.5;
      }
      const sq = b.squash.step(dt);
      const base = b.group.scale.x;
      b.group.position.set(b.x, 1.25 * base + b.y * base + b.lift, b.z);
      b.mesh.scale.set(1 + sq * 0.35, 1 - sq * 0.45, 1 + sq * 0.35);
      (b.group.userData.shadow as THREE.Mesh).position.set(b.x, 0.03 + b.lift, b.z);
      if (b.title) {
        b.title.life -= dt;
        const k = Math.min(1, (1.8 - b.title.life) * 5, b.title.life * 3);
        const e = Math.max(0.01, k * (2 - k));
        b.title.sprite.scale.set(5.2 * e, 1.8 * e, 1);
        b.title.sprite.position.y = 3.6 + (1 - Math.min(1, b.title.life)) * 0.6;
        if (b.title.life <= 0) {
          b.group.remove(b.title.sprite);
          b.title.dispose();
          b.title = null;
        }
      }
    }
    for (const bl of [...this.blobs]) {
      bl.t += dt / 0.4;
      const k = Math.min(1, bl.t);
      bl.mesh.position.lerpVectors(bl.from, bl.to, k);
      bl.mesh.position.y += Math.sin(k * Math.PI) * 2.2;
      bl.mesh.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.4);
      if (bl.t >= 1) {
        this.stage.scene.remove(bl.mesh);
        (bl.mesh.material as THREE.Material).dispose();
        this.blobs = this.blobs.filter((x) => x !== bl);
        this.addSplat(bl.to, bl.hex);
        if (!this.reduced) this.confetti.burst(bl.to.clone().setZ(-6.5), [bl.hex, 0xffffff], 14, 5);
      }
    }
    for (const s of this.splats) {
      s.age += dt;
      s.mesh.scale.setScalar(Math.max(0.01, s.grow.step(dt)));
    }
    this.splats.forEach((s, i) => {
      const older = this.splats.length - 1 - i;
      (s.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0.35, 1 - older * 0.06);
    });
    this.wallMat.color.lerp(this.wallTarget, Math.min(1, dt * 3));
    (this.stage.scene.background as THREE.Color).lerp(this.wallTarget, Math.min(1, dt * 3));
  }

  protected onDestroy() {
    this.balls.forEach((b) => b.title?.dispose());
    this.splats.forEach((s) => s.tex.dispose());
    this.blobGeo.dispose();
    this.shelfMat.dispose();
  }
}
