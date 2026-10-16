import { describe, expect, it } from "vitest";
import { makeProblem } from "./problem";
import { EXTENSION_MS, extend, freshState, isTimeUp } from "./state";

describe("play timer", () => {
  it("problems get harder with level", () => {
    expect(makeProblem(0, () => 0.999).answer).toBeLessThan(makeProblem(3, () => 0).answer);
    const p = makeProblem(2);
    expect(p.a + p.b).toBe(p.answer);
  });

  it("extends by five minutes and bumps level", () => {
    const s = { ...freshState(10), usedMs: 10 * 60_000 };
    expect(isTimeUp(s)).toBe(true);
    const e = extend(s);
    expect(isTimeUp(e)).toBe(false);
    expect(e.allowanceMs - s.allowanceMs).toBe(EXTENSION_MS);
    expect(e.level).toBe(1);
  });
});
