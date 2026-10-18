import { describe, expect, it } from "vitest";
import { chooseVoice, DEFAULT_VOICE, normalizeVoice, rankVoices, speechChunks, VOICE_PITCH, VOICE_RATE } from "./voice";

describe("voice preferences", () => {
  it("defaults to slow, natural speech and repairs bad or missing saves", () => {
    expect(DEFAULT_VOICE.speed).toBe("slow");
    expect(VOICE_RATE.slow).toBeLessThan(0.85); // slower than the old fixed rate
    expect(VOICE_RATE.slower).toBeLessThan(VOICE_RATE.slow);
    expect(VOICE_PITCH.natural).toBeLessThan(1.3); // the old raised pitch sounded synthetic
    expect(normalizeVoice(undefined)).toEqual(DEFAULT_VOICE);
    expect(normalizeVoice({ speed: "warp" as never, style: "deep", voiceName: "" })).toEqual({ speed: "slow", style: "deep", voiceName: null });
  });

  it("speaks long text one sentence at a time and keeps short lines whole", () => {
    expect(speechChunks("Pot a red!")).toEqual(["Pot a red!"]);
    expect(speechChunks("  Drag the ramp into the gap.   Then tap the marble!  Well done. ")).toEqual(["Drag the ramp into the gap.", "Then tap the marble!", "Well done."]);
    expect(speechChunks("   ")).toEqual([]);
  });

  it("prefers high-quality English voices and skips novelty ones", () => {
    const voices = [
      { name: "Thomas", lang: "fr-FR" },
      { name: "Fred", lang: "en-US" },
      { name: "Bubbles", lang: "en-US" },
      { name: "Google UK English Female", lang: "en-GB" },
      { name: "Ava (Premium)", lang: "en-US" },
    ];
    const ranked = rankVoices(voices).map((v) => v.name);
    expect(ranked[0]).toBe("Ava (Premium)");
    expect(ranked).not.toContain("Thomas");
    expect(ranked).not.toContain("Bubbles");
    expect(chooseVoice(voices, null)?.name).toBe("Ava (Premium)");
    expect(chooseVoice(voices, "Fred")?.name).toBe("Fred");
    // A picked voice the device no longer has falls back to the best one
    expect(chooseVoice(voices, "Gone")?.name).toBe("Ava (Premium)");
  });
});
