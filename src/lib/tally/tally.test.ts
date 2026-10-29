import { describe, expect, it } from "vitest";
import { rng } from "@/lib/cake-bakery/recipe";
import { countOf, makeParade, makeQuestions, tallyGroups } from "./tally";

describe("tally and charts", () => {
  it("groups tally marks in fives", () => {
    expect(tallyGroups(0)).toEqual({ fives: 0, ones: 0 });
    expect(tallyGroups(7)).toEqual({ fives: 1, ones: 2 });
    expect(tallyGroups(10)).toEqual({ fives: 2, ones: 0 });
  });

  it("parades have a different count for each animal, growing with the level", () => {
    const r = rng(8);
    for (let level = 0; level < 6; level++) {
      for (let k = 0; k < 20; k++) {
        const p = makeParade(level, r);
        expect(p.kinds).toHaveLength(level >= 2 ? 4 : 3);
        const counts = p.kinds.map((id) => countOf(p.order, id));
        expect(new Set(counts).size).toBe(counts.length);
        expect(Math.min(...counts)).toBeGreaterThanOrEqual(2);
        expect(Math.max(...counts)).toBeLessThanOrEqual(Math.min(12, 5 + level * 2));
        expect(counts.reduce((a, b) => a + b, 0)).toBe(p.order.length);
      }
    }
  });

  it("asks questions whose answer is among the choices and matches the parade", () => {
    const r = rng(1);
    for (let level = 0; level < 4; level++) {
      const p = makeParade(level, r);
      const qs = makeQuestions(p, level, r);
      expect(qs).toHaveLength(3 + (level >= 1 ? 1 : 0));
      for (const q of qs) expect(q.choices).toContain(q.answer);
      const counts = p.kinds.map((id) => countOf(p.order, id));
      expect(countOf(p.order, qs[0].answer as string)).toBe(Math.max(...counts));
      if (level >= 1) expect(qs[3].answer).toBe(p.order.length);
    }
  });
});
