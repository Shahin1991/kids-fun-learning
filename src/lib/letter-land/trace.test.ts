import { describe, expect, it } from "vitest";
import { GLYPHS, LETTERS, NUMBERS } from "@/lib/parade/glyphs";
import { sampleStrokes } from "./trace";

describe("sampleStrokes", () => {
  it("keeps beads evenly spaced along a straight line and includes both ends", () => {
    const beads = sampleStrokes([[[0, 0], [1, 0]]], 0.25);
    expect(beads[0]).toMatchObject({ x: 0, y: 0 });
    expect(beads[beads.length - 1].x).toBeCloseTo(1, 5);
    for (let i = 1; i < beads.length; i++) expect(beads[i].x - beads[i - 1].x).toBeLessThanOrEqual(0.26);
  });
  it("gives every letter and digit a reasonable number of beads", () => {
    for (const c of [...LETTERS, ...NUMBERS]) {
      const beads = sampleStrokes(GLYPHS[c]);
      expect(beads.length, c).toBeGreaterThanOrEqual(5);
      expect(beads.length, c).toBeLessThan(80);
    }
  });
});
