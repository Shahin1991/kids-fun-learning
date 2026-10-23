import { describe, expect, it } from "vitest";
import { MAX_DROPS, NAMED, colourOf, emptyCounts, explain, mixColour, mixQuestion, nameOf, pickTarget, poolFor, recipeSpeech, sameRecipe, toCounts, total } from "./mix";

const c = (red = 0, yellow = 0, blue = 0, white = 0) => ({ red, yellow, blue, white });

describe("mixing", () => {
  it("shows nothing for an empty glass and the pot colour for a single pot", () => {
    expect(mixColour(emptyCounts())).toBeNull();
    expect(nameOf(emptyCounts())).toBeNull();
    expect(mixColour(c(3))).toBe("#ff4d4d");
    expect(mixColour(c(0, 0, 0, 2))).toBe("#ffffff");
  });

  it("makes the classic secondary colours", () => {
    expect(nameOf(c(1, 1))?.name).toBe("Orange");
    expect(nameOf(c(0, 1, 1))?.name).toBe("Green");
    expect(nameOf(c(1, 0, 1))?.name).toBe("Purple");
    expect(nameOf(c(1, 1, 1))?.name).toBe("Brown");
    expect(nameOf(c(1, 0, 0, 1))?.name).toBe("Pink");
  });

  it("only cares about proportions", () => {
    expect(sameRecipe(c(2, 2), c(1, 1))).toBe(true);
    expect(sameRecipe(c(2, 1), c(1, 1))).toBe(false);
    expect(mixColour(c(3, 3))).toBe(mixColour(c(1, 1)));
    expect(nameOf(c(4, 4))?.name).toBe("Orange");
  });

  it("gives every named colour its own look, and names the in-between shades", () => {
    const hexes = NAMED.map(colourOf);
    expect(new Set(hexes).size).toBe(NAMED.length);
    expect(nameOf(c(3, 1))?.name).toBe("Red orange");
  });

  it("lighter with more white", () => {
    const light = (h: string) => parseInt(h.slice(1, 3), 16) + parseInt(h.slice(3, 5), 16) + parseInt(h.slice(5, 7), 16);
    expect(light(mixColour(c(1, 1, 0, 2))!)).toBeGreaterThan(light(mixColour(c(1, 1, 0, 1))!));
  });

  it("every named recipe fits in the glass", () => {
    for (const n of NAMED) expect(total(toCounts(n.recipe))).toBeLessThanOrEqual(MAX_DROPS);
  });
});

describe("words", () => {
  it("explains a pour", () => {
    expect(explain(c(1, 1))).toBe("red and yellow make orange.");
    expect(explain(c(1, 1, 1))).toBe("red, yellow and blue make brown.");
    expect(explain(c(2))).toBe("Red!");
    expect(explain(c(5, 1, 1))).toMatch(/^That looks like/);
    expect(recipeSpeech([2, 1, 0, 0])).toBe("2 red and 1 yellow");
  });
});

describe("questions", () => {
  const seeded = () => {
    let s = 7;
    return () => ((s = (s * 16807) % 2147483647) / 2147483647);
  };

  it("starts with orange, green and purple, then widens", () => {
    expect(poolFor(0).map((n) => n.name)).toEqual(["Orange", "Green", "Purple"]);
    expect(poolFor(4).length).toBeGreaterThan(3);
    expect(poolFor(9).length).toBeGreaterThan(poolFor(4).length);
  });

  it("never offers a primary or white as a target, and avoids the last one", () => {
    const rng = seeded();
    for (let streak = 0; streak < 12; streak++) {
      const t = pickTarget(streak, "Orange", rng);
      expect(["Red", "Yellow", "Blue", "White", "Orange"]).not.toContain(t.name);
    }
  });

  it("has distinct choices including the answer", () => {
    const rng = seeded();
    for (let streak = 0; streak < 12; streak++) {
      const q = mixQuestion(streak, new Set(), rng);
      const names = q.choices.map((n) => n.name);
      expect(new Set(names).size).toBe(names.length);
      expect(names).toContain(q.answer.name);
      expect(names.length).toBe(streak < 3 ? 3 : 4);
    }
  });
});
