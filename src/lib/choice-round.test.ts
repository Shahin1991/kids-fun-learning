import { describe, expect, it } from "vitest";
import type { FactItem } from "@/data/facts";
import { makeChoiceRound } from "./choice-round";

const items: FactItem[] = Array.from({ length: 8 }, (_, i) => ({ id: `i${i}`, label: `L${i}`, emoji: "x", fact: "" }));

describe("makeChoiceRound", () => {
  it("scaffolds from 2 to 4 choices", () => {
    expect(makeChoiceRound(items, 0).choices).toHaveLength(2);
    expect(makeChoiceRound(items, 3).choices).toHaveLength(3);
    expect(makeChoiceRound(items, 30).choices).toHaveLength(4);
  });
  it("always contains the target once", () => {
    for (let s = 0; s < 12; s++) {
      const r = makeChoiceRound(items, s);
      expect(r.choices.filter((c) => c.id === r.target.id)).toHaveLength(1);
    }
  });
});
