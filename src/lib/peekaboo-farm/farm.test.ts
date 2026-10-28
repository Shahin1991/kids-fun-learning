import { describe, expect, it } from "vitest";
import { rng } from "@/lib/cake-bakery/recipe";
import { FARM_ANIMALS, hideAnimals, pickTarget, SPOTS, type SpotId } from "./farm";

describe("peekaboo farm", () => {
  it("hides a different farm animal in every spot, with a duck or frog in the pond", () => {
    const r = rng(5);
    for (let i = 0; i < 200; i++) {
      const h = hideAnimals(r);
      const ids = SPOTS.map((s) => h[s].id);
      expect(new Set(ids).size).toBe(SPOTS.length);
      expect(ids).not.toContain("lion");
      expect(["duck", "frog"]).toContain(h.pond.id);
    }
    expect(FARM_ANIMALS.length).toBeGreaterThanOrEqual(SPOTS.length);
  });

  it("asks for someone not found yet, never the same one twice in a row", () => {
    const r = rng(8);
    const found = new Set<SpotId>(["barn", "pond", "bush"]);
    for (let i = 0; i < 50; i++) {
      const t = pickTarget(found, r, "crate")!;
      expect(found.has(t)).toBe(false);
      expect(t).not.toBe("crate");
    }
    // The last one left is asked for even if it was just asked
    expect(pickTarget(new Set(SPOTS.filter((s) => s !== "crate")), r, "crate")).toBe("crate");
    expect(pickTarget(new Set(SPOTS), r)).toBeNull();
  });
});
