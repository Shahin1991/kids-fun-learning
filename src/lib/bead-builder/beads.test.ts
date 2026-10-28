import { describe, expect, it } from "vitest";
import { rng } from "@/lib/cake-bakery/recipe";
import { beadAt, BEADS, makeRound, STRING_LENGTH } from "./beads";

describe("bead builder", () => {
  it("gives every bead its own colour and shape", () => {
    expect(new Set(BEADS.map((b) => b.color)).size).toBe(BEADS.length);
    expect(new Set(BEADS.map((b) => b.shape)).size).toBe(BEADS.length);
  });

  it("starts with AB copying and grows to longer patterns with an extra tray bead", () => {
    const r = rng(1);
    const first = makeRound(0, r);
    expect(first.unit).toHaveLength(2);
    expect(first.unit[0]).not.toBe(first.unit[1]);
    expect(first.mode).toBe("copy");
    expect(first.given).toBe(0);
    for (let done = 0; done < 20; done++) {
      const round = makeRound(done, r);
      const used = new Set(round.unit);
      // Every bead the pattern needs is on the tray, plus at most one more
      for (const id of used) expect(round.tray).toContain(id);
      expect(round.tray.length - used.size).toBe(done >= 1 ? 1 : 0);
      // "Continue" rounds show at least one full repeat and leave beads to add
      if (round.mode === "continue") {
        expect(round.given).toBeGreaterThanOrEqual(round.unit.length);
        expect(round.given).toBeLessThan(STRING_LENGTH);
      }
    }
    expect(makeRound(8, r).unit.length).toBeGreaterThanOrEqual(3);
  });

  it("repeats the unit along the string", () => {
    const unit = ["red", "red", "blue"];
    expect(Array.from({ length: 6 }, (_, i) => beadAt(unit, i))).toEqual(["red", "red", "blue", "red", "red", "blue"]);
  });
});
