import { describe, expect, it } from "vitest";
import { rng } from "@/lib/cake-bakery/recipe";
import { bundle, check, levelFor, makeTarget, matsFor, readChoices, sayMats, valueOf } from "./place-value";

describe("tens and ones", () => {
  it("picks targets in each level's range", () => {
    const r = rng(3);
    const ranges = [[11, 19], [20, 59], [21, 99], [101, 199]];
    ranges.forEach(([lo, hi], level) => {
      for (let i = 0; i < 100; i++) {
        const n = makeTarget(level, r);
        expect(n).toBeGreaterThanOrEqual(lo);
        expect(n).toBeLessThanOrEqual(hi);
      }
    });
    expect([0, 3, 7, 12].map(levelFor)).toEqual([0, 1, 2, 3]);
  });

  it("asks for a bundle when the total is right but ten or more are loose", () => {
    expect(check(14, { hundreds: 0, tens: 0, ones: 14 })).toBe("bundle");
    expect(check(14, { hundreds: 0, tens: 1, ones: 4 })).toBe("match");
    expect(check(14, { hundreds: 0, tens: 1, ones: 2 })).toBe("more");
    expect(check(14, { hundreds: 0, tens: 2, ones: 0 })).toBe("less");
    expect(check(120, { hundreds: 0, tens: 12, ones: 0 })).toBe("bundle");
  });

  it("bundles ten ones into a ten and ten tens into a hundred", () => {
    expect(bundle({ hundreds: 0, tens: 1, ones: 12 })).toEqual({ hundreds: 0, tens: 2, ones: 2 });
    expect(bundle({ hundreds: 0, tens: 10, ones: 3 })).toEqual({ hundreds: 1, tens: 0, ones: 3 });
    const m = { hundreds: 0, tens: 3, ones: 4 };
    expect(bundle(m)).toBe(m);
    expect(valueOf(matsFor(157))).toBe(157);
  });

  it("says the mats the CBSE way", () => {
    expect(sayMats(matsFor(34))).toBe("3 tens and 4 ones");
    expect(sayMats(matsFor(11))).toBe("1 ten and 1 one");
    expect(sayMats(matsFor(125))).toBe("1 hundred, 2 tens and 5 ones");
    expect(sayMats(matsFor(7))).toBe("7 ones");
  });

  it("offers the answer and two different wrong numbers to read", () => {
    const r = rng(9);
    for (const n of [12, 33, 47, 90, 158]) {
      const c = readChoices(n, r);
      expect(c).toContain(n);
      expect(new Set(c).size).toBe(3);
      expect(c.every((x) => x > 0)).toBe(true);
    }
  });
});
