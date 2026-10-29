import { describe, expect, it } from "vitest";
import { guideDots, symmetricPoints } from "./symmetry";

describe("rangoli symmetry", () => {
  const c = { x: 100, y: 100 };

  it("repeats a point into n equal turns around the centre", () => {
    const pts = symmetricPoints({ x: 150, y: 100 }, c, 4, false);
    expect(pts).toHaveLength(4);
    const expected = [[150, 100], [100, 150], [50, 100], [100, 50]];
    pts.forEach((p, i) => {
      expect(p.x).toBeCloseTo(expected[i][0]);
      expect(p.y).toBeCloseTo(expected[i][1]);
    });
  });

  it("adds a mirror image in each part, all the same distance from the centre", () => {
    const p = { x: 140, y: 120 };
    const pts = symmetricPoints(p, c, 6, true);
    expect(pts).toHaveLength(12);
    const r = Math.hypot(p.x - c.x, p.y - c.y);
    for (const q of pts) expect(Math.hypot(q.x - c.x, q.y - c.y)).toBeCloseTo(r);
    // The mirror of (140, 120) across the horizontal axis is (140, 80)
    expect(pts[1].x).toBeCloseTo(140);
    expect(pts[1].y).toBeCloseTo(80);
  });

  it("lays guide dots in rings inside the box", () => {
    const dots = guideDots(200, 3);
    expect(dots).toHaveLength(1 + 8 + 16 + 24);
    for (const d of dots) {
      expect(d.x).toBeGreaterThanOrEqual(0);
      expect(d.x).toBeLessThanOrEqual(200);
    }
  });
});
