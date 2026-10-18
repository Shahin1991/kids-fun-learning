import { describe, expect, it } from "vitest";
import { isDown, launchVelocity, SLING, SIZES, towerLayout, trajectory, DESIGN_COUNT } from "./catapult";
import { ANGLES, PUZZLES, rampTray, simulate } from "./marble-run";
import { BOARD, clampDrop, dividerXs, pegLayout, SLOT_VALUES, slotAt } from "./peg-drop";

describe("peg drop", () => {
  it("leaves room for a ball between pegs but not between the outer pegs and the wall", () => {
    for (const level of ["easy", "medium", "hard"] as const) {
      const pegs = pegLayout(level);
      const rows = new Map<number, number[]>();
      for (const p of pegs) rows.set(p.y, [...(rows.get(p.y) ?? []), p.x]);
      for (const xs of rows.values()) {
        xs.sort((a, b) => a - b);
        for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1] - 2 * BOARD.pegR).toBeGreaterThan(2 * BOARD.ballR);
      }
      expect(pegs.every((p) => p.y > BOARD.slotH && p.y < BOARD.dropY)).toBe(true);
    }
  });

  it("maps x to the right cup and keeps the dropper inside the walls", () => {
    expect(slotAt(-BOARD.halfW + 0.01)).toBe(0);
    expect(slotAt(0)).toBe(3);
    expect(slotAt(BOARD.halfW - 0.01)).toBe(SLOT_VALUES.easy.length - 1);
    expect(dividerXs()).toHaveLength(SLOT_VALUES.easy.length - 1);
    expect(Math.abs(clampDrop(99)) + BOARD.ballR).toBeLessThan(BOARD.halfW);
    // Cups are symmetric, smallest in the middle
    for (const v of Object.values(SLOT_VALUES)) {
      expect(v).toEqual([...v].reverse());
      expect(Math.min(...v)).toBe(v[3]);
    }
  });
});

describe("catapult", () => {
  it("builds towers that rest exactly on each other with a star on top", () => {
    for (let i = 0; i < DESIGN_COUNT; i++) {
      const t = towerLayout(i, "medium");
      const star = t[t.length - 1];
      expect(star.kind).toBe("star");
      expect(Math.max(...t.map((b) => b.y + b.h / 2))).toBeCloseTo(star.y + star.h / 2, 6);
      // Every block sits on the ground or on top of another block
      for (const b of t) {
        const bottom = b.y - b.h / 2;
        const supported = bottom < 1e-6 || t.some((o) => o !== b && Math.abs(o.y + o.h / 2 - bottom) < 1e-6 && Math.abs(o.x - b.x) < (o.w + b.w) / 2);
        expect(supported).toBe(true);
      }
    }
    expect(towerLayout(0, "hard")[0].x).toBeGreaterThan(towerLayout(0, "easy")[0].x);
  });

  it("launches harder the further you pull, up to the band's limit, and the preview stops at the ground", () => {
    expect(launchVelocity(1, 0).vx).toBeCloseTo(SLING.power, 6);
    expect(launchVelocity(10, 0).pull).toBe(SLING.maxPull);
    const pts = trajectory(0, 2, 5, 5, 9.8, 200);
    expect(pts.length).toBeLessThan(200);
    expect(pts.every((p) => p.y >= 0)).toBe(true);
    expect(isDown(1, 0.4, 0)).toBe(true);
    expect(isDown(1, 0.9, 0.1)).toBe(false);
    expect(isDown(1, 1, 1)).toBe(true);
    expect(SIZES.star.w).toBeLessThan(SIZES.cube.w);
  });
});

describe("marble run", () => {
  it("every puzzle is solved by its solution and not by leaving the ramps in the tray", () => {
    for (const p of PUZZLES) {
      expect(p.solution).toHaveLength(p.ramps.length);
      // Solutions only use angles a tap can reach
      for (const s of p.solution) expect(ANGLES.some((a) => Math.abs(a - s.angle) < 1e-9)).toBe(true);
      expect(simulate(p, p.solution).result, p.name).toBe("cup");
      expect(simulate(p, rampTray(p)).result, p.name).toBe("miss");
    }
  });
});

describe("marble run tray", () => {
  it("parks the ramps away from the cup", () => {
    for (const p of PUZZLES) {
      for (const [i, pose] of rampTray(p).entries()) {
        const half = p.ramps[i] / 2;
        const cupL = p.cup.x - p.cup.w / 2 - 0.3;
        const cupR = p.cup.x + p.cup.w / 2 + 0.3;
        expect(pose.x + half < cupL || pose.x - half > cupR, p.name).toBe(true);
      }
    }
  });
});
