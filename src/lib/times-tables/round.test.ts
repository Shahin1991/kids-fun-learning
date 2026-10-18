import { describe, expect, it } from "vitest";
import { rng } from "@/lib/apex-highway/scenery";
import { skipCount, stageFor, timesRound } from "./round";

describe("times tables", () => {
  it("always has the right answer among unique, positive choices", () => {
    const r = rng(7);
    for (let streak = 0; streak < 40; streak++) {
      const q = timesRound(streak, r);
      expect(q.answer).toBe(q.a * q.b);
      expect(q.choices).toContain(q.answer);
      expect(new Set(q.choices).size).toBe(q.choices.length);
      expect(q.choices).toHaveLength(stageFor(streak).choices);
      q.choices.forEach((c) => expect(c).toBeGreaterThan(0));
    }
  });

  it("warms up on the 2s, 5s and 10s with small groups and two choices", () => {
    const r = rng(1);
    for (let i = 0; i < 30; i++) {
      const q = timesRound(0, r);
      expect([2, 5, 10]).toContain(q.b);
      expect(q.a).toBeLessThanOrEqual(5);
      expect(q.choices).toHaveLength(2);
    }
  });

  it("counts along the rows", () => {
    expect(skipCount(3, 4)).toEqual([4, 8, 12]);
    expect(skipCount(1, 7)).toEqual([7]);
  });
});
