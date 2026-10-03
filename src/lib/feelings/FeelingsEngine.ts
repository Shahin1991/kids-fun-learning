import * as THREE from "three";
import type { TapItem } from "@/data/animals";
import { EMOTIONS } from "@/data/emotions";
import { addToyRoom } from "@/lib/toy3d/scenery";
import { drawFace, type Emotion } from "@/lib/toy3d/faces";
import { Floaters } from "@/lib/toy3d/floaters";
import { ToyScene, type PickInfo, type ToyOptions } from "@/lib/toy3d/ToyScene";
import { Spring } from "@/lib/toy3d/spring";

export interface FeelingsOptions extends ToyOptions {
  onTap?: (p: { id: string; index: number; label: string; phrase: string; found: number }) => void;
  onMilestone?: (p: { found: number }) => void;
}

interface FaceBall {
  item: TapItem;
  index: number;
  emotion: Emotion;
  group: THREE.Group;
  ball: THREE.Mesh;
  x: number;
  z: number;
  squash: Spring;
  pop: Spring;
  react: number;
  fx: number;
  phase: number;
  tex: THREE.CanvasTexture;
}

const REACT_TIME = 1.8;

export class FeelingsEngine extends ToyScene {
  private faces: FaceBall[] = [];
  private floaters: Floaters;
  private found = new Set<string>();
  private lastMilestone = 0;

  constructor(container: HTMLElement, private opts: FeelingsOptions = {}) {
    super(container, 0xffe8f0, opts);
    addToyRoom(this.stage.scene, 0xffe1ec, 0xd0a06c);
    this.floaters = new Floaters(this.stage.scene);
    this.stage.onDispose(() => this.floaters.dispose());
    EMOTIONS.forEach((item, index) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 512;
      drawFace(canvas.getContext("2d")!, item.id as Emotion);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      const group = new THREE.Group();
      const ball = new THREE.Mesh(new THREE.SphereGeometry(1.2, 40, 30), new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.25 }));
      group.add(ball);
      const fb: FaceBall = { item, index, emotion: item.id as Emotion, group, ball, x: 0, z: 0, squash: new Spring(0, 0, 220, 9), pop: new Spring(0, 0, 200, 10), react: 0, fx: 0, phase: Math.random() * 6, tex };
      const hit = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 10), new THREE.MeshBasicMaterial({ visible: false }));
      hit.userData.owner = fb;
      group.add(hit);
      this.stage.scene.add(group);
      this.pickables.push(group);
      this.faces.push(fb);
    });
    this.start();
  }

  protected onResize(aspect: number) {
    const cols = aspect > 1.2 ? 4 : 2;
    const rows = Math.ceil(this.faces.length / cols);
    const dist = (aspect > 1.2 ? 15 : 10 + rows * 3) * Math.max(1, 1.1 / aspect);
    const spacing = Math.min(3.9, (this.stage.halfWidthAt(dist) * 2 * 0.86) / cols);
    this.faces.forEach((f, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      f.x = (c - (cols - 1) / 2) * spacing;
      f.z = 1.5 - r * Math.min(5, spacing * 1.35);
      f.group.scale.setScalar(Math.min(1.25, spacing / 2.9));
    });
    const cam = this.stage.camera;
    cam.position.set(0, 7.5 + rows * 1.0, dist);
    cam.lookAt(0, 1.2, -2.2);
  }

  activate(id: string) {
    const f = this.faces.find((x) => x.item.id === id);
    if (f) this.react(f);
  }

  protected onDown(info: PickInfo | null) {
    const f = info?.owner as FaceBall | undefined;
    if (f) this.react(f);
  }

  private react(f: FaceBall) {
    f.react = REACT_TIME;
    f.fx = 0;
    if (f.emotion === "happy" || f.emotion === "silly") f.pop.kick(this.reduced ? 0 : 9);
    if (f.emotion === "surprised") f.pop.kick(this.reduced ? 0 : 14);
    f.squash.kick(this.reduced ? 0 : -3);
    this.found.add(f.item.id);
    this.opts.onTap?.({ id: f.item.id, index: f.index, label: f.item.label, phrase: f.item.phrase, found: this.found.size });
    if (this.found.size % 4 === 0 && this.found.size !== this.lastMilestone) {
      this.lastMilestone = this.found.size;
      this.opts.onMilestone?.({ found: this.found.size });
    }
  }

  /** Emotion-specific floating bits, spawned a few times during the reaction. */
  private emit(f: FaceBall) {
    if (this.reduced) return;
    const base = f.group.position;
    const r = 1.2 * f.group.scale.x;
    const v = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);
    const at = (x: number, y: number) => v(base.x + x * r, base.y + y * r, base.z + r * 0.8);
    switch (f.emotion) {
      case "sad":
        for (const sx of [-0.4, 0.4]) this.floaters.spawn("tear", at(sx, 0.05), v(0, -1.6), 0.45, 0.9, 0);
        break;
      case "angry":
        for (const sx of [-0.8, 0.8]) this.floaters.spawn("puff", at(sx, 0.9), v(sx * 0.8, 1.8), 0.8, 1.1, 0.8);
        break;
      case "surprised":
        for (let i = 0; i < 3; i++) this.floaters.spawn("star", at((Math.random() - 0.5) * 1.8, 1.1), v((Math.random() - 0.5) * 3, 2.5), 0.6, 1.1, 0);
        break;
      case "sleepy":
        this.floaters.spawn("zzz", at(0.8, 0.9), v(0.6, 1.2), 0.8, 1.6, 0.6);
        break;
      case "loved":
        for (let i = 0; i < 2; i++) this.floaters.spawn("heart", at((Math.random() - 0.5) * 1.6, 0.9), v((Math.random() - 0.5) * 1.2, 1.8), 0.7, 1.6, 0.2);
        break;
      case "scared":
        this.floaters.spawn("sweat", at(-0.9, 0.5), v(-0.2, -1.2), 0.5, 1.0, 0);
        break;
      case "happy":
      case "silly":
        this.floaters.spawn("spark", at((Math.random() - 0.5) * 1.8, 1), v((Math.random() - 0.5) * 2, 2), 0.45, 0.9, 0);
        break;
    }
  }

  protected update(dt: number) {
    this.floaters.update(dt);
    for (const f of this.faces) {
      const t = this.time;
      const sq = f.squash.step(dt);
      const hop = Math.max(0, f.pop.step(dt));
      const base = f.group.scale.x;
      const idle = this.reduced ? 0 : 1;
      let rotZ = 0;
      let rotY = Math.sin(t * 0.7 + f.phase) * 0.25 * idle;
      let sx = 1 + sq * 0.3;
      let sy = 1 - sq * 0.4;
      let dx = 0;
      let dy = Math.sin(t * 1.6 + f.phase) * 0.06 * idle;

      if (f.react > 0) {
        f.react -= dt;
        const p = 1 - f.react / REACT_TIME;
        f.fx -= dt;
        if (f.fx <= 0) {
          this.emit(f);
          f.fx = f.emotion === "angry" || f.emotion === "sad" ? 0.35 : 0.5;
        }
        if (!this.reduced) {
          switch (f.emotion) {
            case "sad":
              rotZ = Math.sin(Math.min(1, p * 2) * Math.PI * 0.5) * 0.35;
              sy *= 0.88;
              dy -= 0.1;
              break;
            case "angry":
              dx = Math.sin(t * 55) * 0.07 * (1 - p);
              sx *= 1.05;
              break;
            case "surprised":
              sx *= 1 + hop * 0.04;
              sy *= 1 + hop * 0.04;
              break;
            case "sleepy":
              rotZ = Math.sin(p * Math.PI) * 0.4;
              break;
            case "silly":
              rotY += Math.sin(p * Math.PI * 4) * 0.7;
              rotZ = Math.sin(p * Math.PI * 6) * 0.2;
              break;
            case "loved": {
              const beat = Math.max(0, Math.sin(p * Math.PI * 6));
              sx *= 1 + beat * 0.12;
              sy *= 1 + beat * 0.12;
              break;
            }
            case "scared":
              dx = Math.sin(t * 70) * 0.045;
              break;
            default:
              break;
          }
        }
      }
      f.group.position.set(f.x + dx * base, 1.2 * base + (dy + hop * 0.12) * base, f.z);
      f.group.rotation.set(0, rotY, rotZ);
      f.ball.scale.set(sx, sy, sx);
      f.ball.position.y = 0;
    }
  }

  protected onDestroy() {
    this.faces.forEach((f) => f.tex.dispose());
  }
}
