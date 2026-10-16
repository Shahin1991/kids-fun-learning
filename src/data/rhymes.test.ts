import { describe, expect, it } from "vitest";
import { RHYME_FAMILIES } from "./rhymes";

describe("rhyme families", () => {
  it("has enough families, each with at least two words", () => {
    expect(RHYME_FAMILIES.length).toBeGreaterThanOrEqual(20);
    RHYME_FAMILIES.forEach((f) => expect(f.length).toBeGreaterThanOrEqual(2));
  });

  it("uses every word and picture only once", () => {
    const all = RHYME_FAMILIES.flat();
    expect(new Set(all.map((w) => w.word)).size).toBe(all.length);
    expect(new Set(all.map((w) => w.emoji)).size).toBe(all.length);
  });
});
