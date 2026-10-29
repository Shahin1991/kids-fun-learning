import { describe, expect, it } from "vitest";
import { rng } from "@/lib/cake-bakery/recipe";
import { buryBones, DINOS, uncovered } from "./dig";

describe("dino dig", () => {
  it("every dinosaur has one skull and its bones fit the skeleton box", () => {
    for (const d of DINOS) {
      expect(d.bones.filter((b) => b.kind === "skull")).toHaveLength(1);
      expect(new Set(d.bones.map((b) => b.id)).size).toBe(d.bones.length);
      for (const b of d.bones) {
        expect(b.x).toBeGreaterThan(0);
        expect(b.x).toBeLessThan(400);
        expect(b.y).toBeLessThan(240);
      }
    }
  });

  it("buries each bone in its own part of the dig", () => {
    const r = rng(7);
    for (const d of DINOS) {
      for (let k = 0; k < 30; k++) {
        const buried = buryBones(d, r);
        expect(buried.map((b) => b.id)).toEqual(d.bones.map((b) => b.id));
        for (let i = 0; i < buried.length; i++)
          for (let j = i + 1; j < buried.length; j++) expect(Math.hypot(buried[i].x - buried[j].x, buried[i].y - buried[j].y)).toBeGreaterThan(70);
        for (const b of buried) {
          expect(b.x).toBeGreaterThan(40);
          expect(b.x).toBeLessThan(360);
          expect(b.y).toBeGreaterThan(40);
          expect(b.y).toBeLessThan(220);
        }
      }
    }
  });

  it("measures how much of a bone the brushing has uncovered", () => {
    const bone = [255, 255, 255, 255, 0, 0];
    expect(uncovered(bone, [255, 255, 255, 255, 255, 255])).toBe(0);
    expect(uncovered(bone, [0, 0, 255, 255, 0, 0])).toBe(0.5);
    expect(uncovered(bone, [0, 0, 0, 0, 255, 255])).toBe(1);
    expect(uncovered([0, 0], [0, 0])).toBe(0);
  });
});
