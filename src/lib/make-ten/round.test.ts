import { describe, expect, it } from "vitest";
import { rng } from "@/lib/apex-highway/scenery";
import { makeTenRound } from "./round";

describe("make ten", () => {
  it("always has a right answer among unique, in-range choices", () => {
    const r = rng(3);
    for (let streak = 0; streak < 20; streak++) {
      const q = makeTenRound(streak, r);
      expect(q.have + q.answer).toBe(q.target);
      expect(q.have).toBeGreaterThan(0);
      expect(q.choices).toContain(q.answer);
      expect(new Set(q.choices).size).toBe(q.choices.length);
      q.choices.forEach((c) => expect(c >= 0 && c <= q.target).toBe(true));
    }
  });

  it("warms up with make 5 and two choices, then grows", () => {
    expect(makeTenRound(0).target).toBe(5);
    expect(makeTenRound(0).choices).toHaveLength(2);
    expect(makeTenRound(9).target).toBe(10);
    expect(makeTenRound(9).choices).toHaveLength(4);
  });
});
