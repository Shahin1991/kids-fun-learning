import { describe, expect, it } from "vitest";
import { renderPageTurnSamples } from "./tone-generator";

describe("page turn sound", () => {
  it("is audible, finite, within range and fades to silence, for every variant", () => {
    let seed = 1;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const v of [0, 1, 2]) {
      const s = renderPageTurnSamples(v, rand);
      expect(s.length).toBeGreaterThan(22050 * 0.3);
      let peak = 0;
      let energy = 0;
      for (const x of s) {
        expect(Number.isFinite(x)).toBe(true);
        peak = Math.max(peak, Math.abs(x));
        energy += x * x;
      }
      expect(peak).toBeGreaterThan(0.3);
      expect(peak).toBeLessThanOrEqual(0.6);
      expect(energy / s.length).toBeGreaterThan(0.001);
      expect(Math.abs(s[s.length - 1])).toBeLessThan(0.01);
    }
  });
});
