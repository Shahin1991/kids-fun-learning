import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** A stand-in speech engine: voices in `silent` never start, like an iOS voice that was never downloaded. */
class FakeUtterance {
  voice: { name: string } | null = null;
  lang = "";
  rate = 1;
  pitch = 1;
  volume = 1;
  onstart: (() => void) | null = null;
  onend: ((e: unknown) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  constructor(public text: string) {}
}

function fakeSynth(silent: string[]) {
  const spoken: { text: string; voice: string | null }[] = [];
  const synth = {
    speaking: false,
    pending: false,
    getVoices: () => [
      { name: "Ava (Premium)", lang: "en-US" },
      { name: "Samantha", lang: "en-US" },
    ],
    resume() {},
    cancel() {},
    addEventListener() {},
    speak(u: FakeUtterance) {
      if (!u.text.trim()) return;
      spoken.push({ text: u.text, voice: u.voice?.name ?? null });
      if (u.voice && silent.includes(u.voice.name)) return;
      setTimeout(() => u.onstart?.(), 10);
      setTimeout(() => u.onend?.({}), 600);
    },
  };
  return { synth, spoken };
}

async function setup(silent: string[]) {
  const { synth, spoken } = fakeSynth(silent);
  vi.stubGlobal("window", { speechSynthesis: synth });
  vi.stubGlobal("document", { visibilityState: "visible" });
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
  vi.resetModules();
  const { audioManager } = await import("./AudioManager");
  return { audioManager, spoken };
}

describe("speech voice fallback", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("uses the best voice when it works", async () => {
    const { audioManager, spoken } = await setup([]);
    audioManager.speak("Pop the balloons!");
    await vi.advanceTimersByTimeAsync(5000);
    expect(spoken).toEqual([{ text: "Pop the balloons!", voice: "Ava (Premium)" }]);
  });

  it("repeats the line with the device voice when the chosen voice stays silent, then skips it", async () => {
    const { audioManager, spoken } = await setup(["Ava (Premium)"]);
    audioManager.speak("Pop the balloons!");
    await vi.advanceTimersByTimeAsync(5000);
    expect(spoken).toEqual([
      { text: "Pop the balloons!", voice: "Ava (Premium)" },
      { text: "Pop the balloons!", voice: null },
    ]);
    audioManager.speak("Well done!");
    await vi.advanceTimersByTimeAsync(5000);
    expect(spoken.at(-1)).toEqual({ text: "Well done!", voice: "Samantha" });
  });

  it("does not repeat a line that was stopped on purpose", async () => {
    const { audioManager, spoken } = await setup(["Ava (Premium)"]);
    audioManager.speak("Pop the balloons!");
    await vi.advanceTimersByTimeAsync(500);
    audioManager.stopSpeech();
    await vi.advanceTimersByTimeAsync(5000);
    expect(spoken).toHaveLength(1);
  });
});
