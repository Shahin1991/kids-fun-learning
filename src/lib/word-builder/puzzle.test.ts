import { describe, expect, it } from "vitest";
import { CVC_WORDS } from "@/data/cvc-words";
import { makePuzzle, nextSlot, placeTile } from "./puzzle";

describe("word builder", () => {
  it("leaves more blanks and adds decoys as levels rise", () => {
    expect(makePuzzle("cat", 0).slots).toEqual(["c", "a", null]);
    expect(makePuzzle("cat", 2).slots).toEqual([null, null, null]);
    expect(makePuzzle("cat", 0).tiles).toEqual(["t"]);
    const hard = makePuzzle("cat", 4);
    expect(hard.tiles).toHaveLength(5);
    expect(hard.tiles.filter((t) => !"cat".includes(t))).toHaveLength(2);
  });

  it("only accepts the right letter for the next slot and finishes the word", () => {
    let p = makePuzzle("dog", 2, () => 0.3);
    const wrong = p.tiles.findIndex((t) => t !== "d");
    expect(placeTile(p, wrong).ok).toBe(false);
    for (const ch of "dog") {
      const r = placeTile(p, p.tiles.indexOf(ch));
      expect(r.ok).toBe(true);
      p = r.puzzle;
    }
    expect(nextSlot(p)).toBe(-1);
    expect(p.slots.join("")).toBe("dog");
  });

  it("word list is all three-letter lowercase words", () => {
    CVC_WORDS.forEach((w) => expect(w.word).toMatch(/^[a-z]{3}$/));
    expect(new Set(CVC_WORDS.map((w) => w.word)).size).toBe(CVC_WORDS.length);
  });
});
