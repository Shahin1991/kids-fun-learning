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

describe("play timer merge", () => {
  it("keeps the most time used across tabs", async () => {
    const { mergeStates } = await import("./state");
    const a = { ...freshState(30), usedMs: 20 * 60_000, resetAt: 1 };
    const b = { ...freshState(30), usedMs: 25 * 60_000, allowanceMs: 35 * 60_000, level: 1, resetAt: 1 };
    const m = mergeStates(a, b);
    expect(m.usedMs).toBe(25 * 60_000);
    expect(m.allowanceMs).toBe(35 * 60_000);
    expect(m.level).toBe(1);
  });

  it("a parent reset in one tab beats older usage in another", async () => {
    const { mergeStates } = await import("./state");
    const old = { ...freshState(30), usedMs: 30 * 60_000, resetAt: 1 };
    const reset = { ...freshState(30), resetAt: 2 };
    expect(mergeStates(old, reset).usedMs).toBe(0);
    expect(mergeStates(reset, old).usedMs).toBe(0);
  });
});
