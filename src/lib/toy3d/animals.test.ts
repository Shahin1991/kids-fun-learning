import { describe, expect, it } from "vitest";
import { ANIMALS } from "@/data/animals";
import { ANIMAL_SPECS } from "./animals";

describe("ANIMAL_SPECS", () => {
  it("has a 3D model for every animal in the data", () => {
    for (const a of ANIMALS) expect(ANIMAL_SPECS.find((s) => s.id === a.id), a.id).toBeDefined();
  });
  it("uses a known template with unique ids", () => {
    const ids = new Set(ANIMAL_SPECS.map((s) => s.id));
    expect(ids.size).toBe(ANIMAL_SPECS.length);
    for (const s of ANIMAL_SPECS) expect(["quad", "bird", "frog"]).toContain(s.kind);
  });
});
