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

  /** Browsers block audio until a gesture; resume the context on the first one. */
  unlock() {
    const ctx = Howler.ctx;
    if (ctx && ctx.state === "suspended") void ctx.resume();
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
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.85;
    u.pitch = 1.3;
    window.speechSynthesis.speak(u);
  }

  playAnimal(onomatopoeia: string) {
    this.speak(onomatopoeia);
  }

  get isMusicOn() {
    return this.musicEnabled;
  }
}

export const audioManager = new AudioManager();
