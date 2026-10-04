import * as THREE from "three";
import { buildVehicle, disposeGlowTexture, getGlowTexture, GeometryCache, type BuiltVehicle } from "@/lib/apex-highway/vehicle-builder";
import { getVehicleSpec } from "@/lib/apex-highway/vehicle-specs";
import { addClouds, addToyLights, type Drifter } from "@/lib/toy3d/scenery";
import { Spring } from "@/lib/toy3d/spring";
import { ToyScene, type ToyOptions } from "@/lib/toy3d/ToyScene";

export interface RacerOptions extends ToyOptions {
  onFinished?: () => void;
}

const LANE = 4;
const TREE_PERIOD = 36;
const DASH_PERIOD = 10;

interface Rival {
  car: BuiltVehicle;
  lane: number;
  rel: number;
}

/** A 3D race: the car is always moving; right answers boost it past the rivals and over the finish line. */
export class RacerEngine extends ToyScene {
  private cache = new GeometryCache();
  private player: BuiltVehicle;
  private rivals: Rival[] = [];
  private clouds: Drifter;
  private trees = new THREE.Group();
  private dashes = new THREE.Group();
  private gantry = new THREE.Group();
  private lines: THREE.Mesh[] = [];
  private lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
  private flame: THREE.Sprite;
  private flameMat: THREE.SpriteMaterial;

  private dist = 0;
  private boostLevel = 0;
  private boostHold = false;
  private move = 1;
  private state: "racing" | "finishing" | "done" = "racing";
  private wob = new Spring(0, 0, 200, 7);
  private hop = new Spring(0, 0, 160, 8);
  private pitch = new Spring(0, 0, 90, 8);
  private fov = 55;
  private notified = false;

  constructor(container: HTMLElement, private opts: RacerOptions = {}) {
    super(container, 0xbfe3ff, opts, 55);
    const scene = this.stage.scene;
    scene.fog = new THREE.Fog(0xbfe3ff, 70, 260);
    addToyLights(scene, 1.15);

    const grass = new THREE.Mesh(new THREE.PlaneGeometry(500, 900), new THREE.MeshStandardMaterial({ color: 0x8fdc6b, roughness: 1 }));
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(0, -0.03, -350);
    scene.add(grass);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(LANE * 3, 900), new THREE.MeshStandardMaterial({ color: 0x4b4f58, roughness: 0.9 }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, -350);
    scene.add(road);
    for (const s of [-1, 1]) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.03, 900), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      edge.position.set(s * (LANE * 1.5 - 0.3), 0.02, -350);
      scene.add(edge);
    }

    // Dashed lane lines and roadside trees scroll by modulo, so the loop is seamless.
    const dashGeo = new THREE.BoxGeometry(0.25, 0.03, 3.2);
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const x of [-LANE / 2, LANE / 2]) {
      for (let i = 0; i < 40; i++) {
        const d = new THREE.Mesh(dashGeo, dashMat);
        d.position.set(x, 0.02, -i * DASH_PERIOD);
        this.dashes.add(d);
      }
    }
    scene.add(this.dashes);

    const trunk = new THREE.CylinderGeometry(0.3, 0.4, 2.4, 8);
    const leaf = new THREE.SphereGeometry(1.7, 14, 10);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a5a3c });
    const leafMats = [0x3fae52, 0x2f9b47, 0x57c069].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }));
    for (let i = 0; i < 30; i++) {
      for (const side of [-1, 1]) {
        const t = new THREE.Group();
        const trunkM = new THREE.Mesh(trunk, trunkMat);
        trunkM.position.y = 1.2;
        const leafM = new THREE.Mesh(leaf, leafMats[(i + (side > 0 ? 1 : 0)) % 3]);
        leafM.position.y = 3.6;
        leafM.scale.set(1, 1.15, 1);
        t.add(trunkM, leafM);
        const sc = 0.85 + ((i * 7 + (side > 0 ? 3 : 0)) % 5) * 0.12;
        t.scale.setScalar(sc);
        t.position.set(side * (9 + ((i * 5) % 4) * 1.6), 0, -i * 12);
        this.trees.add(t);
      }
    }
    scene.add(this.trees);

    for (const [x, z, r, c] of [[-60, -240, 40, 0x7ccf63], [50, -260, 50, 0x6fc45a], [-10, -300, 60, 0x84d46a]] as const) {
      const h = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({ color: c, roughness: 1 }));
      h.position.set(x, -r * 0.4, z);
      h.scale.setScalar(r);
      scene.add(h);
    }
    const sun = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffe066, fog: false }));
    sun.position.set(40, 60, -300);
    sun.scale.setScalar(10);
    scene.add(sun);
    this.clouds = addClouds(scene, 7, 22, -120);

    // Cars
    this.player = buildVehicle(getVehicleSpec("coupe"), "#e53935", this.cache, true);
    this.player.group.position.set(0, 0, 0);
    scene.add(this.player.group);
    const rivalSpecs: [string, string, number][] = [["sedan", "#3a6ee8", -1], ["suv", "#2e9b4a", 1], ["pickup", "#f9a825", -1]];
    rivalSpecs.forEach(([kind, color, lane], i) => {
      const car = buildVehicle(getVehicleSpec(kind), color, this.cache, false);
      scene.add(car.group);
      this.rivals.push({ car, lane, rel: -30 - i * 38 });
    });

    // Finish gantry (shown only at the end)
    this.buildGantry();
    this.gantry.visible = false;
    scene.add(this.gantry);

    // Speed lines and boost flame
    const lineGeo = new THREE.BoxGeometry(0.05, 0.05, 4);
    for (let i = 0; i < 30; i++) {
      const m = new THREE.Mesh(lineGeo, this.lineMat);
      this.resetLine(m, true);
      scene.add(m);
      this.lines.push(m);
    }
    this.flameMat = new THREE.SpriteMaterial({ map: getGlowTexture(), color: 0xff9a3c, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 });
    this.flame = new THREE.Sprite(this.flameMat);
    this.flame.position.set(0, 0.7, 3.2);
    this.player.group.add(this.flame);

    this.stage.onDispose(() => {
      this.cache.dispose();
      this.player.dispose();
      this.rivals.forEach((r) => r.car.dispose());
      this.lineMat.dispose();
      this.flameMat.dispose();
      disposeGlowTexture();
    });
    this.start();
  }

  private buildGantry() {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      g.fillStyle = (x + y) % 2 ? "#111" : "#fff";
      g.fillRect(x * 16, y * 16, 16, 16);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(10, 1);
    tex.colorSpace = THREE.SRGBColorSpace;
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(LANE * 3 + 3, 1.6), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    banner.position.set(0, 8, 0);
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(LANE * 3, 2), new THREE.MeshBasicMaterial({ map: tex.clone() }));
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(0, 0.04, 0);
    const postMat = new THREE.MeshStandardMaterial({ color: 0xe53935 });
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, 8.6, 0.6), postMat);
      post.position.set(s * (LANE * 1.5 + 1.2), 4.3, 0);
      this.gantry.add(post);
    }
    this.gantry.add(banner, strip);
  }

  private resetLine(m: THREE.Mesh, anywhere: boolean) {
    const a = Math.random() * Math.PI * 2;
    const r = 3 + Math.random() * 7;
    m.position.set(Math.cos(a) * r, 1 + Math.abs(Math.sin(a)) * r * 0.6, anywhere ? -Math.random() * 60 + 6 : -50 - Math.random() * 10);
  }

  // ---- controls ----
  /** A right answer: surge forward, hop and flare the flame. */
  boost() {
    if (this.state !== "racing") return;
    this.boostLevel = 1;
    this.hop.kick(this.reduced ? 0 : 5);
    this.pitch.kick(this.reduced ? 0 : -3);
  }

  /** A wrong answer: a gentle wiggle; the car keeps its speed. */
  wobble() {
    this.wob.kick(this.reduced ? 0 : 6);
  }

  finish() {
    if (this.state !== "racing") return;
    this.state = "finishing";
    this.boostHold = true;
    this.gantry.visible = true;
    this.gantry.position.z = -140;
    this.notified = false;
  }

  reset() {
    this.state = "racing";
    this.boostHold = false;
    this.boostLevel = 0;
    this.move = 1;
    this.gantry.visible = false;
    this.notified = false;
    this.rivals.forEach((r, i) => (r.rel = -30 - i * 38));
  }

  protected onResize(aspect: number) {
    const cam = this.stage.camera;
    cam.position.set(0, 3.6 + (aspect < 1 ? 1.2 : 0), 10.5 + (aspect < 1 ? 5 : 0));
    cam.lookAt(0, 1.3, -12);
  }

  // ---- simulation ----
  protected update(dt: number) {
    this.clouds.update(dt);
    const t = this.time;
    const reduced = this.reduced;
    const base = reduced ? 9 : 17;
    if (this.boostHold) this.boostLevel = 1;
    else this.boostLevel = Math.max(0, this.boostLevel - dt * 0.45);
    if (this.state === "done") this.move = Math.max(0, this.move - dt * 0.5);
    const speed = (base + this.boostLevel * (reduced ? 12 : 34)) * this.move;
    this.dist += speed * dt;

    // World scrolling toward the camera
    this.dashes.position.z = this.dist % DASH_PERIOD;
    this.trees.position.z = this.dist % TREE_PERIOD;

    // Player
    const w = this.wob.step(dt);
    const hop = Math.max(0, this.hop.step(dt));
    const pitch = this.pitch.step(dt);
    const p = this.player.group;
    const bounce = reduced ? 0 : Math.sin(t * 22) * 0.012 * Math.min(1, speed / 20);
    p.position.set(w * 0.9, hop * 0.25 + bounce, 0);
    p.rotation.set(pitch * 0.04 + this.boostLevel * 0.025, -w * 0.18, w * 0.03);
    for (const s of this.player.spinGroups) s.rotation.x -= (speed / this.player.spec.wheelRadius) * dt;
    this.player.setLights(0, this.state === "done" && this.move > 0.05);

    // Rivals drive at a steady pace; boosting passes them, coasting lets them pass back
    const rivalSpeed = (reduced ? 9 : 24) * (this.state === "done" ? 0 : 1);
    for (const r of this.rivals) {
      r.rel += (rivalSpeed - speed) * dt;
      if (r.rel > 22) r.rel = -90 - Math.random() * 40;
      r.car.group.position.set(r.lane * LANE, 0, r.rel);
      for (const s of r.car.spinGroups) s.rotation.x -= (rivalSpeed / r.car.spec.wheelRadius) * dt;
    }

    // Boost effects
    const fx = reduced ? 0 : this.boostLevel;
    this.lineMat.opacity = fx * 0.55;
    for (const m of this.lines) {
      m.position.z += speed * 1.6 * dt;
      if (m.position.z > 12) this.resetLine(m, false);
    }
    this.flameMat.opacity = fx * 0.9;
    this.flame.scale.setScalar(1.2 + fx * 3.2 + Math.sin(t * 40) * 0.2 * fx);
    this.fov += (55 + fx * 18 - this.fov) * Math.min(1, dt * 4);
    const cam = this.stage.camera;
    if (Math.abs(cam.fov - this.fov) > 0.01) {
      cam.fov = this.fov;
      cam.updateProjectionMatrix();
    }
    if (fx > 0.5) cam.position.x = (Math.random() - 0.5) * 0.06 * fx;
    else cam.position.x = 0;

    // Finish gantry
    if (this.state !== "racing") {
      this.gantry.position.z += speed * dt;
      if (this.state === "finishing" && this.gantry.position.z >= 0) {
        this.state = "done";
        this.boostHold = false;
        this.boostLevel = 0.6;
        this.hop.kick(this.reduced ? 0 : 7);
        if (!this.reduced) {
          this.confetti.burst(new THREE.Vector3(-6, 6, -2), [0xff6b6b, 0xffd93d, 0x6bcb77, 0x4d96ff], 50, 9);
          this.confetti.burst(new THREE.Vector3(6, 6, -2), [0xff6b6b, 0xffd93d, 0x6bcb77, 0x4d96ff], 50, 9);
          this.confetti.burst(new THREE.Vector3(0, 7, -6), [0xffd93d, 0xffffff, 0xff6b9a], 40, 10);
        }
        if (!this.notified) {
          this.notified = true;
          this.opts.onFinished?.();
        }
      }
    }
  }

  protected onDestroy() {
    this.lines.forEach((l) => this.stage.scene.remove(l));
  }
}
