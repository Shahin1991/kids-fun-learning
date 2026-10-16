import { describe, expect, it } from "vitest";
import { BARS, checkCopy, extendTune, SONGS } from "./music";

describe("music maker", () => {
  it("songs only use bars that exist", () => {
    SONGS.forEach((s) => s.notes.forEach((n) => expect(n >= 0 && n < BARS.length).toBe(true)));
  });

  it("copy-me tunes grow by one and avoid three of the same in a row", () => {
    let t: number[] = [];
    for (let i = 0; i < 30; i++) {
      t = extendTune(t, () => 0);
      expect(t).toHaveLength(i + 1);
    }
    for (let i = 2; i < t.length; i++) expect(t[i] === t[i - 1] && t[i] === t[i - 2]).toBe(false);
  });

  it("checks taps", () => {
    expect(checkCopy([1, 2, 3], [1, 2])).toBe("keep-going");
    expect(checkCopy([1, 2, 3], [1, 3])).toBe("wrong");
    expect(checkCopy([1, 2, 3], [1, 2, 3])).toBe("complete");
  });
});
