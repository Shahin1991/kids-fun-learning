import { describe, expect, it } from "vitest";
import { rng } from "@/lib/cake-bakery/recipe";
import { canLay, isComplete, makeLevel, nextCells, pickUpTo, shortestTrack, type TrackLevel } from "./track";

const open: TrackLevel = { cols: 4, rows: 3, from: { x: 0, y: 1 }, to: { x: 3, y: 1 }, place: { name: "the farm", emoji: "🐄" }, blocked: [{ x: 1, y: 1, kind: "tree" }] };

describe("train track", () => {
  it("lays track only next to the end, never on scenery or twice", () => {
    const path = [open.from];
    expect(canLay(open, path, { x: 1, y: 1 })).toBe("blocked");
    expect(canLay(open, path, { x: 2, y: 0 })).toBe("notNext");
    expect(canLay(open, path, { x: 0, y: 0 })).toBe("ok");
    expect(canLay(open, [open.from, { x: 0, y: 0 }], { x: 0, y: 1 })).toBe("used");
  });

  it("finishes at the station, picking the passenger up on the way", () => {
    const path = [open.from, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 3, y: 1 }];
    expect(isComplete(open, path)).toBe(true);
    expect(canLay(open, path, { x: 3, y: 0 })).toBe("done");
    const withStop = { ...open, stop: { x: 2, y: 2, emoji: "🐼", name: "Panda" } };
    expect(isComplete(withStop, path)).toBe(false);
    expect(canLay(withStop, path.slice(0, -1), { x: 3, y: 1 })).toBe("needStop");
  });

  it("hints only at cells a piece can go on", () => {
    expect(nextCells(open, [open.from])).toEqual([
      { x: 0, y: 2 },
      { x: 0, y: 0 },
    ]);
  });

  it("picks track back up to a tapped piece", () => {
    const path = [open.from, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }];
    expect(pickUpTo(path, { x: 1, y: 0 })).toEqual(path.slice(0, 2));
    expect(pickUpTo(path, open.from)).toEqual([open.from]);
  });

  it("every generated map can be finished, with a passenger from level 2", () => {
    const r = rng(5);
    for (let level = 0; level < 7; level++) {
      for (let k = 0; k < 30; k++) {
        const lv = makeLevel(level, r);
        const best = shortestTrack(lv);
        expect(best).not.toBeNull();
        expect(isComplete(lv, best!)).toBe(true);
        expect(Boolean(lv.stop)).toBe(level >= 2);
        // Walking the best track piece by piece is always allowed
        for (let i = 1; i < best!.length; i++) expect(canLay(lv, best!.slice(0, i), best![i])).toBe("ok");
      }
    }
  });
});
