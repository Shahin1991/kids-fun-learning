import { Howl, Howler } from "howler";
import { tones, type SfxName } from "./tone-generator";
import { chooseVoice, DEFAULT_VOICE, rankVoices, speechChunks, voicesForLang, VOICE_PITCH, VOICE_RATE, type VoicePrefs } from "./voice";

type SoundName = "success" | "failure" | "reward";

class AudioManager {
  private sounds = new Map<string, Howl>();
  private music: Howl | null = null;
  /** Sound effects; the header 🔊 button. */
  private soundEnabled = true;
  /** The spoken voice is a non-reader's only instructions, so only the parent dashboard turns it off. */
  private voiceEnabled = true;
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
    this.setMusic(musicEnabled);
  }

  setVoiceEnabled(enabled: boolean) {
    this.voiceEnabled = enabled;
    if (!enabled) this.stopSpeech();
  }

  private voice: SpeechSynthesisVoice | null = null;
  private voicePrefs: VoicePrefs = DEFAULT_VOICE;
  private speechUnlocked = false;
  private speakTimer: ReturnType<typeof setTimeout> | null = null;
  /** Chrome can garbage-collect an utterance before it finishes, which silences it; keep references. */
  private current: SpeechSynthesisUtterance[] = [];
  /**
   * Voices that stayed silent here. iOS lists Premium/Enhanced voices that were never downloaded,
   * and speaking with one plays nothing and reports no error, so each line is checked as it starts.
   */
  private silentVoices = new Set<string>();
  private speechWatch: ReturnType<typeof setTimeout> | null = null;
  /** Bumped by every new line and every stop, so handlers from an older line do nothing. */
  private speechGen = 0;

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
    this.voice = chooseVoice(synth.getVoices(), this.voicePrefs.voiceName, this.silentVoices);
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

  /** Stops any speech, e.g. when leaving a page or while the play timer's "Time is up" screen shows. */
  stopSpeech() {
    this.speechGen++;
    if (this.speakTimer) clearTimeout(this.speakTimer);
    if (this.speechWatch) clearTimeout(this.speechWatch);
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }

  /** `prefs` overrides the saved voice settings (the dashboard's "Test voice" button). */
  speak(text: string, prefs?: VoicePrefs) {
    if (!this.voiceEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    const p = prefs ?? this.voicePrefs;
    const voice = prefs ? chooseVoice(synth.getVoices(), prefs.voiceName, this.silentVoices) : this.pickVoice(synth);
    this.say(synth, text, p, voice, () => this.speakWithDefaultVoice(text, p));
  }

  /**
   * Speaks once the current line has finished, so an extra (a badge) never cuts off a game's line.
   * Waits at most `maxWaitMs`, then speaks anyway.
   */
  speakWhenQuiet(text: string, maxWaitMs = 8000) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    const until = Date.now() + maxWaitMs;
    const check = () => {
      if (synth.speaking || synth.pending) {
        if (Date.now() < until) return void setTimeout(check, 300);
      }
      this.speak(text);
    };
    // Lets a line started on the same turn (the game's "Well done!") get going first
    setTimeout(check, 400);
  }

  /** True when the device has a voice for this language ("hi", "ar"). */
  hasVoiceFor(lang: string): boolean {
    if (typeof window === "undefined" || !window.speechSynthesis) return false;
    return voicesForLang(window.speechSynthesis.getVoices(), lang, this.silentVoices).length > 0;
  }

  /**
   * Speaks `text` in another language ("hi", "ar") with a voice for it, or `fallback` (the same sounds
   * spelled for the English voice) when the device has none or that voice stays silent.
   */
  speakIn(lang: string, text: string, fallback: string) {
    if (!this.voiceEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    const voice = voicesForLang(synth.getVoices(), lang, this.silentVoices)[0];
    if (!voice) return this.speak(fallback);
    this.say(synth, text, this.voicePrefs, voice, () => this.speak(fallback));
  }

  private say(synth: SpeechSynthesis, text: string, p: VoicePrefs, voice: SpeechSynthesisVoice | null, retry: () => void) {
    const gen = ++this.speechGen;
    if (this.speechWatch) clearTimeout(this.speechWatch);
    const utterances = this.utterances(text, p, voice);
    if (!utterances.length) return;
    if (voice) this.watchVoice(utterances[0], voice, gen, retry);
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

  /**
   * If the chosen voice never starts, errors, or "finishes" instantly, it is not really available:
   * skip it from now on and say the line again another way (`retry`).
   */
  private watchVoice(u: SpeechSynthesisUtterance, voice: SpeechSynthesisVoice, gen: number, retry: () => void) {
    let startedAt = 0;
    let done = false;
    const fail = () => {
      if (done || gen !== this.speechGen) return;
      done = true;
      this.silentVoices.add(voice.name);
      this.voice = null;
      this.stopSpeech();
      this.speakTimer = setTimeout(retry, 70);
    };
    const settle = () => {
      done = true;
      if (this.speechWatch) clearTimeout(this.speechWatch);
    };
    const onEnd = u.onend;
    const onError = u.onerror;
    u.onstart = () => {
      startedAt = performance.now();
      if (this.speechWatch) clearTimeout(this.speechWatch);
    };
    u.onend = (e) => {
      onEnd?.call(u, e);
      if (startedAt && performance.now() - startedAt < 120 && u.text.length > 1) fail();
      else settle();
    };
    u.onerror = (e) => {
      onError?.call(u, e);
      if (e.error === "interrupted" || e.error === "canceled") settle();
      else fail();
    };
    // Counted from now, which includes the short wait after cancelling an older line
    this.speechWatch = setTimeout(() => {
      if (!startedAt && !done && document.visibilityState === "visible") fail();
    }, 3000);
  }

  /** The line again without choosing a voice: the device's own default is always installed. */
  private speakWithDefaultVoice(text: string, p: VoicePrefs) {
    const synth = window.speechSynthesis;
    synth.resume();
    this.utterances(text, p, null).forEach((u) => synth.speak(u));
  }

  /** One utterance per sentence: the engine pauses between them, so children can keep up. */
  private utterances(text: string, p: VoicePrefs, voice: SpeechSynthesisVoice | null): SpeechSynthesisUtterance[] {
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
    this.current = utterances;
    return utterances;
  }

  playAnimal(onomatopoeia: string) {
    this.speak(onomatopoeia);
  }

  get isMusicOn() {
    return this.musicEnabled;
  }
}

export const audioManager = new AudioManager();
