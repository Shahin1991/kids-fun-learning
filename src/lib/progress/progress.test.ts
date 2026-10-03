import { describe, expect, it } from "vitest";
import { bestMovesOf, bestScoreOf } from "./progress";

const rec = (o: { score?: number; moves?: number }) => ({ moduleId: "x", completedAt: 0, ...o });

describe("best helpers", () => {
  it("best score is the max", () => {
    expect(bestScoreOf([rec({ score: 3 }), rec({ score: 9 }), rec({})])).toBe(9);
  });
  it("best moves is the min", () => {
    expect(bestMovesOf([rec({ moves: 12 }), rec({ moves: 8 })])).toBe(8);
  });
  it("returns null with no data", () => {
    expect(bestScoreOf([])).toBeNull();
    expect(bestMovesOf([rec({})])).toBeNull();
  });
});
