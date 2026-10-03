import * as THREE from "three";

export type FloaterKind = "heart" | "star" | "zzz" | "tear" | "puff" | "sweat" | "spark";

const textures = new Map<FloaterKind, THREE.CanvasTexture>();

function draw(kind: FloaterKind): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.translate(64, 64);
  g.lineJoin = "round";
  switch (kind) {
    case "heart":
      g.fillStyle = "#ff5c8a";
      g.beginPath();
      g.moveTo(0, 40);
      g.bezierCurveTo(-70, -5, -35, -52, 0, -18);
      g.bezierCurveTo(35, -52, 70, -5, 0, 40);
      g.fill();
      break;
    case "star":
    case "spark":
      g.fillStyle = kind === "star" ? "#ffd93d" : "#ffffff";
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 22 : 54;
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      g.closePath();
      g.fill();
      break;
    case "zzz":
      g.fillStyle = "#6d7bd8";
      g.font = "bold 100px sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("Z", 0, 6);
      break;
    case "tear":
    case "sweat":
      g.fillStyle = kind === "tear" ? "#4dabf7" : "#8ad4ff";
      g.beginPath();
      g.moveTo(0, -50);
      g.bezierCurveTo(40, 5, 40, 45, 0, 48);
      g.bezierCurveTo(-40, 45, -40, 5, 0, -50);
      g.fill();
      break;
    case "puff":
      g.fillStyle = "rgba(220,220,230,0.95)";
      for (const [x, y, r] of [[0, 0, 36], [-26, 8, 26], [26, 8, 26], [0, 18, 28]] as const) {
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      }
      break;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

interface Floater {
  sprite: THREE.Sprite;
  vel: THREE.Vector3;
  life: number;
  max: number;
  size: number;
  grow: number;
}

/** Little sprites that float, fall or rise and fade: hearts, Zzz, tears, steam, stars. */
export class Floaters {
  private items: Floater[] = [];
  private mats = new Map<FloaterKind, THREE.SpriteMaterial>();

  constructor(private scene: THREE.Scene) {}

  private material(kind: FloaterKind) {
    let m = this.mats.get(kind);
    if (!m) {
      let t = textures.get(kind);
      if (!t) textures.set(kind, (t = draw(kind)));
      m = new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false });
      this.mats.set(kind, m);
    }
    return m;
  }

  spawn(kind: FloaterKind, at: THREE.Vector3, vel: THREE.Vector3, size = 0.7, life = 1.4, grow = 0.3) {
    const sprite = new THREE.Sprite(this.material(kind).clone());
    sprite.position.copy(at);
    sprite.scale.setScalar(0.01);
    sprite.renderOrder = 9;
    this.scene.add(sprite);
    this.items.push({ sprite, vel, life, max: life, size, grow });
  }

  update(dt: number) {
    for (const f of this.items) {
      f.life -= dt;
      f.sprite.position.addScaledVector(f.vel, dt);
      const age = 1 - f.life / f.max;
      const pop = Math.min(1, age * 8);
      const s = f.size * (pop * (2 - pop)) * (1 + f.grow * age);
      f.sprite.scale.setScalar(Math.max(0.01, s));
      f.sprite.material.opacity = Math.min(1, f.life * 2.5);
    }
    this.items = this.items.filter((f) => {
      if (f.life > 0) return true;
      this.scene.remove(f.sprite);
      f.sprite.material.dispose();
      return false;
    });
  }

  dispose() {
    this.items.forEach((f) => {
      this.scene.remove(f.sprite);
      f.sprite.material.dispose();
    });
    this.items = [];
    this.mats.forEach((m) => m.dispose());
    this.mats.clear();
    textures.forEach((t) => t.dispose());
    textures.clear();
  }
}
