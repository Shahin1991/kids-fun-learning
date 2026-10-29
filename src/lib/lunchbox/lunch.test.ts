import { describe, expect, it } from "vitest";
import { rng } from "@/lib/cake-bakery/recipe";
import { foodById, FOODS, GROUPS, isPacked, lunchSpeech, makeTray, pack } from "./lunch";

describe("my lunchbox", () => {
  it("has foods for every group, with unique ids", () => {
    for (const g of GROUPS) expect(FOODS.filter((f) => f.group === g.id).length).toBeGreaterThanOrEqual(3);
    expect(new Set(FOODS.map((f) => f.id)).size).toBe(FOODS.length);
  });

  it("puts at least one of every group on the tray, and some treats", () => {
    const r = rng(3);
    for (let level = 0; level < 8; level++) {
      const tray = makeTray(level, r);
      expect(new Set(tray).size).toBe(tray.length);
      for (const g of GROUPS) expect(tray.some((id) => foodById(id).group === g.id)).toBe(true);
      expect(tray.some((id) => foodById(id).group === "treat")).toBe(true);
    }
    expect(makeTray(6, r).length).toBeGreaterThan(makeTray(0, r).length);
  });

  it("packs one food per spot and keeps treats out", () => {
    let box = {};
    const a = pack(box, "roti");
    expect(a.ok).toBe(true);
    if (a.ok) box = a.box;
    expect(pack(box, "rice")).toEqual({ ok: false, reason: "full", group: "grain" });
    expect(pack(box, "donut")).toEqual({ ok: false, reason: "treat" });
    expect(pack(box, "egg", "fruit")).toEqual({ ok: false, reason: "wrongSpot", group: "protein" });
    for (const id of ["egg", "mango", "carrot", "milk"]) {
      const res = pack(box, id);
      if (res.ok) box = res.box;
    }
    expect(isPacked(box)).toBe(true);
    expect(lunchSpeech(box)).toMatch(/^roti gives you energy/);
  });
});
