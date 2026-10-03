import { describe, expect, it } from "vitest";
import { GLYPHS, LETTERS, NUMBERS } from "./glyphs";

describe("GLYPHS", () => {
  it("defines every letter and digit", () => {
    for (const c of [...LETTERS, ...NUMBERS]) expect(GLYPHS[c], c).toBeDefined();
  });
  it("keeps every point inside the glyph box and every stroke at least 2 points", () => {
    for (const [c, strokes] of Object.entries(GLYPHS)) {
      expect(strokes.length, c).toBeGreaterThan(0);
      for (const s of strokes) {
        expect(s.length, c).toBeGreaterThanOrEqual(2);
        for (const [x, y] of s) {
          expect(Math.abs(x), c).toBeLessThanOrEqual(0.55);
          expect(Math.abs(y), c).toBeLessThanOrEqual(0.65);
        }
      }
    }
  });
});
