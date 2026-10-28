import { describe, expect, it } from "vitest";
import { rng } from "@/lib/cake-bakery/recipe";
import { CLOTHES, makeTray, nextWeather, wear, weatherById, WEATHERS } from "./weather";

describe("dress for the weather", () => {
  it("every needed item exists and no two needed items share a body slot", () => {
    for (const w of WEATHERS) {
      const slots = w.needs.map((id) => CLOTHES.find((c) => c.id === id)!.slot);
      expect(new Set(slots).size).toBe(slots.length);
    }
  });

  it("the tray holds everything needed plus a few others, more as the child plays", () => {
    const r = rng(2);
    for (const w of WEATHERS) {
      for (let level = 0; level < 4; level++) {
        const tray = makeTray(w, level, r);
        expect(new Set(tray).size).toBe(tray.length);
        for (const n of w.needs) expect(tray).toContain(n);
        expect(tray.length).toBe(Math.min(CLOTHES.length, w.needs.length + 1 + level * 2));
      }
    }
  });

  it("only puts on what the weather needs, and finishes on the last one", () => {
    const snow = weatherById("snowy");
    expect(wear(snow, [], "sunglasses")).toBe("wrong");
    expect(wear(snow, [], "scarf")).toBe("on");
    expect(wear(snow, ["scarf"], "scarf")).toBe("already");
    expect(wear(snow, ["scarf", "gloves"], "coat")).toBe("dressed");
  });

  it("never brings the same weather twice in a row", () => {
    const r = rng(6);
    let w = nextWeather(null, r);
    for (let i = 0; i < 50; i++) {
      const n = nextWeather(w, r);
      expect(n).not.toBe(w);
      w = n;
    }
  });
});
