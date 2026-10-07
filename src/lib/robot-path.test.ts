import { describe, expect, it } from "vitest";
import { ROBOT_LEVELS, shortestSolution, solves } from "./robot-path";

describe("robot path levels", () => {
  it("every level is solvable", () => {
    for (const l of ROBOT_LEVELS) {
      const sol = shortestSolution(l.grid);
      expect(sol, l.grid.join("/")).not.toBeNull();
      expect(solves(l.grid, sol!)).toBe(true);
    }
  });
  it("walls bump", () => {
    expect(solves(["R#S"], ["right", "right"])).toBe(false);
  });
});
