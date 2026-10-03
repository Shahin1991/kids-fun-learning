import { describe, expect, it } from "vitest";
import { Spring } from "./spring";

describe("Spring", () => {
  it("settles on its target", () => {
    const s = new Spring(0, 1);
    for (let i = 0; i < 300; i++) s.step(1 / 60);
    expect(s.value).toBeCloseTo(1, 2);
    expect(Math.abs(s.vel)).toBeLessThan(0.01);
  });
  it("overshoots after a kick then returns to rest", () => {
    const s = new Spring(0, 0);
    s.kick(5);
    let peak = 0;
    for (let i = 0; i < 400; i++) peak = Math.max(peak, s.step(1 / 60));
    expect(peak).toBeGreaterThan(0.1);
    expect(s.value).toBeCloseTo(0, 2);
  });
  it("stays stable on a long frame gap", () => {
    const s = new Spring(0, 1);
    s.step(0.5);
    expect(Number.isFinite(s.value)).toBe(true);
  });
});
