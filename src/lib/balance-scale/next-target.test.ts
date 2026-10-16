import { describe, expect, it } from "vitest";
import { nextTarget } from "./BalanceGameModule";

describe("balance puzzle targets", () => {
  it("climb and wrap back after 20", () => {
    expect(nextTarget(5, () => 0)).toBe(6);
    expect(nextTarget(19, () => 0.99)).toBeLessThanOrEqual(6);
    let t = 5;
    for (let i = 0; i < 50; i++) {
      t = nextTarget(t);
      expect(t).toBeGreaterThanOrEqual(4);
      expect(t).toBeLessThanOrEqual(20);
    }
  });
});
