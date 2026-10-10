import * as THREE from "three";
import { applyBend } from "./curve";
import { buildCity, buildNature, makeCityGroundTexture, makeGrassTexture, ridgeGeometry, skylineGeometry } from "./scenery";
import { getGlowTexture } from "./vehicle-builder";

export const LANE_COUNT = 4;
export const LANE_W = 3.6;
export const ROAD_HALF = (LANE_COUNT * LANE_W) / 2;
const SEG = 40;
const SEGS = 10;
const LEN = SEG * SEGS;
/** Scenery repeats over its own, longer period so trees and buildings do not visibly loop every 40 m. */
const NATURE_P = 120;
const CITY_P = 160;
const SCENERY_ORIGIN = 30;
const RIDGES = [
  { z: -780, maxH: 240, snow: 150, haze: 0.55, seed: 1, w: 2600 },
  { z: -640, maxH: 175, snow: 120, haze: 0.34, seed: 2, w: 2300 },
  { z: -520, maxH: 112, snow: 98, haze: 0.16, seed: 3, w: 2000 },
];
const SKYLINES = [
  { z: -560, minH: 25, maxH: 105, haze: 0.45, seed: 4 },
  { z: -430, minH: 18, maxH: 72, haze: 0.28, seed: 5 },
];
export type Environment = "countryside" | "city";

const DAY = {
  skyTop: new THREE.Color(0x3f8fe0), skyBottom: new THREE.Color(0xc4e4ff), fog: new THREE.Color(0xc4e4ff),
  hemi: 0.9, sun: 2.4, sunColor: new THREE.Color(0xfff2d8), exposure: 1.0, mountain: new THREE.Color(0xb7c6dc), grass: new THREE.Color(0xffffff),
};
const NIGHT = {
  skyTop: new THREE.Color(0x01020a), skyBottom: new THREE.Color(0x101a3c), fog: new THREE.Color(0x0a1230),
  hemi: 0.25, sun: 0.35, sunColor: new THREE.Color(0x6f86d8), exposure: 0.8, mountain: new THREE.Color(0x1a2750), grass: new THREE.Color(0x2c3a30),
};

export class World {
  readonly root = new THREE.Group();
  private road = new THREE.Group();
  private gantry = new THREE.Group();
  private clouds: THREE.Sprite[] = [];
  private sky: THREE.Mesh;
  private skyMat: THREE.ShaderMaterial;
  private stars: THREE.Points;
  private sun: THREE.Sprite;
  private moon: THREE.Sprite;
  private hemi = new THREE.HemisphereLight(0xffffff, 0x445544, 1);
  private sunLight = new THREE.DirectionalLight(0xffffff, 1);
  private lampHeads: THREE.MeshStandardMaterial;
  private pools: THREE.MeshBasicMaterial;
  private halos: THREE.SpriteMaterial[] = [];
  private ridges: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; haze: number }[] = [];
  private skylines: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; lights: THREE.Points; haze: number }[] = [];
  private natureGroup = new THREE.Group();
  private natureMats: THREE.MeshStandardMaterial[] = [];
  private cityGroup: THREE.Group | null = null;
  private facade: THREE.MeshStandardMaterial | null = null;
  private grassTex: THREE.Texture;
  private cityGroundTex: THREE.Texture | null = null;
  private env: Environment = "countryside";
  private pendingEnv: Environment | null = null;
  private fade = { k: 1, phase: "idle" as "idle" | "out" | "in" };
  private fogBase = { near: 60, far: 320 };
  private grass: THREE.MeshStandardMaterial;
  private textures: THREE.Texture[] = [];
  night = 0;
  exposure = 1;

  get environment(): Environment {
    return this.pendingEnv ?? this.env;
  }

  constructor(private scene: THREE.Scene, aniso: number) {
    scene.fog = new THREE.Fog(DAY.fog, 60, 320);
    scene.add(this.root, this.hemi, this.sunLight, this.sunLight.target);
    this.sunLight.position.set(40, 80, 30);

    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: DAY.skyTop.clone() }, bottom: { value: DAY.skyBottom.clone() } },
      vertexShader: "varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);} ",
      fragmentShader: "uniform vec3 top; uniform vec3 bottom; varying float h; void main(){ gl_FragColor = vec4(mix(bottom, top, smoothstep(-0.05, 0.6, h)), 1.0);} ",
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 16), this.skyMat);
    this.sky.renderOrder = -10;
    this.root.add(this.sky);

    const starPos = new Float32Array(600 * 3);
    for (let i = 0; i < 600; i++) {
      const v = new THREE.Vector3().randomDirection();
      v.y = Math.abs(v.y) * 0.9 + 0.1;
      v.normalize().multiplyScalar(850);
      starPos.set([v.x, v.y, v.z], i * 3);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    this.root.add(this.stars);

    const glow = getGlowTexture();
    this.sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xfff0b0, fog: false, depthWrite: false, blending: THREE.AdditiveBlending, transparent: true }));
    this.sun.scale.setScalar(160);
    this.sun.position.set(300, 280, -700);
    this.moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xcfd9ff, fog: false, depthWrite: false, transparent: true, opacity: 0 }));
    this.moon.scale.setScalar(70);
    this.moon.position.set(-300, 300, -700);
    this.root.add(this.sun, this.moon);

    for (let i = 0; i < 9; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xffffff, fog: false, depthWrite: false, transparent: true, opacity: 0.55 }));
      s.scale.set(120 + Math.random() * 100, 28 + Math.random() * 14, 1);
      s.position.set((Math.random() - 0.5) * 900, 130 + Math.random() * 90, -300 - Math.random() * 400);
      this.clouds.push(s);
      this.root.add(s);
    }

    this.buildMountains();

    this.grassTex = makeGrassTexture();
    this.grassTex.repeat.set(5, (LEN + SEG * 3) / SEG);
    this.textures.push(this.grassTex);
    this.grass = new THREE.MeshStandardMaterial({ color: DAY.grass, roughness: 1, map: this.grassTex });
    const grassMesh = new THREE.Mesh(new THREE.PlaneGeometry(500, LEN + SEG * 3, 1, 130), this.grass);
    grassMesh.rotation.x = -Math.PI / 2;
    grassMesh.position.set(0, -0.05, -LEN / 2 + SEG * 1.5);
    this.road.add(grassMesh);

    const asphalt = this.makeAsphalt(aniso);
    const roadMat = new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.9 });
    const segGeo = new THREE.PlaneGeometry(LANE_COUNT * LANE_W, SEG, 1, 10);
    for (let i = 0; i < SEGS; i++) {
      const m = new THREE.Mesh(segGeo, roadMat);
      m.rotation.x = -Math.PI / 2;
      m.position.z = SEG - i * SEG;
      this.road.add(m);
    }

    this.buildGuardrails();
    const lamps = this.buildLamps();
    this.lampHeads = lamps.heads;
    this.pools = lamps.pools;
    this.buildNature();
    this.buildGantry();
    applyBend(this.road);
    applyBend(this.gantry);
    this.root.add(this.road, this.gantry);
    applyBend(this.natureGroup);
    this.root.add(this.natureGroup);
    this.setNight(0);
  }

  laneX(i: number) {
    return (i - (LANE_COUNT - 1) / 2) * LANE_W;
  }

  private makeAsphalt(aniso: number) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 1024;
    const g = c.getContext("2d")!;
    g.fillStyle = "#3a3d42";
    g.fillRect(0, 0, 512, 1024);
    for (let i = 0; i < 9000; i++) {
      const v = 40 + Math.random() * 50;
      g.fillStyle = `rgba(${v},${v},${v + 4},0.5)`;
      g.fillRect(Math.random() * 512, Math.random() * 1024, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    const lane = 512 / LANE_COUNT;
    for (let l = 0; l < LANE_COUNT; l++) {
      for (const off of [-0.22, 0.22]) {
        g.fillStyle = "rgba(20,20,22,0.35)";
        g.fillRect(l * lane + lane / 2 + off * lane - 12, 0, 24, 1024);
      }
    }
    g.fillStyle = "#e8e8e8";
    for (let l = 1; l < LANE_COUNT; l++) for (let y = 0; y < 1024; y += 256) g.fillRect(l * lane - 3, y, 6, 102);
    g.fillStyle = "#f2f2f2";
    g.fillRect(6, 0, 8, 1024);
    g.fillRect(498, 0, 8, 1024);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = aniso;
    this.textures.push(tex);
    return tex;
  }

  private buildGuardrails() {
    const metal = new THREE.MeshStandardMaterial({ color: 0xb4bcc4, metalness: 0.7, roughness: 0.4 });
    const railGeo = new THREE.BoxGeometry(0.08, 0.32, LEN + SEG * 2, 1, 1, 110);
    const postGeo = new THREE.BoxGeometry(0.1, 0.8, 0.1);
    const count = Math.floor((LEN + SEG * 2) / 4);
    for (const s of [-1, 1]) {
      const x = s * (ROAD_HALF + 0.5);
      const rail = new THREE.Mesh(railGeo, metal);
      rail.position.set(x, 0.62, -LEN / 2 + SEG);
      this.road.add(rail);
      const posts = new THREE.InstancedMesh(postGeo, metal, count);
      const m = new THREE.Matrix4();
      for (let i = 0; i < count; i++) {
        m.setPosition(x + s * 0.05, 0.4, SEG * 2 - i * 4);
        posts.setMatrixAt(i, m);
      }
      this.road.add(posts);
    }
  }

  private buildLamps() {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.5, roughness: 0.5 });
    const heads = new THREE.MeshStandardMaterial({ color: 0xffe9b0, emissive: 0xffd27a, emissiveIntensity: 0 });
    const pools = new THREE.MeshBasicMaterial({ map: getGlowTexture(), color: 0xffd9a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const n = SEGS * 2;
    const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.14, 8, 8), poleMat, n);
    const arms = new THREE.InstancedMesh(new THREE.BoxGeometry(2, 0.1, 0.1), poleMat, n);
    const headMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.8, 0.14, 0.35), heads, n);
    const poolMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(11, 11).rotateX(-Math.PI / 2), pools, n);
    const m = new THREE.Matrix4();
    let k = 0;
    for (let i = 0; i < SEGS; i++) {
      for (const s of [-1, 1]) {
        const z = SEG - i * SEG - (s === 1 ? 10 : 30);
        const x = s * (ROAD_HALF + 1.1);
        m.setPosition(x, 4, z);
        poles.setMatrixAt(k, m);
        m.setPosition(x - s * 1, 8, z);
        arms.setMatrixAt(k, m);
        m.setPosition(x - s * 1.9, 7.9, z);
        headMesh.setMatrixAt(k, m);
        m.setPosition(x - s * 3.2, 0.04, z);
        poolMesh.setMatrixAt(k, m);
        const halo = new THREE.SpriteMaterial({ map: getGlowTexture(), color: 0xffd9a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
        this.halos.push(halo);
        const sp = new THREE.Sprite(halo);
        sp.scale.setScalar(5);
        sp.position.set(x - s * 1.9, 7.8, z);
        this.road.add(sp);
        k++;
      }
    }
    poolMesh.renderOrder = 2;
    this.road.add(poles, arms, headMesh, poolMesh);
    return { heads, pools };
  }

  private buildMountains() {
    for (const [i, spec] of RIDGES.entries()) {
      const mat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, color: DAY.mountain });
      const mesh = new THREE.Mesh(ridgeGeometry(spec.w, spec.maxH, spec.seed, spec.snow), mat);
      mesh.position.set(i === 1 ? 140 : -60, 0, spec.z);
      mesh.renderOrder = -5 + i;
      this.root.add(mesh);
      this.ridges.push({ mesh, mat, haze: spec.haze });
    }
  }

  private buildNature() {
    const { group, materials } = buildNature({ period: NATURE_P, copies: 4, origin: SCENERY_ORIGIN });
    this.natureGroup.add(group);
    this.natureMats = materials;
  }

  /** The city is built the first time it is wanted, so countryside-only players never pay for it. */
  private ensureCity() {
    if (this.cityGroup) return;
    const city = buildCity({ period: CITY_P, copies: 3, origin: SCENERY_ORIGIN });
    this.cityGroup = city.group;
    this.facade = city.facade;
    this.textures.push(...city.textures);
    applyBend(city.group);
    this.root.add(city.group);
    this.cityGroundTex = makeCityGroundTexture();
    this.cityGroundTex.repeat.set(26, (LEN + SEG * 3) / 20);
    this.textures.push(this.cityGroundTex);
    for (const [i, spec] of SKYLINES.entries()) {
      const { geo, lights } = skylineGeometry(1900, spec.seed, spec.minH, spec.maxH);
      const mat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, color: DAY.mountain });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, 0, spec.z);
      mesh.renderOrder = -5 + i;
      const pts = new THREE.Points(lights, new THREE.PointsMaterial({ color: 0xffd98a, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
      pts.position.copy(mesh.position);
      this.root.add(mesh, pts);
      this.skylines.push({ mesh, mat, lights: pts, haze: spec.haze });
    }
    this.applyEnvVisibility();
    this.setNight(this.night);
  }

  private applyEnvVisibility() {
    const city = this.env === "city";
    this.natureGroup.visible = !city;
    this.ridges.forEach((r) => (r.mesh.visible = !city));
    if (this.cityGroup) this.cityGroup.visible = city;
    this.skylines.forEach((s) => {
      s.mesh.visible = city;
      s.lights.visible = city;
    });
    this.grass.map = city && this.cityGroundTex ? this.cityGroundTex : this.grassTex;
    this.grass.needsUpdate = true;
    this.setNight(this.night);
  }

  /** Switch scenery. Unless `instant`, the fog closes in, the scenery swaps behind it, and the fog opens again. */
  setEnvironment(env: Environment, instant = false) {
    if (env === this.environment) return;
    if (env === "city") this.ensureCity();
    if (instant) {
      this.env = env;
      this.pendingEnv = null;
      this.fade = { k: 1, phase: "idle" };
      this.applyEnvVisibility();
      return;
    }
    this.pendingEnv = env;
    this.fade.phase = "out";
  }

  private buildGantry() {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const g = c.getContext("2d")!;
    g.fillStyle = "#0b6b3a";
    g.fillRect(0, 0, 512, 128);
    g.strokeStyle = "#fff";
    g.lineWidth = 6;
    g.strokeRect(6, 6, 500, 116);
    g.fillStyle = "#fff";
    g.font = "bold 44px sans-serif";
    g.textAlign = "center";
    g.fillText("APEX CITY  12", 256, 62);
    g.font = "bold 30px sans-serif";
    g.fillText("↑ 5 km", 256, 105);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.textures.push(tex);
    const metal = new THREE.MeshStandardMaterial({ color: 0x8a939c, metalness: 0.6, roughness: 0.5 });
    const post = new THREE.BoxGeometry(0.4, 7, 0.4);
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(post, metal);
      p.position.set(s * (ROAD_HALF + 1.6), 3.5, 0);
      this.gantry.add(p);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(ROAD_HALF * 2 + 3.2, 0.5, 0.5), metal);
    beam.position.y = 7;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.15 }));
    sign.position.set(0, 5.6, 0.28);
    this.gantry.add(beam, sign);
  }

  setNight(n: number) {
    this.night = n;
    const mix = (a: THREE.Color, b: THREE.Color) => a.clone().lerp(b, n);
    const fog = this.scene.fog as THREE.Fog;
    fog.color.copy(mix(DAY.fog, NIGHT.fog));
    this.fogBase = { near: 60 - 35 * n, far: 320 - 110 * n };
    fog.near = this.fogBase.near * this.fade.k;
    fog.far = this.fogBase.far * this.fade.k;
    this.skyMat.uniforms.top.value.copy(mix(DAY.skyTop, NIGHT.skyTop));
    this.skyMat.uniforms.bottom.value.copy(mix(DAY.skyBottom, NIGHT.skyBottom));
    this.hemi.intensity = DAY.hemi + (NIGHT.hemi - DAY.hemi) * n;
    this.hemi.color.copy(mix(DAY.skyBottom, NIGHT.skyBottom));
    this.sunLight.intensity = DAY.sun + (NIGHT.sun - DAY.sun) * n;
    this.sunLight.color.copy(mix(DAY.sunColor, NIGHT.sunColor));
    this.exposure = DAY.exposure + (NIGHT.exposure - DAY.exposure) * n;
    const hazeColour = (haze: number) => {
      const day = DAY.mountain.clone().lerp(DAY.skyBottom, haze);
      const night = NIGHT.mountain.clone().lerp(NIGHT.skyBottom, haze * 0.8);
      return day.lerp(night, n);
    };
    this.ridges.forEach((r) => r.mat.color.copy(hazeColour(r.haze)));
    this.skylines.forEach((sk) => {
      sk.mat.color.copy(hazeColour(sk.haze));
      (sk.lights.material as THREE.PointsMaterial).opacity = Math.max(0, n * 1.3 - 0.3);
    });
    const city = this.env === "city";
    this.grass.color.copy(city ? new THREE.Color(0xffffff).lerp(new THREE.Color(0x3a3f4d), n) : mix(DAY.grass, NIGHT.grass));
    if (this.facade) this.facade.emissiveIntensity = n * 1.35;
    this.lampHeads.emissiveIntensity = n * 3;
    this.pools.opacity = n * 0.55;
    this.halos.forEach((h) => (h.opacity = n * 0.9));
    (this.stars.material as THREE.PointsMaterial).opacity = Math.max(0, n * 1.4 - 0.4);
    (this.sun.material as THREE.SpriteMaterial).opacity = 1 - n;
    (this.moon.material as THREE.SpriteMaterial).opacity = n;
    this.clouds.forEach((c) => ((c.material as THREE.SpriteMaterial).color.setScalar(1 - n * 0.85)));
  }

  update(distance: number, dt: number, camPos: THREE.Vector3) {
    this.road.position.z = distance % SEG;
    this.natureGroup.position.z = distance % NATURE_P;
    if (this.cityGroup) this.cityGroup.position.z = distance % CITY_P;
    this.stepFade(dt);
    this.gantry.position.z = -300 + (distance % LEN);
    this.sky.position.copy(camPos);
    this.stars.position.copy(camPos);
    for (const c of this.clouds) {
      c.position.x += dt * 2;
      if (c.position.x > 500) c.position.x = -500;
    }
  }

  private stepFade(dt: number) {
    const f = this.fade;
    if (f.phase === "idle") return;
    if (f.phase === "out") {
      f.k = Math.max(0.1, f.k - dt * 2.4);
      if (f.k <= 0.1 && this.pendingEnv) {
        this.env = this.pendingEnv;
        this.pendingEnv = null;
        this.applyEnvVisibility();
        f.phase = "in";
      }
    } else {
      f.k = Math.min(1, f.k + dt * 1.5);
      if (f.k >= 1) f.phase = "idle";
    }
    const fog = this.scene.fog as THREE.Fog;
    fog.near = this.fogBase.near * f.k;
    fog.far = this.fogBase.far * f.k;
  }

  dispose() {
    this.root.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.InstancedMesh) {
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      }
      if (o instanceof THREE.Sprite) o.material.dispose();
    });
    this.textures.forEach((t) => t.dispose());
    this.hemi.dispose();
    this.sunLight.dispose();
    this.scene.remove(this.root, this.hemi, this.sunLight, this.sunLight.target);
    this.scene.fog = null;
  }
}
