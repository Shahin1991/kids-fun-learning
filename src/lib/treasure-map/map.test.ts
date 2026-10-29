import { describe, expect, it } from "vitest";
import { rng } from "@/lib/cake-bakery/recipe";
import { clueProgress, clueText, follow, makeMap, walkable } from "./map";

describe("treasure map", () => {
  it("clues always lead over land from the start to the treasure, turning at every clue", () => {
    const r = rng(12);
    for (let level = 0; level < 4; level++) {
      for (let k = 0; k < 60; k++) {
        const m = makeMap(level, r);
        expect(m.clues.length).toBe(Math.min(3, 1 + level));
        expect(walkable(m, m.start)).toBe(true);
        expect(follow(m, m.start, m.clues)).toEqual(m.treasure);
        expect(m.treasure).not.toEqual(m.start);
        for (let i = 1; i < m.clues.length; i++) expect(m.clues[i].dir).not.toBe(m.clues[i - 1].dir);
      }
    }
  });

  it("reads clues aloud", () => {
    expect(clueText({ dir: "N", steps: 2 })).toBe("Go 2 steps North");
    expect(clueText({ dir: "W", steps: 1 })).toBe("Go 1 step West");
  });

  it("tracks which clue the explorer is on", () => {
    const clues = [{ dir: "N" as const, steps: 2 }, { dir: "E" as const, steps: 1 }];
    expect(clueProgress(clues, [])).toEqual({ clue: 0, stepInClue: 0 });
    expect(clueProgress(clues, ["N"])).toEqual({ clue: 0, stepInClue: 1 });
    expect(clueProgress(clues, ["N", "N"])).toEqual({ clue: 1, stepInClue: 0 });
    expect(clueProgress(clues, ["N", "N", "E"])).toEqual({ clue: 2, stepInClue: 0 });
    // A wrong turn stops the progress there
    expect(clueProgress(clues, ["N", "W", "N"])).toEqual({ clue: 0, stepInClue: 1 });
  });
});
