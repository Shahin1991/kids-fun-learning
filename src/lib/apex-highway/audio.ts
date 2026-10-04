import type { VehicleSpec } from "./vehicle-specs";

/** Web Audio only. Every node is tracked so dispose() can disconnect everything. */
export class ApexAudio {
  private ctx: AudioContext | null = null;
  private nodes = new Set<AudioNode>();
  private master!: GainNode;
  private noise!: AudioBuffer;
  private osc: OscillatorNode[] = [];
  private engineFilter!: BiquadFilterNode;
  private engineGain!: GainNode;
  private wind!: GainNode;
  private tyre!: GainNode;
  private scrape!: GainNode;
  private horn: OscillatorNode[] = [];
  private hornGain!: GainNode;
  private sirenGain!: GainNode;
  private spec: VehicleSpec | null = null;
  private muted = false;
  private paused = false;

  /** Must be called from a user gesture. */
  start() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = this.t(ctx.createGain());
    this.master.gain.value = 0.6;
    this.master.connect(ctx.destination);

    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    this.engineFilter = this.t(ctx.createBiquadFilter());
    this.engineFilter.type = "lowpass";
    this.engineGain = this.t(ctx.createGain());
    this.engineGain.gain.value = 0.0;
    this.engineFilter.connect(this.engineGain).connect(this.master);
    for (const detune of [-9, 0, 9]) {
      const o = this.t(ctx.createOscillator());
      o.detune.value = detune;
      o.connect(this.engineFilter);
      o.start();
      this.osc.push(o);
    }

    this.wind = this.noiseBed(600, "lowpass");
    this.tyre = this.noiseBed(1100, "bandpass");
    this.scrape = this.noiseBed(3000, "highpass");

    this.hornGain = this.t(ctx.createGain());
    this.hornGain.gain.value = 0;
    this.hornGain.connect(this.master);
    for (const f of [392, 494]) {
      const o = this.t(ctx.createOscillator());
      o.type = "square";
      o.frequency.value = f;
      o.connect(this.hornGain);
      o.start();
      this.horn.push(o);
    }
    // Wailing siren: a sawtooth whose pitch is swept by a slow sine LFO.
    this.sirenGain = this.t(ctx.createGain());
    this.sirenGain.gain.value = 0;
    const sirenFilter = this.t(ctx.createBiquadFilter());
    sirenFilter.type = "lowpass";
    sirenFilter.frequency.value = 2600;
    const sirenOsc = this.t(ctx.createOscillator());
    sirenOsc.type = "sawtooth";
    sirenOsc.frequency.value = 950;
    const lfo = this.t(ctx.createOscillator());
    lfo.frequency.value = 0.8;
    const lfoGain = this.t(ctx.createGain());
    lfoGain.gain.value = 380;
    lfo.connect(lfoGain).connect(sirenOsc.frequency);
    sirenOsc.connect(sirenFilter).connect(this.sirenGain).connect(this.master);
    sirenOsc.start();
    lfo.start();
    if (this.spec) this.setVehicle(this.spec);
  }

  private t<T extends AudioNode>(n: T): T {
    this.nodes.add(n);
    return n;
  }

  private noiseBed(freq: number, type: BiquadFilterType): GainNode {
    const ctx = this.ctx!;
    const src = this.t(ctx.createBufferSource());
    src.buffer = this.noise;
    src.loop = true;
    const f = this.t(ctx.createBiquadFilter());
    f.type = type;
    f.frequency.value = freq;
    const g = this.t(ctx.createGain());
    g.gain.value = 0;
    src.connect(f).connect(g).connect(this.master);
    src.start();
    return g;
  }

  setVehicle(spec: VehicleSpec) {
    this.spec = spec;
    if (!this.ctx) return;
    this.osc.forEach((o) => (o.type = spec.engine.wave));
    this.engineFilter.frequency.value = spec.engine.filter;
  }

  setMuted(m: boolean) {
    this.muted = m;
    this.applyMaster();
  }

  setPaused(p: boolean) {
    this.paused = p;
    this.applyMaster();
  }

  private applyMaster() {
    if (this.ctx) this.master.gain.setTargetAtTime(this.muted || this.paused ? 0 : 0.6, this.ctx.currentTime, 0.05);
  }

  /** rpm 0..1, speedFrac 0..1, steer -1..1 */
  update(rpm: number, throttle: number, speedFrac: number, steer: number, scraping: boolean) {
    const ctx = this.ctx;
    if (!ctx || !this.spec) return;
    const now = ctx.currentTime;
    const freq = this.spec.engine.base * (1 + rpm * this.spec.engine.rpmRange * 2);
    this.osc.forEach((o, i) => o.frequency.setTargetAtTime(freq * (i === 2 ? 2 : 1), now, 0.04));
    this.engineGain.gain.setTargetAtTime(0.06 + throttle * 0.07 + rpm * 0.04, now, 0.06);
    this.engineFilter.frequency.setTargetAtTime(this.spec.engine.filter * (0.6 + rpm), now, 0.08);
    this.wind.gain.setTargetAtTime(speedFrac * speedFrac * 0.35, now, 0.1);
    this.tyre.gain.setTargetAtTime(speedFrac * (0.04 + Math.abs(steer) * 0.12), now, 0.1);
    this.scrape.gain.setTargetAtTime(scraping ? 0.25 : 0, now, 0.03);
  }

  /** Fades out every continuous sound (engine, wind, tyres, scrape, horn, siren); one-shot effects still work. */
  silence() {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    for (const g of [this.engineGain, this.wind, this.tyre, this.scrape, this.hornGain, this.sirenGain]) g.gain.setTargetAtTime(0, now, 0.06);
  }

  setHorn(on: boolean) {
    if (this.ctx) this.hornGain.gain.setTargetAtTime(on ? 0.12 : 0, this.ctx.currentTime, 0.02);
  }

  setSiren(on: boolean) {
    if (this.ctx) this.sirenGain.gain.setTargetAtTime(on ? 0.14 : 0, this.ctx.currentTime, 0.05);
  }

  private burst(dur: number, filterType: BiquadFilterType, f0: number, f1: number, vol: number, delay = 0) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const src = this.t(ctx.createBufferSource());
    src.buffer = this.noise;
    const f = this.t(ctx.createBiquadFilter());
    f.type = filterType;
    f.frequency.setValueAtTime(f0, t0);
    f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = this.t(ctx.createGain());
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
    src.onended = () => this.release(src, f, g);
  }

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const o = this.t(ctx.createOscillator());
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = this.t(ctx.createGain());
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
    o.onended = () => this.release(o, g);
  }

  private release(...ns: AudioNode[]) {
    ns.forEach((n) => {
      n.disconnect();
      this.nodes.delete(n);
    });
  }

  crash() {
    this.burst(0.7, "lowpass", 2000, 150, 0.9);
    this.tone("sine", 90, 30, 0.6, 0.9);
    [900, 1400, 2100].forEach((f, i) => this.tone("triangle", f, f * 0.8, 0.5, 0.2, 0.05 + i * 0.07));
    this.burst(0.5, "highpass", 5000, 3000, 0.4, 0.05);
  }

  whoosh() {
    this.burst(0.45, "bandpass", 400, 2400, 0.35);
  }

  dispose() {
    this.nodes.forEach((n) => {
      try {
        if (n instanceof AudioScheduledSourceNode) n.stop();
      } catch {
        // already stopped
      }
      n.disconnect();
    });
    this.nodes.clear();
    this.osc = [];
    this.horn = [];
    if (this.ctx) void this.ctx.close();
    this.ctx = null;
  }
}
