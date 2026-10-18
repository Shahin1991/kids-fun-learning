import { Howl, Howler } from "howler";
import { tones, type SfxName } from "./tone-generator";
import { chooseVoice, DEFAULT_VOICE, rankVoices, speechChunks, VOICE_PITCH, VOICE_RATE, type VoicePrefs } from "./voice";

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
  private voicePrefs: VoicePrefs = DEFAULT_VOICE;
  private speechUnlocked = false;
  private speakTimer: ReturnType<typeof setTimeout> | null = null;
  /** Chrome can garbage-collect an utterance before it finishes, which silences it; keep references. */
  private current: SpeechSynthesisUtterance[] = [];

  /** Speed, style and device voice from the parent dashboard. */
  setVoicePrefs(prefs: VoicePrefs) {
    this.voicePrefs = prefs;
    this.voice = null;
  }

  /** English voices on this device, best first (empty until the browser has loaded them). */
  listVoices(): SpeechSynthesisVoice[] {
    if (typeof window === "undefined" || !window.speechSynthesis) return [];
    return rankVoices(window.speechSynthesis.getVoices());
  }

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
    this.voice = chooseVoice(synth.getVoices(), this.voicePrefs.voiceName);
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

  /** A xylophone bar at any pitch (Hz), for the music games. */
  playBell(freq: number) {
    if (!this.soundEnabled) return;
    this.get(`bell-${freq.toFixed(1)}`, () => tones.bell(freq)).play();
  }

  /** Balloon pop; three pitch variants plus a little random rate keep it from sounding repetitive. */
  playPop(variant = 0) {
    if (!this.soundEnabled) return;
    const v = Math.abs(Math.floor(variant)) % 3;
    const h = this.get(`pop-${v}`, () => tones.pop(v));
    h.rate(0.92 + Math.random() * 0.2);
    h.play();
  }

  /** A page turning. Three recordings-in-code plus a little random speed keep repeated turns from sounding identical. */
  playPaper(forward = true) {
    if (!this.soundEnabled) return;
    const v = Math.floor(Math.random() * 3);
    const h = this.get(`paper-${v}`, () => tones.page(v), { volume: 0.8 });
    h.rate((forward ? 1 : 0.88) * (0.94 + Math.random() * 0.14));
    h.play();
  }

  /** Sports sound effect at a volume (0..1) so soft taps stay soft. */
  playSfx(name: SfxName, volume = 1) {
    if (!this.soundEnabled) return;
    const h = this.get(`sfx-${name}`, () => tones.sfx(name));
    const id = h.play();
    h.volume(Math.max(0.05, Math.min(1, volume)), id);
    h.rate(0.94 + Math.random() * 0.12, id);
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

  /** `prefs` overrides the saved voice settings (the dashboard's "Test voice" button). */
  speak(text: string, prefs?: VoicePrefs) {
    if (!this.soundEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    const p = prefs ?? this.voicePrefs;
    const voice = prefs ? chooseVoice(synth.getVoices(), prefs.voiceName) : this.pickVoice(synth);
    // One utterance per sentence: the engine pauses between them, so children can keep up
    const utterances = speechChunks(text).map((chunk) => {
      const u = new SpeechSynthesisUtterance(chunk);
      u.lang = voice?.lang ?? "en-US";
      u.rate = VOICE_RATE[p.speed];
      u.pitch = VOICE_PITCH[p.style];
      u.volume = 1;
      if (voice) u.voice = voice;
      u.onend = u.onerror = () => {
        this.current = this.current.filter((x) => x !== u);
      };
      return u;
    });
    if (!utterances.length) return;
    this.current = utterances;
    if (this.speakTimer) clearTimeout(this.speakTimer);
    const busy = synth.speaking || synth.pending;
    synth.resume();
    const go = () => utterances.forEach((u) => synth.speak(u));
    if (busy) {
      // A new line interrupts the old one; Chrome drops an utterance spoken in the same tick as cancel().
      synth.cancel();
      this.speakTimer = setTimeout(go, 70);
    } else {
      go();
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
