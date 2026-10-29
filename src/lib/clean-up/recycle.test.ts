import { describe, expect, it } from "vitest";
import { rng } from "@/lib/cake-bakery/recipe";
import { BINS, binsFor, goesIn, LITTER, litterById, makeLitter } from "./recycle";

describe("clean-up and recycle", () => {
  it("every bin has litter that goes in it", () => {
    for (const b of BINS) expect(LITTER.some((l) => l.bin === b.id)).toBe(true);
  });

  it("starts with three bins and adds cans later", () => {
    expect(binsFor(0).map((b) => b.id)).toEqual(["paper", "plastic", "food"]);
    expect(binsFor(2).map((b) => b.id)).toContain("metal");
  });

  it("scatters litter for the bins in play, at least one for each, without stacking", () => {
    const r = rng(11);
    for (let level = 0; level < 6; level++) {
      for (let k = 0; k < 20; k++) {
        const pieces = makeLitter(level, r);
        const bins = binsFor(level).map((b) => b.id);
        expect(pieces.length).toBe(Math.min(9, 5 + level));
        expect(new Set(pieces.map((p) => p.key)).size).toBe(pieces.length);
        for (const b of bins) expect(pieces.some((p) => litterById(p.litter).bin === b)).toBe(true);
        for (const p of pieces) {
          expect(bins).toContain(litterById(p.litter).bin);
          expect(p.x).toBeGreaterThan(0);
          expect(p.x).toBeLessThan(100);
        }
        for (let i = 0; i < pieces.length; i++)
          for (let j = i + 1; j < pieces.length; j++) expect(Math.hypot(pieces[i].x - pieces[j].x, pieces[i].y - pieces[j].y)).toBeGreaterThan(8);
      }
    }
  });

  it("knows which bin each thing goes in", () => {
    expect(goesIn("peel", "food")).toBe(true);
    expect(goesIn("peel", "paper")).toBe(false);
    expect(goesIn("can", "metal")).toBe(true);
  });
});
