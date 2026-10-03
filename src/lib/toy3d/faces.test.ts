import { describe, expect, it } from "vitest";
import { EMOTIONS } from "@/data/emotions";
import { EMOTION_IDS, skinColor } from "./faces";

describe("faces", () => {
  it("has a face for every emotion in the data", () => {
    for (const e of EMOTIONS) expect(EMOTION_IDS, e.id).toContain(e.id);
  });
  it("gives each emotion a skin colour", () => {
    for (const id of EMOTION_IDS) expect(skinColor(id)).toMatch(/^#[0-9a-f]{6}$/);
  });
});
