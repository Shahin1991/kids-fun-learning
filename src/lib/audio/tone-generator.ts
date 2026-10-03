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

export const tones = {
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
