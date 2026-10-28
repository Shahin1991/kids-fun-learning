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
  voiceURI?: string;
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

/** English voices, best first, leaving out any in `skip` (voices that stayed silent on this device). */
export function rankVoices<T extends VoiceLike>(voices: T[], skip: ReadonlySet<string> = new Set()): T[] {
  return voices.filter((v) => voiceScore(v) > -1 && !skip.has(v.name)).sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name));
}

/**
 * Voices for another language ("hi", "ar"), best first. On-device voices come first and Premium or
 * Enhanced ones last, because Apple lists those even when they were never downloaded.
 */
export function voicesForLang<T extends VoiceLike>(voices: T[], lang: string, skip: ReadonlySet<string> = new Set()): T[] {
  const score = (v: VoiceLike) => (v.localService ? 2 : 0) + (/google/i.test(v.name) ? 1 : 0) - (/premium|enhanced/i.test(v.name) ? 4 : 0);
  return voices
    .filter((v) => v.lang.toLowerCase().replace("_", "-").split("-")[0] === lang.toLowerCase() && !skip.has(v.name))
    .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
}

/** Apple's speech engine (iPad, iPhone, Safari on Mac) names its voices com.apple.… */
export const isAppleSpeech = (voices: VoiceLike[]) => voices.some((v) => v.voiceURI?.startsWith("com.apple."));

/**
 * The voice to use: the parent's pick if the device still has it, otherwise the best one, or null
 * for the device's own default. Apple lists Premium and Enhanced voices that were never downloaded,
 * and they speak in silence while reporting normal start and end events, so on Apple devices
 * automatic mode leaves the choice to the system, whose default English voice is always installed.
 */
export function chooseVoice<T extends VoiceLike>(voices: T[], name: string | null, skip: ReadonlySet<string> = new Set()): T | null {
  if (name && !skip.has(name)) {
    const picked = voices.find((v) => v.name === name);
    if (picked) return picked;
  }
  if (isAppleSpeech(voices)) return null;
  return rankVoices(voices, skip)[0] ?? null;
}

export const VOICE_SAMPLE = "Hi there! Let's count together. One, two, three. Well done!";
