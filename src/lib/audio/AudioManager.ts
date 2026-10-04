import { Howl, Howler } from "howler";
import { tones } from "./tone-generator";

type SoundName = "success" | "failure" | "reward";

class AudioManager {
  private sounds = new Map<string, Howl>();
  private music: Howl | null = null;
  private soundEnabled = true;
  private musicEnabled = false;

  private get(key: string, src: () => string, opts: { loop?: boolean; volume?: number } = {}): Howl {
    let h = this.sounds.get(key);
    if (!h) {
      h = new Howl({ src: [src()], format: ["wav"], ...opts });
      this.sounds.set(key, h);
    }
    return h;
  }

  configure(soundEnabled: boolean, musicEnabled: boolean) {
    this.soundEnabled = soundEnabled;
    if (!soundEnabled) window.speechSynthesis?.cancel();
    this.setMusic(musicEnabled);
  }

  private voice: SpeechSynthesisVoice | null = null;
  private speechUnlocked = false;
  private speakTimer: ReturnType<typeof setTimeout> | null = null;
  /** Chrome can garbage-collect an utterance before it finishes, which silences it; keep a reference. */
  private current: SpeechSynthesisUtterance | null = null;

  /**
   * Browsers block audio and speech until a completed tap, click or key press.
   * Called from every such event: resumes the audio context and primes speech with a silent utterance.
   */
  unlock() {
    const ctx = Howler.ctx;
    if (ctx && ctx.state === "suspended") void ctx.resume();
    const synth = typeof window === "undefined" ? undefined : window.speechSynthesis;
    if (synth && !this.speechUnlocked) {
      this.speechUnlocked = true;
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      synth.speak(u);
      synth.addEventListener?.("voiceschanged", () => (this.voice = null));
    }
  }

  private pickVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | null {
    if (this.voice) return this.voice;
    const voices = synth.getVoices();
    const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
    this.voice = english.find((v) => /en[-_]US/i.test(v.lang) && /google|samantha|natural|enhanced/i.test(v.name)) ?? english.find((v) => /en[-_]US/i.test(v.lang)) ?? english[0] ?? null;
    return this.voice;
  }

  play(name: SoundName) {
    if (!this.soundEnabled) return;
    const src = name === "success" ? tones.success : name === "failure" ? tones.gentle : tones.reward;
    this.get(name, src).play();
  }

  /** step 0-9 maps to a pentatonic pitch, so progress is audible. */
  playNote(step: number) {
    if (!this.soundEnabled) return;
    this.get(`note-${step}`, () => tones.tap(step)).play();
  }

  /** Balloon pop; three pitch variants plus a little random rate keep it from sounding repetitive. */
  playPop(variant = 0) {
    if (!this.soundEnabled) return;
    const v = Math.abs(Math.floor(variant)) % 3;
    const h = this.get(`pop-${v}`, () => tones.pop(v));
    h.rate(0.92 + Math.random() * 0.2);
    h.play();
  }

  setMusic(enabled: boolean) {
    this.musicEnabled = enabled;
    if (enabled) {
      this.music ??= new Howl({ src: [tones.music()], format: ["wav"], loop: true, volume: 0.3 });
      if (!this.music.playing()) this.music.play();
    } else {
      this.music?.pause();
    }
  }

  speak(text: string) {
    if (!this.soundEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.85;
    u.pitch = 1.3;
    u.volume = 1;
    const voice = this.pickVoice(synth);
    if (voice) u.voice = voice;
    this.current = u;
    u.onend = u.onerror = () => {
      if (this.current === u) this.current = null;
    };
    if (this.speakTimer) clearTimeout(this.speakTimer);
    const busy = synth.speaking || synth.pending;
    synth.resume();
    if (busy) {
      // A new line interrupts the old one; Chrome drops an utterance spoken in the same tick as cancel().
      synth.cancel();
      this.speakTimer = setTimeout(() => synth.speak(u), 70);
    } else {
      synth.speak(u);
    }
  }

  playAnimal(onomatopoeia: string) {
    this.speak(onomatopoeia);
  }

  get isMusicOn() {
    return this.musicEnabled;
  }
}

export const audioManager = new AudioManager();
