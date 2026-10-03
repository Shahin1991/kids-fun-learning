import * as THREE from "three";

export type BalanceMode = "sandbox" | "challenge";

export interface BalanceState {
  left: number;
  right: number;
  balanced: boolean;
}

export interface BalanceOptions {
  sharedAudioCtx?: AudioContext;
  mode?: BalanceMode;
  targetWeight?: number;
  onBalanced?: (r: { leftWeight: number; rightWeight: number; moves: number }) => void;
  onState?: (s: BalanceState) => void;
}

const MAX_TILT = 0.42;
const ARM = 3;
const PIVOT_Y = 4.4;
const HANG = 1.9;
const PAN_R = 1.35;
const BLOCK_W = 0.85;
const COLORS = ["#FF6B6B", "#4D96FF", "#6BCB77", "#FFD93D", "#9B51E0", "#FF9F43"];
const PENTA = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99, 880];
const blockHeight = (v: number) => 0.4 + v * 0.18;

interface Block {
  value: number;
  mesh: THREE.Mesh;
  home: THREE.Vector3;
  where: "tray" | "left" | "right" | "drag";
  from: "tray" | "left" | "right";
  locked: boolean;
  bounceAt: number;
}

interface Pan {
  group: THREE.Group;
  blocks: Block[];
  side: -1 | 1;
}

export class BalanceGameModule {
  private container: HTMLElement;
  private opts: BalanceOptions;
  private mode: BalanceMode;
  private target: number;

  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  private beam = new THREE.Group();
  private pans: Record<"left" | "right", Pan>;
  private beamMat: THREE.MeshStandardMaterial;
  private ring: THREE.Mesh;
  private ringTarget: Pan | null = null;
  private confetti: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number }[] = [];

  private tray: Block[] = [];
  private maxValue = 3;
  private angle = 0;
  private omega = 0;
  private balancedFor = 0;
  private celebrated = false;
  private moves = 0;
  private lastLeft = -1;
  private lastRight = -1;

  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private dragging: Block | null = null;
  private dragPlane = new THREE.Plane();
  private dragOffset = new THREE.Vector3();

  private textures = new Map<number, THREE.Texture>();
  private raf = 0;
  private lastT = 0;
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private destroyed = false;

  private audio: AudioContext | null = null;
  private ownsAudio = false;
  private nodes = new Set<AudioNode>();
  private creak: { gain: GainNode } | null = null;

  constructor(container: HTMLElement, options: BalanceOptions = {}) {
    this.container = container;
    this.opts = options;
    this.mode = options.mode ?? "sandbox";
    this.target = options.targetWeight ?? 5;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:none";
    container.appendChild(this.renderer.domElement);
    this.scene.background = new THREE.Color(0xf7f5f0);

    this.buildScene();
    this.beamMat = this.beam.children[0] instanceof THREE.Mesh ? (this.beam.children[0].material as THREE.MeshStandardMaterial) : new THREE.MeshStandardMaterial();
    this.pans = { left: this.makePan(-1), right: this.makePan(1) };
    this.ring = this.makeRing();
    this.scene.add(this.ring);

    container.addEventListener("pointerdown", this.onDown);
    window.addEventListener("pointermove", this.onMove);
    window.addEventListener("pointerup", this.onUp);
    window.addEventListener("pointercancel", this.onUp);

    this.resize();
    this.step(0);
    this.reset();
    this.raf = requestAnimationFrame(this.loop);
  }

  // ---- public API ----
  setMode(mode: BalanceMode, targetWeight?: number) {
    this.mode = mode;
    if (targetWeight !== undefined) this.target = targetWeight;
    this.reset();
  }

  reset() {
    this.clearTimers();
    for (const key of ["left", "right"] as const) {
      for (const b of this.pans[key].blocks) this.disposeBlock(b);
      this.pans[key].blocks = [];
    }
    if (this.dragging) {
      this.disposeBlock(this.dragging);
      this.dragging = null;
    }
    this.moves = 0;
    this.celebrated = false;
    this.balancedFor = 0;
    this.beamMat.emissive.setHex(0x000000);
    if (this.mode === "challenge") {
      let remaining = this.target;
      while (remaining > 0) {
        const v = Math.min(10, remaining);
        remaining -= v;
        const b = this.makeBlock(v, true);
        b.where = "left";
        b.from = "left";
        this.pans.left.blocks.push(b);
        this.scene.add(b.mesh);
      }
      this.layoutPan(this.pans.left);
      for (const b of this.pans.left.blocks) b.mesh.position.copy(b.home);
    }
    this.rebuildTray();
    this.emitState(true);
  }

  resize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Pull back on narrow screens so both pans stay visible.
    const dist = 13.5 * Math.max(1, 1.25 / this.camera.aspect);
    this.camera.position.set(0, 6.5, dist);
    this.camera.lookAt(0, 1.9, 0);
    this.camera.updateProjectionMatrix();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.clearTimers();
    this.container.removeEventListener("pointerdown", this.onDown);
    window.removeEventListener("pointermove", this.onMove);
    window.removeEventListener("pointerup", this.onUp);
    window.removeEventListener("pointercancel", this.onUp);

    this.nodes.forEach((n) => {
      try {
        n.disconnect();
      } catch {
        // already disconnected
      }
    });
    this.nodes.clear();
    if (this.audio && this.ownsAudio) void this.audio.close();
    this.audio = null;

    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.Line) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m: THREE.Material) => m.dispose());
      }
    });
    this.textures.forEach((t) => t.dispose());
    this.textures.clear();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }

  // ---- scene ----
  private buildScene() {
    const wood = new THREE.MeshStandardMaterial({ color: 0xba8c63, roughness: 0.7 });
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7 * Math.PI));
    const key = new THREE.DirectionalLight(0xfff7e6, 0.85 * Math.PI);
    key.position.set(5, 10, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -10, right: 10, top: 10, bottom: -4, near: 1, far: 30 });
    this.scene.add(key);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshStandardMaterial({ color: 0xece7dc, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const base = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.35, 2), wood);
    base.position.y = 0.175;
    base.castShadow = base.receiveShadow = true;
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, PIVOT_Y, 24), wood);
    pedestal.position.y = PIVOT_Y / 2;
    pedestal.castShadow = true;
    this.scene.add(base, pedestal);

    const beamMesh = new THREE.Mesh(new THREE.BoxGeometry(ARM * 2 + 0.3, 0.26, 0.4), new THREE.MeshStandardMaterial({ color: 0xba8c63, roughness: 0.7 }));
    beamMesh.castShadow = true;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.55, 24), new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.6, roughness: 0.35 }));
    hub.rotation.x = Math.PI / 2;
    this.beam.add(beamMesh, hub);
    this.beam.position.set(0, PIVOT_Y, 0);
    this.scene.add(this.beam);
  }

  private makePan(side: -1 | 1): Pan {
    const metal = new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.6, roughness: 0.35 });
    const group = new THREE.Group();
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(PAN_R, PAN_R * 0.9, 0.14, 40), metal);
    dish.position.y = -HANG;
    dish.castShadow = dish.receiveShadow = true;
    // The string hangs straight down because the pan group is never rotated.
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, HANG, 8), metal);
    string.position.y = -HANG / 2;
    group.add(dish, string);
    this.scene.add(group);
    return { group, blocks: [], side };
  }

  private makeRing() {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(PAN_R * 0.95, PAN_R * 1.2, 48),
      new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.visible = false;
    return ring;
  }

  // ---- blocks ----
  private texture(value: number): THREE.Texture {
    let tex = this.textures.get(value);
    if (tex) return tex;
    const w = 170;
    const h = Math.round((w * blockHeight(value)) / BLOCK_W);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d")!;
    const color = COLORS[(value - 1) % COLORS.length];
    g.fillStyle = color;
    g.fillRect(0, 0, w, h);
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = "bold 100px sans-serif";
    const cy = Math.min(h / 2, 80);
    g.fillStyle = "rgba(255,255,255,0.55)";
    g.fillText(String(value), w / 2 - 3, cy - 3);
    g.fillStyle = "rgba(0,0,0,0.3)";
    g.fillText(String(value), w / 2 + 3, cy + 3);
    g.fillStyle = "#ffffff";
    g.fillText(String(value), w / 2, cy);
    g.fillStyle = "rgba(255,255,255,0.8)";
    const tickH = (h - 150) / Math.max(value, 1);
    for (let i = 0; i < value && tickH > 4; i++) g.fillRect(w * 0.2, 140 + i * tickH, w * 0.6, Math.max(2, tickH - 4));
    tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.textures.set(value, tex);
    return tex;
  }

  private makeBlock(value: number, locked = false): Block {
    const color = COLORS[(value - 1) % COLORS.length];
    const side = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
    const front = new THREE.MeshStandardMaterial({ map: this.texture(value), roughness: 0.5 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(BLOCK_W, blockHeight(value), BLOCK_W), [side, side, side, side, front, side]);
    mesh.castShadow = true;
    mesh.userData.block = true;
    const block: Block = { value, mesh, home: new THREE.Vector3(), where: "tray", from: "tray", locked, bounceAt: 0 };
    mesh.userData.ref = block;
    return block;
  }

  private disposeBlock(b: Block) {
    this.scene.remove(b.mesh);
    b.mesh.geometry.dispose();
    (b.mesh.material as THREE.Material[]).forEach((m, i, arr) => {
      if (arr.indexOf(m) === i) m.dispose();
    });
  }

  private rebuildTray() {
    this.tray.forEach((b) => this.disposeBlock(b));
    this.tray = [];
    for (let v = 1; v <= this.maxValue; v++) this.spawnTray(v);
  }

  private trayHome(index: number): THREE.Vector3 {
    const row = Math.floor(index / 5);
    const col = index % 5;
    const inRow = Math.min(5, this.maxValue - row * 5);
    return new THREE.Vector3((col - (inRow - 1) / 2) * 1.35, 0, 3.4 + row * 1.5);
  }

  private spawnTray(value: number) {
    const b = this.makeBlock(value);
    b.home.copy(this.trayHome(value - 1));
    b.home.y = blockHeight(value) / 2;
    b.mesh.position.copy(b.home);
    this.scene.add(b.mesh);
    this.tray.push(b);
  }

  private layoutPan(pan: Pan) {
    const base = pan.group.position.y - HANG + 0.07;
    let layerBase = base;
    pan.blocks.forEach((b, i) => {
      const col = i % 3;
      const layer = Math.floor(i / 3);
      if (col === 0 && layer > 0) {
        const prev = pan.blocks.slice((layer - 1) * 3, layer * 3);
        layerBase += Math.max(...prev.map((p) => blockHeight(p.value)));
      }
      const n = Math.min(3, pan.blocks.length - layer * 3);
      b.home.set(pan.group.position.x + (col - (n - 1) / 2) * 0.95, layerBase + blockHeight(b.value) / 2, 0);
    });
  }

  // ---- interaction ----
  private setPointer(e: PointerEvent) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
  }

  private onDown = (e: PointerEvent) => {
    this.ensureAudio();
    this.setPointer(e);
    const pickables = [...this.tray, ...this.pans.left.blocks, ...this.pans.right.blocks].filter((b) => !b.locked).map((b) => b.mesh);
    const hit = this.raycaster.intersectObjects(pickables, false)[0];
    if (!hit) return;
    const block = hit.object.userData.ref as Block;
    this.dragging = block;
    block.from = block.where === "drag" ? "tray" : block.where;
    block.where = "drag";
    if (block.from !== "tray") {
      const pan = this.pans[block.from];
      pan.blocks = pan.blocks.filter((b) => b !== block);
      this.onWeightsChanged();
    }
    const normal = this.camera.getWorldDirection(new THREE.Vector3()).negate();
    this.dragPlane.setFromNormalAndCoplanarPoint(normal, hit.point);
    this.dragOffset.copy(block.mesh.position).sub(hit.point);
    this.tone("pickup", block.value);
    try {
      this.container.setPointerCapture(e.pointerId);
    } catch {
      // not all pointers can be captured
    }
  };

  private onMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    this.setPointer(e);
    const p = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.dragPlane, p)) {
      this.dragging.mesh.position.copy(p.add(this.dragOffset));
      this.dragging.mesh.position.z = Math.max(this.dragging.mesh.position.z, 0.3);
    }
    this.updateRing(this.panUnder(this.dragging.mesh.position));
  };

  private onUp = () => {
    const b = this.dragging;
    if (!b) return;
    this.dragging = null;
    this.updateRing(null);
    const pan = this.panUnder(b.mesh.position);
    if (pan) {
      this.drop(b, pan);
    } else if (b.from !== "tray" && b.mesh.position.y < 1.2) {
      // Dropping a pan block back on the table removes it.
      this.disposeBlock(b);
      this.moves++;
      this.tone("drop", b.value);
      this.onWeightsChanged();
    } else if (b.from === "tray") {
      b.where = "tray";
      this.tone("return", 0);
    } else {
      this.tone("return", 0);
      this.drop(b, this.pans[b.from], true);
    }
  };

  private panUnder(p: THREE.Vector3): Pan | null {
    for (const pan of [this.pans.left, this.pans.right]) {
      const dx = p.x - pan.group.position.x;
      const dy = p.y - (pan.group.position.y - HANG + 1);
      if (Math.abs(dx) < PAN_R + 0.5 && Math.abs(dy) < 2.4) return pan;
    }
    return null;
  }

  private drop(b: Block, pan: Pan, silent = false) {
    if (b.from === "tray") {
      // Tray blocks respawn so the same value can be used again.
      this.tray = this.tray.filter((t) => t !== b);
      this.spawnTray(b.value);
    }
    b.where = pan.side === -1 ? "left" : "right";
    pan.blocks.push(b);
    b.bounceAt = performance.now();
    if (!silent) {
      this.moves++;
      this.tone("drop", b.value);
    }
    this.onWeightsChanged();
  }

  private updateRing(pan: Pan | null) {
    this.ringTarget = pan;
    this.ring.visible = pan !== null;
  }

  // ---- simulation ----
  private weights() {
    const sum = (p: Pan) => p.blocks.reduce((s, b) => s + b.value, 0);
    return { left: sum(this.pans.left), right: sum(this.pans.right) };
  }

  private onWeightsChanged() {
    // Any change clears the celebration so the status message resets.
    this.celebrated = false;
    this.balancedFor = 0;
    this.beamMat.emissive.setHex(0x000000);
    this.emitState(false);
  }

  private emitState(force: boolean) {
    const w = this.weights();
    if (!force && w.left === this.lastLeft && w.right === this.lastRight && !this.celebrated) return;
    this.lastLeft = w.left;
    this.lastRight = w.right;
    this.opts.onState?.({ ...w, balanced: this.celebrated });
  }

  private step(dt: number) {
    const { left, right } = this.weights();
    const sub = 4;
    const h = dt / sub;
    for (let i = 0; i < sub; i++) {
      const alpha = (left - right) * 0.9 - 6 * this.angle - 3.2 * this.omega;
      this.omega += alpha * h;
      this.angle += this.omega * h;
      if (Math.abs(this.angle) > MAX_TILT) {
        this.angle = Math.sign(this.angle) * MAX_TILT;
        this.omega *= -0.35;
      }
    }
    this.beam.rotation.z = this.angle;
    for (const pan of [this.pans.left, this.pans.right]) {
      pan.group.position.set(pan.side * ARM * Math.cos(this.angle), PIVOT_Y + pan.side * ARM * Math.sin(this.angle), 0);
    }

    if (left > 0 && left === right && Math.abs(this.angle) < 0.02) this.balancedFor += dt * 1000;
    else this.balancedFor = 0;
    if (this.balancedFor > 600 && !this.celebrated) this.celebrate(left, right);
  }

  private celebrate(left: number, right: number) {
    this.celebrated = true;
    this.beamMat.emissive.setHex(0x665500);
    this.chime();
    const now = performance.now();
    [...this.pans.left.blocks, ...this.pans.right.blocks].forEach((b, i) => (b.bounceAt = now + i * 120));
    for (let i = 0; i < 40; i++) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), new THREE.MeshBasicMaterial({ color: COLORS[i % COLORS.length], side: THREE.DoubleSide }));
      mesh.position.set((Math.random() - 0.5) * 3, PIVOT_Y + 1, 1);
      this.scene.add(mesh);
      this.confetti.push({ mesh, vel: new THREE.Vector3((Math.random() - 0.5) * 5, 3 + Math.random() * 4, (Math.random() - 0.5) * 2), life: 2.2 });
    }
    this.maxValue = Math.min(10, this.maxValue + 2);
    this.emitState(true);
    this.opts.onBalanced?.({ leftWeight: left, rightWeight: right, moves: this.moves });
    const t = setTimeout(() => {
      this.timers.delete(t);
      this.reset();
    }, 2800);
    this.timers.add(t);
  }

  private clearTimers() {
    this.timers.forEach(clearTimeout);
    this.timers.clear();
  }

  private loop = (t: number) => {
    if (this.destroyed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.lastT ? (t - this.lastT) / 1000 : 0.016);
    this.lastT = t;
    this.step(dt);

    this.layoutPan(this.pans.left);
    this.layoutPan(this.pans.right);
    const follow = 1 - Math.exp(-dt * 16);
    const now = performance.now();
    const all = [...this.tray, ...this.pans.left.blocks, ...this.pans.right.blocks];
    for (const b of all) {
      if (b === this.dragging) continue;
      b.mesh.position.lerp(b.home, follow);
      const since = (now - b.bounceAt) / 1000;
      const k = since >= 0 && since < 0.5 ? Math.sin(since * Math.PI * 4) * Math.exp(-since * 6) * 0.18 : 0;
      b.mesh.scale.set(1 - k * 0.6, 1 + k, 1 - k * 0.6);
    }
    if (this.dragging) this.dragging.mesh.scale.setScalar(1.08);

    if (this.ringTarget) {
      this.ring.position.set(this.ringTarget.group.position.x, this.ringTarget.group.position.y - HANG + 0.12, 0);
    }
    for (const c of this.confetti) {
      c.life -= dt;
      c.vel.y -= 9 * dt;
      c.mesh.position.addScaledVector(c.vel, dt);
      c.mesh.rotation.x += dt * 6;
    }
    this.confetti = this.confetti.filter((c) => {
      if (c.life > 0) return true;
      this.scene.remove(c.mesh);
      c.mesh.geometry.dispose();
      (c.mesh.material as THREE.Material).dispose();
      return false;
    });

    if (this.creak && this.audio) {
      const target = Math.min(0.05, Math.abs(this.omega) * 0.04);
      this.creak.gain.gain.setTargetAtTime(target, this.audio.currentTime, 0.05);
    }
    this.renderer.render(this.scene, this.camera);
  };

  // ---- audio (Web Audio only; every node is tracked and disconnected on destroy) ----
  private ensureAudio() {
    if (this.audio) {
      if (this.audio.state === "suspended") void this.audio.resume();
      return;
    }
    try {
      if (this.opts.sharedAudioCtx) {
        this.audio = this.opts.sharedAudioCtx;
      } else {
        this.audio = new AudioContext();
        this.ownsAudio = true;
      }
      if (this.audio.state === "suspended") void this.audio.resume();
      const osc = this.track(this.audio.createOscillator());
      osc.type = "sawtooth";
      osc.frequency.value = 90;
      const filter = this.track(this.audio.createBiquadFilter());
      filter.type = "bandpass";
      filter.frequency.value = 400;
      const gain = this.track(this.audio.createGain());
      gain.gain.value = 0;
      osc.connect(filter).connect(gain).connect(this.audio.destination);
      osc.start();
      this.creak = { gain };
    } catch {
      this.audio = null;
    }
  }

  private track<T extends AudioNode>(node: T): T {
    this.nodes.add(node);
    return node;
  }

  private oneShot(src: AudioScheduledSourceNode, stopAt: number) {
    this.track(src);
    src.start();
    src.stop(stopAt);
    src.onended = () => {
      src.disconnect();
      this.nodes.delete(src);
    };
  }

  private blip(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0) {
    const ctx = this.audio;
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = this.track(ctx.createGain());
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    this.track(osc);
    osc.stop(t0 + dur + 0.02);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
      this.nodes.delete(osc);
      this.nodes.delete(gain);
    };
  }

  private tone(kind: "pickup" | "drop" | "return", value: number) {
    const ctx = this.audio;
    if (!ctx) return;
    if (kind === "pickup") {
      const m = 1 + value * 0.04;
      this.blip("sine", 260 * m, 480 * m, 0.08, 0.15);
    } else if (kind === "drop") {
      this.blip("triangle", 140, 40, 0.18, 0.3);
      this.blip("sine", PENTA[(value - 1) % PENTA.length], PENTA[(value - 1) % PENTA.length], 0.35, 0.05, 0.05);
      const len = Math.floor(ctx.sampleRate * 0.12);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const bp = this.track(ctx.createBiquadFilter());
      bp.type = "bandpass";
      bp.frequency.value = 220;
      const g = this.track(ctx.createGain());
      g.gain.value = 0.25;
      src.connect(bp).connect(g).connect(ctx.destination);
      this.oneShot(src, ctx.currentTime + 0.15);
    } else {
      this.blip("sine", 330, 294, 0.22, 0.06);
    }
  }

  private chime() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.blip("triangle", f, f * 0.995, 0.6, 0.16, i * 0.14));
  }
}
