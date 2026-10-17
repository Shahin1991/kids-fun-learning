import { encodeWavDataUri } from "./wav-encoder";

const SAMPLE_RATE = 22050;

export interface ToneNote {
  freq: number;
  /** seconds */
  duration: number;
  volume?: number;
}

/** Render notes back-to-back with a soft attack/release so there are no clicks. */
export function renderNotes(notes: ToneNote[], wave: "sine" | "triangle" = "sine"): string {
  const total = notes.reduce((sum, n) => sum + n.duration, 0);
  const samples = new Float32Array(Math.ceil(total * SAMPLE_RATE));
  let offset = 0;
  for (const note of notes) {
    const len = Math.floor(note.duration * SAMPLE_RATE);
    const vol = note.volume ?? 0.4;
    for (let i = 0; i < len; i++) {
      const t = i / SAMPLE_RATE;
      const phase = 2 * Math.PI * note.freq * t;
      const raw = wave === "sine" ? Math.sin(phase) : (2 / Math.PI) * Math.asin(Math.sin(phase));
      const attack = Math.min(1, i / (SAMPLE_RATE * 0.01));
      const release = Math.min(1, (len - i) / (SAMPLE_RATE * 0.05));
      samples[offset + i] = raw * vol * attack * release;
    }
    offset += len;
  }
  return encodeWavDataUri(samples, SAMPLE_RATE);
}

/** C major pentatonic, so any pitch the child triggers sounds pleasant. */
export const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];

export function pentatonic(step: number): number {
  return PENTATONIC[Math.max(0, Math.min(PENTATONIC.length - 1, step))];
}

/** A short balloon "pop": a noise crack over a quick falling tone. */
export function renderPop(pitch: number): string {
  const n = Math.floor(SAMPLE_RATE * 0.16);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 34);
    const body = Math.sin(2 * Math.PI * 520 * pitch * t * Math.exp(-t * 8));
    samples[i] = ((Math.random() * 2 - 1) * 0.6 + body * 0.5) * env * 0.85;
  }
  return encodeWavDataUri(samples, SAMPLE_RATE);
}

/**
 * A page turning: filtered noise that sweeps upward like a quick swish, with a paper-fibre crinkle
 * on top and a soft low "tap" as the page lands. Three variants differ in length and brightness.
 */
export function renderPageTurnSamples(variant = 0, rand: () => number = Math.random): Float32Array {
  const v = Math.abs(Math.floor(variant)) % 3;
  const dur = [0.46, 0.38, 0.54][v];
  const lo = [1500, 1900, 1200][v];
  const hi = [4300, 5200, 3600][v];
  const n = Math.floor(SAMPLE_RATE * dur);
  const out = new Float32Array(n);
  let low = 0;
  let band = 0;
  let crinkle = 1;
  let thudLp = 0;
  const q = 0.55;
  const landAt = dur * 0.78;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const k = t / dur;
    // State-variable band-pass whose centre climbs through the swish.
    const fc = lo + (hi - lo) * Math.pow(k, 0.8);
    const f = 2 * Math.sin((Math.PI * fc) / SAMPLE_RATE);
    const x = rand() * 2 - 1;
    const high = x - low - q * band;
    band += f * high;
    low += f * band;
    // Swish envelope: fast rise, long soft fall.
    const rise = Math.min(1, t / (dur * 0.18));
    const env = rise * rise * (3 - 2 * rise) * Math.exp(-Math.max(0, t - dur * 0.18) * (3.2 / dur));
    // Crinkle: a random gain held for ~3 ms at a time.
    if (i % 66 === 0) crinkle = 0.35 + 0.65 * Math.pow(rand(), 1.6);
    let sample = band * env * crinkle * 1.7;
    // Soft landing tap
    if (t >= landAt) {
      const tt = t - landAt;
      thudLp += 0.12 * ((rand() * 2 - 1) - thudLp);
      sample += thudLp * Math.exp(-tt * 65) * 2.2;
    }
    out[i] = sample;
  }
  // Fade the very end and level to a comfortable peak.
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  const gain = peak > 0 ? 0.55 / peak : 1;
  for (let i = 0; i < n; i++) out[i] *= gain * Math.min(1, (n - i) / (SAMPLE_RATE * 0.03));
  return out;
}

/** A xylophone-like strike: bright attack, a quiet overtone, and a ringing exponential decay. */
export function renderBell(freq: number, seconds = 0.9): string {
  const len = Math.floor(seconds * SAMPLE_RATE);
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.min(1, i / (SAMPLE_RATE * 0.004)) * Math.exp(-t * 5);
    const tone = Math.sin(2 * Math.PI * freq * t) + 0.25 * Math.sin(2 * Math.PI * freq * 4 * t) * Math.exp(-t * 18);
    samples[i] = tone * 0.35 * env;
  }
  return encodeWavDataUri(samples, SAMPLE_RATE);
}

/** Sports effects: a ball "clack", a wooden knock, a dart/arrow thud, a throw whoosh and a pocket plunk. */
export type SfxName = "clack" | "knock" | "thud" | "whoosh" | "plunk";

export function renderSfxSamples(name: SfxName, rand: () => number = Math.random): Float32Array {
  const dur = { clack: 0.08, knock: 0.14, thud: 0.16, whoosh: 0.32, plunk: 0.24 }[name];
  const n = Math.floor(SAMPLE_RATE * dur);
  const out = new Float32Array(n);
  let lp = 0;
  let band = 0;
  let low = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const noise = rand() * 2 - 1;
    let v = 0;
    if (name === "clack") {
      // Hard phenolic balls: two bright partials and a tiny click.
      v = (Math.sin(2 * Math.PI * 2350 * t) * 0.6 + Math.sin(2 * Math.PI * 3720 * t) * 0.35) * Math.exp(-t * 85) + noise * Math.exp(-t * 600) * 0.5;
    } else if (name === "knock" || name === "thud") {
      lp += (name === "knock" ? 0.25 : 0.12) * (noise - lp);
      const f = name === "knock" ? 210 : 120;
      v = (Math.sin(2 * Math.PI * f * t) * 0.8 + lp * 1.6) * Math.exp(-t * (name === "knock" ? 38 : 30));
    } else if (name === "whoosh") {
      const fc = 600 + 2600 * (t / dur);
      const f = 2 * Math.sin((Math.PI * fc) / SAMPLE_RATE);
      const high = noise - low - 0.6 * band;
      band += f * high;
      low += f * band;
      const k = t / dur;
      v = band * Math.sin(Math.PI * k) * 0.9;
    } else {
      // Plunk: a falling hollow tone as the ball drops into the pocket.
      const f = 320 * Math.exp(-t * 5);
      v = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 12) * 0.8;
    }
    out[i] = v * Math.min(1, (n - i) / (SAMPLE_RATE * 0.01));
  }
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  const gain = peak > 0 ? 0.6 / peak : 1;
  for (let i = 0; i < n; i++) out[i] *= gain;
  return out;
}

export const tones = {
  sfx: (name: SfxName) => encodeWavDataUri(renderSfxSamples(name), SAMPLE_RATE),
  bell: (freq: number) => renderBell(freq),
  page: (variant: number) => encodeWavDataUri(renderPageTurnSamples(variant), SAMPLE_RATE),
  pop: (variant: number) => renderPop(0.85 + variant * 0.2),
  success: () => renderNotes([{ freq: 523.25, duration: 0.12 }, { freq: 659.25, duration: 0.18 }]),
  // Deliberately soft and neutral: a low, gentle "bloop", never a buzzer.
  gentle: () => renderNotes([{ freq: 330, duration: 0.15, volume: 0.2 }, { freq: 294, duration: 0.2, volume: 0.15 }], "triangle"),
  reward: () =>
    renderNotes([
      { freq: 523.25, duration: 0.12 },
      { freq: 659.25, duration: 0.12 },
      { freq: 783.99, duration: 0.12 },
      { freq: 1046.5, duration: 0.3 },
    ]),
  tap: (step: number) => renderNotes([{ freq: pentatonic(step), duration: 0.18 }], "triangle"),
  music: () =>
    renderNotes(
      [261.63, 329.63, 392.0, 329.63, 293.66, 349.23, 440.0, 349.23].map((freq) => ({ freq, duration: 0.5, volume: 0.12 })),
      "triangle",
    ),
};
