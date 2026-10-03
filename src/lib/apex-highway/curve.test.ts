import { describe, expect, it } from "vitest";
import { curvatureAt } from "./curve";

describe("curvatureAt", () => {
  it("stays within the limit and has both straights and bends", () => {
    let straight = 0;
    let left = 0;
    let right = 0;
    for (let d = 0; d < 20000; d += 10) {
      const c = curvatureAt(d);
      expect(Math.abs(c)).toBeLessThanOrEqual(0.0009 + 1e-9);
      if (c === 0) straight++;
      else if (c > 0) right++;
      else left++;
    }
    expect(straight).toBeGreaterThan(100);
    expect(left).toBeGreaterThan(100);
    expect(right).toBeGreaterThan(100);
  });
  it("changes smoothly", () => {
    for (let d = 0; d < 5000; d += 1) expect(Math.abs(curvatureAt(d + 1) - curvatureAt(d))).toBeLessThan(0.0001);
  });
});
