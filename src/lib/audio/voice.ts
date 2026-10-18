/**
 * Spoken-voice preferences: how fast and in what style the app talks, and which device voice it
 * uses. Pure helpers so they can be tested without a browser.
 */

export type VoiceSpeed = "slower" | "slow" | "normal";
export type VoiceStyle = "natural" | "bright" | "deep" | "squeaky";

export interface VoicePrefs {
  speed: VoiceSpeed;
  style: VoiceStyle;
  /** A device voice the parent picked, or null to choose the best one automatically */
  voiceName: string | null;
}

/** Slow by default: young children follow speech best well under adult speed. */
export const DEFAULT_VOICE: VoicePrefs = { speed: "slow", style: "natural", voiceName: null };

/** speechSynthesis rate (1 = a typical adult voice) */
export const VOICE_RATE: Record<VoiceSpeed, number> = { slower: 0.6, slow: 0.75, normal: 0.9 };

/** speechSynthesis pitch. A big pitch lift sounds more synthetic, so "natural" stays near 1. */
export const VOICE_PITCH: Record<VoiceStyle, number> = { natural: 1.05, bright: 1.25, deep: 0.85, squeaky: 1.6 };

export const SPEED_OPTIONS: { id: VoiceSpeed; label: string }[] = [
  { id: "slower", label: "🐢 Extra slow" },
  { id: "slow", label: "🐌 Slow" },
  { id: "normal", label: "🚶 Normal" },
];

export const STYLE_OPTIONS: { id: VoiceStyle; label: string }[] = [
  { id: "natural", label: "🙂 Natural" },
  { id: "bright", label: "✨ Bright" },
  { id: "deep", label: "🐻 Deep" },
  { id: "squeaky", label: "🐭 Squeaky" },
];

/** Fills in anything missing or unknown in saved preferences (older saves have none). */
export function normalizeVoice(p: Partial<VoicePrefs> | null | undefined): VoicePrefs {
  return {
    speed: p?.speed && p.speed in VOICE_RATE ? p.speed : DEFAULT_VOICE.speed,
    style: p?.style && p.style in VOICE_PITCH ? p.style : DEFAULT_VOICE.style,
    voiceName: typeof p?.voiceName === "string" && p.voiceName ? p.voiceName : null,
  };
}

/**
 * Splits text into sentences so each is spoken as its own utterance: the speech engine leaves a
 * natural pause between them, which helps children keep up. Short lines stay whole.
 */
export function speechChunks(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= 40) return [clean];
  return clean
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

interface VoiceLike {
  name: string;
  lang: string;
  localService?: boolean;
}

/** Higher is better: high-quality voices first, then well-known clear ones, then any English. */
export function voiceScore(v: VoiceLike): number {
  const lang = v.lang.toLowerCase().replace("_", "-");
  if (!lang.startsWith("en")) return -1;
  let s = 0;
  if (/premium|enhanced|natural|neural/i.test(v.name)) s += 50;
  if (/google/i.test(v.name)) s += 30;
  if (/samantha|ava|allison|susan|serena|karen|moira|daniel/i.test(v.name)) s += 20;
  if (lang === "en-us" || lang === "en-gb") s += 10;
  // Novelty voices are fun but hard to understand
  if (/whisper|bells|bubbles|cellos|organ|zarvox|trinoids|bad news|good news|boing|wobble|jester|superstar|albert|hysterical|deranged/i.test(v.name)) s -= 100;
  return s;
}

/** English voices, best first. */
export function rankVoices<T extends VoiceLike>(voices: T[]): T[] {
  return voices.filter((v) => voiceScore(v) > -1).sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name));
}

/** The voice to use: the parent's pick if the device still has it, otherwise the best one. */
export function chooseVoice<T extends VoiceLike>(voices: T[], name: string | null): T | null {
  if (name) {
    const picked = voices.find((v) => v.name === name);
    if (picked) return picked;
  }
  return rankVoices(voices)[0] ?? null;
}

export const VOICE_SAMPLE = "Hi there! Let's count together. One, two, three. Well done!";
