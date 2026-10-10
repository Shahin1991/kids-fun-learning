import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { ApexAudio } from "./audio";
import { applyBend, bendUniform, curvatureAt } from "./curve";
import { buildVehicle, disposeGlowTexture, GeometryCache, type BuiltVehicle } from "./vehicle-builder";
import { EMERGENCY_KINDS, getVehicleSpec, TRAFFIC_KINDS, type VehicleSpec } from "./vehicle-specs";
import { LANE_COUNT, ROAD_HALF, World } from "./world";

export type CameraMode = "follow" | "cockpit";
export type Phase = "garage" | "playing" | "paused" | "crashed";
export type InputKey = "left" | "right" | "brake" | "gas";

export interface HudData {
  speedKmh: number;
  maxKmh: number;
  gear: number;
  rpm: number;
  score: number;
  distance: number;
  closeCalls: number;
  combo: number;
}

export interface GameSummary {
  score: number;
  distance: number;
  closeCalls: number;
}

export interface ApexHooks {
  onHud?: (h: HudData) => void;
  onPhase?: (p: Phase) => void;
  onGameOver?: (s: GameSummary) => void;
  onCamera?: (m: CameraMode) => void;
  onNight?: (night: boolean) => void;
  onMuted?: (muted: boolean) => void;
}

interface Traffic {
  built: BuiltVehicle;
  lane: number;
  x: number;
  /** distance ahead of the player in metres (negative = behind) */
  d: number;
  speed: number;
  baseSpeed: number;
  changeIn: number;
  lastD: number;
  scored: boolean;
  flashing: boolean;
  spheres: number[];
  r: number;
}

interface Spark {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
}

const GEARS = 6;
const SPARK_MAX = 90;

export class ApexEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1200);
  private world: World;
  private cache = new GeometryCache();
  private audio = new ApexAudio();
  private pmrem: THREE.PMREMGenerator;
  private envTarget: THREE.WebGLRenderTarget;
  private spots = [new THREE.SpotLight(0xfff1c8, 0, 90, 0.5, 0.6, 1), new THREE.SpotLight(0xfff1c8, 0, 90, 0.5, 0.6, 1)];

  private player: BuiltVehicle;
  private spec: VehicleSpec;
  private color = "#3a6ee8";
  private traffic: Traffic[] = [];
  private sparks: Spark[] = [];
  private sparkPoints: THREE.Points;

  private phase: Phase = "garage";
  private camMode: CameraMode = "follow";
  private keys: Record<InputKey, boolean> = { left: false, right: false, brake: false, gas: false };
  private sirenOn = false;
  private sceneryMode: "countryside" | "city" | "auto" = "countryside";
  private lightsLatched = false;
  private muted = false;
  private nightTarget = 0;

  private speed = 0;
  private accel = 0;
  private x = 0;
  private heading = 0;
  private steer = 0;
  private pitch = 0;
  private distance = 0;
  private score = 0;
  private closeCalls = 0;
  private combo = 0;
  private comboT = 0;
  private scraping = false;
  private shake = 0;
  private crashT = 0;
  private spawnT = 0;
  private gear = 1;
  private rpm = 0;
  private garageAngle = 0.6;
  private viewShift = { x: 0, y: 0 };
  private hudAt = 0;
  private timeSec = 0;

  private raf = 0;
  private lastT = 0;
  private destroyed = false;
  private camPos = new THREE.Vector3(0, 4, 10);
  private camLook = new THREE.Vector3(0, 1, -10);

  constructor(private container: HTMLElement, private hooks: ApexHooks = {}) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:none";
    container.appendChild(this.renderer.domElement);

    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.envTarget = this.pmrem.fromScene(room, 0.04);
    this.scene.environment = this.envTarget.texture;
    room.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });

    this.world = new World(this.scene, this.renderer.capabilities.getMaxAnisotropy());
    for (const s of this.spots) {
      s.penumbra = 0.6;
      this.scene.add(s, s.target);
    }

    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SPARK_MAX * 3), 3));
    this.sparkPoints = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ color: 0xffb040, size: 0.18, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.sparkPoints.frustumCulled = false;
    this.scene.add(this.sparkPoints);

    this.spec = getVehicleSpec("sedan");
    this.player = this.makePlayer();

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("pagehide", this.onPageHide);
    window.addEventListener("blur", this.releaseInputs);
    this.resize();
    this.applyNight(0);
    this.raf = requestAnimationFrame(this.loop);
  }

  // ---- public API ----
  setVehicle(id: string) {
    this.spec = getVehicleSpec(id);
    this.scene.remove(this.player.group);
    this.player.dispose();
    this.player = this.makePlayer();
    this.audio.setVehicle(this.spec);
    this.setSiren(false);
  }

  setPaint(hex: string) {
    this.color = hex;
    this.player.setPaint(hex);
  }

  /** Countryside, city, or auto (switches every 4 km of driving, through a short fog fade). */
  setScenery(mode: "countryside" | "city" | "auto", instant = false) {
    this.sceneryMode = mode;
    if (mode !== "auto") this.world.setEnvironment(mode, instant);
  }

  setNight(night: boolean) {
    this.nightTarget = night ? 1 : 0;
    this.hooks.onNight?.(night);
  }

  setCameraMode(m: CameraMode) {
    this.camMode = m;
    this.hooks.onCamera?.(m);
  }

  setMuted(m: boolean) {
    this.muted = m;
    this.audio.setMuted(m);
    this.hooks.onMuted?.(m);
  }

  setInput(k: InputKey, down: boolean) {
    this.keys[k] = down;
  }

  setViewShift(x: number, y: number) {
    this.viewShift = { x, y };
    this.applyViewOffset();
  }

  start() {
    this.audio.start();
    this.audio.setVehicle(this.spec);
    this.audio.setMuted(this.muted);
    this.resetRun();
    this.setPhase("playing");
  }

  pause(p: boolean) {
    if (p && this.phase === "playing") {
      this.setPhase("paused");
      this.audio.setPaused(true);
    } else if (!p && this.phase === "paused") {
      this.setPhase("playing");
      this.audio.setPaused(false);
    }
  }

  toGarage() {
    this.audio.silence();
    this.clearTraffic();
    this.resetRun();
    this.audio.setPaused(false);
    this.setPhase("garage");
  }

  resize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.applyViewOffset();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("pagehide", this.onPageHide);
    window.removeEventListener("blur", this.releaseInputs);
    this.audio.dispose();
    this.clearTraffic();
    this.player.dispose();
    this.world.dispose();
    this.cache.dispose();
    disposeGlowTexture();
    this.sparkPoints.geometry.dispose();
    (this.sparkPoints.material as THREE.Material).dispose();
    this.spots.forEach((s) => s.dispose());
    this.envTarget.dispose();
    this.pmrem.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }

  // ---- setup helpers ----
  private makePlayer(): BuiltVehicle {
    const v = buildVehicle(this.spec, this.color, this.cache, true);
    applyBend(v.group);
    this.scene.add(v.group);
    // The two spotlights are re-parented to the new body instead of being recreated.
    this.spots.forEach((s, i) => {
      v.headAnchors[i].add(s);
      v.group.add(s.target);
      s.position.set(0, 0, 0);
      s.target.position.set(v.headAnchors[i].position.x, 0, -40);
    });
    return v;
  }

  private setPhase(p: Phase) {
    this.phase = p;
    this.hooks.onPhase?.(p);
  }

  private applyViewOffset() {
    const w = this.renderer.domElement.clientWidth || this.container.clientWidth;
    const h = this.renderer.domElement.clientHeight || this.container.clientHeight;
    if (this.phase === "garage" && (this.viewShift.x || this.viewShift.y)) {
      this.camera.setViewOffset(w, h, this.viewShift.x, this.viewShift.y, w, h);
    } else {
      this.camera.clearViewOffset();
    }
    this.camera.updateProjectionMatrix();
  }

  private resetRun() {
    this.speed = 0;
    this.accel = 0;
    this.x = this.world.laneX(2);
    this.heading = 0;
    this.steer = 0;
    this.distance = 0;
    this.score = 0;
    this.closeCalls = 0;
    this.combo = 0;
    this.shake = 0;
    this.crashT = 0;
    this.scraping = false;
    this.sparks = [];
    this.spawnT = 0;
    this.clearTraffic();
    for (let d = 50; d < 260; d += 30 + Math.random() * 25) this.trySpawn(d);
  }

  private clearTraffic() {
    for (const t of this.traffic) {
      this.scene.remove(t.built.group);
      t.built.dispose();
    }
    this.traffic = [];
  }

  // ---- input ----
  private onKeyDown = (e: KeyboardEvent) => {
    const map: Record<string, InputKey> = { ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right", ArrowUp: "gas", w: "gas", W: "gas", ArrowDown: "brake", s: "brake", S: "brake", " ": "brake" };
    if (e.key in map) {
      this.keys[map[e.key]] = true;
      e.preventDefault();
      return;
    }
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === "c") this.setCameraMode(this.camMode === "follow" ? "cockpit" : "follow");
    else if (k === "n") this.setNight(this.nightTarget < 0.5);
    else if (k === "m") this.setMuted(!this.muted);
    else if (k === "h") this.setSiren(true);
    else if (k === "l") this.lightsLatched = !this.lightsLatched;
    else if (k === "p" || e.key === "Escape") this.pause(this.phase === "playing");
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const map: Record<string, InputKey> = { ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right", ArrowUp: "gas", w: "gas", W: "gas", ArrowDown: "brake", s: "brake", S: "brake", " ": "brake" };
    if (e.key in map) this.keys[map[e.key]] = false;
    if (e.key.toLowerCase() === "h") this.setSiren(false);
  };

  /** H: siren on emergency vehicles, horn on everything else. */
  private setSiren(on: boolean) {
    this.sirenOn = on && Boolean(this.spec.features.siren);
    this.audio.setSiren(this.sirenOn);
    this.audio.setHorn(on && !this.spec.features.siren);
  }

  /** Leaving the page (or it going into the back/forward cache) must never leave an engine running. */
  private onPageHide = () => this.audio.dispose();

  private onVisibility = () => {
    if (document.hidden) this.pause(true);
    this.releaseInputs();
  };

  /** A key or pedal released while the window was unfocused would otherwise stay "held". */
  private releaseInputs = () => {
    this.keys = { left: false, right: false, brake: false, gas: false };
  };

  // ---- traffic ----
  private laneOccupied(lane: number, d: number, span: number, ignore?: Traffic) {
    return this.traffic.some((t) => t !== ignore && Math.round(t.lane) === lane && Math.abs(t.d - d) < span);
  }

  private trySpawn(d: number) {
    const lanes = Array.from({ length: LANE_COUNT }, (_, i) => i).sort(() => Math.random() - 0.5);
    for (const lane of lanes) {
      if (this.laneOccupied(lane, d, 22)) continue;
      // Keep at least one lane free in this band so there is always a way through.
      const busy = new Set(this.traffic.filter((t) => Math.abs(t.d - d) < 30).map((t) => Math.round(t.lane)));
      busy.add(lane);
      if (busy.size >= LANE_COUNT) continue;
      const emergency = Math.random() < 0.12;
      const pool = emergency ? EMERGENCY_KINDS : TRAFFIC_KINDS;
      const kind = pool[Math.floor(Math.random() * pool.length)];
      const spec = getVehicleSpec(kind);
      const hue = Math.floor(Math.random() * 360);
      const built = buildVehicle(spec, `hsl(${hue},55%,${35 + Math.random() * 25}%)`, this.cache, false);
      const base = 17 + (LANE_COUNT - 1 - lane) * 5 + Math.random() * 3 - (kind === "bus" || kind === "fire" ? 5 : 0) + (emergency ? 4 : 0);
      const r = (spec.width / 2) * 0.92;
      const n = Math.max(1, Math.round(spec.length / spec.width));
      const spheres = Array.from({ length: n }, (_, i) => (n === 1 ? 0 : ((i / (n - 1)) - 0.5) * (spec.length - spec.width)));
      const t: Traffic = { built, lane, x: this.world.laneX(lane), d, speed: base, baseSpeed: base, changeIn: 4 + Math.random() * 8, lastD: d, scored: false, flashing: emergency && Math.random() < 0.7, spheres, r };
      built.group.position.set(t.x, 0, -d);
      applyBend(built.group);
      this.scene.add(built.group);
      this.traffic.push(t);
      return;
    }
  }

  private updateTraffic(dt: number) {
    for (const t of this.traffic) {
      // Follow the car ahead in the same lane
      let ahead: Traffic | null = null;
      for (const o of this.traffic) {
        if (o !== t && Math.abs(o.x - t.x) < 2 && o.d > t.d && (!ahead || o.d < ahead.d)) ahead = o;
      }
      let target = t.baseSpeed;
      if (ahead && ahead.d - t.d < 24) target = Math.min(target, ahead.speed - 0.5);
      t.built.setLights(this.world.night, target < t.speed - 0.4);
      t.speed += (target - t.speed) * Math.min(1, dt * 1.5);

      t.changeIn -= dt;
      if (t.changeIn <= 0) {
        t.changeIn = 6 + Math.random() * 10;
        const dir = Math.random() < 0.5 ? -1 : 1;
        const to = Math.round(t.lane) + dir;
        const playerNear = Math.abs(t.d) < 16 && Math.abs(this.world.laneX(to) - this.x) < 3;
        if (to >= 0 && to < LANE_COUNT && !this.laneOccupied(to, t.d, 18, t) && !playerNear) t.lane = to;
      }
      t.x += (this.world.laneX(t.lane) - t.x) * Math.min(1, dt * 2.2);
      t.lastD = t.d;
      t.d += (t.speed - this.speed) * dt;
      t.built.group.position.set(t.x, 0, -t.d);
      for (const w of t.built.spinGroups) w.rotation.x -= (t.speed / t.built.spec.wheelRadius) * dt;
      t.built.tick(this.timeSec, t.flashing);
    }
    this.traffic = this.traffic.filter((t) => {
      if (t.d < -90 || t.d > 320) {
        this.scene.remove(t.built.group);
        t.built.dispose();
        return false;
      }
      return true;
    });
    this.spawnT -= dt;
    if (this.spawnT <= 0 && this.traffic.length < 14) {
      this.spawnT = 0.5 + Math.random() * 0.7;
      this.trySpawn(230 + Math.random() * 40);
    }
  }

  private checkCollisions() {
    const pr = (this.spec.width / 2) * 0.9;
    const pn = Math.max(1, Math.round(this.spec.length / this.spec.width));
    for (const t of this.traffic) {
      if (Math.abs(t.d) > 12) continue;
      let hit = false;
      for (let i = 0; i < pn && !hit; i++) {
        const pz = pn === 1 ? 0 : (i / (pn - 1) - 0.5) * (this.spec.length - this.spec.width);
        for (const tz of t.spheres) {
          const dx = this.x - t.x;
          const dz = pz - (-t.d + tz);
          if (Math.hypot(dx, dz) < pr + t.r) {
            hit = true;
            break;
          }
        }
      }
      if (hit) {
        this.crash(t);
        return;
      }
      // Close call: crossed the player's position with a narrow lateral gap
      if (!t.scored && t.lastD * t.d < 0 && Math.abs(this.x - t.x) < this.spec.width / 2 + t.built.spec.width / 2 + 0.9) {
        t.scored = true;
        this.closeCalls++;
        this.combo = this.comboT > 0 ? this.combo + 1 : 1;
        this.comboT = 4;
        this.score += 25 * this.combo;
        this.audio.whoosh();
      }
    }
  }

  private crash(t: Traffic) {
    this.setPhase("crashed");
    this.shake = 1;
    this.crashT = 0;
    this.audio.silence();
    this.audio.crash();
    this.setSiren(false);
    this.emitSparks(new THREE.Vector3((this.x + t.x) / 2, 0.8, -t.d * 0.5), 60, 8);
    this.speed *= 0.5;
  }

  // ---- sparks ----
  private emitSparks(at: THREE.Vector3, n: number, power: number) {
    for (let i = 0; i < n && this.sparks.length < SPARK_MAX; i++) {
      this.sparks.push({
        pos: at.clone(),
        vel: new THREE.Vector3((Math.random() - 0.5) * power, Math.random() * power * 0.6, (Math.random() - 0.5) * power),
        life: 0.4 + Math.random() * 0.5,
      });
    }
  }

  private updateSparks(dt: number) {
    this.sparks = this.sparks.filter((s) => (s.life -= dt) > 0);
    const attr = this.sparkPoints.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < SPARK_MAX; i++) {
      const s = this.sparks[i];
      if (s) {
        s.vel.y -= 14 * dt;
        s.pos.addScaledVector(s.vel, dt);
        attr.setXYZ(i, s.pos.x, s.pos.y, s.pos.z);
      } else {
        attr.setXYZ(i, 0, -100, 0);
      }
    }
    attr.needsUpdate = true;
  }

  // ---- simulation ----
  private drive(dt: number) {
    const spec = this.spec;
    const vmax = (spec.topSpeedKmh / 3.6) * 1.04;
    const gas = this.keys.gas ? 1 : 0;
    const prev = this.speed;
    // Thrust only comes from the pedal and tapers near top speed. Lifting off coasts down
    // like a real car: engine braking plus rolling and air drag that grows with speed squared.
    let a = gas * spec.accel * (1 - (this.speed / vmax) ** 2) - (0.6 + 0.0007 * this.speed * this.speed);
    if (this.keys.brake) a = -spec.brake;
    this.speed = Math.max(0, this.speed + a * dt);
    this.accel = (this.speed - prev) / Math.max(dt, 1e-4);

    const steerIn = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
    this.steer += (steerIn - this.steer) * Math.min(1, dt * 8);
    // Steering lock shrinks with speed and does nothing when stopped.
    const lock = spec.lock / (1 + this.speed / 18);
    const target = this.steer * lock * Math.min(1, this.speed / 3);
    this.heading += (target - this.heading) * Math.min(1, dt * 6);
    this.x += this.speed * Math.sin(this.heading) * dt;
    // Bends push the car toward the outside of the curve, so the driver has to steer into it.
    this.x -= bendUniform.value * this.speed * this.speed * 0.25 * dt;

    const limit = ROAD_HALF - spec.width / 2 - 0.05;
    this.scraping = false;
    if (Math.abs(this.x) > limit) {
      const side = Math.sign(this.x);
      this.x = side * limit;
      if (this.speed > 2) {
        this.scraping = true;
        this.speed *= 1 - Math.min(1, 1.2 * dt);
        this.emitSparks(new THREE.Vector3(this.x + side * spec.width * 0.5, 0.5, -spec.length * (Math.random() - 0.5)), 2, 5);
        this.shake = Math.max(this.shake, 0.15);
      }
      if (Math.sign(this.heading) === side) this.heading = 0;
    }

    this.distance += this.speed * dt;
    this.score += this.speed * dt * 0.2;
    this.comboT = Math.max(0, this.comboT - dt);

    // 6-gear RPM model
    const frac = this.speed / (spec.topSpeedKmh / 3.6);
    this.gear = Math.min(GEARS, Math.max(1, Math.floor(frac * GEARS * 1.05) + 1));
    const inGear = frac * GEARS * 1.05 - (this.gear - 1);
    this.rpm = Math.max(0.12, Math.min(1, 0.15 + inGear * 0.8 + gas * 0.05));
  }

  private applyPlayerPose(dt: number) {
    const g = this.player.group;
    g.position.set(this.x, 0, 0);
    this.pitch += (Math.max(-0.05, Math.min(0.05, this.accel * 0.006)) - this.pitch) * Math.min(1, dt * 5);
    g.rotation.set(this.pitch, -this.heading * 0.9, -this.heading * 0.5 * Math.min(1, this.speed / 20));
    for (const w of this.player.spinGroups) w.rotation.x -= (this.speed / this.spec.wheelRadius) * dt;
    for (const s of this.player.steerGroups) s.rotation.y = -this.steer * 0.45;
    if (this.player.steeringWheel) this.player.steeringWheel.rotation.z = -this.steer * 1.6;
    this.player.setLights(this.world.night, this.keys.brake && this.phase === "playing");
  }

  /** Tall phone screens need a wider vertical view or the road and car get cut off at the sides. */
  private narrowBoost() {
    const a = this.camera.aspect;
    return a >= 1 ? 1 : Math.min(1.5, 1 + (1 / a - 1) * 0.5);
  }

  // ---- camera ----
  private updateCamera(dt: number) {
    const cam = this.camera;
    if (this.phase === "garage") {
      this.garageAngle += dt * 0.35;
      const r = Math.max(6, this.spec.length * 1.25);
      this.camPos.set(Math.sin(this.garageAngle) * r, 2.1 + this.spec.wheelRadius, Math.cos(this.garageAngle) * r);
      this.camLook.set(0, 0.9, 0);
      cam.position.copy(this.camPos);
      cam.fov = 45 * this.narrowBoost();
    } else {
      let pos: THREE.Vector3;
      let look: THREE.Vector3;
      const d = this.spec.driver;
      if (this.camMode === "cockpit") {
        pos = new THREE.Vector3(this.x + d.x, d.y + 0.35, this.cockpitZ());
        look = new THREE.Vector3(this.x + d.x * 0.5 + this.heading * 30, d.y + 0.2, -60);
      } else {
        pos = new THREE.Vector3(this.x * 0.7, 3.4 + this.spec.wheelRadius, this.spec.length * 0.5 + 7.5);
        look = new THREE.Vector3(this.x * 0.85, 1.2, -14);
      }
      look.x += bendUniform.value * (this.camMode === "cockpit" ? 1800 : 800);
      const k = this.camMode === "cockpit" ? 1 : 1 - Math.exp(-dt * 6);
      this.camPos.lerp(pos, k);
      this.camLook.lerp(look, k);
      cam.position.copy(this.camPos);
      const targetFov = (58 + Math.min(1, this.speed / 70) * 18) * this.narrowBoost();
      cam.fov += (targetFov - cam.fov) * Math.min(1, dt * 3);
    }
    if (this.shake > 0) {
      cam.position.x += (Math.random() - 0.5) * this.shake * 0.5;
      cam.position.y += (Math.random() - 0.5) * this.shake * 0.5;
      this.shake = Math.max(0, this.shake - dt * 1.5);
    }
    cam.lookAt(this.camLook);
    cam.updateProjectionMatrix();
  }

  /** z of the driver's head, in scene space (forward is -z). */
  private cockpitZ() {
    const c = this.spec.cabin;
    return c ? -(c[0][0] + c[3][0]) / 2 + 0.3 : this.spec.driver.z;
  }

  // ---- night ----
  private applyNight(n: number) {
    this.world.setNight(n);
    this.renderer.toneMappingExposure = this.world.exposure;
    this.scene.environmentIntensity = 1 - 0.8 * n;
    const on = Math.max(0, n * 2 - 0.6);
    this.spots.forEach((s) => (s.intensity = on * 120));
  }

  // ---- loop ----
  private loop = (t: number) => {
    if (this.destroyed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.lastT ? (t - this.lastT) / 1000 : 0.016);
    this.lastT = t;

    const n = this.world.night + Math.sign(this.nightTarget - this.world.night) * Math.min(Math.abs(this.nightTarget - this.world.night), dt * 1.2);
    if (n !== this.world.night) this.applyNight(n);

    if (this.phase === "playing") {
      this.drive(dt);
      this.updateTraffic(dt);
      this.checkCollisions();
    } else if (this.phase === "crashed") {
      this.crashT += dt;
      this.speed = Math.max(0, this.speed - 25 * dt);
      this.distance += this.speed * dt;
      this.updateTraffic(dt);
      if (this.crashT > 1.4) {
        this.hooks.onGameOver?.({ score: Math.floor(this.score), distance: Math.floor(this.distance), closeCalls: this.closeCalls });
        this.crashT = -999;
      }
    } else if (this.phase === "garage") {
      this.speed = 0;
    }

    this.timeSec = t / 1000;
    const bendTarget = this.phase === "garage" ? 0 : curvatureAt(this.distance);
    bendUniform.value += (bendTarget - bendUniform.value) * Math.min(1, dt * 2);
    this.player.tick(this.timeSec, this.lightsLatched || this.sirenOn || this.spec.features.livery === "police" || this.spec.features.livery === "police-uae");
    this.applyPlayerPose(dt);
    this.updateSparks(dt);
    if (this.sceneryMode === "auto" && this.phase === "playing") {
      const want = Math.floor(this.distance / 4000) % 2 === 0 ? "countryside" : "city";
      if (want !== this.world.environment) this.world.setEnvironment(want);
    }
    this.world.update(this.distance, dt, this.camera.position);
    this.updateCamera(dt);

    if (this.phase === "playing") {
      this.audio.update(this.rpm, this.keys.gas ? 1 : 0, Math.min(1, this.speed / (this.spec.topSpeedKmh / 3.6)), this.steer, this.scraping);
    } else if (this.phase === "crashed") {
      this.audio.update(0.1, 0, 0, 0, false);
    }

    if (t - this.hudAt > 80) {
      this.hudAt = t;
      this.hooks.onHud?.({
        speedKmh: Math.round(this.speed * 3.6),
        maxKmh: this.spec.topSpeedKmh,
        gear: this.speed < 0.5 ? 0 : this.gear,
        rpm: this.rpm,
        score: Math.floor(this.score),
        distance: Math.floor(this.distance),
        closeCalls: this.closeCalls,
        combo: this.comboT > 0 ? this.combo : 0,
      });
    }
    this.renderer.render(this.scene, this.camera);
  };
}
