import { describe, expect, it } from "vitest";
import { SHAPES } from "@/data/shapes";
import { OUTLINES, outlineShape } from "./outlines";

describe("outlines", () => {
  it("has an outline for every sorter shape", () => {
    for (const s of SHAPES) expect(OUTLINES[s.id], s.id).toBeDefined();
  });
  it("builds closed shapes with enough points", () => {
    for (const s of SHAPES) {
      const pts = outlineShape(s.id).getPoints(8);
      expect(pts.length, s.id).toBeGreaterThan(8);
      const first = pts[0];
      const last = pts[pts.length - 1];
      expect(Math.hypot(first.x - last.x, first.y - last.y), s.id).toBeLessThan(0.5);
    }
  });
  it("keeps shapes inside the unit box", () => {
    for (const s of SHAPES) for (const p of outlineShape(s.id).getPoints(8)) expect(Math.max(Math.abs(p.x), Math.abs(p.y))).toBeLessThanOrEqual(1.01);
  });
});
