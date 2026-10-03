import * as THREE from "three";
import { ANIMALS, type TapItem } from "@/data/animals";
import { ToyScene, type PickInfo, type ToyOptions } from "@/lib/toy3d/ToyScene";
import { makeBubble } from "@/lib/toy3d/bubble";
import { buildAnimal, type AnimalRig } from "@/lib/toy3d/animals";
import { addMeadow, type Drifter } from "@/lib/toy3d/scenery";
import { Spring } from "@/lib/toy3d/spring";

export interface MeadowOptions extends ToyOptions {
  onTap?: (p: { id: string; index: number; label: string; phrase: string; found: number }) => void;
  onMilestone?: (p: { found: number }) => void;
}

interface Slot {
  item: TapItem;
  index: number;
  outer: THREE.Group;
  rig: AnimalRig;
  x: number;
  z: number;
  forward: Spring;
  forwardUntil: number;
  bubble: { sprite: THREE.Sprite; dispose: () => void; life: number } | null;
}

export class MeadowEngine extends ToyScene {
  private slots: Slot[] = [];
  private scenery: Drifter;
  private found = new Set<string>();
  private camY = 5;
  private camZ = 12;

  constructor(container: HTMLElement, private opts: MeadowOptions = {}) {
    super(container, 0xa9dcff, opts);
    this.scenery = addMeadow(this.stage.scene);
    ANIMALS.forEach((item, index) => {
      const rig = buildAnimal(item.id);
      const outer = new THREE.Group();
      outer.add(rig.group);
      const slot: Slot = { item, index, outer, rig, x: 0, z: 0, forward: new Spring(0, 0, 90, 12), forwardUntil: 0, bubble: null };
      outer.add(this.hitBox(slot, 2.0, rig.height + 0.8, 2.0));
      outer.children[outer.children.length - 1].position.y = (rig.height + 0.8) / 2;
      this.stage.scene.add(outer);
      this.pickables.push(outer);
      this.slots.push(slot);
    });
    this.start();
  }

  protected onResize(aspect: number) {
    const cols = aspect > 1.3 ? 5 : 3;
    const rows = Math.ceil(this.slots.length / cols);
    const dist = (aspect > 1.3 ? 14 : 16 + rows) * Math.max(1, 1.2 / aspect);
    const spacing = Math.min(5.6, (this.stage.halfWidthAt(dist) * 2 * 0.8) / cols);
    this.slots.forEach((s, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      s.x = (c - (cols - 1) / 2) * spacing + (r % 2 ? spacing * 0.22 : -spacing * 0.12);
      s.z = -r * Math.min(5.5, spacing * 1.25) + 1.5;
      const scale = Math.min(1.9, spacing / 2.0);
      s.outer.scale.setScalar(scale);
    });
    this.camZ = dist;
    this.camY = 8 + rows * 1.2;
    const cam = this.stage.camera;
    cam.position.set(0, this.camY, this.camZ);
    cam.lookAt(0, 0.3, -rows * 1.25);
  }

  /** Keyboard / screen reader equivalent of tapping an animal. */
  activate(id: string) {
    const s = this.slots.find((x) => x.item.id === id);
    if (s) this.celebrate(s);
  }

  protected onDown(info: PickInfo | null) {
    const slot = info?.owner as Slot | undefined;
    if (slot) this.celebrate(slot);
  }

  private celebrate(s: Slot) {
    s.rig.cheer();
    s.forward.target = 1.6;
    s.forwardUntil = this.time + 1.8;
    s.bubble?.dispose();
    if (s.bubble) this.stage.scene.remove(s.bubble.sprite);
    const b = makeBubble(s.item.phrase);
    b.sprite.position.set(0, s.rig.height + 1.3, 0);
    b.sprite.scale.set(0.01, 0.01, 1);
    s.outer.add(b.sprite);
    s.bubble = { ...b, life: 1.8 };
    if (!this.reduced) {
      const at = s.outer.position.clone();
      at.y += s.rig.height * s.outer.scale.y;
      this.confetti.burst(at, [0xff6b9a, 0xffd93d, 0xffffff, 0x6bcb77], 22, 6);
    }
    this.found.add(s.item.id);
    this.opts.onTap?.({ id: s.item.id, index: s.index, label: s.item.label, phrase: s.item.phrase, found: this.found.size });
    if (this.found.size % 5 === 0 && this.found.size > 0 && this.found.size !== this.lastMilestone) {
      this.lastMilestone = this.found.size;
      this.opts.onMilestone?.({ found: this.found.size });
    }
  }
  private lastMilestone = 0;

  protected update(dt: number) {
    this.scenery.update(dt);
    for (const s of this.slots) {
      if (s.forwardUntil && this.time > s.forwardUntil) {
        s.forward.target = 0;
        s.forwardUntil = 0;
      }
      const f = s.forward.step(dt);
      s.outer.position.set(s.x, 0, s.z + f);
      s.rig.update(dt, this.time, this.reduced);
      if (s.bubble) {
        s.bubble.life -= dt;
        const pop = Math.min(1, (1.8 - s.bubble.life) * 6);
        const fade = Math.min(1, s.bubble.life * 3);
        const k = Math.min(pop, fade);
        const ease = k * (2 - k);
        s.bubble.sprite.scale.set(3.6 * ease, 1.4 * ease, 1);
        if (s.bubble.life <= 0) {
          s.outer.remove(s.bubble.sprite);
          s.bubble.dispose();
          s.bubble = null;
        }
      }
    }
  }

  protected onDestroy() {
    for (const s of this.slots) s.bubble?.dispose();
  }
}
