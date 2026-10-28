import { describe, expect, it } from "vitest";
import { rng } from "@/lib/cake-bakery/recipe";
import { BODY, CARS, cleared, coveredCount, mudSplats, WHEELS } from "./wash";

describe("car wash", () => {
  it("has a body outline and two wheels for every kind of car", () => {
    for (const c of CARS) {
      expect(BODY[c.kind]).toMatch(/^M.*Z$/);
      expect(WHEELS[c.kind]).toHaveLength(2);
    }
  });

  it("splats mud over the car's body box", () => {
    const r = rng(4);
    for (const kind of ["hatch", "pickup", "bus"] as const) {
      for (const s of mudSplats(kind, r)) {
        expect(s.x).toBeGreaterThanOrEqual(40);
        expect(s.x).toBeLessThanOrEqual(360);
        expect(s.y).toBeLessThanOrEqual(165);
        expect(s.r).toBeGreaterThanOrEqual(18);
      }
    }
  });

  it("measures how much of the layer is wiped off", () => {
    const start = [255, 255, 255, 255, 0, 0];
    const n = coveredCount(start);
    expect(n).toBe(4);
    expect(cleared(n, start)).toBe(0);
    expect(cleared(n, [255, 0, 0, 0, 0, 0])).toBe(0.75);
    expect(cleared(n, [0, 0, 0, 0, 0, 0])).toBe(1);
    expect(cleared(0, [])).toBe(1);
  });
});
