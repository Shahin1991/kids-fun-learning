import { describe, expect, it } from "vitest";
import { rng } from "@/lib/cake-bakery/recipe";
import { numberChoices } from "@/lib/math/choices";
import { blockFit, holdsMore, lengthQuestion, makeRound, RULER_CM } from "./measure";

describe("measure it", () => {
  it("cycles blocks, ruler, jugs", () => {
    expect([0, 1, 2, 3].map((n) => makeRound(n).kind)).toEqual(["blocks", "ruler", "jugs", "blocks"]);
  });

  it("keeps things on the ruler, starting at 0 at first", () => {
    const r = rng(9);
    for (let n = 1; n < 60; n += 3) {
      const round = makeRound(n, r);
      if (round.kind !== "ruler") throw new Error("expected a ruler round");
      expect(round.start + round.length).toBeLessThanOrEqual(RULER_CM);
      if (n < 6) expect(round.start).toBe(0);
      else expect(round.start).toBeGreaterThan(0);
    }
  });

  it("offers the end mark as a tempting wrong on an offset ruler", () => {
    const q = lengthQuestion({ kind: "ruler", thing: { art: "pencil", name: "pencil", color: "" }, start: 3, length: 5 });
    expect(q.answer).toBe(5);
    expect(q.choices).toContain(5);
    expect(q.choices).toContain(8);
    expect(q.choices).toHaveLength(3);
  });

  it("number choices are three different positive numbers", () => {
    const r = rng(2);
    for (let a = 1; a < 15; a++) {
      const c = numberChoices(a, r);
      expect(new Set(c).size).toBe(3);
      expect(c).toContain(a);
      expect(Math.min(...c)).toBeGreaterThan(0);
    }
  });

  it("jugs differ, and later rounds make the taller one hold less", () => {
    const r = rng(4);
    for (let n = 2; n < 60; n += 3) {
      const round = makeRound(n, r);
      if (round.kind !== "jugs") throw new Error("expected a jugs round");
      expect(round.a.cups).not.toBe(round.b.cups);
      if (n >= 5) {
        const taller = round.a.h > round.b.h ? round.a : round.b;
        expect(holdsMore(round)).not.toBe(taller);
      }
    }
  });

  it("knows when the blocks fit", () => {
    expect(blockFit(3, 5)).toBe("short");
    expect(blockFit(5, 5)).toBe("exact");
    expect(blockFit(6, 5)).toBe("over");
  });
});
